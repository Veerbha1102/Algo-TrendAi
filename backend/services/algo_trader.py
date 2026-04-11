from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod
import os

def get_algod_client():
    algod_address = "https://testnet-api.algonode.cloud"
    algod_token = ""
    return algod.AlgodClient(algod_token, algod_address)

def execute_test_trade(sender_mnemonic: str, receiver_address: str, amount_microalgos: int) -> str:
    algod_client = get_algod_client()
    
    # Get private key and address
    private_key = mnemonic.to_private_key(sender_mnemonic)
    sender_address = account.address_from_private_key(private_key)
    
    # Get suggested parameters
    params = algod_client.suggested_params()
    
    # Create the payment transaction
    unsigned_txn = transaction.PaymentTxn(
        sender=sender_address,
        sp=params,
        receiver=receiver_address,
        amt=amount_microalgos,
        note="AlgoPilot AI Test Trade".encode()
    )
    
    # Sign the transaction
    signed_txn = unsigned_txn.sign(private_key)
    
    # Submit the transaction
    txid = algod_client.send_transaction(signed_txn)
    print(f"Successfully sent transaction with txID: {txid}")
    
    return txid
