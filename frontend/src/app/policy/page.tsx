"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/utils/api-client";
import { getSessionUser } from "@/utils/auth";
import { formatCurrency, formatDate, statusTone } from "@/utils/format";

type Policy = {
  _id?: string;
  status: string;
  coverageAmount: number;
  premiumPaid: number;
  startDate: string;
  endDate: string;
  coveredEvents?: string[];
  maxPayoutPerEvent?: number;
};

type QuoteResponse = {
  quote: number;
  breakdown: {
    base: number;
    risk_adjustment: number;
    platform_fee: number;
    final_premium: number;
  };
  coverageAmount: number;
};

type PolicyResponse = { policy: Policy | null };
type PolicyHistoryResponse = { policies: Policy[] };

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
  const [savingSettings, setSavingSettings] = useState(false);
  const [policyHistory, setPolicyHistory] = useState<Policy[]>([]);
  const [coverageAmount, setCoverageAmount] = useState(3500);
  const [maxPayoutPerEvent, setMaxPayoutPerEvent] = useState(1000);
  const [coveredEvents, setCoveredEvents] = useState<string[]>(["HEAVY_RAIN", "HEATWAVE", "PLATFORM_OUTAGE"]);
  const supportedEvents = ["HEAVY_RAIN", "HEATWAVE", "PLATFORM_OUTAGE", "AQI_SEVERE", "TRAFFIC_SURGE"];

  useEffect(() => {
    const user = getSessionUser();
    if (!user) return;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [policyData, historyData, quoteData] = await Promise.all([
          apiFetch<PolicyResponse>("/api/policy/current"),
          apiFetch<PolicyHistoryResponse>("/api/policy/history"),
          apiFetch<QuoteResponse>("/api/policy/quote", {
            method: "POST",
            body: JSON.stringify({ userId: user.id }),
          }),
        ]);

        setPolicy(policyData.policy);
        setPolicyHistory(policyData.policy ? [policyData.policy, ...historyData.policies.filter((item) => item._id !== policyData.policy?._id)] : historyData.policies);
        setQuote(quoteData);
        if (policyData.policy) {
          setCoverageAmount(policyData.policy.coverageAmount || 3500);
          setMaxPayoutPerEvent(policyData.policy.maxPayoutPerEvent || 1000);
          setCoveredEvents(policyData.policy.coveredEvents || ["HEAVY_RAIN", "HEATWAVE", "PLATFORM_OUTAGE"]);
        }
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
      setCoverageAmount(response.policy.coverageAmount || 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not activate policy");
    } finally {
      setActivating(false);
    }
  };

  const savePolicySettings = async () => {
    setSavingSettings(true);
    setError("");
    try {
      const response = await apiFetch<{ policy: Policy }>("/api/policy/current", {
        method: "PUT",
        body: JSON.stringify({
          coverageAmount,
          maxPayoutPerEvent,
          coveredEvents,
        }),
      });
      setPolicy(response.policy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update policy settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const cancelPolicy = async () => {
    setSavingSettings(true);
    setError("");
    try {
      const response = await apiFetch<{ policy: Policy }>("/api/policy/cancel", {
        method: "POST",
      });
      setPolicy(response.policy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel policy");
    } finally {
      setSavingSettings(false);
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
                  <span>Risk adjustment</span>
                  <span className="font-bold">+{formatCurrency(quote.breakdown.risk_adjustment)}</span>
                </motion.div>
                <motion.div variants={itemVariants} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 light-mode:border-black/10 transition-colors hover:bg-white/5 light-mode:hover:bg-black/5">
                  <span>Platform fee</span>
                  <span className="font-bold">+{formatCurrency(quote.breakdown.platform_fee)}</span>
                </motion.div>
                <motion.div variants={itemVariants} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 bg-emerald-500/10 light-mode:border-emerald-200 light-mode:bg-emerald-50">
                  <span className="font-semibold">Final premium</span>
                  <span className="font-bold text-emerald-300 light-mode:text-emerald-700">{formatCurrency(quote.breakdown.final_premium)}</span>
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

      {policy ? (
        <motion.section variants={itemVariants} className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-4xl border border-white/10 bg-white/3 p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-xl">
            <h2 className="text-2xl font-black text-white light-mode:text-slate-900">Manage active policy</h2>
            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-white/70 light-mode:text-slate-600">Coverage amount</label>
                <input type="number" min={500} max={10000} value={coverageAmount} onChange={(e) => setCoverageAmount(Number(e.target.value))} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white light-mode:border-black/10 light-mode:bg-white light-mode:text-slate-900" />
              </div>
              <div>
                <label className="text-sm font-semibold text-white/70 light-mode:text-slate-600">Max payout per event</label>
                <input type="number" min={250} max={5000} value={maxPayoutPerEvent} onChange={(e) => setMaxPayoutPerEvent(Number(e.target.value))} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white light-mode:border-black/10 light-mode:bg-white light-mode:text-slate-900" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/70 light-mode:text-slate-600">Covered events</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {supportedEvents.map((event) => (
                    <label key={event} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white light-mode:border-black/10 light-mode:bg-white light-mode:text-slate-900">
                      <input
                        type="checkbox"
                        checked={coveredEvents.includes(event)}
                        onChange={(e) => {
                          setCoveredEvents((current) => e.target.checked ? [...current, event] : current.filter((item) => item !== event));
                        }}
                      />
                      <span>{event}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={savePolicySettings} disabled={savingSettings} className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-900 transition hover:scale-[1.01] disabled:opacity-60">
                  {savingSettings ? "Saving..." : "Save policy settings"}
                </button>
                <button onClick={cancelPolicy} disabled={savingSettings} className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-3 text-sm font-black text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-60 light-mode:text-rose-700">
                  Cancel policy
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-4xl border border-white/10 bg-white/3 p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-xl">
            <h2 className="text-2xl font-black text-white light-mode:text-slate-900">Policy history</h2>
            <div className="mt-6 space-y-3">
              {policyHistory.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">
                  No policy history available yet.
                </div>
              ) : (
                policyHistory.map((item) => (
                  <div key={`${item._id || item.startDate}-${item.endDate}`} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 light-mode:border-black/10 light-mode:bg-white">
                    <div className="flex items-center justify-between gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${toneClass[statusTone(item.status)]}`}>{item.status.toUpperCase()}</span>
                      <span className="text-xs text-white/50 light-mode:text-slate-500">{formatDate(item.startDate)} - {formatDate(item.endDate)}</span>
                    </div>
                    <div className="mt-3 text-sm text-white/70 light-mode:text-slate-600">
                      {formatCurrency(item.coverageAmount)} coverage · {formatCurrency(item.premiumPaid)} premium
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.section>
      ) : null}
    </motion.main>
  );
}
