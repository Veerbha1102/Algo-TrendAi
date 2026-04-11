import os
import google.generativeai as genai
import json
import yfinance as yf

# Configure Gemini
api_key = os.environ.get("GEMINI_API_KEY", "")
if api_key:
    genai.configure(api_key=api_key)

def get_macro_sentiment():
    try:
        # Fetch NIFTY 50 data (^NSEI)
        nifty = yf.Ticker("^NSEI")
        todays_data = nifty.history(period="1d")
        
        if todays_data.empty:
            return "NEUTRAL MACRO: Market data unavailable."
            
        # Calculate simple open/close sentiment
        open_price = todays_data['Open'].iloc[0]
        close_price = todays_data['Close'].iloc[0]
        
        if close_price < open_price:
            return "BEARISH MACRO: NIFTY is down today. Increase risk-aversion."
        return "BULLISH MACRO: NIFTY is stable/up. Normal crypto trading allowed."
    except Exception as e:
        return f"NEUTRAL MACRO: Error fetching data - {e}"

def get_ai_decision(market_trend: str, sentiment: str, portfolio_balance: float, asset: str = "ALGOUSD", last_action: str = None, last_trade_age_minutes: int = None) -> dict:
    if not api_key:
        return {"action": "HOLD", "confidence": 0.5, "explanation": "Mock decision due to missing GEMINI_API_KEY", "financial_grade": "Mock Data"}
    
    macro_context = get_macro_sentiment()

    # Fetch live ALGO-USD price for accurate net-profit calculation
    try:
        algo_ticker = yf.Ticker("ALGO-USD")
        algo_data = algo_ticker.history(period="1d")
        current_algo_price = algo_data['Close'].iloc[0] if not algo_data.empty else 0.20
    except Exception:
        current_algo_price = 0.20

    # Build position context so AI knows where it stands
    position_context = "FLAT (no open position, not yet bought)"
    entry_context = ""
    
    if last_action == "BUY":
        age_str = f"{last_trade_age_minutes} minutes ago" if last_trade_age_minutes is not None else "recently"
        position_context = f"LONG (we BUY'd {age_str} and are currently holding ALGO)"
        # For showcase/demo purposes, simulate that we bought at a slightly lower price to evaluate profit math
        entry_price = current_algo_price * 0.99 
        entry_context = f"ESTIMATED ENTRY PRICE: ${entry_price:.4f}"
    elif last_action == "SELL":
        age_str = f"{last_trade_age_minutes} minutes ago" if last_trade_age_minutes is not None else "recently"
        position_context = f"FLAT (we SELL'd {age_str} and are out of the market)"
    
    model = genai.GenerativeModel('gemini-2.5-pro')
    prompt = f"""
    SYSTEM PROMPT:
    You are Algopilot Assistant, a quantitative hedge fund AI making REAL autonomous trades on Algorand Testnet.
    You operate a strict position cycle: FLAT → BUY → LONG → SELL → FLAT → repeat.
    
    CRITICAL POSITION RULES & PROFIT TAKING:
    - If current position is FLAT: You may BUY or HOLD. Do not SELL.
    - If current position is LONG: YOUR PRIMARY GOAL IS TO SECURE PROFIT. 
      - IMPORTANT RULE: Algorand transaction charge is 0.001 ALGO per trade (0.002 ALGO total round-trip).
      - You MUST calculate if the spread covers the transaction charge and secures a mathematical net profit.
      - If net positive after 0.002 ALGO fees, return SELL immediately. Otherwise, HOLD.
    - You MUST alternate: If last action was BUY, you are now LONG. The only logical next execution is SELL.
    - NEVER return BUY if you are already LONG.

    Trust & Transparency Layer:
    Always cite your data source, ALGO price, transaction fee calculations, and show confidence reasoning.
    Example if Selling: "Given the LONG position, the spread from our entry to current ${current_algo_price:.4f} covers the 0.002 ALGO total transaction charge. Initiating SELL to secure net profit."

    Global Macro Context (Source: Yahoo Finance):
    {macro_context}
    
    Market Data:
    Asset: {asset}
    Current Market Price: ${current_algo_price:.4f}
    Market Trend: {market_trend}
    Sentiment: {sentiment}
    Available Balance: {portfolio_balance} ALGO

    CURRENT POSITION STATE: {position_context}
    {entry_context}

    Decision Required: What is the SINGLE best action right now — BUY, SELL, or HOLD?
    Respond ONLY in strictly valid JSON with keys: action, confidence, explanation, financial_grade.
    action: one of BUY, SELL, HOLD — respect your position rules above absolutely.
    confidence: float 0-1.
    explanation: concise professional paragraph with reasoning and sources.
    financial_grade: institutional grade e.g. "AAA (Maximum Conviction)", "BBB (Speculative)", "CCC (High Risk)", "HOLD (Capital Preservation)".
    """
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3]
        elif text.startswith("```"):
            text = text[3:-3]
        result = json.loads(text.strip())
        # Safety override: enforce position rules even if AI ignores them
        if last_action == "BUY" and result.get("action") == "BUY":
            result["action"] = "HOLD"  # Already long, can't buy again
            result["explanation"] = "[Position Guard] Already holding ALGO. Waiting for optimal SELL window. " + result.get("explanation", "")
        if last_action == "SELL" and result.get("action") == "SELL":
            result["action"] = "HOLD"  # Already flat, can't sell
            result["explanation"] = "[Position Guard] Already flat. Looking for BUY entry. " + result.get("explanation", "")
        return result
    except Exception as e:
        return {"action": "HOLD", "confidence": 0.0, "explanation": f"Error: {e}", "financial_grade": "System Error"}

def generate_chat_response(message: str, context: list) -> str:
    if not api_key:
        return "Mock response: Set GEMINI_API_KEY to enable chat."
    
    model = genai.GenerativeModel('gemini-2.5-pro')
    system_prompt = """
    SYSTEM PROMPT:
    You are Algopilot Assistant, an AI trading co-pilot.

    Your responsibilities:
    1. Guide users through the platform clearly and professionally
    2. Explain trading signals with reasoning
    3. Help troubleshoot issues step-by-step
    4. Always maintain a polite, confident, and calm tone

    Rules:
    - Always greet first-time users politely ("Welcome to Trend AI...").
    - Never give vague answers.
    - When providing trading signals or market analysis:
      - Include data sources
      - Include reasoning
      - Include confidence level
    - If unsure, ask clarifying questions instead of guessing.
    - Adapts explanations based on user knowledge level.
    """
    
    history = [{"role": "user", "parts": [system_prompt]}, {"role": "model", "parts": ["Welcome to Trend AI. I am the Algopilot Assistant. I'll help you navigate the platform, understand signals, and manage your trading workflow. What would you like to do today?"]}]
    
    history.extend([{"role": "user" if m['role'] == 'user' else 'model', "parts": [m['content']]} for m in context])
    history.append({"role": "user", "parts": [message]})
    
    try:
        chat = model.start_chat(history=history[:-1])
        response = chat.send_message(history[-1]['parts'][0])
        return response.text
    except Exception as e:
        return f"Error: {e}"
