"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/utils/api-client";
import { getSessionUser } from "@/utils/auth";
import { formatCurrency, statusTone } from "@/utils/format";
import { normalizePremiumResponse, type PremiumResponse } from "@/utils/risk";

type Claim = { _id?: string; trigger: string; trustScore: number; status: string; payout: number; reasons?: string[]; createdAt: string };
type PolicyResponse = { policy: { status: string; coverageAmount: number; premiumPaid: number; endDate: string } | null };
type ZoneRiskResponse = { zones: Array<{ risk_level: string; reason: string }> };
const zoneInputs: Record<string, { weather: number; traffic: number; location: number }> = {
  "Delhi NCR": { weather: 72, traffic: 80, location: 68 },
  "Mumbai South": { weather: 88, traffic: 76, location: 74 },
  "Bangalore Central": { weather: 56, traffic: 62, location: 52 },
};

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

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [policy, setPolicy] = useState<PolicyResponse["policy"]>(null);
  const [premium, setPremium] = useState<PremiumResponse | null>(null);
  const [risk, setRisk] = useState({ label: "Loading", reason: "Fetching live zone signal" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const user = getSessionUser();
    if (!user) return;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const inputs = zoneInputs[user.zone || "Delhi NCR"] || zoneInputs["Delhi NCR"];
        const [claimsData, policyData, riskData, premiumData] = await Promise.all([
          apiFetch<Claim[]>("/api/claim/history"),
          apiFetch<PolicyResponse>("/api/policy/current"),
          apiFetch<ZoneRiskResponse>("/api/risk/zone-risk"),
          apiFetch<Record<string, unknown>>("/api/risk/premium-breakdown", { method: "POST", body: JSON.stringify({ weather: inputs.weather, traffic: inputs.traffic, location: inputs.location, persona_type: "FOOD_DELIVERY" }) }),
        ]);
        setClaims(claimsData);
        setPolicy(policyData.policy);
        setPremium(normalizePremiumResponse(premiumData));
        setRisk({ label: riskData.zones[0]?.risk_level || "MEDIUM", reason: riskData.zones[0]?.reason || "No live risk reason returned" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load dashboard");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [mounted]);

  if (!mounted) return null;

  const lastClaim = claims[0];
  const trustScore = lastClaim?.trustScore || 85;

  return (
    <motion.main 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
    >
      <motion.section variants={itemVariants} className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300 light-mode:text-sky-700">Main hub</p>
          <h1 className="mt-3 text-4xl font-black text-white light-mode:text-slate-900">Worker dashboard</h1>
          <p className="mt-3 max-w-2xl text-white/65 light-mode:text-slate-600">Track active policy coverage, premium economics, trust performance, and claim outcomes from one place.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/claims" className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:scale-105 active:scale-95">Trigger Claim</Link>
          <Link href="/policy" className="rounded-full border border-white/10 px-5 py-3 text-sm font-bold text-white light-mode:border-black/10 light-mode:text-slate-800 transition hover:bg-white/5 light-mode:hover:bg-black/5">View Policy</Link>
          <Link href="/risk" className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-5 py-3 text-sm font-bold text-indigo-200 light-mode:text-indigo-700 transition hover:bg-indigo-500/20">View Premium Breakdown</Link>
        </div>
      </motion.section>

      {error ? <motion.div variants={itemVariants} className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200 light-mode:text-rose-700">{error}</motion.div> : null}

      <motion.section variants={containerVariants} className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <motion.div variants={itemVariants} className={`rounded-[1.75rem] border p-6 shadow-lg transition-transform hover:scale-[1.02] ${toneClass[statusTone(policy?.status || "REJECTED")]}`}>
          <p className="text-xs font-bold uppercase tracking-[0.2em]">Current Policy Status</p>
          <h2 className="mt-4 text-3xl font-black">{policy?.status?.toUpperCase() || "NO ACTIVE POLICY"}</h2>
          <p className="mt-3 text-sm opacity-80">Coverage up to {formatCurrency(policy?.coverageAmount)}</p>
        </motion.div>
        
        <motion.div variants={itemVariants} className="rounded-[1.75rem] border border-white/10 bg-black/20 p-6 shadow-lg transition-transform hover:scale-[1.02] light-mode:border-black/10 light-mode:bg-white/80">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 light-mode:text-slate-500">Current Premium</p>
          <h2 className="mt-4 text-3xl font-black text-white light-mode:text-slate-900">{formatCurrency(premium?.weekly_premium_inr || policy?.premiumPaid)}</h2>
          <Link href="/risk" className="mt-3 inline-flex text-sm font-semibold text-sky-300 light-mode:text-sky-700 hover:underline">See breakdown</Link>
        </motion.div>

        <motion.div variants={itemVariants} className={`rounded-[1.75rem] border p-6 shadow-lg transition-transform hover:scale-[1.02] ${toneClass[statusTone(lastClaim?.status || "VERIFY")]}`}>
          <p className="text-xs font-bold uppercase tracking-[0.2em]">Last Claim Status</p>
          <h2 className="mt-4 text-3xl font-black">{lastClaim?.status || "NO CLAIMS"}</h2>
          <p className="mt-3 text-sm opacity-80">Most recent trigger: {lastClaim?.trigger || "None yet"}</p>
        </motion.div>

        <motion.div variants={itemVariants} className="rounded-[1.75rem] border border-white/10 bg-black/20 p-6 shadow-lg transition-transform hover:scale-[1.02] light-mode:border-black/10 light-mode:bg-white/80">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 light-mode:text-slate-500">Trust Score</p>
          <h2 className="mt-4 text-3xl font-black text-white light-mode:text-slate-900">{trustScore}/100</h2>
          <p className="mt-3 text-sm text-white/65 light-mode:text-slate-600">Based on your latest claim assessment and reputation behavior.</p>
        </motion.div>
      </motion.section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <motion.section variants={itemVariants} className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-2xl">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white light-mode:text-slate-900">Recent Claims</h3>
              <p className="text-sm text-white/55 light-mode:text-slate-500">Live history from `/api/claim/history`</p>
            </div>
            <Link href="/claims" className="text-sm font-semibold text-indigo-300 light-mode:text-indigo-700 hover:underline">Open claims page</Link>
          </div>
          
          <div className="space-y-4">
            {loading ? <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">Loading claim history...</div> : null}
            {!loading && claims.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">No claims yet. Trigger a parametric claim to test the full flow.</div> : null}
            {claims.map((claim, idx) => (
              <motion.div 
                key={claim._id || `${claim.trigger}-${claim.createdAt}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-2xl border border-white/10 bg-black/20 p-4 transition-colors hover:bg-black/30 light-mode:border-black/10 light-mode:bg-white light-mode:hover:bg-slate-50 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-white light-mode:text-slate-900">{claim.trigger}</div>
                    <div className="text-xs text-white/50 light-mode:text-slate-500">{new Date(claim.createdAt).toLocaleString()}</div>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-bold ${toneClass[statusTone(claim.status)]}`}>{claim.status}</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-6 text-sm text-white/70 light-mode:text-slate-600">
                  <span>Payout: {formatCurrency(claim.payout)}</span>
                  <span>Trust score: {claim.trustScore}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.div variants={containerVariants} className="space-y-6">
          <motion.div variants={itemVariants} className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-xl overflow-hidden group">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 light-mode:text-slate-500">Risk Level</p>
            <h3 className="mt-3 text-3xl font-black text-white light-mode:text-slate-900 group-hover:text-indigo-400 transition-colors">{risk.label}</h3>
            <p className="mt-3 text-sm text-white/65 light-mode:text-slate-600">{risk.reason}</p>
          </motion.div>

          <motion.div variants={itemVariants} className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 light-mode:text-slate-500">Premium Snapshot</p>
            <div className="mt-4 space-y-3 text-sm text-white/70 light-mode:text-slate-600">
              <div className="flex items-center justify-between"><span>Expected loss</span><span className="font-bold">{formatCurrency(premium?.expected_loss_inr)}</span></div>
              <div className="flex items-center justify-between"><span>Risk margin</span><span className="font-bold">{formatCurrency(premium?.risk_margin_inr)}</span></div>
              <div className="flex items-center justify-between"><span>Platform fee</span><span className="font-bold">{formatCurrency(premium?.platform_fee_inr)}</span></div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.main>
  );
}
