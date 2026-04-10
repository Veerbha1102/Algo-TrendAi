import os
import google.generativeai as genai
import json

# Configure Gemini
api_key = os.environ.get("GEMINI_API_KEY", "")
if api_key:
    genai.configure(api_key=api_key)

def get_ai_decision(market_trend: str, sentiment: str, portfolio_balance: float) -> dict:
    if not api_key:
        return {"action": "HOLD", "confidence": 0.5, "explanation": "Mock decision due to missing GEMINI_API_KEY"}
    
    model = genai.GenerativeModel('gemini-2.5-pro')
    prompt = f"""
    You are an AI trading bot. Make a single trading decision.
    Market Trend: {market_trend}
    Sentiment: {sentiment}
    Portfolio Balance: {portfolio_balance} ALGO

    Respond ONLY in strictly valid JSON format with keys: action, confidence, explanation.
    action must be one of: BUY, SELL, HOLD.
    confidence must be a float between 0 and 1.
    """
    try:
        response = model.generate_content(prompt)
        # Clean response potentially containing markdown formatting
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3]
        elif text.startswith("```"):
            text = text[3:-3]
        return json.loads(text.strip())
    except Exception as e:
        return {"action": "HOLD", "confidence": 0.0, "explanation": f"Error: {e}"}

def generate_chat_response(message: str, context: list) -> str:
    if not api_key:
        return "Mock response: Set GEMINI_API_KEY to enable chat."
    
    model = genai.GenerativeModel('gemini-2.5-pro')
    system_prompt = "You are a professional, polite, and highly analytical Quantitative Architect assistant representing AlgoPilot. You greet the user warmly and advise them thoughtfully like a real high-end wealth manager."
    
    history = [{"role": "user", "parts": [system_prompt]}, {"role": "model", "parts": ["Understood. I am your Quantitative Architect. How can I assist you today?"]}]
    
    history.extend([{"role": "user" if m['role'] == 'user' else 'model', "parts": [m['content']]} for m in context])
    history.append({"role": "user", "parts": [message]})
    
    try:
        chat = model.start_chat(history=history[:-1])
        response = chat.send_message(history[-1]['parts'][0])
        return response.text
    except Exception as e:
        return f"Error: {e}"
