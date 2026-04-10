from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod
import os

ALGOD_ADDRESS = os.environ.get("ALGOD_URL", "https://mainnet-api.algonode.cloud")
ALGOD_TOKEN = os.environ.get("ALGOD_TOKEN", "")

# Initialize client
algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

# Use env wallet for demo if real execution initiated
# In a real app, users sign via WalletConnect, but for this SaaS prototype:
APP_WALLET_MNEMONIC = os.environ.get("APP_WALLET_MNEMONIC", "")

def get_platform_account():
    if APP_WALLET_MNEMONIC:
        private_key = mnemonic.to_private_key(APP_WALLET_MNEMONIC)
        address = account.address_from_private_key(private_key)
        return private_key, address
    else:
        # Generate a temporary account for sandbox testing
        private_key, address = account.generate_account()
        return private_key, address

platform_pk, platform_address = get_platform_account()

def execute_trade(action: str, amount_algo: float, receiver_address: str = platform_address):
    try:
        params = algod_client.suggested_params()
        
        # Simplistic example: Since it's a demo, we simulate a 'BUY' by sending ALGO
        # If no real mnemonic with funds, this will fail elegantly.
        # But we ensure we return a tx_id if successful.
        amount_microalgo = int(amount_algo * 1_000_000)
        
        # Example transaction (sending to self or acting as a platform fee/trade proxy)
        unsigned_txn = transaction.PaymentTxn(
            sender=platform_address,
            sp=params,
            receiver=receiver_address,
            amt=amount_microalgo,
            note=f"AlgoPilot Trade: {action}".encode()
        )
        
        signed_txn = unsigned_txn.sign(platform_pk)
        tx_id = algod_client.send_transaction(signed_txn)
        return {"status": "success", "tx_id": tx_id, "message": "Transaction submitted."}
    except Exception as e:
        return {"status": "failed", "tx_id": None, "message": str(e)}

def get_balance(address: str):
    try:
        account_info = algod_client.account_info(address)
        return account_info.get('amount', 0) / 1_000_000
    except Exception:
        return 0.0
