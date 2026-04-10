from pyteal import *

def approval_program():
    # Simple smart contract enforcing a maximum trade limit of 10%
    # For hackathon demonstration purposes.
    
    # Check if this is an app creation
    on_creation = Seq([
        App.globalPut(Bytes("max_trade_percent"), Int(10)),
        Return(Int(1))
    ])
    
    # Allow simple NoOp calls to simulate a trade check
    # Arguments: 0: "check_trade", 1: trade_amount, 2: total_balance
    is_check_trade = Txn.application_args[0] == Bytes("check_trade")
    trade_amt = Btoi(Txn.application_args[1])
    total_balance = Btoi(Txn.application_args[2])
    
    max_percent = App.globalGet(Bytes("max_trade_percent"))
    max_allowed = (total_balance * max_percent) / Int(100)
    
    check_trade = Seq([
        If(trade_amt <= max_allowed)
        .Then(Return(Int(1)))
        .Else(Return(Int(0))) # Rejected
    ])
    
    program = Cond(
        [Txn.application_id() == Int(0), on_creation],
        [Txn.on_completion() == OnComplete.DeleteApplication, Return(Int(0))], # No deleting
        [Txn.on_completion() == OnComplete.UpdateApplication, Return(Int(0))], # No updating
        [Txn.on_completion() == OnComplete.CloseOut, Return(Int(1))],
        [Txn.on_completion() == OnComplete.OptIn, Return(Int(1))],
        [is_check_trade, check_trade]
    )
    return program

def clear_state_program():
    return Return(Int(1))

if __name__ == "__main__":
    with open("trading_approval.teal", "w") as f:
        compiled = compileTeal(approval_program(), mode=Mode.Application, version=5)
        f.write(compiled)
    
    with open("trading_clear.teal", "w") as f:
        compiled = compileTeal(clear_state_program(), mode=Mode.Application, version=5)
        f.write(compiled)
