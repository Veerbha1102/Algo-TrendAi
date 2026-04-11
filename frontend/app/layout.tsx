import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Algo Trend AI — Autonomous Trading Terminal",
  description: "Institutional-grade AI trading co-pilot powered by Algorand blockchain. Real-time autonomous trade execution with Gemini AI.",
  metadataBase: new URL("https://trendcoin.skillbridgeladder.in"),
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  keywords: ["algorand", "AI trading", "autonomous", "blockchain", "fintech", "ALGO", "TRND", "Trend Coin"],
  openGraph: {
    title: "Algo Trend AI — Autonomous Trading Terminal",
    description: "AI-powered autonomous trading on Algorand. Earn TRND rewards on every AI trade.",
    siteName: "Algo Trend AI",
    url: "https://trendcoin.skillbridgeladder.in",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{__html: `

          /* ── Skeleton shimmer ── */
          @keyframes shimmer { 100% { transform: translateX(100%); } }
          .skeleton-shimmer {
            position: relative; overflow: hidden;
            background-color: rgba(67, 70, 86, 0.2);
          }
          .skeleton-shimmer::after {
            content: ''; position: absolute; inset: 0;
            transform: translateX(-100%);
            background-image: linear-gradient(90deg, rgba(255,255,255,0) 0, rgba(255,255,255,0.05) 20%, rgba(255,255,255,0.05) 60%, rgba(255,255,255,0));
            animation: shimmer 2s infinite;
          }

          /* ── Gradient text animation ── */
          @keyframes gradient-x {
            0%, 100% { background-position: 0% 50%; }
            50%       { background-position: 100% 50%; }
          }
          .animate-gradient-x { background-size: 200% 200%; animation: gradient-x 3s ease infinite; }

          /* ── AI thinking dots ── */
          @keyframes ai-dot {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
            40%           { transform: scale(1.1); opacity: 1; }
          }
          .ai-dot { display: inline-block; border-radius: 9999px; animation: ai-dot 1.4s ease-in-out infinite; }
          .ai-dot:nth-child(1) { animation-delay: 0s; }
          .ai-dot:nth-child(2) { animation-delay: 0.2s; }
          .ai-dot:nth-child(3) { animation-delay: 0.4s; }

          /* ── Typing cursor blink ── */
          @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
          .typing-cursor::after {
            content: '|'; margin-left: 2px;
            color: #2E5BFF; font-weight: 300;
            animation: blink 1s step-end infinite;
          }

          /* ── Neural pulse ring (FAB button) ── */
          @keyframes neural-pulse {
            0%   { transform: scale(1);   opacity: 0.7; }
            70%  { transform: scale(1.7); opacity: 0; }
            100% { transform: scale(1.7); opacity: 0; }
          }
          .neural-pulse { position: relative; }
          .neural-pulse::before, .neural-pulse::after {
            content: ''; position: absolute; inset: 0;
            border-radius: 9999px;
            border: 2px solid rgba(46, 91, 255, 0.5);
            animation: neural-pulse 2s ease-out infinite;
            pointer-events: none;
          }
          .neural-pulse::after { animation-delay: 1s; }

          /* ── Signal glow badges ── */
          @keyframes signal-glow-green {
            0%, 100% { box-shadow: 0 0 6px rgba(78,222,163,0.4); }
            50%       { box-shadow: 0 0 22px rgba(78,222,163,0.95), 0 0 44px rgba(78,222,163,0.25); }
          }
          @keyframes signal-glow-red {
            0%, 100% { box-shadow: 0 0 6px rgba(255,180,171,0.4); }
            50%       { box-shadow: 0 0 22px rgba(255,180,171,0.95), 0 0 44px rgba(255,180,171,0.25); }
          }
          .signal-glow-buy  { animation: signal-glow-green 2s ease-in-out infinite; }
          .signal-glow-sell { animation: signal-glow-red   2s ease-in-out infinite; }

          /* ── Orbit particles (around AI FAB) ── */
          @keyframes orbit {
            from { transform: rotate(0deg)   translateX(30px) rotate(0deg); }
            to   { transform: rotate(360deg) translateX(30px) rotate(-360deg); }
          }
          .orbit-dot {
            position: absolute; border-radius: 9999px; background: #2E5BFF;
            width: 6px; height: 6px;
            top: 50%; left: 50%; margin: -3px 0 0 -3px;
            animation: orbit 3s linear infinite;
          }
          .orbit-dot:nth-child(2) { animation-delay: -1s; width: 5px; height: 5px; background: #4edea3; }
          .orbit-dot:nth-child(3) { animation-delay: -2s; width: 4px; height: 4px; background: #b8c3ff; }

          /* ── AI terminal scan line ── */
          @keyframes scan { 0% { top: -2px; } 100% { top: 100%; } }
          .scan-line {
            position: absolute; left: 0; right: 0; height: 2px;
            background: linear-gradient(90deg, transparent, rgba(46,91,255,0.5), transparent);
            animation: scan 5s linear infinite;
            pointer-events: none; z-index: 1;
          }

          /* ── Pop-in for numbers/badges ── */
          @keyframes pop-in {
            0%   { transform: scale(0.5); opacity: 0; }
            70%  { transform: scale(1.12); }
            100% { transform: scale(1); opacity: 1; }
          }
          .pop-in { animation: pop-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both; }

          /* ── AI response slide-in ── */
          @keyframes slide-in-up {
            from { transform: translateY(12px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
          .slide-in-up { animation: slide-in-up 0.3s ease-out both; }

          /* ── Utility ── */
          .glass-effect { backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
          .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #434656; border-radius: 10px; }
        `}} />
      </head>
      <body className="bg-surface text-on-surface selection:bg-primary-container selection:text-white antialiased" style={{ fontFamily: "'Inter', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
