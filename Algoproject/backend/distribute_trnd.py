import os
from dotenv import load_dotenv
load_dotenv()

from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod

ALGOD_ADDRESS = os.environ.get("ALGOD_URL", "https://testnet-api.algonode.cloud")
ALGOD_TOKEN = os.environ.get("ALGOD_TOKEN", "")
BOT_MNEMONIC = os.environ.get("BOT_MNEMONIC") or os.environ.get("APP_WALLET_MNEMONIC", "")
TRND_ASSET_ID = int(os.environ.get("TRND_ASSET_ID", "758636754"))

algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

def distribute_liquidity():
    if not BOT_MNEMONIC:
        print("ERROR: BOT_MNEMONIC not set in .env")
        return

    # 1. Load Bot/Creator Wallet
    creator_private_key = mnemonic.to_private_key(BOT_MNEMONIC)
    creator_address = account.address_from_private_key(creator_private_key)
    print(f"Creator (Bot) Address: {creator_address}")

    # 2. Generate new Market Liquidity Address
    private_key, liquidity_address = account.generate_account()
    print(f"Generated NEW Market Liquidity Address: {liquidity_address}")

    params = algod_client.suggested_params()

    # 3. Fund the new address with 0.2 ALGO so it can opt-in
    print("\n[1/3] Funding Liquidity Wallet with 0.3 ALGO...")
    fund_txn = transaction.PaymentTxn(
        sender=creator_address,
        sp=params,
        receiver=liquidity_address,
        amt=300_000, # 0.3 ALGO
        note=b"Funding for TRND Market Liquidity Setup"
    )
    signed_fund_txn = fund_txn.sign(creator_private_key)
    tx_id_1 = algod_client.send_transaction(signed_fund_txn)
    transaction.wait_for_confirmation(algod_client, tx_id_1, 4)
    print(f"Funded! TX: {tx_id_1}")

    # 4. Opt-in the Liquidity Wallet to TRND
    print("\n[2/3] Opting Liquidity Wallet into TRND...")
    params = algod_client.suggested_params()
    optin_txn = transaction.AssetTransferTxn(
        sender=liquidity_address,
        sp=params,
        receiver=liquidity_address,
        amt=0,
        index=TRND_ASSET_ID
    )
    signed_optin_txn = optin_txn.sign(private_key)
    tx_id_2 = algod_client.send_transaction(signed_optin_txn)
    transaction.wait_for_confirmation(algod_client, tx_id_2, 4)
    print(f"Opted In! TX: {tx_id_2}")

    # 5. Send 50,000,000 TRND (50% of supply) to Liquidity Wallet
    print("\n[3/3] Transferring 50,000,000 TRND to Liquidity Wallet...")
    params = algod_client.suggested_params()
    transfer_txn = transaction.AssetTransferTxn(
        sender=creator_address,
        sp=params,
        receiver=liquidity_address,
        amt=50_000_000_000_000, # 50 Million * 10^6 decimals
        index=TRND_ASSET_ID,
        note=b"50% Market Liquidity Allocation"
    )
    signed_transfer_txn = transfer_txn.sign(creator_private_key)
    tx_id_3 = algod_client.send_transaction(signed_transfer_txn)
    transaction.wait_for_confirmation(algod_client, tx_id_3, 4)
    print(f"Transferred! TX: {tx_id_3}")

    print(f"\n{'='*60}")
    print(f"  🎉 SUCCESS! 50% OF TRND MOVED TO LIQUIDITY POOL")
    print(f"  Creator Wallet : 50% (50.00M TRND)")
    print(f"  Liquidity Pool : 50% (50.00M TRND)")
    print(f"  Check Pera Explorer: https://testnet.explorer.perawallet.app/asset/{TRND_ASSET_ID}")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    distribute_liquidity()
