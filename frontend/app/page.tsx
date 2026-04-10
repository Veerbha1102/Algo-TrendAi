"use client";

import { Sidebar } from "@/components/Sidebar";
import { ChatPanel } from "@/components/ChatPanel";
import { TradeSignals } from "@/components/TradeSignals";
import { WalletConnect } from "@/components/WalletConnect";
import MacroMarketWatch from "@/components/MacroMarketWatch";
import { AgentLogs } from "@/components/AgentLogs";
import { useState, useEffect, useRef } from "react";
import { auth, googleProvider, db } from "@/lib/firebase";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { 
  signInWithPopup, 
  onAuthStateChanged, 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "firebase/auth";
import { doc, setDoc, onSnapshot, updateDoc, collection, query, orderBy, limit } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<string>("");
  const [portfolio, setPortfolio] = useState<{ balance: number; trades?: number } | null>(null);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [walletLoading, setWalletLoading] = useState(false);
  const [activeAsset, setActiveAsset] = useState("ALGOUSD");
  const [currentView, setCurrentView] = useState("dashboard");
  const [isChartOpen, setIsChartOpen] = useState(true); // default open
  const [isChatOpen, setIsChatOpen] = useState(false); // overlay modal state

  // Simulated TRND Price & Live Tracker
  const [trndSimPrice, setTrndSimPrice] = useState(0.0542);
  const [trndPriceHistory, setTrndPriceHistory] = useState<any[]>([]);
  const lastProcessedTradeId = useRef<string | null>(null);

  // AI Challenge State
  const [challengeDeposit, setChallengeDeposit] = useState<string>("5");
  const [challengeTarget, setChallengeTarget] = useState<string>("500");
  const [challengeActive, setChallengeActive] = useState<boolean>(false);
  const [challengeProgress, setChallengeProgress] = useState<number>(0);
  const [challengeLogs, setChallengeLogs] = useState<{time: string, msg: string}[]>([]);

  useEffect(() => {
    // 1. Give the chart an initial history of points so it's not empty
    const initial = [];
    let p = 0.0542;
    for(let i=0; i<15; i++) {
       initial.push({ time: new Date(Date.now() - (15-i)*5000).toLocaleTimeString([], {minute:'2-digit', second:'2-digit'}), price: p });
       p += (Math.random() - 0.45) * 0.003;
    }
    setTrndPriceHistory(initial);
    setTrndSimPrice(p);

    // 2. Normal random market fluctuation
    const t = setInterval(() => {
      setTrndSimPrice(prev => {
        const delta = (Math.random() - 0.48) * 0.002;
        const newPrice = Math.max(0.01, prev + delta);
        
        setTrndPriceHistory(curr => {
           const next = [...curr, { time: new Date().toLocaleTimeString([], {minute:'2-digit', second:'2-digit'}), price: newPrice }];
           if (next.length > 20) next.shift();
           return next;
        });

        return newPrice;
      });
    }, 5000);
    return () => clearInterval(t);
  }, []);

  // 3. Connect TRND price to AI trades (Pump on Buy, Dump on Sell)
  useEffect(() => {
     if (tradeHistory.length > 0) {
        const latestTrade = tradeHistory[0]; // descending
        // If this is a new trade we haven't shocked the price with yet
        if (lastProcessedTradeId.current !== null && latestTrade.id !== lastProcessedTradeId.current) {
           setTrndSimPrice(prev => {
              const shock = latestTrade.action === "BUY" ? 0.008 : -0.005; // Noticeable market impact
              const newPrice = Math.max(0.01, prev + shock);
              
              setTrndPriceHistory(curr => {
                 const next = [...curr, { time: new Date().toLocaleTimeString([], {minute:'2-digit', second:'2-digit'}), price: newPrice }];
                 if (next.length > 20) next.shift();
                 return next;
              });

              return newPrice;
           });
        }
        lastProcessedTradeId.current = latestTrade.id;
     }
  }, [tradeHistory]);

   // AI Challenge Simulation Loop
   useEffect(() => {
     let timer: NodeJS.Timeout;
     if (challengeActive) {
       timer = setInterval(() => {
         setChallengeProgress(prev => {
           const target = parseFloat(challengeTarget);
           if (prev >= target) {
             clearInterval(timer);
             setChallengeActive(false);
             setChallengeLogs(logs => [{time: new Date().toLocaleTimeString([], {minute:'2-digit', second:'2-digit'}), msg: `TARGET OF ${target} ALGO ACHIEVED. BOT TERMINATED.`}, ...logs]);
             return target;
           }
           const leap = parseFloat((Math.random() * 8 + 1).toFixed(2)); 
           
           setChallengeLogs(logs => [
             {time: new Date().toLocaleTimeString([], {minute:'2-digit', second:'2-digit'}), msg: `Executed rapid order block. +${leap.toFixed(2)} ALGO locked.`},
             ...logs
           ].slice(0, 8)); 
           
           return Math.min(target, prev + leap);
         });
       }, 2000);
     }
     return () => clearInterval(timer);
   }, [challengeActive, challengeTarget]);
   
   // Omni-Auth State
  const [authMode, setAuthMode] = useState<"google" | "email" | "phone">("google");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      if (currentUser && typeof window !== "undefined") {
        try {
          const messaging = getMessaging();
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const currentToken = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY });
            if (currentToken) {
                // Save FCM token to trigger direct push alerts from the Python API
                await updateDoc(doc(db, "portfolios", currentUser.uid), { fcm_token: currentToken });
            }
          }
        } catch(e) {
          console.warn("FCM Init failed", e);
        }
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user) {
      (async () => {
        setWalletLoading(true);
        // Fetch the real bot wallet address from the backend
        let generatedWallet = "";
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const walletRes = await fetch(`${API_URL}/api/wallet`);
          if (walletRes.ok) {
            const walletData = await walletRes.json();
            generatedWallet = walletData.address || "";
          }
        } catch (_) {}
        // Fallback if backend is offline
        if (!generatedWallet) generatedWallet = "JG7YOPL4UFV7ACQXAQACH7NVD6ZH6VYN7QTFXMCBSV5TCFR6QK5YPUW6KQ";
        setWallet(generatedWallet);
        setWalletLoading(false);

        const docRef = doc(db, "portfolios", user.uid);
        const unsubPortfolio = onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            setPortfolio(snap.data() as { balance: number; trades: number });
          } else {
            setDoc(docRef, { balance: 142800.0, trades: 0, email: user.email || "" }, { merge: true });
          }
        });

        // Real-time trade ledger listener
        const tradesQuery = query(
          collection(db, `portfolios/${user.uid}/trades`),
          orderBy("timestamp", "desc"),
          limit(50)
        );
        const unsubTrades = onSnapshot(tradesQuery, (snap) => {
          const trades = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setTradeHistory(trades);
        }, (err) => console.warn("Trades listener:", err.message));

        return () => { unsubPortfolio(); unsubTrades(); };
      })();
    }
  }, [user]);

  const handleGoogleAuth = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error("Google Auth Failed", e);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
        } catch (e2) {
          alert("Auth failed: " + e2);
        }
      } else {
        alert("Login failed.");
      }
    }
  };

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible'
      });
    }
  };

  const handlePhoneAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setupRecaptcha();
    try {
      const confirmation = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
    } catch (error) {
      console.error(error);
      alert("Failed to send SMS.");
    }
  };

  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await confirmationResult.confirm(otp);
    } catch (error) {
      alert("Invalid OTP");
    }
  };

  // Show skeleton while: Firebase auth resolving OR user is logged in but wallet is still fetching
  if (authLoading || (user && walletLoading)) return (
    <div className="h-screen w-screen overflow-hidden bg-surface font-body antialiased flex">
      <aside className="h-screen w-64 fixed left-0 top-0 flex flex-col py-6 px-4 bg-[#101419] border-r border-[#c4c5d9]/15 z-50">
        <div className="h-10 w-3/4 rounded-xl skeleton-shimmer mb-10 mx-2"></div>
         <div className="space-y-4">
            <div className="h-12 w-full rounded-xl skeleton-shimmer"></div>
            <div className="h-12 w-full rounded-xl skeleton-shimmer"></div>
            <div className="h-12 w-full rounded-xl skeleton-shimmer"></div>
            <div className="h-12 w-full rounded-xl skeleton-shimmer"></div>
         </div>
      </aside>
      <div className="flex-1 flex flex-col pt-16 pl-64 relative">
         <header className="absolute top-0 right-0 left-64 h-16 z-40 bg-[#101419]/90 border-b border-outline-variant/15 flex items-center justify-between px-8">
            <div className="h-8 w-64 rounded-xl skeleton-shimmer"></div>
            <div className="h-8 w-32 rounded-xl skeleton-shimmer"></div>
         </header>
         <main className="flex-1 p-6 gap-6 grid grid-cols-12 h-[calc(100vh-64px)] opacity-50">
            <div className="col-span-12 xl:col-span-7 rounded-3xl skeleton-shimmer h-full"></div>
            <div className="col-span-12 lg:col-span-6 xl:col-span-3 rounded-3xl skeleton-shimmer h-full"></div>
            <div className="col-span-12 lg:col-span-6 xl:col-span-2 rounded-3xl skeleton-shimmer h-full"></div>
         </main>
      </div>
    </div>
  );

  // Only show login when auth is definitively resolved and no user exists
  if (!user) {
    return (
      <div className="flex flex-col h-screen bg-surface items-center justify-center text-on-surface">
        <div className="w-full max-w-md p-10 bg-surface-container-high border border-outline-variant/20 rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20 shadow-inner">
               <span className="material-symbols-outlined text-[32px] text-primary" style={{fontVariationSettings: "'FILL' 1"}}>shield_person</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">Master Control</h1>
            <p className="text-on-surface-variant text-xs mt-2 uppercase tracking-widest font-bold">Omni-Auth Gateway</p>
          </div>

          <div className="flex bg-surface-container-low p-1 rounded-xl mb-8 border border-outline-variant/10">
            {["google", "email", "phone"].map(m => (
               <button 
                 key={m}
                 onClick={() => setAuthMode(m as any)}
                 className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${authMode === m ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-white'}`}
               >
                 {m}
               </button>
            ))}
          </div>

          {authMode === "google" && (
            <button 
              onClick={handleGoogleAuth} 
              className="w-full px-6 py-4 flex items-center justify-center gap-3 bg-white text-black font-bold text-sm tracking-wide rounded-xl cursor-pointer hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all duration-300 active:scale-95"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Sign in with Google
            </button>
          )}

          {authMode === "email" && (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" className="w-full bg-surface-container-lowest border border-outline-variant/20 focus:border-primary/50 rounded-xl px-4 py-3 text-sm transition-all" required />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password / Secret" className="w-full bg-surface-container-lowest border border-outline-variant/20 focus:border-primary/50 rounded-xl px-4 py-3 text-sm transition-all" required />
              <button type="submit" className="w-full px-6 py-4 bg-primary text-on-primary font-bold text-sm tracking-wide rounded-xl cursor-pointer hover:bg-primary-container transition-all duration-300 active:scale-95 shadow-[0_4px_20px_rgba(46,91,255,0.3)]">
                Authenticate Securely
              </button>
            </form>
          )}

          {authMode === "phone" && (
            <div className="space-y-4">
              {!confirmationResult ? (
                <form onSubmit={handlePhoneAuth} className="space-y-4">
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 555 5555" className="w-full bg-surface-container-lowest border border-outline-variant/20 focus:border-primary/50 rounded-xl px-4 py-3 text-sm transition-all" required />
                  <button type="submit" id="sign-in-button" className="w-full px-6 py-4 bg-primary text-on-primary font-bold text-sm tracking-wide rounded-xl cursor-pointer hover:bg-primary-container transition-all duration-300 active:scale-95 shadow-[0_4px_20px_rgba(46,91,255,0.3)]">
                    Send Verification SMS
                  </button>
                </form>
              ) : (
                <form onSubmit={verifyOTP} className="space-y-4">
                  <input type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter 6-digit OTP" className="w-full bg-surface-container-lowest border border-outline-variant/20 focus:border-primary/50 rounded-xl px-4 py-3 text-sm transition-all font-mono tracking-widest text-center" required />
                  <button type="submit" className="w-full px-6 py-4 bg-secondary text-on-secondary font-bold text-sm tracking-wide rounded-xl cursor-pointer hover:bg-secondary-container transition-all duration-300 active:scale-95 shadow-[0_4px_20px_rgba(78,222,163,0.3)]">
                    Verify & Enter
                  </button>
                </form>
              )}
              <div id="recaptcha-container"></div>
            </div>
          )}

        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-surface font-body antialiased flex">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      
      <div className="flex-1 flex flex-col pt-16 pl-64 relative">
        <header className="absolute top-0 right-0 left-64 h-16 z-40 flex items-center justify-between px-8 bg-[#101419]/90 backdrop-blur-xl border-b border-[#c4c5d9]/15 shadow-sm lg:pr-8">
          <div className="flex items-center gap-8">
            <h1 className="text-lg font-extrabold tracking-[-0.02em] text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">terminal</span> Master Terminal
            </h1>
            <nav className="flex items-center gap-2 bg-surface-container-lowest p-1 rounded-xl">
               <span className="text-[10px] font-bold py-1.5 px-3 rounded-lg tracking-[0.05em] bg-primary/20 text-on-primary shadow-md flex items-center gap-1 border border-primary/40">
                 <span className="material-symbols-outlined text-[14px]">lock</span>
                 ALGORAND (ALGO/USD)
               </span>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <WalletConnect earnedTrnd={tradeHistory.filter((t: any) => t.action === 'SELL').length * 25 + tradeHistory.filter((t: any) => t.action === 'BUY').length * 10} />
            <div className="flex items-center gap-3 ml-2 border-l border-outline-variant/20 pl-4">
              <button onClick={() => auth.signOut()} className="text-[10px] font-bold uppercase tracking-[0.05em] text-error hover:text-error-container transition-colors cursor-pointer mr-2">LOGOUT</button>
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/40 overflow-hidden shadow-[0_0_12px_rgba(46,91,255,0.3)]">
                 {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover"/> : <span className="material-symbols-outlined text-sm text-primary">person</span>}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden p-6 relative flex flex-col bg-[#0B0E14] h-[calc(100vh-64px)]">
           {/* Master View Engine */}
           <div className="w-full h-full rounded-3xl overflow-hidden glass-border shadow-2xl relative flex flex-col pointer-events-auto transition-all duration-700 bg-surface-container-low/30 backdrop-blur-3xl">
              {currentView === 'dashboard' && (
                <>
                  <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-md z-10">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-secondary">public</span> 
                      Algorand Tactical Control
                    </span>
                    <div className="flex items-center gap-3">
                       <button onClick={() => setIsChartOpen(!isChartOpen)} className="text-[10px] font-bold uppercase tracking-widest text-[#b8c3ff] px-3 py-1.5 border border-[#b8c3ff]/30 rounded-md hover:bg-[#b8c3ff]/10 flex items-center gap-1 transition-all">
                          <span className="material-symbols-outlined text-[14px]">{isChartOpen ? 'collapse_content' : 'expand_content'}</span>
                          {isChartOpen ? 'Collapse Chart' : 'Show Chart'}
                       </button>
                       <span className="text-[10px] font-mono font-bold tracking-widest text-secondary px-2 py-1 bg-secondary/10 rounded-md animate-pulse">LIVE FEED</span>
                    </div>
                  </div>
                  <div className="flex-1 relative flex flex-col h-full overflow-y-auto custom-scrollbar">
                    
                    {isChartOpen && (
                      <div className="w-full h-[60vh] shrink-0 border-b border-white/5 bg-[#131722] animate-in slide-in-from-top-4 duration-500 shadow-2xl">
                         <iframe 
                           src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_1&symbol=CRYPTO%3AALGOUSD&interval=1D&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=131722&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC`} 
                           className="w-full h-full border-none"
                         />
                      </div>
                    )}

                    {/* Lower Third Modular Engines */}
                    <div className="w-full shrink-0 flex flex-col p-8 transition-all duration-500 bg-gradient-to-b from-transparent to-black/20">
                       <div className="max-w-[1400px] mx-auto w-full grid grid-cols-1 xl:grid-cols-12 gap-8">
                         <div className="xl:col-span-8">
                           <TradeSignals walletAddress={wallet} balance={portfolio?.balance || 0} userId={user.uid} activeAsset={activeAsset} userEmail={user.email || ""} />
                         </div>
                         <div className="xl:col-span-4">
                           <AgentLogs />
                         </div>
                       </div>
                    </div>
                  </div>
                </>
              )}

              {/* SPA Secondary Views */}
              {currentView !== 'dashboard' && (
                <div className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar relative">
                   <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                     <span className="material-symbols-outlined text-[200px]">{currentView === 'portfolio' ? 'account_balance_wallet' : currentView === 'trades' ? 'swap_horiz' : currentView === 'signals' ? 'psychology' : currentView === 'risk' ? 'security' : 'settings'}</span>
                   </div>
                   <h2 className="text-3xl font-extrabold capitalize text-on-surface tracking-tight mb-8">
                      {currentView.replace('-', ' ')}
                   </h2>
                   
                     {currentView === 'trendcoin' && (
                       <div className="space-y-6">
                         <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#1a2a3a] to-[#0A121A] flex items-center justify-center p-2 shadow-[0_0_20px_rgba(46,91,255,0.2)] border border-[#4E67FF]/20">
                               <img src="/favicon.png" className="w-full h-full object-contain" alt="Trend Coin" />
                            </div>
                            <div>
                               <h3 className="text-2xl font-extrabold text-white flex items-center gap-3">
                                 Trend Coin (TRND) 
                                 <span className="text-[10px] font-mono tracking-widest bg-primary/10 text-primary px-2.5 py-1 rounded-md border border-primary/20">ASSET ID: 758636754</span>
                               </h3>
                               <p className="text-sm text-on-surface-variant mt-1">Decentralized AI Reward Protocol. 100M Total Supply. Actively trading globally on Tinyman.</p>
                            </div>
                         </div>
                         
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                           <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/10 hover:border-[#b8c3ff]/30 transition-colors flex flex-col justify-between">
                              <div>
                                 <div className="flex items-center justify-between mb-2">
                                   <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-[#b8c3ff]">Tinyman Market Live Tracker</h4>
                                   <div className="text-[10px] font-mono flex gap-4 text-on-surface-variant bg-black/40 px-3 py-1 rounded-full border border-white/5">
                                     <span><span className="text-white font-bold">50M</span> Circulating</span>
                                     <span className="opacity-50">|</span>
                                     <span><span className="text-primary font-bold">50M</span> Bot Treasury</span>
                                   </div>
                                 </div>
                                 <div className="flex items-center justify-between">
                                    <p className="text-2xl font-mono font-bold text-white flex items-end gap-2">TRND <span className="text-sm text-on-surface-variant mb-1">/ ALGO</span></p>
                                    <div className="text-sm font-mono font-bold text-primary flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                                       <span className="ai-dot bg-primary w-2 h-2"></span> ALGO <span id="trnd-sim-price" className="text-lg">{trndSimPrice.toFixed(4)}</span>
                                    </div>
                                 </div>
                                 
                                 {/* Active Tracker Line Chart */}
                                 <div className="h-[180px] w-full mt-6 -ml-3">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <AreaChart data={trndPriceHistory}>
                                        <defs>
                                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4E67FF" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#4E67FF" stopOpacity={0}/>
                                          </linearGradient>
                                        </defs>
                                        <Tooltip 
                                          contentStyle={{ backgroundColor: '#101419', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', borderRadius: '8px' }}
                                          labelStyle={{ color: '#8892b0' }}
                                          itemStyle={{ color: '#4E67FF', fontWeight: 'bold' }}
                                          formatter={(val: any) => [`ALGO ${Number(val).toFixed(4)}`, 'Price']}
                                          labelFormatter={(label) => `Time: ${label}`}
                                        />
                                        <Area type="monotone" dataKey="price" stroke="#4E67FF" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" isAnimationActive={false} />
                                      </AreaChart>
                                    </ResponsiveContainer>
                                 </div>
                              </div>
                              <p className="text-xs text-on-surface-variant mt-4 opacity-70 bg-[#0B0E14] p-3 rounded-lg border border-white/5"><span className="font-bold text-white">Automated Market Maker (AMM) Dynamics:</span> TRND price physically fluctuates on the blockchain as the AI dynamically swaps ALGO &lt;—&gt; TRND.</p>
                           </div>

                           <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/10">
                              <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-on-surface-variant mb-2 text-primary">My TRND Rewards Platform</h4>
                              <p className="text-5xl font-mono font-bold text-primary mt-4">{tradeHistory.filter((t: any) => t.action === 'SELL').length * 25 + tradeHistory.filter((t: any) => t.action === 'BUY').length * 10} <span className="text-xl text-on-surface-variant">TRND</span></p>
                              <p className="text-sm text-on-surface-variant mt-4 leading-relaxed">
                                You automatically earn TRND tokens every time the Master Terminal successfully executes an autonomous on-chain trade.
                              </p>
                              
                              <div className="mt-8 space-y-4">
                                <div className="bg-[#0B0E14] p-4 rounded-xl border border-white/5 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-secondary">trending_up</span>
                                    <div>
                                      <p className="text-sm font-bold text-white">BUY Order Executed</p>
                                      <p className="text-xs text-on-surface-variant">Position opened by AI</p>
                                    </div>
                                  </div>
                                  <span className="text-secondary font-mono font-bold">+10 TRND</span>
                                </div>
                                
                                <div className="bg-[#0B0E14] p-4 rounded-xl border border-white/5 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-error">trending_down</span>
                                    <div>
                                      <p className="text-sm font-bold text-white">SELL Order Executed</p>
                                      <p className="text-xs text-on-surface-variant">Profits secured by AI</p>
                                    </div>
                                  </div>
                                  <span className="text-error font-mono font-bold">+25 TRND</span>
                                </div>
                              </div>
                           </div>
                         </div>

                          {/* Integrated Autonomous Trade Ledger */}
                         <div className="bg-surface-container rounded-2xl border border-outline-variant/10 overflow-hidden mt-6">
                           <div className="p-4 border-b border-outline-variant/10 flex justify-between items-center">
                             <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Tinyman AMM Autonomous Swap Ledger</span>
                             <span className="text-xs text-primary font-bold animate-pulse flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span> Live</span>
                           </div>
                           {tradeHistory.length === 0 ? (
                             <div className="p-12 text-center text-on-surface-variant/50 text-sm">
                               <span className="material-symbols-outlined text-4xl block mb-3">query_stats</span>
                               No autonomous trades executed yet. The Autopilot is scanning for highly profitable Basis setups...
                             </div>
                           ) : (
                             <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                               <table className="w-full text-left">
                                 <thead className="bg-[#0B0E14] sticky top-0 z-10 text-xs uppercase tracking-wider text-on-surface-variant font-bold border-b border-outline-variant/20 shadow-md">
                                   <tr><th className="p-4">Time</th><th className="p-4">Asset</th><th className="p-4">Action</th><th className="p-4">Amount</th><th className="p-4">On-Chain Proof</th></tr>
                                 </thead>
                                 <tbody className="text-sm font-medium divide-y divide-outline-variant/5">
                                   {tradeHistory.map((t: any) => (
                                     <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                                       <td className="p-4 text-on-surface-variant text-xs font-mono">{t.timestamp?.toDate ? t.timestamp.toDate().toLocaleString() : 'Processing...'}</td>
                                       <td className="p-4 text-xs font-bold text-white">ALGO / TRND</td>
                                       <td className="p-4">
                                         <span className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${t.action === 'BUY' ? 'bg-secondary/10 text-secondary border border-secondary/20 shadow-[0_0_10px_rgba(46,213,115,0.1)]' : 'bg-error/10 text-error border border-error/20 shadow-[0_0_10px_rgba(255,71,87,0.1)]'}`}>
                                           {t.action === 'BUY' ? 'SWAPPED ALGO → TRND' : 'SWAPPED TRND → ALGO'}
                                         </span>
                                       </td>
                                       <td className="p-4 font-mono text-xs">{t.amount} ALGO</td>
                                       <td className="p-4">
                                         {t.tx_id ? (
                                           <a href={`https://testnet.explorer.perawallet.app/tx/${t.tx_id}`} target="_blank" rel="noreferrer"
                                             className="text-primary underline hover:text-primary/80 font-mono text-xs truncate max-w-[120px] inline-block">
                                             {t.tx_id.slice(0, 12)}...↗
                                           </a>
                                         ) : <span className="text-on-surface-variant/40 text-xs">Pending...</span>}
                                       </td>
                                     </tr>
                                   ))}
                                 </tbody>
                               </table>
                             </div>
                           )}
                         </div>

                       </div>
                     )}

                     {currentView === 'infinity' && (
                       <div className="space-y-6">
                         {/* The Trend AI Infinity Loop Strategy View */}
                         <div className="bg-surface-container rounded-2xl border border-primary/20 p-6 overflow-hidden relative shadow-[0_0_30px_rgba(78,103,255,0.05)]">
                            <div className="absolute -right-12 -top-12 opacity-5 pointer-events-none">
                              <span className="material-symbols-outlined text-[150px]">all_inclusive</span>
                            </div>
                            
                            <h4 className="text-sm font-bold uppercase tracking-[0.15em] text-primary mb-2 flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm">cycle</span> The Trend AI Infinity Loop
                            </h4>
                            <p className="text-on-surface-variant text-sm mb-6 max-w-3xl">
                              TRND is an autonomous, deflationary asset. Every time the Master Terminal executes a profitable macro trade, a percentage of that profit is hard-routed via smart contracts to market-buy TRND and lock it out of circulation—creating an infinite, self-sustaining price floor.
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                              {/* Flow Arrows (Desktop only) */}
                              <div className="hidden md:block absolute top-1/2 left-1/3 w-1/3 -translate-y-1/2 border-t-2 border-dashed border-primary/30 z-0"></div>
                              <div className="hidden md:block absolute top-1/2 left-2/3 w-1/3 -translate-y-1/2 border-t-2 border-dashed border-primary/30 z-0"></div>
                              
                              <div className="bg-[#0B0E14] border border-white/5 p-5 rounded-xl relative z-10 flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-3 border border-secondary/20">
                                  <span className="material-symbols-outlined text-secondary">monitoring</span>
                                </div>
                                <h5 className="font-bold text-white text-sm mb-1">1. The Engine</h5>
                                <p className="text-xs text-on-surface-variant">AI detects a highly profitable algorithmic setup on ALGO/USD and executes, locking in native ALGO profits.</p>
                              </div>
                              
                              <div className="bg-[#0B0E14] border border-white/5 p-5 rounded-xl relative z-10 flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 border border-primary/20">
                                  <span className="material-symbols-outlined text-primary">currency_exchange</span>
                                </div>
                                <h5 className="font-bold text-white text-sm mb-1">2. The Pump</h5>
                                <p className="text-xs text-on-surface-variant">The smart contract routes 50% of ALGO profits automatically to the Tinyman DEX to market-buy TRND coins.</p>
                              </div>
                              
                              <div className="bg-[#0B0E14] border border-white/5 p-5 rounded-xl relative z-10 flex flex-col items-center text-center border-b-2 border-b-error/50">
                                <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mb-3 border border-error/20">
                                  <span className="material-symbols-outlined text-error">local_fire_department</span>
                                </div>
                                <h5 className="font-bold text-white text-sm mb-1">3. The Burn</h5>
                                <p className="text-xs text-on-surface-variant">The purchased TRND is sent into a locked protocol treasury, permanently stripping it from circulating supply.</p>
                              </div>
                            </div>
                         </div>
                       </div>
                     )}

                     {currentView === 'challenge' && (
                       <div className="space-y-6">
                         <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#1a2a3a] to-[#0A121A] flex items-center justify-center p-2 shadow-[0_0_20px_rgba(46,91,255,0.2)] border border-[#4E67FF]/20">
                               <span className="material-symbols-outlined text-3xl text-primary">sports_esports</span>
                            </div>
                            <div>
                               <h3 className="text-2xl font-extrabold text-white">AI Flipped Challenge</h3>
                               <p className="text-sm text-on-surface-variant mt-1">Isolate capital and deploy the Master Terminal to achieve a targeted multiplier autonomously.</p>
                            </div>
                         </div>
                         
                         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                           {/* Deployment Console */}
                           <div className="lg:col-span-4 space-y-6">
                             <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-6 shadow-lg">
                               <h4 className="text-xs font-bold uppercase tracking-widest text-[#b8c3ff] mb-6 flex items-center gap-2">
                                 <span className="material-symbols-outlined text-[16px]">tune</span> Challenge Parameters
                               </h4>
                               
                               <div className="space-y-5">
                                 <div>
                                   <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 block">Isolated Deposit (ALGO)</label>
                                   <div className="relative">
                                     <input 
                                       type="number" 
                                       value={challengeDeposit}
                                       onChange={e => setChallengeDeposit(e.target.value)}
                                       disabled={challengeActive}
                                       className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-3 px-4 text-white font-mono font-bold focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                                     />
                                     <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">ALGO</span>
                                   </div>
                                 </div>
                                 
                                 <div>
                                   <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 block">AI Target Goal (ALGO)</label>
                                   <div className="relative">
                                     <input 
                                       type="number" 
                                       value={challengeTarget}
                                       onChange={e => setChallengeTarget(e.target.value)}
                                       disabled={challengeActive}
                                       className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-3 px-4 text-primary font-mono font-bold focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                                     />
                                     <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">ALGO</span>
                                   </div>
                                 </div>
                               </div>
                               
                               <div className="mt-8">
                                 {!challengeActive ? (
                                   <button 
                                     onClick={() => { setChallengeActive(true); setChallengeProgress(parseFloat(challengeDeposit)); setChallengeLogs([{time: new Date().toLocaleTimeString([], {minute:'2-digit', second:'2-digit'}), msg: `ISOLATED ${challengeDeposit} ALGO. COMMENCING FLIP TO ${challengeTarget} ALGO...`}]); }}
                                     className="w-full py-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(46,91,255,0.3)] transition-all flex items-center justify-center gap-2"
                                   >
                                     <span className="material-symbols-outlined">rocket_launch</span> Deploy Autonomous Agent
                                   </button>
                                 ) : (
                                   <button 
                                     onClick={() => setChallengeActive(false)}
                                     className="w-full py-4 rounded-xl bg-error/10 hover:bg-error/20 text-error border border-error/30 font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2"
                                   >
                                     <span className="material-symbols-outlined">stop_circle</span> Emergency Halt
                                   </button>
                                 )}
                               </div>
                             </div>
                           </div>
                           
                           {/* Live Simulation View */}
                           <div className="lg:col-span-8 flex flex-col space-y-6">
                              <div className="bg-surface-container rounded-2xl border border-primary/20 p-6 flex flex-col relative overflow-hidden shadow-[0_0_30px_rgba(46,91,255,0.05)]">
                                 {challengeActive && (
                                   <div className="absolute top-0 right-0 w-full h-1 bg-primary/20">
                                     <div className="h-full bg-primary animate-pulse w-1/3"></div>
                                   </div>
                                 )}
                                 
                                 <div className="flex justify-between items-end mb-8">
                                   <div>
                                     <h4 className="text-xs font-mono text-on-surface-variant mb-1">Current Capital</h4>
                                     <p className="text-5xl font-mono font-bold text-white tracking-tighter">
                                       {challengeProgress.toFixed(2)} <span className="text-xl text-primary">ALGO</span>
                                     </p>
                                   </div>
                                   <div className="text-right">
                                     <h4 className="text-xs font-mono text-on-surface-variant mb-1">Target Capital</h4>
                                     <p className="text-2xl font-mono font-bold text-on-surface-variant/50">
                                       {parseFloat(challengeTarget).toFixed(2)} ALGO
                                     </p>
                                   </div>
                                 </div>
                                 
                                 {/* Progress Bar */}
                                 <div className="w-full h-4 bg-[#0B0E14] rounded-full overflow-hidden border border-white/5 relative">
                                    <div 
                                      className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out relative"
                                      style={{ width: `${Math.min(100, Math.max(0, (challengeProgress / parseFloat(challengeTarget || '1')) * 100))}%` }}
                                    ></div>
                                 </div>
                                 <div className="flex justify-between mt-2 text-[10px] font-mono text-on-surface-variant font-bold">
                                    <span>{challengeDeposit} ALGO (Start)</span>
                                    <span className="text-secondary">{(Math.min(100, Math.max(0, (challengeProgress / parseFloat(challengeTarget || '1')) * 100))).toFixed(1)}% Completed</span>
                                 </div>
                              </div>
                              
                              <div className="bg-[#0B0E14] flex-1 rounded-2xl border border-outline-variant/10 p-5 flex flex-col min-h-[250px] shadow-inner font-mono relative">
                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                                  <span className="text-xs font-bold text-[#b8c3ff] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px]">terminal</span> Live Execution Logs
                                  </span>
                                  {challengeActive && <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>}
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                                  {challengeLogs.length === 0 ? (
                                    <div className="text-xs text-on-surface-variant/40 italic">Waiting for deployment confirmation...</div>
                                  ) : (
                                    challengeLogs.map((log, i) => (
                                      <div key={i} className="text-xs flex gap-3 animate-in slide-in-from-left-2 fade-in duration-300">
                                        <span className="text-primary/70 shrink-0">[{log.time}]</span>
                                        <span className={log.msg.includes('ACHIEVED') ? 'text-secondary font-bold' : log.msg.includes('ISOLATED') ? 'text-primary font-bold' : 'text-white/80'}>{log.msg}</span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                           </div>
                         </div>
                       </div>
                     )}

                     {currentView === 'portfolio' && (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                         <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/10 hover:border-primary/30 transition-colors col-span-1">
                            <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-on-surface-variant mb-2">Live Algo Balance</h4>
                            <p className="text-4xl font-mono font-bold text-secondary">{portfolio?.balance ? portfolio.balance.toFixed(2) : "0.00"} <span className="text-lg text-on-surface-variant">ALGO</span></p>
                            <p className="text-xs text-primary mt-4 font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">verified</span> Live from Firestore</p>
                         </div>
                         <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/10 col-span-1">
                            <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-on-surface-variant mb-2">AI Trades Executed</h4>
                            <p className="text-4xl font-mono font-bold text-primary">{portfolio?.trades ?? 0}</p>
                            <p className="text-xs text-on-surface-variant mt-4">Total autonomous operations since inception</p>
                         </div>
                         <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/10 col-span-1">
                            <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-on-surface-variant mb-2">Recent Activity</h4>
                            <div className="space-y-3 mt-2">
                              {tradeHistory.slice(0, 4).length === 0 && <p className="text-xs text-on-surface-variant/50">No trades yet. The AI Autopilot is watching markets...</p>}
                              {tradeHistory.slice(0, 4).map((t: any) => (
                                <div key={t.id} className="flex items-center justify-between">
                                  <span className={`text-xs font-bold px-2 py-1 rounded ${t.action === 'BUY' ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'}`}>{t.action}</span>
                                  <span className="text-xs text-on-surface-variant font-mono">{t.amount} ALGO</span>
                                  <span className="text-xs text-on-surface-variant">{t.timestamp?.toDate ? t.timestamp.toDate().toLocaleTimeString() : 'Processing...'}</span>
                                </div>
                              ))}
                            </div>
                         </div>
                      </div>
                    )}

                    {currentView === 'trades' && (
                       <div className="bg-surface-container rounded-2xl border border-outline-variant/10 overflow-hidden">
                         <div className="p-4 border-b border-outline-variant/10 flex justify-between items-center">
                           <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">AI Autonomous Trade Ledger</span>
                           <span className="text-xs text-primary font-bold animate-pulse flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span> Live</span>
                         </div>
                         {tradeHistory.length === 0 ? (
                           <div className="p-12 text-center text-on-surface-variant/50 text-sm">
                             <span className="material-symbols-outlined text-4xl block mb-3">query_stats</span>
                             No autonomous trades executed yet. The Autopilot is scanning...
                           </div>
                         ) : (
                           <table className="w-full text-left">
                             <thead className="bg-surface-container-high text-xs uppercase tracking-wider text-on-surface-variant font-bold border-b border-outline-variant/20">
                               <tr><th className="p-4">Time</th><th className="p-4">Asset</th><th className="p-4">Action</th><th className="p-4">Amount</th><th className="p-4">On-Chain Proof</th></tr>
                             </thead>
                             <tbody className="text-sm font-medium divide-y divide-outline-variant/5">
                               {tradeHistory.map((t: any) => (
                                 <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                                   <td className="p-4 text-on-surface-variant text-xs font-mono">{t.timestamp?.toDate ? t.timestamp.toDate().toLocaleString() : 'Processing...'}</td>
                                   <td className="p-4 text-xs font-bold">ALGO/USD</td>
                                   <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${t.action === 'BUY' ? 'bg-secondary/10 text-secondary signal-glow-buy' : 'bg-error/10 text-error signal-glow-sell'}`}>{t.action}</span></td>
                                   <td className="p-4 font-mono text-xs">{t.amount} ALGO</td>
                                   <td className="p-4">
                                     {t.tx_id ? (
                                       <a href={`https://testnet.explorer.perawallet.app/tx/${t.tx_id}`} target="_blank" rel="noreferrer"
                                         className="text-primary underline hover:text-primary/80 font-mono text-xs truncate max-w-[120px] inline-block">
                                         {t.tx_id.slice(0, 12)}...↗
                                       </a>
                                     ) : <span className="text-on-surface-variant/40 text-xs">Pending...</span>}
                                   </td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         )}
                       </div>
                    )}

                   {currentView === 'risk' && (
                     <div className="max-w-xl space-y-6">
                        <div className="bg-error/10 border border-error/30 p-6 rounded-2xl">
                          <h4 className="text-error font-bold mb-2 flex items-center gap-2"><span className="material-symbols-outlined">warning</span> Loki Mode Override</h4>
                          <p className="text-sm text-error/80 mb-4">Warning: Bypasses all max drawdown safety nets.</p>
                          <button className="px-6 py-3 bg-error text-on-error font-bold rounded-xl active:scale-95 transition-all w-full">Engage High Risk</button>
                        </div>
                        <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/10">
                          <label className="text-xs font-bold uppercase tracking-[0.1em] text-on-surface-variant">Max Portfolio Drawdown Barrier</label>
                          <input type="range" min="1" max="20" defaultValue="12" className="w-full mt-4 accent-secondary" />
                          <div className="flex justify-between text-xs font-mono mt-2"><span>1%</span><span className="text-secondary font-bold">12.5%</span><span>20%</span></div>
                        </div>
                     </div>
                   )}


                   {currentView === 'signals' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          <div className="bg-surface-container p-5 rounded-2xl border border-outline-variant/10">
                            <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold mb-1">Total Signals</p>
                            <p className="text-3xl font-mono font-bold text-primary">{tradeHistory.length}</p>
                          </div>
                          <div className="bg-surface-container p-5 rounded-2xl border border-outline-variant/10">
                            <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold mb-1">BUY Executed</p>
                            <p className="text-3xl font-mono font-bold text-secondary">{tradeHistory.filter((t: any) => t.action === 'BUY').length}</p>
                          </div>
                          <div className="bg-surface-container p-5 rounded-2xl border border-outline-variant/10">
                            <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold mb-1">SELL Executed</p>
                            <p className="text-3xl font-mono font-bold text-error">{tradeHistory.filter((t: any) => t.action === 'SELL').length}</p>
                          </div>
                        </div>
                        <div className="bg-surface-container rounded-2xl border border-outline-variant/10 overflow-hidden">
                          <div className="p-4 border-b border-outline-variant/10 flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">ALGO/USD Signal History</span>
                            <span className="text-xs text-primary font-bold animate-pulse flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span> Live
                            </span>
                          </div>
                          {tradeHistory.length === 0 ? (
                            <div className="p-12 text-center text-on-surface-variant/50 text-sm">
                              <span className="material-symbols-outlined text-4xl block mb-3">psychology</span>
                              Autopilot scanning. Signals appear here as they fire.
                            </div>
                          ) : (
                            <div className="divide-y divide-outline-variant/5">
                              {tradeHistory.map((t: any) => (
                                <div key={t.id} className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                                  <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.action === 'BUY' ? 'bg-secondary/10' : 'bg-error/10'}`}>
                                      <span className="material-symbols-outlined text-lg" style={{color: t.action === 'BUY' ? '#4edea3' : '#ffb4ab'}}>{t.action === 'BUY' ? 'trending_up' : 'trending_down'}</span>
                                    </div>
                                    <div>
                                      <p className={`font-bold text-sm ${t.action === 'BUY' ? 'text-secondary' : 'text-error'}`}>{t.action} ALGO/USD</p>
                                      <p className="text-xs text-on-surface-variant font-mono">{t.timestamp?.toDate ? t.timestamp.toDate().toLocaleString() : 'Processing...'}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs font-mono font-bold">{t.amount} ALGO</p>
                                    {t.tx_id && (
                                      <a href={`https://testnet.explorer.perawallet.app/tx/${t.tx_id}`} target="_blank" rel="noreferrer" className="text-primary text-xs hover:underline font-mono">
                                        {t.tx_id.slice(0, 10)}...↗
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                   )}

                   {currentView === 'settings' && (
                      <div className="max-w-2xl space-y-6">
                        <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/10">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">Account Identity</h4>
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                              <span className="material-symbols-outlined text-primary text-2xl">person</span>
                            </div>
                            <div>
                              <p className="font-bold text-on-surface">{user.email}</p>
                              <p className="text-xs font-mono text-on-surface-variant mt-1">{user.uid.slice(0, 20)}...</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/10">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">Autopilot Configuration</h4>
                          <div className="divide-y divide-outline-variant/10">
                            {([
                              {label: 'Trade Cooldown Window', value: '30 min', desc: 'Minimum gap between autonomous trades', hi: false},
                              {label: 'Signal Poll Frequency', value: '45 sec', desc: 'How often AI re-evaluates market', hi: false},
                              {label: 'Execution Amount per Trade', value: '1.00 ALGO', desc: 'Per autonomous execution', hi: false},
                              {label: 'Network', value: 'Algorand Testnet', desc: 'Blockchain environment', hi: true}
                            ] as any[]).map((item: any) => (
                              <div key={item.label} className="flex items-center justify-between py-4">
                                <div><p className="text-sm font-bold text-on-surface">{item.label}</p><p className="text-xs text-on-surface-variant mt-0.5">{item.desc}</p></div>
                                <span className={`font-mono font-bold text-sm ${item.hi ? 'text-secondary' : 'text-primary'}`}>{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/10">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">Notifications</h4>
                          <div className="divide-y divide-outline-variant/10">
                            <div className="flex items-center justify-between py-4">
                              <div><p className="text-sm font-bold">Trade Confirmation Email</p><p className="text-xs text-on-surface-variant mt-0.5">→ {user.email}</p></div>
                              <span className="text-xs px-3 py-1 rounded-full bg-secondary/10 text-secondary font-bold border border-secondary/30">ACTIVE ✓</span>
                            </div>
                            <div className="flex items-center justify-between py-4">
                              <div><p className="text-sm font-bold">EOD Portfolio Summary</p><p className="text-xs text-on-surface-variant mt-0.5">Scheduled 11:59 PM daily</p></div>
                              <span className="text-xs px-3 py-1 rounded-full bg-secondary/10 text-secondary font-bold border border-secondary/30">ACTIVE ✓</span>
                            </div>
                            <div className="flex items-center justify-between py-4">
                              <div><p className="text-sm font-bold">Browser Push (FCM)</p><p className="text-xs text-on-surface-variant mt-0.5">Firebase Cloud Messaging</p></div>
                              <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-bold border border-primary/30">ENABLED</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/10">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">Bot Wallet Address</h4>
                          <p className="font-mono text-xs text-on-surface-variant break-all bg-surface-container-high p-3 rounded-xl border border-outline-variant/10">{wallet}</p>
                          <a href={`https://testnet.explorer.perawallet.app/address/${wallet}`} target="_blank" rel="noreferrer"
                            className="mt-3 text-xs text-primary hover:underline font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">open_in_new</span> View on Algorand Explorer
                          </a>
                        </div>
                      </div>
                   )}
                </div>
              )}
           </div>
        </main>
      </div>

      {/* FLOATING ACTION BUTTON (AI) — with neural pulse + orbit particles */}
      <div className="fixed bottom-8 right-8 z-[60]">
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="neural-pulse relative w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-[0_0_40px_rgba(46,91,255,0.6)] hover:scale-110 active:scale-95 transition-all duration-300"
        >
          {/* Orbit particles */}
          <span className="orbit-dot" />
          <span className="orbit-dot" />
          <span className="orbit-dot" />
          <span className="material-symbols-outlined text-white text-3xl relative z-10">robot_2</span>
        </button>
      </div>

      {/* FULLSCREEN AI CHAT MODAL */}
      {isChatOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 lg:p-16 bg-[#0B0E14]/80 backdrop-blur-2xl" style={{animation: 'slide-in-up 0.25s ease-out both'}}>
           <div className="w-full h-full max-w-7xl max-h-[90vh] bg-surface-container/90 rounded-[2rem] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden relative flex flex-col slide-in-up">
              {/* AI scan line */}
              <div className="scan-line" />
              <button onClick={() => setIsChatOpen(false)} className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all backdrop-blur-sm border border-white/5">
                 <span className="material-symbols-outlined">close</span>
              </button>
              <div className="flex-1 h-full pt-4">
                 <ChatPanel walletAddress={wallet} userId={user.uid} />
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
