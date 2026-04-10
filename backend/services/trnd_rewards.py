"""
trnd_rewards.py — TRND Token Reward Engine

After every successful AI trade, this engine:
1. Checks if the user's Pera Wallet has opted in to TRND
2. If opted in → sends TRND tokens as a reward
3. If NOT opted in → skips reward (user must opt in first via the UI)

Reward Schedule:
- BUY executed  → 10 TRND reward
- SELL executed → 25 TRND reward (rewarded more for closing profitable positions)
"""

import os
from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod

ALGOD_ADDRESS = os.environ.get("ALGOD_URL", "https://testnet-api.algonode.cloud")
ALGOD_TOKEN = os.environ.get("ALGOD_TOKEN", "")
BOT_MNEMONIC = os.environ.get("BOT_MNEMONIC") or os.environ.get("APP_WALLET_MNEMONIC", "")
TRND_ASSET_ID = int(os.environ.get("TRND_ASSET_ID", "758636754"))

# Reward amounts in TRND (decimals=6, so multiply by 1_000_000)
REWARD_BUY = 10     # 10 TRND for executing a BUY
REWARD_SELL = 25    # 25 TRND for executing a SELL (closing position)

algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)


def is_opted_in(user_wallet: str) -> bool:
    """Check if the user's wallet has opted in to receive TRND tokens."""
    if not user_wallet or len(user_wallet) != 58:
        return False
    try:
        account_info = algod_client.account_info(user_wallet)
        assets = account_info.get("assets", [])
        return any(a["asset-id"] == TRND_ASSET_ID for a in assets)
    except Exception as e:
        print(f"[TRND] Failed to check opt-in for {user_wallet}: {e}")
        return False


def send_trnd_reward(user_wallet: str, action: str) -> dict:
    """
    Send TRND tokens to the user's Pera Wallet after a successful trade.
    Returns a dict with status and reward tx_id.
    """
    if not user_wallet or not BOT_MNEMONIC:
        return {"status": "skipped", "reason": "No wallet or bot mnemonic"}

    if not is_opted_in(user_wallet):
        print(f"[TRND] {user_wallet} has not opted in to TRND. Reward skipped.")
        return {"status": "not_opted_in", "reason": "User must opt in to TRND first"}

    reward_amount = REWARD_SELL if action == "SELL" else REWARD_BUY
    reward_microunits = reward_amount * 1_000_000  # Convert to base units (decimals=6)

    try:
        bot_pk = mnemonic.to_private_key(BOT_MNEMONIC)
        bot_address = account.address_from_private_key(bot_pk)
        params = algod_client.suggested_params()

        # Check bot's TRND balance
        bot_info = algod_client.account_info(bot_address)
        bot_assets = bot_info.get("assets", [])
        trnd_balance = next(
            (a["amount"] for a in bot_assets if a["asset-id"] == TRND_ASSET_ID), 0
        )

        if trnd_balance < reward_microunits:
            print(f"[TRND] Bot TRND balance too low: {trnd_balance / 1_000_000} TRND")
            return {"status": "insufficient_trnd", "reason": "Bot TRND reserve depleted"}

        # ASA Transfer Transaction
        txn = transaction.AssetTransferTxn(
            sender=bot_address,
            sp=params,
            receiver=user_wallet,
            amt=reward_microunits,
            index=TRND_ASSET_ID,
            note=f"Trend AI TRND Reward: {reward_amount} TRND for {action}".encode()
        )

        signed_txn = txn.sign(bot_pk)
        tx_id = algod_client.send_transaction(signed_txn)
        transaction.wait_for_confirmation(algod_client, tx_id, 4)

        print(f"[TRND] Sent {reward_amount} TRND to {user_wallet} | TX: {tx_id}")
        return {
            "status": "success",
            "tx_id": tx_id,
            "amount_trnd": reward_amount,
            "explorer_url": f"https://testnet.explorer.perawallet.app/tx/{tx_id}"
        }

    except Exception as e:
        print(f"[TRND] Reward failed: {e}")
        return {"status": "failed", "reason": str(e)}
