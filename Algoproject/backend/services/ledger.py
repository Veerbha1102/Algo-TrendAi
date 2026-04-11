"""
ledger.py — Comprehensive Firestore Transaction Ledger

Saves EVERY trade detail to Firebase with full audit trail:
- On-chain TX ID (verifiable on Algorand Explorer)
- AI decision details (action, confidence, grade, explanation)
- Balance before and after trade
- User wallet, asset, amount
- Timestamp (server-side)
- Network confirmation status
"""

import datetime
from typing import Optional


def save_transaction(
    db,
    user_id: str,
    action: str,
    amount_algo: float,
    tx_id: str,
    balance_before: float,
    balance_after: float,
    ai_confidence: float = 0.0,
    ai_grade: str = "",
    ai_explanation: str = "",
    asset: str = "ALGO/USD",
    wallet_address: str = "",
    network: str = "Algorand Testnet",
    user_email: str = ""
) -> str:
    """
    Write a full audit-grade transaction record to Firestore.
    Returns the Firestore document ID.
    """
    if not db:
        print("[Ledger] Firebase not initialized — skipping save.")
        return ""

    record = {
        # Core trade data
        "action": action,
        "amount_algo": amount_algo,
        "asset": asset,
        "tx_id": tx_id,
        "network": network,
        "explorer_url": f"https://testnet.explorer.perawallet.app/tx/{tx_id}",

        # Balance snapshot
        "balance_before": balance_before,
        "balance_after": balance_after,
        "pnl": round(balance_after - balance_before, 6),

        # AI decision metadata
        "ai_confidence": ai_confidence,
        "ai_financial_grade": ai_grade,
        "ai_explanation": ai_explanation,

        # User context
        "user_id": user_id,
        "user_email": user_email,
        "wallet_address": wallet_address,

        # Timestamps
        "timestamp": datetime.datetime.utcnow(),
        "timestamp_iso": datetime.datetime.utcnow().isoformat(),
        "status": "confirmed"
    }

    try:
        # Save to user's personal trade ledger
        user_ref = db.collection("portfolios").document(user_id).collection("trades").add(record)
        
        # Also save to global transaction log (for analytics/admin view)
        db.collection("global_transactions").add(record)

        print(f"[Ledger] Saved {action} trade | TX: {tx_id} | User: {user_id}")
        return user_ref[1].id
    except Exception as e:
        print(f"[Ledger] Failed to save transaction: {e}")
        return ""


def update_portfolio_balance(db, user_id: str, real_balance: float, last_action: str, tx_id: str):
    """
    Update the portfolio document with the real on-chain balance.
    This ensures the frontend always shows accurate ALGO holdings.
    """
    if not db:
        return
    try:
        db.collection("portfolios").document(user_id).update({
            "balance": real_balance,
            "last_trade_action": last_action,
            "last_tx_id": tx_id,
            "last_updated": datetime.datetime.utcnow(),
            "balance_synced_from_chain": True
        })
        print(f"[Ledger] Portfolio balance synced: {real_balance} ALGO")
    except Exception as e:
        print(f"[Ledger] Portfolio update failed: {e}")
