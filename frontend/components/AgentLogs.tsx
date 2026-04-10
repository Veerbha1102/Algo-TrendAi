"use client";

import { useEffect, useState, useRef } from "react";

const LOGS_SEQUENCE = [
  "[SYS] Booting Trend AI Agent...",
  "[NET] Connecting to Algorand Testnet Node...",
  "[DATA] Scraping Yahoo Finance for NIFTY & VIX...",
  "[AI] Gemini 3.1 Pro analyzing macro sentiment...",
  "[AI] VIX > 25 detected. Adjusting risk parameters...",
  "[TX] Ready to sign payload via Pera Wallet."
];

export function AgentLogs() {
  const [logs, setLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < LOGS_SEQUENCE.length) {
        setLogs((prev) => [...prev, LOGS_SEQUENCE[index]]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 2000); // add a new log every 2 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-black border border-green-500/30 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(34,197,94,0.15)] mt-4">
      <div className="bg-green-950/40 px-4 py-2 border-b border-green-500/20 flex items-center justify-between">
        <span className="text-xs font-bold font-mono text-green-500 tracking-widest uppercase">Agentic Brainwaves</span>
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
      </div>
      <div 
        ref={scrollRef}
        className="h-40 overflow-y-auto p-4 font-mono text-xs text-green-400 space-y-2 custom-scrollbar"
      >
        {logs.map((log, i) => (
          <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <span className="opacity-50 mr-2">{'>'}</span> {log}
          </div>
        ))}
        {logs.length < LOGS_SEQUENCE.length && (
          <div className="animate-pulse flex items-center">
             <span className="w-2 h-4 bg-green-500 inline-block"></span>
          </div>
        )}
      </div>
    </div>
  );
}
