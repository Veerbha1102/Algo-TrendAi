import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import api
from services.algo_trader import execute_test_trade
from pydantic import BaseModel
import firebase_admin
from firebase_admin import credentials, firestore
import os
from apscheduler.schedulers.background import BackgroundScheduler
from services.notifier import send_custom_email

# Initialize Firebase Admin — try multiple locations for the service account key
_BASE = os.path.dirname(os.path.abspath(__file__))
_CERT_CANDIDATES = [
    os.environ.get("FIREBASE_ADMIN_CERT", ""),            # env var (any path)
    os.path.join(_BASE, "algopilot-3940a-firebase-adminsdk-fbsvc-ec99f2a8fe.json"),  # backend dir
    os.path.join(_BASE, "..", "algopilot-3940a-firebase-adminsdk-fbsvc-ec99f2a8fe.json"),  # project root
    os.path.join(_BASE, "firebase-service-account.json"),  # generic name in backend
]

_cert_path_found = None
for candidate in _CERT_CANDIDATES:
    if candidate and os.path.exists(candidate):
        _cert_path_found = candidate
        break

if _cert_path_found:
    try:
        cred = credentials.Certificate(_cert_path_found)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        print(f"[Firebase] Admin initialized from: {_cert_path_found}")
    except Exception as e:
        print(f"[Firebase] Init failed: {e}")
else:
    print("[Firebase] WARNING: No service account JSON found. Firestore logging disabled.")
    print("  -> Place algopilot-3940a-firebase-adminsdk-fbsvc-ec99f2a8fe.json in the backend folder.")
    print("  -> Or set FIREBASE_ADMIN_CERT=/correct/path/to/key.json in .env")

db = None
if firebase_admin._apps:
    db = firestore.client()

app = FastAPI(title="Trend AI", version="1.0.0")

def eod_portfolio_summary():
    if not db:
        return
    print("Running EOD Portfolio Summary CRON JOB...")
    users = db.collection("portfolios").stream()
    for user in users:
        data = user.to_dict()
        email = data.get("email") # Assuming frontend saved email
        balance = data.get("balance", 0)
        if email:
            html = f"""
            <div style="font-family: system-ui, sans-serif; background-color: #101419; color: #e0e2ea; padding: 40px; border-radius: 12px;">
                <h2 style="color: #b8c3ff;">EOD Portfolio Summary</h2>
                <h1 style="font-size: 32px; color: #4edea3;">${balance}</h1>
                <p>System algorithms have completed the daily review. All constraints valid.</p>
            </div>
            """
            send_custom_email(email, "Your Trend AI Daily Summary", html)

scheduler = BackgroundScheduler()
# Run at 23:59 every day
scheduler.add_job(eod_portfolio_summary, 'cron', hour=23, minute=59)
scheduler.start()

@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api.router, prefix="/api")

@app.get("/api/wallet")
def get_wallet_address():
    """Returns the bot's real Algorand address so the frontend can use it."""
    from services.algorand_client import get_bot_account
    try:
        _, address = get_bot_account()
        return {"address": address}
    except Exception as e:
        return {"address": "", "error": str(e)}


class TestTradeRequest(BaseModel):
    sender_mnemonic: str
    receiver_address: str
    amount_microalgos: int

@app.post("/api/test-trade")
def test_trade(request: TestTradeRequest):
    try:
        txid = execute_test_trade(
            request.sender_mnemonic, 
            request.receiver_address, 
            request.amount_microalgos
        )
        return {"status": "success", "txid": txid}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/")
def read_root():
    return {"status": "Trend AI API Running"}
