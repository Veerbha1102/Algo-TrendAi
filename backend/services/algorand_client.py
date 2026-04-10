from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod
import os

ALGOD_ADDRESS = os.environ.get("ALGOD_URL", "https://testnet-api.algonode.cloud")
ALGOD_TOKEN = os.environ.get("ALGOD_TOKEN", "")

algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

BOT_MNEMONIC = os.environ.get("BOT_MNEMONIC") or os.environ.get("APP_WALLET_MNEMONIC", "")

def get_bot_account():
    """Load the funded bot wallet from env."""
    if not BOT_MNEMONIC:
        raise ValueError("No BOT_MNEMONIC or APP_WALLET_MNEMONIC set in environment.")
    private_key = mnemonic.to_private_key(BOT_MNEMONIC)
    address = account.address_from_private_key(private_key)
    return private_key, address

def execute_trade(action: str, amount_algo: float, receiver_address: str):
    """
    Execute a real on-chain AlgoPilot trade.
    
    BUY  → Bot sends ALGO to receiver (simulates buying power delivered to user wallet)
    SELL → Bot sends ALGO to itself  (simulates sell proceeds collected by platform)
    HOLD → No transaction, returns a mock tx_id
    """
    try:
        if action == "HOLD":
            return {"status": "success", "tx_id": "HOLD_NO_TX", "message": "AI decided to HOLD. No transaction needed."}

        bot_pk, bot_address = get_bot_account()
        params = algod_client.suggested_params()
        amount_microalgo = int(amount_algo * 1_000_000)

        # For BUY: send to the user's linked wallet address
        # For SELL: send back to bot itself (platform collects)
        # Both paths produce a real, signed, confirmed on-chain transaction
        target = receiver_address if action == "BUY" else bot_address

        # Validate receiver is a real Algorand address (not our fake ALGO_ prefix string)
        if not target or target.startswith("ALGO_") or len(target) != 58:
            target = bot_address  # Fallback: send to bot itself as demo

        unsigned_txn = transaction.PaymentTxn(
            sender=bot_address,
            sp=params,
            receiver=target,
            amt=amount_microalgo,
            note=f"AlgoPilot AI Autonomous Trade: {action} {amount_algo} ALGO".encode()
        )

        signed_txn = unsigned_txn.sign(bot_pk)
        tx_id = algod_client.send_transaction(signed_txn)

        # Wait for confirmation (up to 4 rounds ~12 seconds)
        transaction.wait_for_confirmation(algod_client, tx_id, 4)
        
        print(f"[AlgoPilot] {action} trade confirmed. TX: {tx_id}")
        return {"status": "success", "tx_id": tx_id, "message": f"{action} trade confirmed on Algorand Testnet."}

    except Exception as e:
        print(f"[AlgoPilot] Trade failed: {e}")
        return {"status": "failed", "tx_id": None, "message": str(e)}

def get_balance(address: str):
    try:
        account_info = algod_client.account_info(address)
        return account_info.get('amount', 0) / 1_000_000
    except Exception:
        return 0.0
