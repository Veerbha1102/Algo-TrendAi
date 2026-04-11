# AlgoPilot MVP - Deployment Architecture & Strategy

This document outlines the systematic process for taking the AlgoPilot AI application from a local development environment into a secure, globally accessible production environment.

## 1. Hosting Architecture Overview

The application utilizes a decoupled client-server architecture. For maximum scalability and ease-of-use at zero-to-low cost, we recommend the following stack:

*   **Frontend (Next.js):** [Vercel](https://vercel.com) - Native hosting for Next.js with edge caching, Server-Side Rendering (SSR) support, and automatic CI/CD from GitHub.
*   **Backend (FastAPI):** [Render](https://render.com) or [Google Cloud Run](https://cloud.google.com/run) - Serverless container execution. Render's Web Service is the easiest to start with.
*   **Database & Auth:** Firebase (already configured) - Hosted on Google Cloud.

## 2. Deploying the Backend (API Server)

To deploy the FastAPI python server, we'll configure a containerized Web Service.

### Using Render (Recommended for Hackathons)
1. Push your code to a GitHub repository.
2. Sign in to Render and create a new **Web Service**.
3. Point it to your GitHub repository and set the `Root Directory` to `backend/`.
4. Render will automatically detect the Python environment. Set the start command to:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
5. **Environment Variables:** You MUST configure the following secrets in the Render dashboard:
   *   `GEMINI_API_KEY`
   *   `FIREBASE_ADMIN_CERT` (Paste the JSON string directly or use a base64 encoded string if multi-line is an issue).
   *   `ALGOD_URL` and `BOT_MNEMONIC`

> [!NOTE]
> The backend `main.py` specifies CORS using `allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"]`. **Before deploying the frontend**, you must update this array to include your future Vercel domain (e.g., `https://algopilot.vercel.app` or `*` for testing).

## 3. Deploying the Frontend (Web App)

1. Sign up for [Vercel](https://vercel.com) and link your GitHub account.
2. Click **Add New Project** and select your repository.
3. Before clicking "Deploy", configure the framework settings:
   *   **Framework Preset:** Next.js
   *   **Root Directory:** `frontend/`
4. **Environment Variables:** During setup, expand the Environment Variables tab and add:
   *   `NEXT_PUBLIC_API_URL` = `https://your-backend-url.onrender.com` (Get this URL from Step 2 above).
   *   `NEXT_PUBLIC_FIREBASE_VAPID_KEY` (if using push notifications).
5. Click **Deploy**. Vercel will install dependencies, run `npm run build`, and assign your platform a live global URL!

## 4. Final Security & Maintenance Checklist
- [ ] Ensure `global_transactions` and `global_chat` paths in Firebase have proper security rules to prevent unauthorized reads/writes from the internet.
- [ ] Make sure Pera Wallet connection functions smoothly over the HTTPS domain.
- [ ] Set up the daily CRON job (`apscheduler` in python) using external triggers like cron-job.org if the server sleeps on a free tier.
