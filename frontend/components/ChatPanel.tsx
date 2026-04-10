"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";

interface Message {
  role: "user" | "model";
  content: string;
}

export function ChatPanel({ walletAddress, userId }: { walletAddress: string, userId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, `portfolios/${userId}/chats`),
      orderBy("timestamp", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(doc => ({
        role: doc.data().role,
        content: doc.data().content
      }));
      setMessages(msgs.length ? msgs : [{ role: "model", content: "Good day, I am your Quantitative Architectural Advisor. How can I assist with your algorithmic portfolio today?" }]);
    }, (error) => {
      console.warn("Firebase listener error:", error.message);
    });
    return () => unsub();
  }, [userId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || !userId) return;

    const userContent = input;
    setInput("");
    setLoading(true);

    try {
      try {
        await addDoc(collection(db, `portfolios/${userId}/chats`), {
          role: "user",
          content: userContent,
          timestamp: serverTimestamp()
        });
      } catch (err) {
        console.warn("Could not save to db, ephemeral mode:", err);
      }

      const API_URL = "https://algo-trendai.onrender.com";
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userContent,
          context: messages.slice(-50) // Sending more history so the AI remembers context
        }),
      });
      const data = await response.json();

      try {
        await addDoc(collection(db, `portfolios/${userId}/chats`), {
          role: "model",
          content: data.response,
          timestamp: serverTimestamp()
        });
      } catch (err) {
        console.warn("Could not save to db, ephemeral mode:", err);
      }

    } catch (error) {
      console.error(error);
      await addDoc(collection(db, `portfolios/${userId}/chats`), {
        role: "model",
        content: "I apologize, my systems are currently offline temporarily. Please standby.",
        timestamp: serverTimestamp()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#1c222a]/90 backdrop-blur-3xl border border-outline-variant/15 rounded-3xl shadow-inner overflow-hidden">
        <div className="p-4 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container-lowest/50">
          <div>
            <h4 className="text-on-surface font-bold text-sm flex items-center gap-2"><span className="material-symbols-outlined text-sm text-primary">smart_toy</span> Quantitative Architect</h4>
            <p className="text-on-surface-variant text-[10px] mt-1 text-primary animate-pulse">● AI Network Online</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          <div className="space-y-4 mt-2">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={cn(
                  "rounded-2xl p-3 space-y-2",
                  msg.role === "user"
                    ? "bg-primary-container/40 border-l-2 border-primary mr-8 shadow-sm"
                    : "bg-surface-container-high/60 ml-8 shadow-sm"
                )}
              >
                <div className="flex gap-2">
                  <div className={msg.role === "user" ? "text-primary text-xs" : "text-secondary text-xs mt-0.5"}>
                    <span className="material-symbols-outlined text-xs">{msg.role === "user" ? "person" : "auto_awesome"}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="bg-surface-container-high/60 rounded-2xl p-3 space-y-2 w-fit ml-8 shadow-sm">
                <div className="flex gap-2 text-secondary text-sm">
                  <span className="w-1.5 h-1.5 bg-secondary/80 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-secondary/80 rounded-full animate-bounce delay-75"></span>
                  <span className="w-1.5 h-1.5 bg-secondary/80 rounded-full animate-bounce delay-150"></span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </div>

        <div className="p-3 bg-surface-container-lowest/30 border-t border-outline-variant/15 mt-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex flex-col gap-2 relative group"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!userId || loading}
              placeholder="Query the system..."
              className="bg-surface-container border border-outline-variant/20 rounded-xl py-3 pl-4 pr-12 text-xs font-medium focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all w-full placeholder:text-on-surface-variant/40 shadow-inner"
              type="text"
            />
             <button type="submit" disabled={!input || loading} className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square flex items-center justify-center bg-primary hover:bg-primary-container text-on-primary rounded-lg cursor-pointer disabled:opacity-50 transition-all"><span className="material-symbols-outlined text-sm">arrow_upward</span></button>
          </form>
        </div>
      </div>
  );
}
