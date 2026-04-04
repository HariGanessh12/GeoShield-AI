"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/utils/api-client";
import { getSessionUser } from "@/utils/auth";
import { formatCurrency, formatDate, statusTone } from "@/utils/format";

type Policy = {
  status: string;
  coverageAmount: number;
  premiumPaid: number;
  startDate: string;
  endDate: string;
};

type QuoteResponse = {
  quote: number;
  breakdown: {
    base: number;
    zoneSurcharge: number;
    reputationDiscount: number;
  };
  coverageAmount: number;
};

type PolicyResponse = { policy: Policy | null };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const toneClass: Record<string, string> = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  danger: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

export default function PolicyPage() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = getSessionUser();
    if (!user) return;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [policyData, quoteData] = await Promise.all([
          apiFetch<PolicyResponse>("/api/policy/current"),
          apiFetch<QuoteResponse>("/api/policy/quote", {
            method: "POST",
            body: JSON.stringify({ userId: user.id }),
          }),
        ]);

        setPolicy(policyData.policy);
        setQuote(quoteData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load policy details");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const activatePolicy = async () => {
    const user = getSessionUser();
    if (!user || !quote) return;

    setActivating(true);
    setError("");
    try {
      const response = await apiFetch<{ policy: Policy }>("/api/policy/activate", {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          premiumPaid: quote.quote,
          coverageAmount: quote.coverageAmount,
        }),
      });

      setPolicy(response.policy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not activate policy");
    } finally {
      setActivating(false);
    }
  };

  return (
    <motion.main 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
    >
      <motion.section variants={itemVariants} className="rounded-4xl border border-white/10 bg-white/3 p-8 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300 light-mode:text-emerald-700">Coverage</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-black text-white light-mode:text-slate-900">Policy center</h1>
            <p className="mt-3 max-w-2xl text-white/65 light-mode:text-slate-600">
              Review your current protection window and activate a new weekly plan when needed.
            </p>
          </div>
          <Link href="/dashboard" className="text-sm font-semibold text-sky-300 light-mode:text-sky-700 hover:underline">
            Back to dashboard
          </Link>
        </div>
      </motion.section>

      {error ? <motion.div variants={itemVariants} className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200 light-mode:text-rose-700">{error}</motion.div> : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <motion.section variants={itemVariants} className="rounded-4xl border border-white/10 bg-white/3 p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-xl">
          <h2 className="text-2xl font-black text-white light-mode:text-slate-900">Current status</h2>
          {loading ? (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">
              Loading policy details...
            </div>
          ) : policy ? (
            <motion.div variants={containerVariants} className="mt-6 space-y-4">
              <motion.div variants={itemVariants} className={`inline-flex rounded-full border px-4 py-2 text-sm font-bold ${toneClass[statusTone(policy.status)]}`}>
                {policy.status.toUpperCase()}
              </motion.div>
              <div className="grid gap-4 md:grid-cols-2">
                <motion.div variants={itemVariants} className="rounded-2xl border border-white/10 bg-black/20 p-5 light-mode:border-black/10 light-mode:bg-white shadow-sm transition-transform hover:scale-[1.02]">
                  <p className="text-sm text-white/50 light-mode:text-slate-500">Coverage amount</p>
                  <p className="mt-2 text-3xl font-black text-white light-mode:text-slate-900">{formatCurrency(policy.coverageAmount)}</p>
                </motion.div>
                <motion.div variants={itemVariants} className="rounded-2xl border border-white/10 bg-black/20 p-5 light-mode:border-black/10 light-mode:bg-white shadow-sm transition-transform hover:scale-[1.02]">
                  <p className="text-sm text-white/50 light-mode:text-slate-500">Premium paid</p>
                  <p className="mt-2 text-3xl font-black text-white light-mode:text-slate-900">{formatCurrency(policy.premiumPaid)}</p>
                </motion.div>
                <motion.div variants={itemVariants} className="rounded-2xl border border-white/10 bg-black/20 p-5 light-mode:border-black/10 light-mode:bg-white shadow-sm transition-transform hover:scale-[1.02]">
                  <p className="text-sm text-white/50 light-mode:text-slate-500">Start date</p>
                  <p className="mt-2 text-lg font-bold text-white light-mode:text-slate-900">{formatDate(policy.startDate)}</p>
                </motion.div>
                <motion.div variants={itemVariants} className="rounded-2xl border border-white/10 bg-black/20 p-5 light-mode:border-black/10 light-mode:bg-white shadow-sm transition-transform hover:scale-[1.02]">
                  <p className="text-sm text-white/50 light-mode:text-slate-500">End date</p>
                  <p className="mt-2 text-lg font-bold text-white light-mode:text-slate-900">{formatDate(policy.endDate)}</p>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">
              No active policy found yet. You can activate one from the quote panel.
            </div>
          )}
        </motion.section>

        <motion.section variants={itemVariants} className="rounded-4xl border border-white/10 bg-white/3 p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-xl">
          <h2 className="text-2xl font-black text-white light-mode:text-slate-900">Weekly quote</h2>
          {quote ? (
            <motion.div variants={containerVariants} className="mt-6 space-y-4">
              <motion.div variants={itemVariants} className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center shadow-lg">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300 light-mode:text-emerald-700">Premium</p>
                <p className="mt-3 text-5xl font-black text-white light-mode:text-slate-900">{formatCurrency(quote.quote)}</p>
                <p className="mt-2 text-sm text-white/65 light-mode:text-slate-600">Coverage up to {formatCurrency(quote.coverageAmount)}</p>
              </motion.div>
              <div className="space-y-3 text-sm text-white/70 light-mode:text-slate-600">
                <motion.div variants={itemVariants} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 light-mode:border-black/10 transition-colors hover:bg-white/5 light-mode:hover:bg-black/5">
                  <span>Base premium</span>
                  <span className="font-bold">{formatCurrency(quote.breakdown.base)}</span>
                </motion.div>
                <motion.div variants={itemVariants} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 light-mode:border-black/10 transition-colors hover:bg-white/5 light-mode:hover:bg-black/5">
                  <span>Zone surcharge</span>
                  <span className="font-bold">+{formatCurrency(quote.breakdown.zoneSurcharge)}</span>
                </motion.div>
                <motion.div variants={itemVariants} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 light-mode:border-black/10 transition-colors hover:bg-white/5 light-mode:hover:bg-black/5">
                  <span>Reputation discount</span>
                  <span className="font-bold">-{formatCurrency(quote.breakdown.reputationDiscount)}</span>
                </motion.div>
              </div>
              <motion.button
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={activatePolicy}
                disabled={activating}
                className="w-full rounded-2xl bg-emerald-500 px-5 py-4 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {activating ? "Activating..." : "Activate weekly policy"}
              </motion.button>
            </motion.div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">
              Quote unavailable right now.
            </div>
          )}
        </motion.section>
      </div>
    </motion.main>
  );
}