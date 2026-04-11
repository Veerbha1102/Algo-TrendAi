from dotenv import load_dotenv
load_dotenv()  # Load BOT_MNEMONIC and other vars from .env

import algo_trader
result = algo_trader.execute_autonomous_trade(100000, 'JG7YOPL4UFV7ACQXAQACH7NVD6ZH6VYN7QTFXMCBSV5TCFR6QK5YPUW6KQ')
print("Explorer URL:", result)
