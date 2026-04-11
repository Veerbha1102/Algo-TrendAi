from pydantic import BaseModel
from typing import Optional, List, Dict

class TradeRequest(BaseModel):
    wallet_address: str
    action: str
    amount: float
    asset_id: int = 0
    user_email: str = ""
    user_id: str = ""              # Firebase UID for ledger attribution
    ai_confidence: float = 0.0    # AI signal confidence for audit trail
    ai_grade: str = ""            # AI financial grade for audit trail
    ai_explanation: str = ""      # AI reasoning for audit trail

class ChatRequest(BaseModel):
    message: str
    context: List[Dict[str, str]] = []

class AIDecisionRequest(BaseModel):
    wallet_address: str
    balance: float
    asset: str = "ALGOUSD"
    last_action: Optional[str] = None           # e.g. "BUY", "SELL", None
    last_trade_age_minutes: Optional[int] = None # how many minutes ago the last trade was

class AIDecisionResponse(BaseModel):
    action: str
    confidence: float
    explanation: str
    financial_grade: str

class TradeResponse(BaseModel):
    status: str
    tx_id: Optional[str] = None
    message: str
    real_balance: Optional[float] = None  # Actual on-chain ALGO balance after trade

class ChatResponse(BaseModel):
    response: str
