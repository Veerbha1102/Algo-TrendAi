from fastapi import APIRouter, HTTPException
import schemas
from services.ai_engine import get_ai_decision, generate_chat_response
from services.algorand_client import execute_trade, get_balance, get_bot_account
from services.notifier import send_trade_alert
from services.ledger import save_transaction, update_portfolio_balance
from services.trnd_rewards import send_trnd_reward, is_opted_in, TRND_ASSET_ID
from algosdk import account, mnemonic, transaction as algo_txn
from algosdk.v2client import algod
import os

router = APIRouter()

ALGOD_ADDRESS = os.environ.get("ALGOD_URL", "https://testnet-api.algonode.cloud")
ALGOD_TOKEN   = os.environ.get("ALGOD_TOKEN", "")
BOT_MNEMONIC  = os.environ.get("BOT_MNEMONIC") or os.environ.get("APP_WALLET_MNEMONIC", "")
algod_client  = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)


@router.post("/ai-decision", response_model=schemas.AIDecisionResponse)
def ai_decision(request: schemas.AIDecisionRequest):
    market_trend = f"Bullish - {request.asset} forming higher highs"
    sentiment = "Positive"
    decision = get_ai_decision(
        market_trend, sentiment, request.balance, request.asset,
        last_action=request.last_action,
        last_trade_age_minutes=request.last_trade_age_minutes
    )
    return decision


@router.post("/trade", response_model=schemas.TradeResponse)
def create_trade(request: schemas.TradeRequest):
    # ── Snapshot balance BEFORE trade ─────────────────────────────
    try:
        bot_pk_str, bot_address = get_bot_account()
        balance_before = get_balance(bot_address)
    except Exception:
        bot_address = request.wallet_address
        balance_before = 0.0

    # ── Execute on Algorand blockchain ────────────────────────────
    result = execute_trade(request.action, request.amount, request.wallet_address)
    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=result["message"])

    # ── Real on-chain balance AFTER trade ─────────────────────────
    try:
        real_balance = get_balance(bot_address)
    except Exception:
        real_balance = balance_before

    # ── Comprehensive Firestore Audit Log ─────────────────────────
    try:
        from main import db
        if db:
            save_transaction(
                db=db,
                user_id=request.user_id or "unknown",
                action=request.action,
                amount_algo=request.amount,
                tx_id=result["tx_id"],
                balance_before=balance_before,
                balance_after=real_balance,
                ai_confidence=request.ai_confidence,
                ai_grade=request.ai_grade,
                ai_explanation=request.ai_explanation,
                asset="ALGO/USD",
                wallet_address=bot_address,
                user_email=request.user_email
            )
            if request.user_id:
                update_portfolio_balance(db, request.user_id, real_balance, request.action, result["tx_id"])
    except Exception as e:
        print(f"[Ledger] Save failed: {e}")

    # ── TRND Reward to User's Pera Wallet ─────────────────────────
    trnd_result = {"status": "skipped"}
    if request.wallet_address and len(request.wallet_address) == 58:
        try:
            trnd_result = send_trnd_reward(request.wallet_address, request.action)
            print(f"[TRND] Reward result: {trnd_result}")
        except Exception as e:
            print(f"[TRND] Reward exception: {e}")

    # ── Trade Confirmation Email ──────────────────────────────────
    if request.user_email:
        try:
            send_trade_alert(request.user_email, request.action, request.amount, result["tx_id"])
        except Exception as e:
            print(f"Email failed: {e}")

    return {
        "status": "success",
        "tx_id": result["tx_id"],
        "message": f"{request.action} executed. TRND reward: {trnd_result.get('status')}",
        "real_balance": real_balance
    }


@router.get("/balance")
def get_live_balance():
    """Returns the real-time on-chain ALGO balance of the bot wallet."""
    try:
        _, address = get_bot_account()
        balance = get_balance(address)
        return {"address": address, "balance": balance, "unit": "ALGO", "network": "Algorand Testnet"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trnd/status")
def trnd_status(wallet: str):
    """Check if a wallet has opted in to TRND and return token info."""
    opted = is_opted_in(wallet)
    return {
        "wallet": wallet,
        "opted_in": opted,
        "asset_id": TRND_ASSET_ID,
        "asset_name": "Trend AI Token (TRND)",
        "explorer": f"https://testnet.explorer.perawallet.app/asset/{TRND_ASSET_ID}",
        "opt_in_guide": "To receive TRND rewards, opt-in to asset ID {TRND_ASSET_ID} in your Pera Wallet."
    }


@router.post("/trnd/optin")
def submit_optin(payload: dict):
    """
    Receives a signed opt-in transaction from the frontend (signed by Pera Wallet)
    and submits it to the Algorand network.
    
    The frontend signs an ASA opt-in txn with Pera Wallet, sends the signed bytes here,
    and we submit it — user pays their own 0.001 ALGO fee.
    """
    signed_txn_bytes = payload.get("signed_txn")
    if not signed_txn_bytes:
        raise HTTPException(status_code=400, detail="signed_txn is required")
    try:
        import base64
        raw = base64.b64decode(signed_txn_bytes)
        tx_id = algod_client.send_raw_transaction(raw)
        algo_txn.wait_for_confirmation(algod_client, tx_id, 4)
        return {"status": "success", "tx_id": tx_id, "message": "Opted in to TRND. You will now receive rewards!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/chat", response_model=schemas.ChatResponse)
def chat_with_ai(request: schemas.ChatRequest):
    context = [{"role": h["role"], "content": h["content"]} for h in request.context]
    ai_response_text = generate_chat_response(request.message, context)
    return {"response": ai_response_text}
