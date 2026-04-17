"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { apiFetch } from "@/utils/api-client";
import { getSessionUser } from "@/utils/auth";
import { formatCurrency } from "@/utils/format";
import { normalizePremiumResponse, type PremiumResponse } from "@/utils/risk";

type ZoneSignal = {
  category: string;
  source: string;
  reliability: string;
  last_updated: string;
  severity_score: number;
};

type ZoneRiskResponse = {
  zones: Array<{
    zone: string;
    risk_level: string;
    reason: string;
    severity_score: number;
    data_label: string;
    source: string;
    last_updated: string;
    reliability: string;
    signals: ZoneSignal[];
  }>;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

function formatTimestamp(value?: string | null) {
  if (!value) return "Unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function RiskPage() {
  const [riskZone, setRiskZone] = useState<ZoneRiskResponse["zones"][number] | null>(null);
  const [premium, setPremium] = useState<PremiumResponse | null>(null);
  const [zone, setZone] = useState("Delhi NCR");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = getSessionUser();
    const selectedZone = user?.zone || "Delhi NCR";
    setZone(selectedZone);

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [riskData, premiumData] = await Promise.all([
          apiFetch<ZoneRiskResponse>("/api/risk/zone-risk"),
          apiFetch<Record<string, unknown>>("/api/policy/quote", {
            method: "POST",
            body: JSON.stringify({ userId: user?.id }),
          }),
        ]);

        const selectedRiskZone = riskData.zones.find((item) => item.zone === selectedZone) || riskData.zones[0] || null;
        setRiskZone(selectedRiskZone);
        setPremium(normalizePremiumResponse(premiumData));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load risk data");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <motion.main initial="hidden" animate="visible" variants={containerVariants} className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.section variants={itemVariants} className="rounded-4xl border border-white/10 bg-white/3 p-8 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300 light-mode:text-sky-700">Risk engine</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-black text-white light-mode:text-slate-900">Risk and premium breakdown</h1>
            <p className="mt-3 max-w-2xl text-white/65 light-mode:text-slate-600">
              Real and fallback risk signals for <span className="font-bold text-white light-mode:text-slate-900">{zone}</span>.
            </p>
          </div>
          <Link href="/dashboard" className="text-sm font-semibold text-sky-300 light-mode:text-sky-700 hover:underline">
            Back to dashboard
          </Link>
        </div>
      </motion.section>

      {error ? <motion.div variants={itemVariants} className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200 light-mode:text-rose-700">{error}</motion.div> : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.section variants={itemVariants} className="rounded-4xl border border-white/10 bg-white/3 p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-xl">
          <h2 className="text-2xl font-black text-white light-mode:text-slate-900">Zone signals</h2>
          {loading ? (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">
              Loading zone risks...
            </div>
          ) : riskZone ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5 light-mode:border-black/10 light-mode:bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-lg font-bold text-white light-mode:text-slate-900">{riskZone.zone}</div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-white/80 light-mode:border-black/10 light-mode:text-slate-700">
                    {riskZone.risk_level}
                  </span>
                </div>
                <p className="mt-3 text-sm text-white/65 light-mode:text-slate-600">{riskZone.reason}</p>
                <div className="mt-4 space-y-1 text-xs text-white/55 light-mode:text-slate-500">
                  <p>Source: {riskZone.source}</p>
                  <p>Last updated: {formatTimestamp(riskZone.last_updated)}</p>
                  <p>Reliability: {riskZone.reliability}</p>
                  <p>Mode: {riskZone.data_label}</p>
                </div>
              </div>

              <div className="grid gap-3">
                {riskZone.signals.map((signal) => (
                  <div key={`${signal.category}-${signal.source}`} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm light-mode:border-black/10 light-mode:bg-white">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold text-white light-mode:text-slate-900">{signal.category.toUpperCase()}</span>
                      <span className="text-xs text-white/55 light-mode:text-slate-500">{Math.round(signal.severity_score * 100)}%</span>
                    </div>
                    <div className="mt-2 text-xs text-white/55 light-mode:text-slate-500">Source: {signal.source}</div>
                    <div className="mt-1 text-xs text-white/55 light-mode:text-slate-500">Reliability: {signal.reliability}</div>
                    <div className="mt-1 text-xs text-white/55 light-mode:text-slate-500">Last updated: {formatTimestamp(signal.last_updated)}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">
              No zone risk available right now.
            </div>
          )}
        </motion.section>

        <motion.section variants={itemVariants} className="rounded-4xl border border-white/10 bg-white/3 p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-xl">
          <h2 className="text-2xl font-black text-white light-mode:text-slate-900">Premium model</h2>
          {premium ? (
            <motion.div variants={containerVariants} className="mt-6 space-y-4">
              <motion.div variants={itemVariants} className="rounded-3xl border border-indigo-500/20 bg-indigo-500/10 p-6 text-center shadow-lg">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300 light-mode:text-indigo-700">Weekly premium</p>
                <p className="mt-3 text-5xl font-black text-white light-mode:text-slate-900">{formatCurrency(premium.final_premium)}</p>
                <p className="mt-2 text-xs text-white/60 light-mode:text-slate-500">Base + Risk + Fee = Final</p>
              </motion.div>
              <div className="space-y-3 text-sm text-white/70 light-mode:text-slate-600">
                <motion.div variants={itemVariants} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 light-mode:border-black/10">
                  <span>Base premium</span>
                  <span className="font-bold">{formatCurrency(premium.base_premium)}</span>
                </motion.div>
                <motion.div variants={itemVariants} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 light-mode:border-black/10">
                  <span>Risk adjustment</span>
                  <span className="font-bold">+{formatCurrency(premium.risk_adjustment)}</span>
                </motion.div>
                <motion.div variants={itemVariants} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 light-mode:border-black/10">
                  <span>Platform fee</span>
                  <span className="font-bold">+{formatCurrency(premium.platform_fee)}</span>
                </motion.div>
                <motion.div variants={itemVariants} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-xs text-white/55 light-mode:border-black/10 light-mode:bg-white light-mode:text-slate-500">
                  Premium source: Backend pricing engine via live/fallback risk signals from the worker zone.
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">
              Premium data unavailable right now.
            </div>
          )}
        </motion.section>
      </div>
    </motion.main>
  );
}
