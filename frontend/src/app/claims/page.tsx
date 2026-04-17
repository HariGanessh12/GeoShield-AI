"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { apiFetch } from "@/utils/api-client";
import { formatCurrency, statusTone } from "@/utils/format";

type Claim = {
  _id?: string;
  trigger: string;
  trustScore: number;
  status: string;
  payout: number;
  reasons?: string[];
  createdAt: string;
};

type ClaimResponse = {
  message: string;
  decision?: {
    status: string;
    trust_score: number;
    payout?: number;
    reasons?: string[];
  };
};

type TriggerFeedResponse = {
  shiftState?: "ON" | "OFF";
  triggers: Array<{
    type: string;
    label: string;
    severityScore: number;
    coveredByPolicy: boolean;
    canAutoClaim: boolean;
    reason: string;
    lossAmount: number;
  }>;
};

type ZeroTouchResponse = ClaimResponse & {
  automated?: boolean;
  recommendedTrigger?: {
    type: string;
    label: string;
    severityScore: number;
    lossAmount: number;
  };
  triggers?: TriggerFeedResponse["triggers"];
};

const sampleTriggers = [
  { label: "Heatwave", description: "I was affected by extreme heat today", payload: { type: "HEATWAVE", lossAmount: 450 } },
  { label: "Heavy Rain", description: "Heavy rain disrupted my shift", payload: { type: "HEAVY_RAIN", lossAmount: 550 } },
  { label: "Platform Outage", description: "My platform went down mid-shift", payload: { type: "PLATFORM_OUTAGE", lossAmount: 400 } },
  { label: "Severe AQI", description: "Air quality made the shift unsafe", payload: { type: "AQI_SEVERE", lossAmount: 500 } },
  { label: "Traffic Surge", description: "Congestion sharply reduced my trips", payload: { type: "TRAFFIC_SURGE", lossAmount: 350 } },
];

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

export default function ClaimsPage() {
  const [mounted, setMounted] = useState(false);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [triggerFeed, setTriggerFeed] = useState<TriggerFeedResponse["triggers"]>([]);
  const [zeroTouchLoading, setZeroTouchLoading] = useState(false);
  const [zeroTouchResult, setZeroTouchResult] = useState<ZeroTouchResponse | null>(null);

  const loadClaims = async () => {
    setLoading(true);
    setError("");
    try {
      const [claimsData, triggerData] = await Promise.all([
        apiFetch<Claim[]>("/api/claim/history"),
        apiFetch<TriggerFeedResponse>("/api/claim/triggers/feed"),
      ]);
      setClaims(claimsData);
      setTriggerFeed(triggerData.triggers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load claims");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    void loadClaims();
  }, [mounted]);

  if (!mounted) return null;

  const triggerClaim = async (label: string, disruptionFactor: { type: string; lossAmount: number }) => {
    setSubmitting(label);
    setError("");
    setMessage("");

    try {
      // Get GPS location
      const location = await getCurrentLocation();
      const deviceInfo = getDeviceInfo();

      const result = await apiFetch<ClaimResponse>("/api/claim/auto-trigger", {
        method: "POST",
        body: JSON.stringify({
          disruptionFactor,
          location,
          deviceInfo
        }),
      });
      setMessage(result.message || `${label} claim processed`);
      setZeroTouchResult(null);
      await loadClaims();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not trigger claim");
    } finally {
      setSubmitting(null);
    }
  };

  const runZeroTouch = async () => {
    setZeroTouchLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await apiFetch<ZeroTouchResponse>("/api/claim/zero-touch-scan", {
        method: "POST",
      });
      setZeroTouchResult(result);
      setMessage(result.message || (result.automated ? "Zero-touch claim created" : "Zero-touch scan finished"));
      await loadClaims();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete zero-touch scan");
    } finally {
      setZeroTouchLoading(false);
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
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300 light-mode:text-amber-700">Claims</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="mt-3 text-4xl font-black text-white light-mode:text-slate-900">Trigger and review claims</h1>
            <p className="mt-3 max-w-2xl text-white/65 light-mode:text-slate-600">
              Something disrupted your shift? Report it here. We verify it automatically.
            </p>
          </div>
          <Link href="/dashboard" className="text-sm font-semibold text-sky-300 light-mode:text-sky-700 hover:underline">
            Back to dashboard
          </Link>
        </div>
      </motion.section>

      {message ? <motion.div variants={itemVariants} className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200 light-mode:text-emerald-700">{message}</motion.div> : null}
      {error ? <motion.div variants={itemVariants} className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200 light-mode:text-rose-700">{error}</motion.div> : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.section variants={itemVariants} className="rounded-4xl border border-white/10 bg-white/3 p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-xl">
          <h2 className="text-2xl font-black text-white light-mode:text-slate-900">Zero-touch claim scan</h2>
          <div className="mt-6 rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-5">
            <p className="text-sm text-white/75 light-mode:text-slate-600">
              Detect live trigger conditions from zone risk, policy coverage, and shift state. This flow minimizes manual input by automatically choosing the strongest eligible trigger.
            </p>
            <button
              onClick={runZeroTouch}
              disabled={zeroTouchLoading}
              className="mt-4 w-full rounded-2xl bg-cyan-400 px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {zeroTouchLoading ? "Scanning current conditions..." : "Run zero-touch scan"}
            </button>
            {zeroTouchResult?.recommendedTrigger ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm light-mode:border-black/10 light-mode:bg-white">
                <div className="font-bold text-white light-mode:text-slate-900">{zeroTouchResult.recommendedTrigger.label}</div>
                <div className="mt-1 text-white/60 light-mode:text-slate-500">
                  Recommended payout: {formatCurrency(zeroTouchResult.recommendedTrigger.lossAmount)}
                </div>
              </div>
            ) : null}
          </div>

          <h3 className="mt-8 text-lg font-black text-white light-mode:text-slate-900">Detected automated triggers</h3>
          <div className="mt-4 space-y-3">
            {triggerFeed.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">
                No trigger feed available right now.
              </div>
            ) : (
              triggerFeed.map((trigger) => (
                <div key={trigger.type} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm light-mode:border-black/10 light-mode:bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-white light-mode:text-slate-900">{trigger.label}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${trigger.canAutoClaim ? toneClass.success : trigger.coveredByPolicy ? toneClass.warning : toneClass.danger}`}>
                      {trigger.canAutoClaim ? "AUTO-CLAIM READY" : trigger.coveredByPolicy ? "WATCHING" : "NOT COVERED"}
                    </span>
                  </div>
                  <div className="mt-2 text-white/60 light-mode:text-slate-500">{trigger.reason}</div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/65 light-mode:text-slate-500">
                    <span>Severity: {(trigger.severityScore * 100).toFixed(0)}%</span>
                    <span>Projected loss: {formatCurrency(trigger.lossAmount)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <h3 className="mt-8 text-lg font-black text-white light-mode:text-slate-900">Manual fallback triggers</h3>
          <motion.div variants={containerVariants} className="mt-4 space-y-4">
            {sampleTriggers.map((item) => (
              <motion.button
                key={item.label}
                variants={itemVariants}
                onClick={() => triggerClaim(item.label, item.payload)}
                disabled={submitting !== null}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-left transition hover:border-white/25 hover:bg-black/30 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 light-mode:border-black/10 light-mode:bg-white light-mode:shadow-sm"
              >
                <div className="text-sm font-black text-white light-mode:text-slate-900">{item.label}</div>
                <div className="mt-1 text-sm text-white/55 light-mode:text-slate-500">
                  {submitting === item.label ? "Submitting..." : item.description}
                </div>
              </motion.button>
            ))}
          </motion.div>
        </motion.section>

        <motion.section variants={itemVariants} className="rounded-4xl border border-white/10 bg-white/3 p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-xl">
          <h2 className="text-2xl font-black text-white light-mode:text-slate-900">Recent claim history</h2>
          <div className="mt-6 space-y-4">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">
                Loading claim history...
              </div>
            ) : null}
            {!loading && claims.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">
                No claims recorded yet.
              </div>
            ) : null}
            {claims.map((claim, idx) => (
              <motion.div 
                key={claim._id || `${claim.trigger}-${claim.createdAt}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-2xl border border-white/10 bg-black/20 p-5 light-mode:border-black/10 light-mode:bg-white shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-bold text-white light-mode:text-slate-900">{claim.trigger}</div>
                    <div className="text-xs text-white/50 light-mode:text-slate-500">{new Date(claim.createdAt).toLocaleString()}</div>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-bold ${toneClass[statusTone(claim.status)]}`}>
                    {claim.status}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-5 text-sm text-white/70 light-mode:text-slate-600">
                  <span>Payout: {formatCurrency(claim.payout)}</span>
                  <span>Trust score: {claim.trustScore}</span>
                </div>
                {claim.reasons?.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {claim.reasons.map((reason) => (
                      <span key={reason} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 light-mode:border-black/10 light-mode:text-slate-600">
                        {reason}
                      </span>
                    ))}
                  </div>
                ) : null}
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>
    </motion.main>
  );
}

// Helper functions for GPS and device info
async function getCurrentLocation(): Promise<{
  zone: string;
  coordinates: { lat: number; lng: number };
  accuracy: number;
  timestamp: string;
} | undefined> {
  if (!navigator.geolocation) {
    console.warn('Geolocation not supported');
    return undefined;
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      });
    });

    // Mock zone detection based on coordinates (Delhi NCR bounds)
    let zone = 'Delhi NCR';
    const { latitude, longitude } = position.coords;

    if (latitude > 19 && latitude < 20 && longitude > 72.5 && longitude < 73.5) {
      zone = 'Mumbai South';
    } else if (latitude > 12.8 && latitude < 13.2 && longitude > 77.5 && longitude < 77.8) {
      zone = 'Bangalore Central';
    }

    return {
      zone,
      coordinates: { lat: latitude, lng: longitude },
      accuracy: position.coords.accuracy,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.warn('GPS location error:', error);
    return undefined;
  }
}

function getDeviceInfo(): {
  ipAddress?: string;
  userAgent: string;
  deviceId?: string;
} {
  return {
    userAgent: navigator.userAgent,
    // In production, deviceId would be generated and stored securely
    deviceId: localStorage.getItem('deviceId') || generateDeviceId()
  };
}

function generateDeviceId(): string {
  const stored = localStorage.getItem('deviceId');
  if (stored) return stored;

  const deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('deviceId', deviceId);
  return deviceId;
}
