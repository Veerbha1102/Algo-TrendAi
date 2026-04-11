import os
from dotenv import load_dotenv
load_dotenv()

from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod

ALGOD_ADDRESS = os.environ.get("ALGOD_URL", "https://testnet-api.algonode.cloud")
ALGOD_TOKEN = os.environ.get("ALGOD_TOKEN", "")
BOT_MNEMONIC = os.environ.get("BOT_MNEMONIC") or os.environ.get("APP_WALLET_MNEMONIC", "")
TRND_ASSET_ID = int(os.environ.get("TRND_ASSET_ID", "758636754"))
LOST_LIQUIDITY_WALLET = "7ZU7JLIKYYPMYT2TNUNKOG3J7NAKFXZD3LOLE5DP5NG7R7YOZSMHOCSLGE"

algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

def clawback_to_bot():
    creator_private_key = mnemonic.to_private_key(BOT_MNEMONIC)
    creator_address = account.address_from_private_key(creator_private_key)
    print(f"Executing Clawback Power as Creator: {creator_address}")
    
    params = algod_client.suggested_params()
    
    # AssetTransferTxn with revocation_target enables Clawback
    clawback_txn = transaction.AssetTransferTxn(
        sender=creator_address,          # Clawback controller
        sp=params,
        receiver=creator_address,        # We send it back to the bot
        amt=50_000_000_000_000,          # 50 Million * 10^6
        index=TRND_ASSET_ID,
        revocation_target=LOST_LIQUIDITY_WALLET, # Take from here!
        note=b"Emergency Revocation / Reclaim to Treasury"
    )
    
    signed_txn = clawback_txn.sign(creator_private_key)
    tx_id = algod_client.send_transaction(signed_txn)
    
    print(f"Clawback Transaction Sent: {tx_id}")
    transaction.wait_for_confirmation(algod_client, tx_id, 4)
    print(f"SUCCESS! Using protocol Clawback authority, the Bot securely ripped the 50,000,000 TRND out of the void address and returned it to the treasury.")

if __name__ == "__main__":
    clawback_to_bot()
