import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import api
import firebase_admin
from firebase_admin import credentials, firestore
import os
from apscheduler.schedulers.background import BackgroundScheduler
from services.notifier import send_custom_email

# Initialize Firebase Admin
cert_path = os.environ.get("FIREBASE_ADMIN_CERT")
if cert_path and os.path.exists(cert_path):
    cred = credentials.Certificate(cert_path)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
else:
    print(f"WARNING: Firebase admin key not found at {cert_path}")

db = None
if firebase_admin._apps:
    db = firestore.client()

app = FastAPI(title="AlgoPilot AI", version="1.0.0")

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
            send_custom_email(email, "Your AlgoPilot Daily Summary", html)

scheduler = BackgroundScheduler()
# Run at 23:59 every day
scheduler.add_job(eod_portfolio_summary, 'cron', hour=23, minute=59)
scheduler.start()

@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api.router, prefix="/api")

@app.get("/")
def read_root():
    return {"status": "AlgoPilot API Running"}
