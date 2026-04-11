from algosdk.v2client import algod
from algosdk import transaction, mnemonic
import os

# 1. Connect to Algorand Testnet via AlgoNode (Free, no API key needed)
ALGOD_ADDRESS = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN = ""
client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

def execute_autonomous_trade(amount_microalgos: int, receiver_address: str):
    print("[SYS] Initiating Autonomous Trade...")
    
    # 2. Load the Bot's Wallet from Environment Variables
    passphrase = os.getenv("BOT_MNEMONIC")
    if not passphrase:
        print("[ERROR] BOT_MNEMONIC environment variable is not set or is empty.")
        return None

    try:
        from algosdk import account
        private_key = mnemonic.to_private_key(passphrase)
        sender_address = account.address_from_private_key(private_key)
    except Exception as e:
        print(f"[ERROR] Invalid mnemonic: {e}")
        return None

    try:
        # 3. Get network parameters
        params = client.suggested_params()
        
        # 4. Create the Transaction (Sending ALGO as a test)
        # Note: 1 ALGO = 1,000,000 microAlgos
        txn = transaction.PaymentTxn(
            sender=sender_address,
            sp=params,
            receiver=receiver_address,
            amt=amount_microalgos,
            note="AlgoPilot AI: Autonomous Execution".encode()
        )

        # 5. Sign the Transaction (Autonomous part - no human clicks needed)
        signed_txn = txn.sign(private_key)

        # 6. Broadcast to the Blockchain
        txid = client.send_transaction(signed_txn)
        print(f"[TX] Transaction broadcasted! ID: {txid}")

        # 7. Wait for confirmation (Usually 2.8 seconds)
        confirmed_txn = transaction.wait_for_confirmation(client, txid, 4)
        print(f"[SUCCESS] Trade Confirmed in block {confirmed_txn['confirmed-round']}")
        
        return f"https://testnet.explorer.perawallet.app/tx/{txid}"

    except Exception as e:
        print(f"[ERROR] Trade failed: {e}")
        return None
