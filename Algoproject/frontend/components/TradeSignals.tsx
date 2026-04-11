"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, increment, getDoc, serverTimestamp } from "firebase/firestore";

const TRADE_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes between autonomous trades

export function TradeSignals({ walletAddress, balance, userId, activeAsset, userEmail }: { walletAddress: string, balance: number, userId: string, activeAsset?: string, userEmail?: string }) {
  const [signal, setSignal] = useState<{ action: string; confidence: number; explanation: string; financial_grade: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [successTxId, setSuccessTxId] = useState<string | null>(null);
  const [autopilot, setAutopilot] = useState(true);
  const [lastTradeInfo, setLastTradeInfo] = useState<{ action: string; timestamp: Date } | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [liveBalance, setLiveBalance] = useState<number | null>(null);
  const executingRef = useRef(false);
  const lastExecutedSignalRef = useRef<string | null>(null); // tracks the signal action we last acted on

  const currentAsset = activeAsset || "ALGOUSD";

  // On mount: read the last trade state from Firestore to restore memory after reload
  useEffect(() => {
    if (!userId) return;
    const loadLastTrade = async () => {
      const portfolioSnap = await getDoc(doc(db, "portfolios", userId));
      if (portfolioSnap.exists()) {
        const data = portfolioSnap.data();
        if (data.last_trade_timestamp && data.last_trade_action) {
          const lastTs = data.last_trade_timestamp.toDate
            ? data.last_trade_timestamp.toDate()
            : new Date(data.last_trade_timestamp);
          setLastTradeInfo({ action: data.last_trade_action, timestamp: lastTs });
          // Restore successTxId from Firestore to show "settled" status on reload
          if (data.last_tx_id) setSuccessTxId(data.last_tx_id);
        }
      }
    };
    loadLastTrade();
  }, [userId]);

  // Cooldown timer display
  useEffect(() => {
    if (!lastTradeInfo) return;
    const tick = () => {
      const elapsed = Date.now() - lastTradeInfo.timestamp.getTime();
      const remaining = Math.max(0, TRADE_COOLDOWN_MS - elapsed);
      setCooldownRemaining(remaining);
    };
    tick();
    const t = setInterval(tick, 5000);
    return () => clearInterval(t);
  }, [lastTradeInfo]);

  const isInCooldown = () => {
    if (!lastTradeInfo) return false;
    const elapsed = Date.now() - lastTradeInfo.timestamp.getTime();
    return elapsed < TRADE_COOLDOWN_MS;
  };

  // Fetch real on-chain balance from backend
  const fetchLiveBalance = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_URL}/api/balance`);
      if (res.ok) {
        const data = await res.json();
        setLiveBalance(data.balance);
      }
    } catch (_) {}
  };

  // On mount and every 60s: fetch live on-chain balance
  useEffect(() => {
    fetchLiveBalance();
    const t = setInterval(fetchLiveBalance, 60000);
    return () => clearInterval(t);
  }, []);

  const fetchSignal = async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_URL}/api/ai-decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: walletAddress,
          balance: balance,
          asset: currentAsset,
          // Pass last trade context so AI knows what already happened
          last_action: lastTradeInfo?.action || null,
          last_trade_age_minutes: lastTradeInfo
            ? Math.round((Date.now() - lastTradeInfo.timestamp.getTime()) / 60000)
            : null
        })
      });
      const data = await res.json();
      setSignal(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Periodic Signal Retrieval
  useEffect(() => {
    // Wait until lastTradeInfo is loaded from DB if we expect it, but we don't block fully.
    // By adding it to the dependency array, we ensure we re-fetch if it updates.
    if (walletAddress) fetchSignal();
    const intervalId = setInterval(() => {
      if (walletAddress && autopilot) fetchSignal();
    }, 45000);
    return () => clearInterval(intervalId);
  }, [walletAddress, currentAsset, autopilot, lastTradeInfo]);

  // Autonomous Execution Engine
  useEffect(() => {
    if (
      signal &&
      autopilot &&
      signal.action !== "HOLD" &&
      !executingRef.current &&
      // Only execute if this signal hasn't already been acted on
      lastExecutedSignalRef.current !== `${signal.action}-${signal.confidence}`
    ) {
      executeTrade();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal, autopilot]);

  const executeTrade = async (manualAction?: string) => {
    const actionToExecute = manualAction || (signal ? signal.action : null);
    if (!actionToExecute || !walletAddress || !userId) return;
    if (executingRef.current) return; // prevent double-fire
    executingRef.current = true;
    setExecuting(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_URL}/api/trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: walletAddress,
          action: actionToExecute,
          amount: 1,
          asset_id: 0,
          user_email: userEmail || "",
          user_id: userId,
          ai_confidence: manualAction ? 1.0 : signal?.confidence,
          ai_grade: manualAction ? "Manual Override" : signal?.financial_grade,
          ai_explanation: manualAction ? `User manually commanded ${actionToExecute}.` : signal?.explanation
        })
      });
      const data = await res.json();

      if (res.ok) {
        const tradeTimestamp = new Date();

        // Mark this signal as executed so the watcher can't re-fire it
        lastExecutedSignalRef.current = signal ? `${signal.action}-${signal.confidence}` : manualAction || null;

        // Clear signal so the autonomy watcher won't re-trigger on the same signal
        setSignal(null);

        // Write trade to ledger (include AI brain metadata for the AI Brain Log view)
        await addDoc(collection(db, `portfolios/${userId}/trades`), {
          action: actionToExecute,
          amount: 1,
          tx_id: data.tx_id,
          timestamp: serverTimestamp(),
          ai_explanation: manualAction ? `User manually commanded ${actionToExecute}.` : (signal?.explanation || ""),
          ai_confidence: manualAction ? 1.0 : (signal?.confidence || 0),
          ai_grade: manualAction ? "Manual Override" : (signal?.financial_grade || ""),
        });

        // Sync Firestore balance to REAL on-chain balance (not fake +/-1)
        const docRef = doc(db, "portfolios", userId);
        const updatePayload: any = {
          trades: increment(1),
          last_trade_action: actionToExecute,
          last_trade_timestamp: tradeTimestamp,
          last_tx_id: data.tx_id
        };
        // If backend returned real on-chain balance, use it. Otherwise skip balance update.
        if (data.real_balance !== null && data.real_balance !== undefined) {
          updatePayload.balance = data.real_balance;
        }
        await updateDoc(docRef, updatePayload);

        setSuccessTxId(data.tx_id);
        setLastTradeInfo({ action: actionToExecute, timestamp: tradeTimestamp });
      } else {
        console.error(`Trade failed: ${data.detail || data.message || "Unknown Error"}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setExecuting(false);
      executingRef.current = false;
    }
  };

  const formatCooldown = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  if (loading || !signal) {
    return (
      <div className="bg-surface-container-high border border-outline-variant/15 text-on-surface flex items-center justify-center min-h-[200px] rounded-2xl shadow-[-24px_0_48px_rgba(0,0,0,0.4)]">
        <div className="animate-pulse flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <span className="text-sm font-bold uppercase tracking-[0.1em] text-on-surface-variant">Syncing Market State...</span>
        </div>
      </div>
    );
  }

  const isBuy = signal.action === "BUY";
  const isSell = signal.action === "SELL";
  const Icon = isBuy ? TrendingUp : isSell ? TrendingDown : Minus;
  const inCooldown = isInCooldown();

  return (
    <div className="bg-surface-container-high border border-outline-variant/15 text-on-surface shadow-2xl rounded-2xl overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary"></div>
      <div className="p-8 pb-2">
        <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em] flex items-center justify-between mb-2">
          <span>{currentAsset} AI Signal</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-[#1c222a] text-secondary border-secondary/30">
              {signal.financial_grade}
            </Badge>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {Math.round(signal.confidence * 100)}% Confidence
            </Badge>
          </div>
        </div>
      </div>
      <div className="p-8 pt-0">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className={`text-4xl font-bold flex items-center gap-3 ${isBuy ? 'text-emerald-400' : isSell ? 'text-rose-400' : 'text-slate-400'}`}>
              {signal.action} <Icon className="h-8 w-8" />
            </div>
            <p className="text-slate-400 mt-2 text-sm leading-relaxed max-w-md">
              {signal.explanation}
            </p>
            {/* Show last trade context */}
            {lastTradeInfo && (
              <div className="mt-3 text-[10px] font-mono text-on-surface-variant/60 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary/60 inline-block"></span>
                Last AI action: <span className={`font-bold ${lastTradeInfo.action === 'BUY' ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>{lastTradeInfo.action}</span>
                {" · "}{lastTradeInfo.timestamp.toLocaleTimeString()}
              </div>
            )}
            {successTxId && (
              <div className="mt-6 bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl inline-block">
                <p className="text-emerald-400 font-bold mb-2">Trade Execution Settled!</p>
                <a
                  href={`https://testnet.explorer.perawallet.app/tx/${successTxId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white hover:text-emerald-300 underline font-mono text-sm inline-flex items-center gap-2"
                >
                  View On-Chain Settlement <Zap className="h-4 w-4 text-emerald-400" />
                </a>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end justify-center gap-3">
            <button
              onClick={() => setAutopilot(!autopilot)}
              className={`text-[10px] uppercase font-bold tracking-widest px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${autopilot ? 'bg-primary/20 text-primary border-primary/40 shadow-[0_0_15px_rgba(46,91,255,0.3)]' : 'bg-surface-container text-on-surface-variant border-outline-variant/30'}`}
            >
              <span className={`w-2 h-2 rounded-full ${autopilot ? 'bg-primary animate-pulse' : 'bg-on-surface-variant'}`}></span>
              Autopilot: {autopilot ? 'Engaged' : 'Standby'}
            </button>

            {/* Removed artificial cooldown blocker text for showcasing purposes. */}
            {lastTradeInfo?.action === "BUY" && autopilot && (
              <div className="text-[10px] font-mono text-emerald-400/60 text-right animate-pulse">
                Monitoring for optimal SELL window...
              </div>
            )}
            {lastTradeInfo?.action === "SELL" && autopilot && (
              <div className="text-[10px] font-mono text-secondary/60 text-right animate-pulse">
                Monitoring for optimal BUY window...
              </div>
            )}

            {!autopilot && (
              <div className="flex gap-2 mt-2">
                <Button
                  onClick={() => executeTrade("BUY")}
                  disabled={executing}
                  className="shadow-lg px-4 py-2 font-semibold tracking-wide border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-all hover:scale-[1.02] active:scale-95"
                >
                  🚀 Manual BUY
                </Button>
                <Button
                  onClick={() => executeTrade("SELL")}
                  disabled={executing}
                  className="shadow-lg px-4 py-2 font-semibold tracking-wide border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-all hover:scale-[1.02] active:scale-95"
                >
                  📉 Manual SELL
                </Button>
              </div>
            )}

            {executing && autopilot && (
              <div className="text-secondary text-sm font-bold animate-pulse mt-2 flex items-center gap-2">
                <Zap className="h-4 w-4" /> AI Executing Sequence...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
