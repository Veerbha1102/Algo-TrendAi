"use client";

import dynamic from "next/dynamic";

const AdvancedRealTimeChart = dynamic(
  () => import("react-ts-tradingview-widgets").then((mod) => mod.AdvancedRealTimeChart),
  { ssr: false }
);

export default function MacroMarketWatch() {
  return (
    <div className="w-full h-[400px] rounded-xl overflow-hidden border border-outline-variant/20 shadow-lg mb-6">
      <AdvancedRealTimeChart
        theme="dark"
        symbol="NASDAQ:NDX" // Default to US Tech
        allow_symbol_change={true}
        watchlist={[
          "NSE:NIFTY",   // India
          "SP:SPX",      // USA S&P 500
          "NASDAQ:NDX",  // USA Tech
          "TVC:NI225",   // Japan
          "XETR:DAX",    // Germany
          "CBOE:VIX"     // Fear Index
        ]}
        details={true}
        hide_side_toolbar={true}
      />
    </div>
  );
}
