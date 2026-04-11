<div align="center">

<img src="Algoproject/frontend/public/favicon.png" alt="AlgoPilot Logo" width="80" />

# AlgoPilot — Trend AI
### Autonomous AI Trading Platform on Algorand

[![Algorand](https://img.shields.io/badge/Blockchain-Algorand-00D4AA?style=for-the-badge)](https://algorand.com)
[![AlgoKit](https://img.shields.io/badge/SDK-AlgoKit-2D5BFF?style=for-the-badge)](https://developer.algorand.org/algokit)
[![Gemini](https://img.shields.io/badge/AI-Gemini%202.5%20Pro-4285F4?style=for-the-badge)](https://ai.google.dev)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015-black?style=for-the-badge)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge)](https://fastapi.tiangolo.com)

**🔗 GitHub:** [github.com/Veerbha1102/Algo-TrendAi](https://github.com/Veerbha1102/Algo-TrendAi)

**🎥 Demo Video:** *[Upload your 4-minute demo here and paste the link]*

</div>

---

## 📌 Project Overview

**AlgoPilot** is a fully autonomous AI-powered cryptocurrency trading platform built natively on **Algorand**. Every 15 minutes, the platform's AI engine — powered by **Google Gemini 2.5 Pro** — analyzes live technical indicators (RSI, EMA, MACD) and global macro data, then autonomously signs and broadcasts real **PaymentTxn** transactions on the Algorand Testnet.

This is not a simulation. Every trade produces a real, verifiable **Algorand Transaction ID** linked to the Pera Wallet Explorer. Users are rewarded with **TRND** — a custom Algorand Standard Asset (ASA) — after every completed trade.

---

## 🔗 Blockchain Details

| Property | Value |
|---|---|
| **Network** | Algorand Testnet |
| **TRND Token Asset ID** | [`758636754`](https://testnet.explorer.perawallet.app/asset/758636754) |
| **Bot Wallet Address** | `JG7YOPL4UFV7ACQXAQACH7NVD6ZH6VYN7QTFXMCBSV5TCFR6QK5YPUW6KQ` |
| **Explorer** | [testnet.explorer.perawallet.app](https://testnet.explorer.perawallet.app/address/JG7YOPL4UFV7ACQXAQACH7NVD6ZH6VYN7QTFXMCBSV5TCFR6QK5YPUW6KQ) |
| **Algorand SDK** | `algosdk` (Python backend) + `@algorandfoundation/algokit-utils` (Next.js) |
| **Transaction Type** | `PaymentTxn` (trades) + `AssetTransferTxn` (TRND rewards) |

> No smart contract App ID — AlgoPilot uses native Algorand **Layer-1 transactions** (PaymentTxn + ASA transfers). The TRND token (ASA #758636754) is the on-chain asset.

---

## ✨ Key Features

- 🤖 **Autonomous AI Trading** — Gemini 2.5 Pro makes BUY/SELL/HOLD decisions every 15 minutes based on real quantitative data
- 📊 **Live Technical Analysis** — RSI(14), EMA(9/21), MACD(12,26,9) computed in real-time on ALGO-USD 15m bars
- ⛓️ **Real On-Chain Execution** — Every decision fires a signed `PaymentTxn` on Algorand Testnet
- 🪙 **TRND Reward Token** — Users earn TRND (ASA #758636754) after every trade via `AssetTransferTxn`
- 🔍 **AlgoKit Chain Health Monitor** — Live on-chain analytics using `AlgorandClient.testNet()` from `@algorandfoundation/algokit-utils`
- 💼 **Pera Wallet Integration** — Users connect real Algorand wallets to receive BUY proceeds and TRND rewards
- 🧠 **AI Brain Log** — Full audit trail of every AI decision with explanation, confidence score, and Algorand TX link
- 🔥 **Firebase Audit Ledger** — Immutable Firestore record of every trade with AI reasoning persisted permanently
- 📧 **Trade Notifications** — Email + FCM push alerts on every confirmed trade

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│   Next.js 15    │◄────►   Python FastAPI      │────►│  Algorand Testnet    │
│   (Vercel)      │     │   (Render)            │     │  (Algonode)          │
│                 │     │                       │     │                      │
│ • Dashboard UI  │     │ • Gemini AI Engine    │     │ • PaymentTxn (trade) │
│ • Chain Health  │     │ • algosdk execution   │     │ • AssetTransferTxn   │
│ • AI Brain Log  │     │ • TRND reward engine  │     │ • TRND ASA #758636754│
│ • Pera Wallet   │     │ • Firebase ledger     │     └──────────────────────┘
└─────────────────┘     └──────────────────────┘
         │                        │
         └────────────────────────┘
                     │
              ┌──────▼──────┐
              │   Firebase   │
              │  (Google)    │
              │ Firestore    │
              │ Auth + FCM   │
              └─────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, TypeScript, Recharts |
| **Backend** | Python 3.11, FastAPI, APScheduler |
| **AI Engine** | Google Gemini 2.5 Pro |
| **Blockchain** | Algorand Testnet (algosdk, AlgoKit) |
| **Database** | Firebase Firestore |
| **Auth** | Firebase Google OAuth |
| **Wallet** | Pera Wallet Connect |
| **Market Data** | Yahoo Finance (yfinance) |
| **Notifications** | Firebase FCM + Email |

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js 18+
- Python 3.11 (not 3.14 — some deps require 3.11)
- A funded Algorand Testnet wallet ([use Algorand Testnet Dispenser](https://bank.testnet.algorand.network))
- A Gemini API key from [Google AI Studio](https://aistudio.google.com)
- A Firebase project with Firestore + Auth enabled

---

### 1. Clone the Repository

```bash
git clone https://github.com/Veerbha1102/Algo-TrendAi.git
cd Algo-TrendAi
```

---

### 2. Set Up the Backend

```bash
cd Algoproject/backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in `Algoproject/backend/`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
BOT_MNEMONIC=word1 word2 word3 ... word25
TRND_ASSET_ID=758636754
ALGOD_URL=https://testnet-api.algonode.cloud
ALGOD_TOKEN=
FIREBASE_ADMIN_CERT=/path/to/your/firebase-service-account.json
```

Place your Firebase Admin SDK JSON file in the backend folder and set the path above.

Start the backend:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

✅ Test: Open [http://localhost:8000](http://localhost:8000) — you should see `{"status": "Trend AI API Running"}`

---

### 3. Set Up the Frontend

```bash
cd Algoproject/frontend

# Install dependencies
npm install
```

Create a `.env.local` file in `Algoproject/frontend/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000

NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key_from_firebase_console
```

Start the frontend:

```bash
npm run dev
```

✅ Open [http://localhost:3000](http://localhost:3000)

---

### 4. Run Both Together (Windows)

```bash
cd Algoproject
start.bat
```

---

### 5. Enable Autonomous Trading

1. Log in with Google
2. Navigate to the **Signals** view
3. Toggle **AI Autopilot ON**
4. The AI will analyze markets and execute trades every 15 minutes
5. Check the **Portfolio → Chain Health Monitor** to see live Algorand on-chain data
6. Check the **AI Brain Log** to see every decision with its reasoning and TX link

---

## 📁 Project Structure

```
Algo-TrendAi/
├── Algoproject/
│   ├── backend/
│   │   ├── main.py                   # FastAPI app + APScheduler
│   │   ├── requirements.txt
│   │   ├── services/
│   │   │   ├── ai_engine.py          # Gemini 2.5 Pro + RSI/EMA/MACD
│   │   │   ├── algorand_client.py    # algosdk PaymentTxn execution
│   │   │   ├── trnd_rewards.py       # TRND ASA reward engine
│   │   │   ├── ledger.py             # Firestore audit logger
│   │   │   └── notifier.py           # Email alerts
│   │   └── routes/api.py             # REST endpoints
│   │
│   └── frontend/
│       ├── app/
│       │   ├── page.tsx              # Main dashboard
│       │   └── api/chain-health/     # AlgoKit Chain Health API route
│       └── components/
│           ├── TradeSignals.tsx      # Autonomous trading engine
│           ├── ChainHealthPanel.tsx  # AlgoKit live monitor
│           ├── ChatPanel.tsx         # Gemini chat assistant
│           └── WalletConnect.tsx     # Pera Wallet integration
```

---

## 🌐 Deploy to Production

| Service | Platform | Guide |
|---|---|---|
| **Backend** | [Render](https://render.com) | Root dir: `Algoproject/backend`, Start: `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Frontend** | [Vercel](https://vercel.com) | Root dir: `Algoproject/frontend`, Framework: Next.js |

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full step-by-step instructions.

---

## 🏆 Built For

**Algorand Foundation Hackathon 2025**

AlgoPilot demonstrates how the Algorand blockchain's speed (4-second finality), low fees (0.001 ALGO/tx), and ASA standard enable a production-grade autonomous trading platform that is transparent, auditable, and aligned with user incentives through on-chain token rewards.

---

<div align="center">

*Every trade is real. Every decision is transparent. Every reward is on-chain.*

**[View Live Transactions on Pera Explorer →](https://testnet.explorer.perawallet.app/address/JG7YOPL4UFV7ACQXAQACH7NVD6ZH6VYN7QTFXMCBSV5TCFR6QK5YPUW6KQ)**

</div>
