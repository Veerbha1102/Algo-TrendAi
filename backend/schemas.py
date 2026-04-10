from pydantic import BaseModel
from typing import Optional, List, Dict

class TradeRequest(BaseModel):
    wallet_address: str
    action: str
    amount: float
    asset_id: int = 0

class ChatRequest(BaseModel):
    message: str
    context: List[Dict[str, str]] = []

class AIDecisionRequest(BaseModel):
    wallet_address: str
    balance: float

class AIDecisionResponse(BaseModel):
    action: str
    confidence: float
    explanation: str

class TradeResponse(BaseModel):
    status: str
    tx_id: Optional[str] = None
    message: str

class ChatResponse(BaseModel):
    response: str
