from fastapi import APIRouter, HTTPException
import schemas
from services.ai_engine import get_ai_decision, generate_chat_response
from services.algorand_client import execute_trade, get_balance

router = APIRouter()

@router.post("/ai-decision", response_model=schemas.AIDecisionResponse)
def ai_decision(request: schemas.AIDecisionRequest):
    # Mock market data for the prototype
    market_trend = "Bullish - ALGO forming higher highs"
    sentiment = "Positive"
    decision = get_ai_decision(market_trend, sentiment, request.balance)
    return decision

from services.notifier import send_trade_alert

@router.post("/trade", response_model=schemas.TradeResponse)
def create_trade(request: schemas.TradeRequest):
    # In a real app we'd verify the signature, here we just proxy the execute_trade for demo
    result = execute_trade(request.action, request.amount, request.wallet_address)
    
    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=result["message"])
        
    # Trigger Resend Alert
    uid = request.wallet_address.replace("ALGO_", "") if request.wallet_address.startswith("ALGO_") else None
    
    try:
        from main import db
        if db and uid:
            user_doc = db.collection("portfolios").document(uid).get()
            if user_doc.exists:
                data = user_doc.to_dict()
                email = data.get("email")
                fcm_token = data.get("fcm_token")
                
                if email:
                    send_trade_alert(email, request.action, request.amount, result["tx_id"])
                    
                if fcm_token:
                    from services.notifier import send_push_notification
                    send_push_notification(
                        fcm_token, 
                        f"Trade Executed: {request.action}", 
                        f"{request.amount} ALGO processed successfully."
                    )
    except Exception as e:
        print(f"Failed to send trade alert: {e}")
        
    return {"status": "success", "tx_id": result["tx_id"], "message": "Trade executed on Algorand."}

@router.post("/chat", response_model=schemas.ChatResponse)
def chat_with_ai(request: schemas.ChatRequest):
    context = [{"role": h["role"], "content": h["content"]} for h in request.context]
    ai_response_text = generate_chat_response(request.message, context)
    return {"response": ai_response_text}
