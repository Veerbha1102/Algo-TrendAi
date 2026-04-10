import os
from dotenv import load_dotenv
load_dotenv()

from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod

ALGOD_ADDRESS = os.environ.get("ALGOD_URL", "https://testnet-api.algonode.cloud")
ALGOD_TOKEN = os.environ.get("ALGOD_TOKEN", "")
BOT_MNEMONIC = os.environ.get("BOT_MNEMONIC") or os.environ.get("APP_WALLET_MNEMONIC", "")
TRND_ASSET_ID = int(os.environ.get("TRND_ASSET_ID", "758636754"))
TARGET_WALLET = "KCBEL22Y5ABYMUIUN4H3Q3ONQWSLHF7PGZUV7ZSZZRHFREIZHOJXTILGBM"

algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

def check_opt_in_and_send():
    print(f"Checking if {TARGET_WALLET} is opted into TRND ({TRND_ASSET_ID})...")
    
    try:
        info = algod_client.account_info(TARGET_WALLET)
        assets = info.get("assets", [])
        opted_in = any(a["asset-id"] == TRND_ASSET_ID for a in assets)
        
        if not opted_in:
            print(f"FAILED: The wallet has NOT opted in to Asset {TRND_ASSET_ID} yet!")
            return False
            
    except Exception as e:
        print(f"Error reading account: {e}")
        return False
        
    print("User HAS opted in! Proceeding with 50,000,000 TRND transfer...")
    
    creator_private_key = mnemonic.to_private_key(BOT_MNEMONIC)
    creator_address = account.address_from_private_key(creator_private_key)
    
    params = algod_client.suggested_params()
    transfer_txn = transaction.AssetTransferTxn(
        sender=creator_address,
        sp=params,
        receiver=TARGET_WALLET,
        amt=50_000_000_000_000, # 50 Million * 10^6
        index=TRND_ASSET_ID,
        note=b"Transfer 50% TRND to Personal Wallet"
    )
    signed_transfer_txn = transfer_txn.sign(creator_private_key)
    tx_id = algod_client.send_transaction(signed_transfer_txn)
    print(f"Transaction sent: {tx_id}")
    transaction.wait_for_confirmation(algod_client, tx_id, 4)
    print(f"SUCCESS! 50 million TRND transferred to {TARGET_WALLET}.")
    return True

if __name__ == "__main__":
    check_opt_in_and_send()
