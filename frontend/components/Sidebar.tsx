"use client";
import { useState } from "react";

export function Sidebar({ currentView, setCurrentView }: { currentView: string; setCurrentView: (view: string) => void }) {
  const [isTrendExpanded, setIsTrendExpanded] = useState(false);

  const navItems = [
    { id: "dashboard", icon: "dashboard", label: "Dashboard" },
    { id: "trendcoin", icon: "toll", label: "Trend Ecosystem", isParent: true },
    { id: "infinity", icon: "all_inclusive", label: "Infinity Loop", isSubItem: true },
    { id: "challenge", icon: "sports_esports", label: "AI Flipped Challenge", isSubItem: true },
    { id: "portfolio", icon: "account_balance_wallet", label: "Portfolio" },
    { id: "trades", icon: "swap_horiz", label: "Trades" },
    { id: "signals", icon: "psychology", label: "AI Signals" },
    { id: "risk", icon: "security", label: "Risk Control" },
    { id: "settings", icon: "settings", label: "Settings" }
  ];

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 flex flex-col py-6 px-4 bg-[#101419] border-r border-[#c4c5d9]/15 z-50 overflow-y-auto custom-scrollbar">
      <div className="mb-10 px-2 group cursor-pointer">
        <h1 className="text-xl font-extrabold tracking-[-0.02em] bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-primary animate-gradient-x drop-shadow-[0_0_15px_rgba(46,91,255,0.8)] transition-all duration-500 group-hover:drop-shadow-[0_0_25px_rgba(78,222,163,1)]">
          Algo Trend AI
        </h1>
        <p className="text-[10px] uppercase tracking-[0.1em] text-secondary font-bold mt-1 opacity-80 group-hover:opacity-100 transition-opacity">The Quantitative Architect</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(item => {
          if (item.isSubItem && !isTrendExpanded) return null;
          
          return (
            <button 
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                if (item.isParent) {
                  setIsTrendExpanded(!isTrendExpanded);
                }
              }}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                item.isSubItem ? 'ml-6 w-[calc(100%-1.5rem)] text-xs border-l-2 border-[#1c222a] bg-[#0A121A]/50' : 'w-full'
              } ${
                currentView === item.id 
                  ? 'text-[#b8c3ff] font-bold border-l-2 border-primary bg-[#1c222a] shadow-[inset_4px_0_0_0_rgba(46,91,255,1)]' 
                  : 'text-[#c4c5d9] hover:bg-[#1c222a]/50 hover:pl-4 border-l-2 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined transition-transform duration-300 ${item.isSubItem ? 'text-[18px]' : 'text-[22px]'} ${currentView === item.id ? 'scale-110 drop-shadow-[0_0_8px_rgba(46,91,255,0.8)]' : ''}`} style={item.icon === "security" ? {fontVariationSettings: "'FILL' 1"} : {}}>
                  {item.icon}
                </span>
                <span className={item.isSubItem ? "text-xs font-mono" : "text-sm"}>{item.label}</span>
              </div>
              {item.isParent && (
                <span className={`material-symbols-outlined text-xs transition-transform duration-300 ${isTrendExpanded ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto px-2 pt-6">
        <button className="w-full flex items-center justify-center gap-2 py-3 bg-error/10 hover:bg-error/20 text-error border border-error/20 hover:border-error/50 rounded-xl font-bold text-sm tracking-tight transition-all duration-300 shadow-[0_0_15px_rgba(255,82,82,0.1)] hover:shadow-[0_0_25px_rgba(255,82,82,0.3)]">
          <span className="material-symbols-outlined text-sm animate-pulse">bolt</span>
          Loki Mode
        </button>
      </div>
    </aside>
  );
}
