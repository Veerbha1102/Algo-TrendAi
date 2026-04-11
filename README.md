<div align="center">

<br/>

# 🤖 AlgoPilot — Trend AI
### Autonomous AI Trading Terminal on Algorand

<br/>

[![Algorand](https://img.shields.io/badge/Blockchain-Algorand%20Testnet-00D4AA?style=for-the-badge&logo=algorand)](https://algorand.com)
[![AlgoKit](https://img.shields.io/badge/SDK-AlgoKit%20Utils-2D5BFF?style=for-the-badge)](https://developer.algorand.org/algokit)
[![Gemini](https://img.shields.io/badge/AI-Gemini%202.5%20Pro-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![Firebase](https://img.shields.io/badge/Database-Firebase-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com)

<br/>

| 🔗 GitHub | 🎥 Demo Video | 🔑 TRND Asset ID | 🌐 Network |
|:---:|:---:|:---:|:---:|
| [Veerbha1102/Algo-TrendAi](https://github.com/Veerbha1102/Algo-TrendAi) | [Watch Demo ▶️](#) | [`758636754`](https://testnet.explorer.perawallet.app/asset/758636754) | Algorand Testnet |

</div>

---

## 📌 Short Description

**AlgoPilot** is a fully autonomous AI-powered cryptocurrency trading platform built natively on the **Algorand blockchain**. Every 15 minutes, the platform's AI brain — powered by **Google Gemini 2.5 Pro** — analyzes real-time technical indicators (RSI, EMA, MACD) and global macro data, then **autonomously signs and broadcasts real transactions on Algorand Testnet**. Users earn **TRND**, a custom Algorand Standard Asset (ASA #758636754), as a reward after every completed trade. Every decision is transparent, every transaction is on-chain, and every AI reasoning is permanently logged to Firebase for full auditability.

---

## 🔗 On-Chain Identifiers

> AlgoPilot uses **native Algorand Layer-1 transactions** (PaymentTxn + AssetTransferTxn) rather than a traditional AVM smart contract. The primary on-chain artifact is the TRND token.

| Field | Value | Link |
|---|---|---|
| **TRND Token — ASA / App ID** | `758636754` | [View on Pera Explorer](https://testnet.explorer.perawallet.app/asset/758636754) |
| **Bot Wallet Address** | `JG7YOPL4UFV7ACQXAQACH7NVD6ZH6VYN7QTFXMCBSV5TCFR6QK5YPUW6KQ` | [View on Explorer](https://testnet.explorer.perawallet.app/address/JG7YOPL4UFV7ACQXAQACH7NVD6ZH6VYN7QTFXMCBSV5TCFR6QK5YPUW6KQ) |
| **Transaction Type** | `PaymentTxn` (BUY/SELL) + `AssetTransferTxn` (TRND rewards) | Algorand Testnet |
| **Network** | Algorand Testnet via Algonode | `https://testnet-api.algonode.cloud` |
| **GitHub Repository** | Public | [github.com/Veerbha1102/Algo-TrendAi](https://github.com/Veerbha1102/Algo-TrendAi) |
| **Demo Video** | 4-minute walkthrough | [Link to be added] |

---

## ✨ What Makes AlgoPilot Unique

- **Real trades, not simulations** — Every BUY/SELL decision fires a signed `PaymentTxn` on Algorand. You can verify any trade by pasting the TX ID into Pera Explorer.
- **Fee-aware AI** — The Gemini prompt explicitly includes Algorand's 0.001 ALGO fee. The AI only executes a SELL if the spread mathematically covers the 0.002 ALGO round-trip fee and produces net profit.
- **TRND is a real ASA** — Asset ID `758636754` exists on Algorand Testnet. After every trade, an `AssetTransferTxn` sends real TRND tokens to the user's Pera Wallet.
- **AlgoKit integration** — The Chain Health Monitor uses `@algorandfoundation/algokit-utils` (`AlgorandClient.testNet()`) to display live on-chain analytics every 30 seconds.
- **Full auditability** — Every AI decision (explanation, confidence, grade) is stored alongside the Algorand TX ID in Firebase. Tap any TX ID in the AI Brain Log to open it in Pera Explorer.

---

## 🏗️ Architecture

```
┌──────────────────┐       ┌─────────────────────────┐       ┌───────────────────────┐
│   Next.js 15     │       │   Python FastAPI         │       │   Algorand Testnet    │
│   (Vercel)       │◄─────►│   (Render / Docker)      │──────►│   (Algonode)          │
│                  │       │                          │       │                       │
│ • Dashboard UI   │       │ • Gemini 2.5 Pro AI      │       │ • PaymentTxn (trades) │
│ • Chain Health   │       │ • algosdk execution      │       │ • AssetTransferTxn    │
│   (AlgoKit)      │       │ • RSI/EMA/MACD engine    │       │ • TRND ASA #758636754 │
│ • AI Brain Log   │       │ • TRND reward engine     │       │ • Block height: live  │
│ • Pera Wallet    │       │ • Firebase ledger writer  │       └───────────────────────┘
│ • Chat AI        │       │ • APScheduler (15min)    │
└──────────────────┘       └─────────────────────────┘
         │                            │
         └────────────────────────────┘
                      │
              ┌───────▼────────┐
              │   Firebase     │
              │   Firestore    │  ← Immutable audit trail of every trade
              │   Auth + FCM   │  ← Google OAuth + push notifications
              └────────────────┘
```

---

## 🛠️ Full Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 15, TypeScript | Dashboard, API routes |
| **Backend** | Python 3.11, FastAPI | REST API, trade engine |
| **AI** | Google Gemini 2.5 Pro | Trading decisions + chat |
| **Blockchain** | Algorand Testnet | Real transaction execution |
| **Algorand SDK (Python)** | `algosdk` | PaymentTxn & AssetTransferTxn signing |
| **Algorand SDK (JS)** | `@algorandfoundation/algokit-utils` | Chain Health Monitor |
| **Market Data** | `yfinance` (Yahoo Finance) | ALGO-USD price + NIFTY 50 macro |
| **Technical Analysis** | Pure `pandas` | RSI, EMA, MACD (no C extensions) |
| **Database** | Firebase Firestore | Immutable trade audit ledger |
| **Auth** | Firebase Google Auth | User identity |
| **Wallet** | Pera Wallet Connect | User wallet for TRND rewards |
| **Notifications** | Firebase FCM + Email | Trade alerts |
| **Scheduler** | APScheduler | Autonomous 15-min trading loop |

---

## 🚀 How to Run Locally

### Prerequisites
- **Node.js** 18+ ([download](https://nodejs.org))
- **Python** 3.11 ([download](https://python.org/downloads))
- **Git** ([download](https://git-scm.com))
- A **Gemini API Key** from [Google AI Studio](https://aistudio.google.com) (free)
- A **Firebase project** with Firestore + Google Auth enabled ([guide](https://firebase.google.com/docs/web/setup))
- A funded **Algorand Testnet wallet** mnemonic — use the [Testnet Dispenser](https://bank.testnet.algorand.network) to top up

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/Veerbha1102/Algo-TrendAi.git
cd Algo-TrendAi
```

---

### Step 2 — Set Up the Backend

```bash
cd Algoproject/backend

# Create a virtual environment
python -m venv venv

# Activate it
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

# Install all dependencies
pip install -r requirements.txt
```

Create a `.env` file inside `Algoproject/backend/`:

```env
# AI
GEMINI_API_KEY=your_gemini_api_key_here

# Algorand
BOT_MNEMONIC=word1 word2 word3 ... word25
ALGOD_URL=https://testnet-api.algonode.cloud
ALGOD_TOKEN=

# TRND Token
TRND_ASSET_ID=758636754

# Firebase Admin (path to your downloaded service account JSON)
FIREBASE_ADMIN_CERT=/absolute/path/to/firebase-service-account.json

# Email notifications (optional)
SENDGRID_API_KEY=your_sendgrid_key
SENDER_EMAIL=your@email.com
```

Download your Firebase Admin SDK JSON from:
`Firebase Console → Project Settings → Service Accounts → Generate new private key`

Place the JSON file in the `backend/` folder and set `FIREBASE_ADMIN_CERT` to its full path.

Start the backend:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

✅ Verify: Open [http://localhost:8000](http://localhost:8000) — should return:
```json
{"status": "Trend AI API Running"}
```

---

### Step 3 — Set Up the Frontend

```bash
cd Algoproject/frontend

npm install
```

Create a `.env.local` file inside `Algoproject/frontend/`:

```env
# Backend URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Firebase (from Firebase Console → Project Settings → General → Your apps)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdefgh
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Push Notifications (optional — Firebase Console → Project Settings → Cloud Messaging → Web Push certificates)
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key
```

Start the frontend:

```bash
npm run dev
```

✅ Verify: Open [http://localhost:3000](http://localhost:3000) — you should see the Algo Trend AI dashboard.

---

### Step 4 — Quick Start (Windows — Both Servers Together)

```bash
cd Algoproject
start.bat
```

---

### Step 5 — Enable Autonomous AI Trading

1. Open [http://localhost:3000](http://localhost:3000) and log in with Google
2. Navigate to **AI Signals** in the sidebar
3. Toggle **"AI Autopilot"** ON
4. The bot will now analyze ALGO-USD every 15 minutes and execute real Algorand trades autonomously

**Monitor your trades:**
- **AI Brain Log** — Full AI reasoning, confidence scores, and Algorand TX IDs for every trade
- **Portfolio → Chain Health Monitor** — Live AlgoKit-powered on-chain analytics (balance, rewards, block height)
- **Trades** — Complete transaction history linked to Pera Explorer

---

### Step 6 — Earn TRND Rewards

1. Click **"Connect Pera Wallet"** in the top navbar
2. Navigate to **Settings** and click "Opt-in to TRND"
3. Approve the transaction in Pera Wallet (costs 0.001 ALGO)
4. After every trade, **10–25 TRND tokens** are automatically sent to your wallet

---

## 📁 Project Structure

```
Algo-TrendAi/
├── README.md
├── DEPLOYMENT.md
└── Algoproject/
    ├── start.bat                              # Start both servers (Windows)
    ├── backend/
    │   ├── main.py                            # FastAPI app + APScheduler
    │   ├── schemas.py                         # Pydantic request/response models
    │   ├── requirements.txt                   # Python dependencies
    │   ├── Dockerfile                         # Container for API server
    │   ├── Dockerfile.bot                     # Container for trading bot
    │   ├── docker-compose.yml
    │   ├── mint_trnd.py                       # Script used to create TRND ASA
    │   └── services/
    │       ├── ai_engine.py                   # ⭐ Gemini 2.5 Pro + RSI/EMA/MACD
    │       ├── algorand_client.py             # ⭐ algosdk PaymentTxn execution
    │       ├── trnd_rewards.py                # ⭐ TRND ASA reward engine
    │       ├── ledger.py                      # Firestore audit logger
    │       └── notifier.py                    # Email trade alerts
    │   └── routes/
    │       └── api.py                         # All REST endpoints
    └── frontend/
        ├── app/
        │   ├── page.tsx                       # Main dashboard (all views)
        │   └── api/chain-health/route.ts      # ⭐ AlgoKit Chain Health API
        ├── components/
        │   ├── TradeSignals.tsx               # ⭐ Autonomous trading UI engine
        │   ├── ChainHealthPanel.tsx           # ⭐ AlgoKit live monitor panel
        │   ├── ChatPanel.tsx                  # Gemini AI chat assistant
        │   ├── MacroMarketWatch.tsx           # Global macro data panel
        │   └── WalletConnect.tsx              # Pera Wallet integration
        └── lib/
            └── firebase.ts                    # Firebase SDK config
```

> ⭐ = Core Algorand integration files

---

## 🌐 Deploy to Production

| Service | Platform | Config |
|---|---|---|
| **Backend** | [Render](https://render.com) | Root: `Algoproject/backend` · Start: `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Frontend** | [Vercel](https://vercel.com) | Root: `Algoproject/frontend` · Framework: Next.js |

**Required env vars on Render:** `GEMINI_API_KEY`, `BOT_MNEMONIC`, `TRND_ASSET_ID`, `ALGOD_URL`, `FIREBASE_ADMIN_CERT`

**Required env vars on Vercel:** `NEXT_PUBLIC_API_URL` = your Render URL + all `NEXT_PUBLIC_FIREBASE_*` vars

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the complete step-by-step guide.

---

## 🤖 How the AI Trading Works

```
Every 15 minutes:
  1. yfinance fetches ALGO-USD 15-min candles (5 days of data)
  2. pandas computes: RSI(14), EMA(9), EMA(21), MACD(12,26,9)
  3. yfinance fetches NIFTY 50 for global macro sentiment
  4. Gemini 2.5 Pro receives all indicators + position state + fee math
  5. Gemini returns JSON: { action, confidence, explanation, financial_grade }
  6. Position guard validates the action (no double-buy, no double-sell)
  7. If BUY/SELL → algosdk signs + broadcasts PaymentTxn on Algorand
  8. TX confirmed in ~4 rounds (~12 seconds)
  9. Firestore ledger saves full AI reasoning + TX ID
 10. TRND reward sent if user's Pera wallet is opted-in
 11. Email + push notification fired
```

---

## 🏆 Built For

**Algorand Foundation Hackathon 2025**

AlgoPilot demonstrates how Algorand's **4-second transaction finality**, **0.001 ALGO fees**, and the **ASA standard** enable a production-grade, fully autonomous trading platform that is transparent, auditable, and incentive-aligned through on-chain token rewards.

---

<div align="center">

**Every trade is real. Every decision is transparent. Every reward is on-chain.**

[🔍 Verify Trades on Pera Explorer](https://testnet.explorer.perawallet.app/address/JG7YOPL4UFV7ACQXAQACH7NVD6ZH6VYN7QTFXMCBSV5TCFR6QK5YPUW6KQ) · [📊 View TRND Token](https://testnet.explorer.perawallet.app/asset/758636754) · [💻 GitHub](https://github.com/Veerbha1102/Algo-TrendAi)

</div>
