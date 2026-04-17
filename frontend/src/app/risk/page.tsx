"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { apiFetch } from "@/utils/api-client";
import { getSessionUser } from "@/utils/auth";
import { formatCurrency } from "@/utils/format";
import { normalizePremiumResponse, type PremiumResponse } from "@/utils/risk";

type ZoneRiskResponse = {
  zones: Array<{
    lat?: number;
    lng?: number;
    risk_level: string;
    reason: string;
  }>;
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

const zoneInputs: Record<string, { weather: number; traffic: number; location: number }> = {
  "Delhi NCR": { weather: 72, traffic: 80, location: 68 },
  "Mumbai South": { weather: 88, traffic: 76, location: 74 },
  "Bangalore Central": { weather: 56, traffic: 62, location: 52 },
};

export default function RiskPage() {
  const [risk, setRisk] = useState<ZoneRiskResponse["zones"]>([]);
  const [premium, setPremium] = useState<PremiumResponse | null>(null);
  const [zone, setZone] = useState("Delhi NCR");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getZoneName = (lat: number | undefined, lng: number | undefined, index: number) => {
    if (!lat || !lng) return `Zone ${index + 1}`;
    if (lat.toFixed(2) === "28.70" && lng.toFixed(2) === "77.10") return "Delhi NCR";
    if (lat.toFixed(2) === "19.08" && lng.toFixed(2) === "72.88") return "Mumbai";
    return `Zone ${index + 1}`;
  };

  const riskStyles = `
    .risk-pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
      display: inline-block;
      margin-right: 6px;
      animation: riskPulse 1.5s infinite;
    }
    @keyframes riskPulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.5;
        transform: scale(1.3);
      }
    }
  `;

  useEffect(() => {
    const user = getSessionUser();
    const selectedZone = user?.zone || "Delhi NCR";
    const inputs = zoneInputs[selectedZone] || zoneInputs["Delhi NCR"];

    setZone(selectedZone);

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [riskData, premiumData] = await Promise.all([
          apiFetch<ZoneRiskResponse>("/api/risk/zone-risk"),
          apiFetch<Record<string, unknown>>("/api/risk/premium-breakdown", {
            method: "POST",
            body: JSON.stringify({
              weather: inputs.weather,
              traffic: inputs.traffic,
              location: inputs.location,
              persona_type: user?.personaType || "FOOD_DELIVERY",
            }),
          }),
        ]);
        setRisk(riskData.zones);
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
    <motion.main 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
    >
      <motion.section variants={itemVariants} className="rounded-4xl border border-white/10 bg-white/3 p-8 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300 light-mode:text-sky-700">Risk engine</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-black text-white light-mode:text-slate-900">Risk and premium breakdown</h1>
            <p className="mt-3 max-w-2xl text-white/65 light-mode:text-slate-600">
              Live zone signals and premium components for <span className="font-bold text-white light-mode:text-slate-900">{zone}</span>.
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
          <div className="mt-6 space-y-4">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">
                Loading zone risks...
              </div>
            ) : null}
            {!loading &&
              risk.map((item, index) => (
                <motion.div 
                  key={`${item.risk_level}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`rounded-2xl border border-white/10 bg-black/20 p-5 light-mode:border-black/10 light-mode:bg-white shadow-sm transition-colors hover:bg-black/30 light-mode:hover:bg-slate-50 ${item.risk_level === 'HIGH' ? 'border-l-4 border-l-red-500 bg-red-500/5' : item.risk_level === 'MEDIUM' ? 'border-l-4 border-l-amber-500' : item.risk_level === 'LOW' ? 'border-l-4 border-l-emerald-500' : ''}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-lg font-bold text-white light-mode:text-slate-900" title={`${item.lat?.toFixed(2)}° N, ${item.lng?.toFixed(2)}° E`}>
                      {item.risk_level === 'HIGH' && <span className="risk-pulse"></span>}
                      {getZoneName(item.lat, item.lng, index)}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-white/65 light-mode:text-slate-600">{item.reason}</p>
                </motion.div>
              ))}
          </div>
        </motion.section>

        <motion.section variants={itemVariants} className="rounded-4xl border border-white/10 bg-white/3 p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-xl">
          <h2 className="text-2xl font-black text-white light-mode:text-slate-900">Premium model</h2>
          {premium ? (
            <motion.div variants={containerVariants} className="mt-6 space-y-4">
              <motion.div variants={itemVariants} className="rounded-3xl border border-indigo-500/20 bg-indigo-500/10 p-6 text-center shadow-lg">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300 light-mode:text-indigo-700">Weekly premium</p>
                <p className="mt-3 text-5xl font-black text-white light-mode:text-slate-900">{formatCurrency(premium.weekly_premium_inr)}</p>
              </motion.div>
              <div className="space-y-3 text-sm text-white/70 light-mode:text-slate-600">
                <motion.div variants={itemVariants} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 light-mode:border-black/10 transition-colors hover:bg-white/5 light-mode:hover:bg-black/5">
                  <span>Expected loss</span>
                  <span className="font-bold">{formatCurrency(premium.expected_loss_inr)}</span>
                </motion.div>
                <motion.div variants={itemVariants} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 light-mode:border-black/10 transition-colors hover:bg-white/5 light-mode:hover:bg-black/5">
                  <span>Risk margin</span>
                  <span className="font-bold">{formatCurrency(premium.risk_margin_inr)}</span>
                </motion.div>
                <motion.div variants={itemVariants} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 light-mode:border-black/10 transition-colors hover:bg-white/5 light-mode:hover:bg-black/5">
                  <span>Platform fee</span>
                  <span className="font-bold">{formatCurrency(premium.platform_fee_inr)}</span>
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
      <style dangerouslySetInnerHTML={{__html: riskStyles}} />
    </motion.main>
  );
}
