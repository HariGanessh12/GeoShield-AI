"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { apiFetch } from "@/utils/api-client";
import { getSessionUser } from "@/utils/auth";

type PolicyQuote = {
  quote: number;
  coverageAmount: number;
  breakdown: {
    base_premium: number;
    risk_adjustment: number;
    platform_fee: number;
    final_premium: number;
  };
  _meta?: { data_label?: string };
};

export default function PolicyDashboard() {
  const router = useRouter();
  const [quote, setQuote] = useState<PolicyQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchased, setPurchased] = useState(false);

  const fetchQuote = async () => {
    try {
      const user = getSessionUser();
      if (!user) return;

      const data = await apiFetch<PolicyQuote>("/api/policy/quote", {
        method: "POST",
        body: JSON.stringify({ userId: user.id }),
      });

      setQuote(data);
    } catch (error) {
      console.error("Quote fetch error:", error);
    }
  };

  useEffect(() => {
    const user = getSessionUser();
    if (user?.role !== "worker") {
      router.replace("/");
      return;
    }

    void fetchQuote();
  }, [router]);

  const buyPolicy = async () => {
    if (!quote) return;

    setLoading(true);
    try {
      const user = getSessionUser();
      if (!user) return;

      await apiFetch("/api/policy/activate", {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          premiumPaid: quote.quote,
          coverageAmount: quote.coverageAmount,
        }),
      });

      setPurchased(true);
    } catch (error) {
      console.error("Policy activation error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f17] text-white font-sans selection:bg-indigo-500/30">
      <div className="fixed inset-0 overflow-hidden z-0 pointer-events-none">
        <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full"></motion.div>
        <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, -5, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-emerald-900/20 blur-[120px] rounded-full"></motion.div>
      </div>

      <nav className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-white/5 backdrop-blur-xl bg-[#0d0f17]/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-white to-white/60">Policy Hub</h1>
        </div>
        <div className="flex items-center gap-6">
          <a href="/dashboard" className="text-xs font-bold text-gray-400 hover:text-white transition-colors border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2">Back to Dashboard</a>
        </div>
      </nav>

      <motion.main initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10 max-w-200 mx-auto px-6 py-12">
        {!quote ? (
          <div className="text-center text-gray-400 flex flex-col items-center justify-center mt-20">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            Calculating coverage premium...
          </div>
        ) : (
          <div className="bg-white/2 backdrop-blur-2xl border border-white/5 rounded-4xl p-8 shadow-2xl">
            <h2 className="text-3xl font-bold mb-2">Weekly Income Protection</h2>
            <p className="text-gray-400 mb-4 border-b border-white/10 pb-6 text-sm">Your premium is derived from backend risk signals, with live external data when available and explicit fallback labels when providers are unavailable.</p>
            <p className="mb-8 text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">{quote._meta?.data_label || "Live pricing engine"}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-gray-400 text-sm font-semibold">Base Premium</span>
                  <span className="font-bold text-white">₹{quote.breakdown.base_premium}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-rose-500/10 rounded-xl border border-rose-500/20">
                  <span className="text-rose-400 text-sm font-semibold">Risk Adjustment</span>
                  <span className="font-bold text-rose-300">+₹{quote.breakdown.risk_adjustment}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <span className="text-blue-400 text-sm font-semibold">Platform Fee</span>
                  <span className="font-bold text-blue-300">+₹{quote.breakdown.platform_fee}</span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-6 bg-linear-to-br from-[#0d0f17] to-black/60 rounded-3xl border border-emerald-500/20 shadow-inner text-center">
                <span className="text-xs text-gray-500 font-bold tracking-widest uppercase mb-2">Your Weekly Premium</span>
                <span className="text-6xl font-black text-white mb-4 drop-shadow-xl">₹{quote.breakdown.final_premium}</span>
                <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">Protects up to ₹{quote.coverageAmount}</span>
              </div>
            </div>

            {purchased ? (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full text-center p-6 bg-emerald-500/20 border border-emerald-500/50 rounded-2xl">
                <h3 className="text-xl font-bold text-emerald-400 mb-2">Policy Activated</h3>
                <p className="text-sm text-emerald-100/70 font-medium">You are covered for the next 7 days against supported external disruptions.</p>
              </motion.div>
            ) : (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={buyPolicy} disabled={loading} className="w-full relative overflow-hidden p-5 rounded-2xl bg-emerald-500 text-black font-black text-lg shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-50 hover:bg-emerald-400 transition-colors">
                {loading ? "Processing payment..." : "Subscribe Weekly Plan"}
              </motion.button>
            )}
          </div>
        )}
      </motion.main>
    </div>
  );
}
