"use client";

import { useState, useEffect } from "react";

// Fallback to the known bot wallet if none is provided via prop
const BOT_WALLET_FALLBACK = "JG7YOPL4UFV7ACQXAQACH7NVD6ZH6VYN7QTFXMCBSV5TCFR6QK5YPUW6KQ";

interface ChainHealth {

  address: string;
  balance: number;
  minBalance: number;
  availBalance: number;
  pendingRewards: number;
  totalAssets: number;
  lastModified: number;
  networkRound: number;
  status: string;
  source: string;
}

export function ChainHealthPanel({ address }: { address: string }) {
  const resolvedAddress = address || BOT_WALLET_FALLBACK;

  const [data, setData] = useState<ChainHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      const res = await fetch(`/api/chain-health?address=${resolvedAddress}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ChainHealth = await res.json();
      setData(json);
      setLastUpdated(new Date());
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Failed to fetch chain data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const t = setInterval(fetchHealth, 30_000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedAddress]);


  const cards = data
    ? [
        {
          label: "Available Balance",
          value: `${data.availBalance.toFixed(4)} ALGO`,
          sub: "Balance minus min reserve",
          icon: "account_balance_wallet",
          color: "text-secondary",
          border: "border-secondary/20",
          glow: "shadow-[0_0_20px_rgba(78,222,163,0.06)]",
        },
        {
          label: "Min Balance Reserve",
          value: `${data.minBalance.toFixed(4)} ALGO`,
          sub: "Algorand safety floor",
          icon: "lock",
          color: "text-amber-400",
          border: "border-amber-400/20",
          glow: "",
        },
        {
          label: "Pending Rewards",
          value: `${data.pendingRewards.toFixed(6)} ALGO`,
          sub: "Unclaimed staking rewards",
          icon: "workspace_premium",
          color: "text-primary",
          border: "border-primary/20",
          glow: "shadow-[0_0_20px_rgba(46,91,255,0.06)]",
        },
        {
          label: "Opted-In Assets",
          value: String(data.totalAssets),
          sub: "ASAs (incl. TRND #758636754)",
          icon: "token",
          color: "text-purple-400",
          border: "border-purple-400/20",
          glow: "",
        },
        {
          label: "Network Round",
          value: `#${data.networkRound.toLocaleString()}`,
          sub: "Current Algorand block height",
          icon: "hub",
          color: "text-primary",
          border: "border-primary/20",
          glow: "",
        },
        {
          label: "Account Status",
          value: data.status,
          sub: "On-chain registration state",
          icon: data.status === "Online" ? "wifi" : "wifi_off",
          color: data.status === "Online" ? "text-secondary" : "text-error",
          border: data.status === "Online" ? "border-secondary/20" : "border-error/20",
          glow: "",
        },
      ]
    : [];

  return (
    <div className="rounded-2xl border border-primary/15 overflow-hidden bg-gradient-to-br from-[#0a0f1a] to-[#0B0E14] shadow-[0_0_40px_rgba(46,91,255,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/30">
        <div className="flex items-center gap-3">
          {/* AlgoKit badge */}
          <div className="flex items-center gap-2 bg-[#1c222a] px-3 py-1.5 rounded-lg border border-primary/20">
            <span className="material-symbols-outlined text-[16px] text-primary">memory</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
              AlgoKit
            </span>
            <span className="text-[9px] font-mono text-on-surface-variant/60">
              @algorandfoundation/algokit-utils
            </span>
          </div>
          <span className="text-xs font-bold text-white">Chain Health Monitor</span>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[9px] font-mono text-on-surface-variant/40">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchHealth}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 transition-all"
            title="Refresh"
          >
            <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
              refresh
            </span>
          </button>
          <span className="flex items-center gap-1 text-[10px] font-bold text-secondary animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block" />
            Testnet Live
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        {loading && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl skeleton-shimmer" />
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center gap-3 bg-error/10 border border-error/20 rounded-xl p-5 text-sm">
            <span className="material-symbols-outlined text-error">error</span>
            <div>
              <p className="font-bold text-error text-xs">Chain lookup failed</p>
              <p className="text-on-surface-variant text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map((card) => (
                <div
                  key={card.label}
                  className={`bg-[#0B0E14] rounded-xl p-4 border ${card.border} ${card.glow} hover:brightness-110 transition-all`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`material-symbols-outlined text-[16px] ${card.color}`}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {card.icon}
                    </span>
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                      {card.label}
                    </p>
                  </div>
                  <p className={`text-lg font-mono font-black ${card.color} tracking-tight`}>
                    {card.value}
                  </p>
                  <p className="text-[9px] text-on-surface-variant/50 mt-1">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Source footer */}
            <p className="text-[9px] font-mono text-on-surface-variant/30 mt-4 text-right">
              {data.source}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
