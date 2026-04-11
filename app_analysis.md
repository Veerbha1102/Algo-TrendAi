# AlgoPilot AI - Project Analysis Report

## 1. Project Overview
**AlgoPilot AI** appears to be a hackathon prototype for an AI-powered crypto portfolio management platform. It leverages generative AI to make trading decisions and executes them on the Algorand blockchain. The architecture follows a modern decoupled approach, utilizing a separated **Next.js frontend** and **FastAPI backend**.

---

## 2. Technology Stack & Components

### ⚙️ Backend (Python / FastAPI)
The backend `/backend` acts as the engine driving AI logic, blockchain interactions, and scheduling.
*   **Web Framework:** FastAPI for high-performance REST APIs.
*   **AI Engine:** Google Gemini (Gemini 2.5 Pro via `google.generativeai`) to generate quantitative trading decisions (BUY, SELL, HOLD) and power a chatbot ("Quantitative Architect").
*   **Blockchain Integration:** `algosdk` for Algorand transactions. Real ALGO micro-transactions are submitted if provided a correct wallet.
*   **Smart Contracts:** PyTeal script (`contracts/trading_rules.py`) generating `.teal` approval and clear state programs. It includes logic to enforce a maximum trade limit (10% of portfolio balance).
*   **Database & Auth:** Firebase Admin SDK for checking portfolios, user balances, and fetching fcm_tokens/emails.
*   **Scheduling:** `apscheduler` running as a background job to send daily End-Of-Day (EOD) portfolio summaries at 23:59.
*   **Notifications:** Custom notifier to send email summaries and Firebase Cloud Messaging (FCM) push notifications upon executed trades.

### 💻 Frontend (Next.js / React)
The frontend `/frontend` is built as a highly interactive, modern web application.
*   **Framework:** Next.js with React 19.
*   **Styling & UI:** 
    *   TailwindCSS v4 for utility-first styling.
    *   `shadcn` / `@base-ui/react` for standardized accessible components.
    *   Framer Motion (`framer-motion`) and `tw-animate-css` for premium UI micro-animations and transitions.
    *   Lucide React for iconography.
*   **Structure:** It has traces of UI extraction (`stitch_algopilot_ai_dashboard.zip`), which hints the UI design may have been rapidly prototyped and exported from a design-to-code tool like Stitch or V0.

---

## 3. Current Functionality Highlights
1.  **`/api/ai-decision` Endpoint:** Takes market trend and sentiment (currently mocked) and asks Gemini to return a structured JSON response to execute a trading action.
2.  **`/api/trade` Endpoint:** Takes the AI recommendation and proxies it to the `algorand_client.py`, constructing a `PaymentTxn` on the Algorand blockchain. Notifies the user via email and push notification on success.
3.  **`/api/chat` Endpoint:** Provides conversational interface logic for a "Quantitative Architect" designed to politely advise users.
4.  **EOD CRON Job:** A daily summary loop parsing all Firestore portfolios and dispatching HTML-driven emails out to users.

---

## 4. Recommendations & What We Can Do Next

Here are the actionable paths we can take to upgrade this prototype into a production-ready MVP:

### A. Real-Time Data pipelines
*   **Connect Live Market APIs:** Replace the mocked `market_trend` strings in `api.py` with real-time price orations (e.g., CoinGecko, Binance API, or Pyth Network on Algorand).

### B. Blockchain Upgrades
*   **Frontend Wallet Integration:** Instead of holding the mnemonic on the backend, we should integrate **Pera Wallet** or **Defly** via WalletConnect on the Next.js frontend to allow users to sign their own trades securely.
*   **Deploy PyTeal Contracts:** Deploy the 10% maximum-trade constraint contract to the Algorand Testnet and refactor the backend/frontend to make application calls (AppCall) instead of basic `PaymentTxn`.

### C. Architecture & Production Resilience
*   **Serverless CRON Jobs:** While `apscheduler` works locally, in a serverless environment (like Vercel/Render where you might deploy), background tasks get shut down. We should migrate the EOD summary to Google Cloud Scheduler or a serverless CRON ping route.
*   **Database Expansion:** Properly hook up Firebase Auth with the Next.js frontend so user persistence goes end-to-end.

### D. Frontend Integration
*   **Link APIs:** Ensure the dashboard's Action buttons actually hit the FastAPI endpoints via standard `fetch()` or `axios`.
*   **Polishing UI:** Integrate the downloaded `stitch.zip` assets fully into the Next.js `/app` router structure ensuring responsive, smooth, animation-ready interfaces inline with the `framer-motion` dependencies.

If you would like to proceed with any of these features, let me know where you'd like to start!
