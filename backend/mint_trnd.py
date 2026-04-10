"""
mint_trnd.py — Mint the TREND AI Platform Token (TRND) on Algorand Testnet

This creates an Algorand Standard Asset (ASA) — no smart contract needed.
Total supply: 1,00,00,000 (1 Crore) TRND tokens
Decimals: 6 (like ALGO)

After running this script:
- Copy the printed ASSET_ID into your .env as TRND_ASSET_ID=<id>
- The backend reward engine will use this to send TRND to users after successful trades
"""

import os
from dotenv import load_dotenv
load_dotenv()

from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod

ALGOD_ADDRESS = os.environ.get("ALGOD_URL", "https://testnet-api.algonode.cloud")
ALGOD_TOKEN = os.environ.get("ALGOD_TOKEN", "")
BOT_MNEMONIC = os.environ.get("BOT_MNEMONIC") or os.environ.get("APP_WALLET_MNEMONIC", "")

algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

def mint_trnd():
    if not BOT_MNEMONIC:
        print("ERROR: BOT_MNEMONIC not set in .env")
        return

    private_key = mnemonic.to_private_key(BOT_MNEMONIC)
    creator_address = account.address_from_private_key(private_key)
    print(f"Creator (Bot) Address: {creator_address}")

    # Check balance first
    info = algod_client.account_info(creator_address)
    balance_algo = info["amount"] / 1_000_000
    print(f"Bot Balance: {balance_algo} ALGO")

    if balance_algo < 0.2:
        print("ERROR: Bot wallet needs at least 0.2 ALGO to pay ASA creation fee.")
        print(f"Top up at: https://bank.testnet.algorand.network/?account={creator_address}")
        return

    params = algod_client.suggested_params()

    # ASA Creation Transaction
    txn = transaction.AssetConfigTxn(
        sender=creator_address,
        sp=params,
        total=100_000_000_000_000,   # 1 Crore tokens × 10^6 (decimals)
        decimals=6,
        default_frozen=False,
        unit_name="TRND",
        asset_name="Trend AI Token",
        manager=creator_address,     # Can update metadata
        reserve=creator_address,     # Holds uncirculated supply
        freeze=creator_address,      # Can freeze accounts
        clawback=creator_address,    # Can reclaim tokens
        url="https://trendcoin.skillbridgeladder.in",
        note="Trend AI Platform Governance & Reward Token".encode()
    )

    signed_txn = txn.sign(private_key)
    tx_id = algod_client.send_transaction(signed_txn)
    print(f"ASA Creation TX sent: {tx_id}")
    print("Waiting for confirmation (~5 seconds)...")

    confirmed = transaction.wait_for_confirmation(algod_client, tx_id, 6)
    asset_id = confirmed["asset-index"]

    print(f"\n{'='*60}")
    print(f"  ✅ TRND TOKEN MINTED SUCCESSFULLY!")
    print(f"  Asset ID  : {asset_id}")
    print(f"  Name      : Trend AI Token (TRND)")
    print(f"  Supply    : 1,00,00,000 TRND (1 Crore)")
    print(f"  Decimals  : 6")
    print(f"  Network   : Algorand Testnet")
    print(f"  Explorer  : https://testnet.explorer.perawallet.app/asset/{asset_id}")
    print(f"{'='*60}")
    print(f"\nNEXT STEP: Add this to your .env file:")
    print(f"  TRND_ASSET_ID={asset_id}")
    print(f"\nThe reward engine will automatically send TRND to users after every successful AI trade.")
    return asset_id

if __name__ == "__main__":
    mint_trnd()
