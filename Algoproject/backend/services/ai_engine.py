import os
import google.generativeai as genai
import json
import yfinance as yf
import pandas as pd

# ─── Pure-pandas Technical Indicator helpers (no pandas-ta / numba required) ───

def _calc_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Wilder's RSI using exponential moving average of gains/losses."""
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(com=period - 1, min_periods=period).mean()
    avg_loss = loss.ewm(com=period - 1, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, float('inf'))
    return 100 - (100 / (1 + rs))

def _calc_ema(series: pd.Series, span: int) -> pd.Series:
    return series.ewm(span=span, adjust=False).mean()

def _calc_macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    ema_fast = _calc_ema(series, fast)
    ema_slow = _calc_ema(series, slow)
    macd_line = ema_fast - ema_slow
    signal_line = _calc_ema(macd_line, signal)
    return macd_line, signal_line

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

    # Fetch live ALGO-USD price and 15-minute historical data for Technical Analysis
    try:
        algo_ticker = yf.Ticker("ALGO-USD")
        algo_data = algo_ticker.history(period="5d", interval="15m")
        if not algo_data.empty and len(algo_data) > 30:
            algo_data.dropna(inplace=True)
            close = algo_data['Close']

            # Calculate Indicators using pure pandas helpers
            rsi_series  = _calc_rsi(close, 14)
            ema9_series  = _calc_ema(close, 9)
            ema21_series = _calc_ema(close, 21)
            macd_series, signal_series = _calc_macd(close, 12, 26, 9)

            rsi_14     = rsi_series.iloc[-1]
            ema_9      = ema9_series.iloc[-1]
            ema_21     = ema21_series.iloc[-1]
            macd       = macd_series.iloc[-1]
            macd_signal = signal_series.iloc[-1]
            current_algo_price = float(close.iloc[-1])

            rsi_14_str     = f"{rsi_14:.2f}"     if pd.notna(rsi_14)     else 'N/A'
            ema_9_str      = f"${ema_9:.4f}"    if pd.notna(ema_9)      else 'N/A'
            ema_21_str     = f"${ema_21:.4f}"   if pd.notna(ema_21)     else 'N/A'
            macd_str       = f"{macd:.6f}"      if pd.notna(macd)       else 'N/A'
            macd_sig_str   = f"{macd_signal:.6f}" if pd.notna(macd_signal) else 'N/A'

            # EMA cross signal
            ema_cross = "EMA9 ABOVE EMA21 (Bullish)" if ema_9 > ema_21 else "EMA9 BELOW EMA21 (Bearish)"
            macd_cross = "MACD ABOVE Signal (Bullish)" if macd > macd_signal else "MACD BELOW Signal (Bearish)"

            ta_context = f"""
    --- REAL-TIME TECHNICAL INDICATORS (ALGO-USD, 15m Interval, Pure Pandas) ---
    RSI (14): {rsi_14_str} (Above 70=Overbought, Below 30=Oversold, 30-70=Neutral)
    EMA 9: {ema_9_str}
    EMA 21: {ema_21_str}
    EMA Cross: {ema_cross}
    MACD Line: {macd_str} | Signal Line: {macd_sig_str}
    MACD Cross: {macd_cross}
    Current ALGO Price: ${current_algo_price:.4f}
            """
        else:
            current_algo_price = float(algo_data['Close'].iloc[-1]) if not algo_data.empty else 0.20
            ta_context = "--- TECHNICAL INDICATORS UNAVAILABLE (insufficient data) ---"
    except Exception as e:
        print(f"Error fetching TA: {e}")
        current_algo_price = 0.20
        ta_context = "--- TECHNICAL INDICATORS UNAVAILABLE ---"


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

    TRUST & TRANSPARENCY LAYER:
    Always cite your data source, ALGO price, transaction fee calculations, AND specifically mention the Technical Indicators provided below to justify your decision.
    Example if buying: "RSI is heavily oversold at 28.5 leaving room to bounce. MACD crossed signal line. Initiating BUY."
    Example if selling: "Given LONG position, current price covers 0.002 fees for net profit. RSI is 68 indicating nearing overbought volume. Initiating SELL."

    Global Macro Context (Source: Yahoo Finance):
    {macro_context}
    
    {ta_context}
    
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
    explanation: concise professional paragraph explaining exactly WHY this trade is occurring, relying heavily on the Technical Indicators provided and mathematical profit taking.
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
    You are Algopilot Assistant, an AI trading co-pilot for the Trend AI platform on Algorand.

    FORMATTING RULES (CRITICAL):
    - Do NOT use markdown formatting of any kind: no **, no *, no ##, no ---, no bullet lists with asterisks.
    - Write in clean, flowing prose with numbered points if needed (e.g., "1. First..." "2. Second...").
    - Use plain text only. Structure responses with clear paragraph breaks instead of markdown.

    Your responsibilities:
    1. Guide users through the platform clearly and professionally
    2. Explain trading signals with reasoning
    3. Help troubleshoot issues step-by-step
    4. Always maintain a polite, confident, and calm tone

    Rules:
    - Always greet first-time users politely.
    - Never give vague answers.
    - When providing trading signals or market analysis, include data sources, reasoning, and confidence level.
    - If unsure, ask clarifying questions instead of guessing.
    - Adapt explanations based on user knowledge level.
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
