"use client";

import { useEffect, useState, useCallback } from "react";
import { PeraWalletConnect } from "@perawallet/connect";
import algosdk from "algosdk";

const TRND_ASSET_ID = 758636754;
const ALGOD_URL = "https://testnet-api.algonode.cloud";

let peraWallet: PeraWalletConnect | null = null;
if (typeof window !== "undefined") {
  peraWallet = new PeraWalletConnect();
}

interface TrndStatus {
  opted_in: boolean;
  asset_id: number;
  asset_name: string;
  explorer: string;
}

export function WalletConnect({ earnedTrnd = 0 }: { earnedTrnd?: number }) {
  const [accountAddress, setAccountAddress] = useState<string | null>(null);
  const [trndStatus, setTrndStatus] = useState<TrndStatus | null>(null);
  const [optInLoading, setOptInLoading] = useState(false);
  const [optInSuccess, setOptInSuccess] = useState(false);
  const [trndBalance, setTrndBalance] = useState<number | null>(null);

  const isConnected = !!accountAddress;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // ── Check TRND opt-in status whenever wallet connects ─────────
  const checkTrndStatus = useCallback(async (addr: string) => {
    try {
      const res = await fetch(`${API_URL}/api/trnd/status?wallet=${addr}`);
      if (res.ok) {
        const data = await res.json();
        setTrndStatus(data);
      }
    } catch (_) {}

    // Also fetch TRND balance directly from Algorand node
    try {
      const res = await fetch(`${ALGOD_URL}/v2/accounts/${addr}`, {
        headers: { "X-Algo-API-Token": "" }
      });
      if (res.ok) {
        const info = await res.json();
        const assets: any[] = info.assets || [];
        const trndAsset = assets.find((a: any) => a["asset-id"] === TRND_ASSET_ID);
        setTrndBalance(trndAsset ? trndAsset.amount / 1_000_000 : 0);
      }
    } catch (_) {}
  }, [API_URL]);

  useEffect(() => {
    if (!peraWallet) return;
    peraWallet.reconnectSession()
      .then((accounts) => {
        peraWallet!.connector?.on("disconnect", handleDisconnect);
        if (accounts.length) {
          setAccountAddress(accounts[0]);
          checkTrndStatus(accounts[0]);
        }
      })
      .catch(console.error);
  }, [checkTrndStatus]);

  function handleDisconnect() {
    peraWallet?.disconnect();
    setAccountAddress(null);
    setTrndStatus(null);
    setTrndBalance(null);
  }

  async function handleConnect() {
    if (!peraWallet) return;
    try {
      const accounts = await peraWallet.connect();
      peraWallet.connector?.on("disconnect", handleDisconnect);
      setAccountAddress(accounts[0]);
      checkTrndStatus(accounts[0]);
    } catch (err: any) {
      if (err?.data?.type !== "ERR_USER_CLOSED_MODAL") console.error(err);
    }
  }

  // ── TRND Opt-In: build txn → sign with Pera → submit to backend ──
  async function handleOptIn() {
    if (!peraWallet || !accountAddress) return;
    setOptInLoading(true);
    try {
      // 1. Fetch suggested params from Algorand node
      const paramsRes = await fetch(`${ALGOD_URL}/v2/transactions/params`, {
        headers: { "X-Algo-API-Token": "" }
      });
      const params = await paramsRes.json();

      // 2. Build ASA opt-in transaction (send 0 TRND to yourself)
      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: accountAddress,
        receiver: accountAddress,      // self-transfer = opt-in
        assetIndex: TRND_ASSET_ID,
        amount: 0,
        suggestedParams: {
          fee: params["min-fee"] || 1000,
          minFee: params["min-fee"] || 1000,
          firstValid: params["last-round"],
          lastValid: params["last-round"] + 1000,
          genesisHash: params["genesis-hash"],
          genesisID: params["genesis-id"],
          flatFee: true
        },
        note: new TextEncoder().encode("Trend AI TRND Opt-In")
      });

      // 3. Sign with Pera Wallet (user approves in mobile app)
      const signedTxns = await peraWallet.signTransaction([[{ txn, signers: [accountAddress] }]]);

      // 4. Submit signed bytes via backend /api/trnd/optin
      const base64Txn = btoa(String.fromCharCode(...new Uint8Array(signedTxns[0])));
      const res = await fetch(`${API_URL}/api/trnd/optin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signed_txn: base64Txn })
      });

      if (res.ok) {
        setOptInSuccess(true);
        // Refresh TRND status after opt-in
        setTimeout(() => checkTrndStatus(accountAddress), 3000);
      } else {
        const err = await res.json();
        alert(`Opt-in failed: ${err.detail}`);
      }
    } catch (err: any) {
      if (err?.data?.type !== "ERR_USER_CLOSED_MODAL") {
        console.error("Opt-in error:", err);
        alert("Opt-in failed. Check console.");
      }
    } finally {
      setOptInLoading(false);
    }
  }

  // ── Disconnected state ─────────────────────────────────────────
  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
        className="text-xs font-bold uppercase tracking-[0.05em] text-black bg-white hover:bg-gray-200 transition-colors cursor-pointer px-4 py-1.5 rounded-full shadow-md"
      >
        Connect Pera Wallet
      </button>
    );
  }

  // ── Connected state ────────────────────────────────────────────
  return (
    <div className="flex items-center gap-3">
      {/* Wallet address pill */}
      <div className="bg-surface-container-low px-4 py-1.5 rounded-full border border-outline-variant/10 shadow-inner flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-secondary animate-pulse shadow-[0_0_8px_rgba(78,222,163,0.8)]"></div>
        <span className="text-[10px] uppercase tracking-[0.05em] text-on-surface-variant font-mono font-bold">
          {accountAddress.slice(0, 6)}...{accountAddress.slice(-4)}
        </span>
      </div>

      {/* TRND Status */}
      {trndStatus?.opted_in ? (
        <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/30 px-3 py-1 rounded-full">
          <span className="text-[9px] font-bold uppercase tracking-widest text-primary">TRND</span>
          <span className="text-[10px] font-mono font-bold text-primary">
            {earnedTrnd > 0 ? earnedTrnd : trndBalance !== null ? `${trndBalance.toFixed(0)}` : "…"}
          </span>
        </div>
      ) : optInSuccess ? (
        <div className="text-[10px] font-bold text-secondary animate-pulse">Opted in! ✓</div>
      ) : (
        <button
          onClick={handleOptIn}
          disabled={optInLoading}
          title="Opt in to TRND to receive trading rewards"
          className="text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all disabled:opacity-50 cursor-pointer"
        >
          {optInLoading ? "Signing…" : "+ TRND Rewards"}
        </button>
      )}

      <button
        onClick={handleDisconnect}
        className="text-[10px] font-bold uppercase tracking-[0.05em] text-error hover:text-error/70 transition-colors cursor-pointer"
      >
        Disconnect
      </button>
    </div>
  );
}
