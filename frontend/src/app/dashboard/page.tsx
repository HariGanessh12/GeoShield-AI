"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/utils/api-client";
import { getSessionUser } from "@/utils/auth";
import { formatCurrency, statusTone } from "@/utils/format";
import { normalizePremiumResponse, type PremiumResponse } from "@/utils/risk";

type Claim = { _id?: string; trigger: string; trustScore: number; status: string; payout: number; reasons?: string[]; createdAt: string; externalData?: { source?: string; reliability?: string; lastUpdated?: string; metadata?: { source_name?: string; last_updated_timestamp?: string } } };
type PolicyResponse = { policy: { status: string; coverageAmount: number; premiumPaid: number; endDate: string } | null };
type ZoneRiskResponse = { zones: Array<{ zone?: string; risk_level: string; reason: string; data_label?: string; source?: string; last_updated?: string; reliability?: string }> };
type PolicyTermsResponse = {
  waiting_period_hours: number;
  max_claims_per_week: number;
  exclusions: string[];
  coverage_rules: string[];
};
type PolicySummaryResponse = {
  activeCoverageHours: number;
  estimatedMonthlySaving: number;
  fullCoverageMonthlyCost: number;
  microPolicyMonthlyCost: number;
  coverageEfficiencyPercent: number;
  currentState?: "ON" | "OFF";
  autoShutoffApplied?: boolean;
};
type WorkerSummaryResponse = {
  profile: { _id: string; email: string; zone?: string; reputationScore?: number } | null;
  currentPolicy: { shiftState?: "ON" | "OFF"; status?: string; premiumPaid?: number; coverageAmount?: number; toggleCount?: number } | null;
  shiftState: "ON" | "OFF";
  recentToggles: Array<{ previousState: "ON" | "OFF"; currentState: "ON" | "OFF"; reason?: string; source?: string; createdAt: string }>;
  autoShutoffApplied?: boolean;
};
type SystemStatusResponse = {
  last_scan_time: string | null;
  next_scan_time: string | null;
  last_trigger_detected: { trigger?: string; detectedAt?: string; source?: string; reliability?: string } | null;
  last_auto_claim_created: { claimId?: string; trigger?: string; status?: string; createdAt?: string; processedAt?: string } | null;
  triggersDetected: Array<Record<string, unknown> | string>;
  scanIntervalMinutes: number;
};
type WeatherMetadataResponse = {
  source_name: string;
  last_updated_timestamp: string;
  location: string;
  reliability_flag?: string;
};
type PayoutSummaryResponse = {
  total_payout_received: number;
  total_claims_approved: number;
  last_payout: {
    amount: number;
    transaction_id: string;
    method: string;
    timestamp: string;
  } | null;
  coverage_status: string;
  active_policy: {
    coverage_amount: number;
    max_payout_per_event: number;
  };
  coverage_utilized_percent: number;
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

function formatRelativeTime(value: string) {
  const now = Date.now();
  const date = new Date(value);
  const diffMs = date.getTime() - now;
  const absMinutes = Math.abs(Math.round(diffMs / 60000));

  if (absMinutes < 1) return "just now";
  if (absMinutes < 60) return `${absMinutes} minute${absMinutes === 1 ? "" : "s"} ${diffMs < 0 ? "ago" : "from now"}`;

  const absHours = Math.abs(Math.round(diffMs / 3600000));
  if (absHours < 24) return `${absHours} hour${absHours === 1 ? "" : "s"} ${diffMs < 0 ? "ago" : "from now"}`;

  const absDays = Math.abs(Math.round(diffMs / 86400000));
  return `${absDays} day${absDays === 1 ? "" : "s"} ${diffMs < 0 ? "ago" : "from now"}`;
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return "Unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [policy, setPolicy] = useState<PolicyResponse["policy"]>(null);
  const [premium, setPremium] = useState<PremiumResponse | null>(null);
  const [policyTerms, setPolicyTerms] = useState<PolicyTermsResponse | null>(null);
  const [policySummary, setPolicySummary] = useState<PolicySummaryResponse | null>(null);
  const [risk, setRisk] = useState({ label: "Loading", reason: "Fetching live zone signal", source: "Unknown", lastUpdated: "", reliability: "fallback" });
  const [policyToggleState, setPolicyToggleState] = useState<"ON" | "OFF">("OFF");
  const [policyHistory, setPolicyHistory] = useState<WorkerSummaryResponse["recentToggles"]>([]);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [toggleError, setToggleError] = useState("");
  const [autoShutoffWarning, setAutoShutoffWarning] = useState("");
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [systemStatus, setSystemStatus] = useState<SystemStatusResponse>({
    last_scan_time: null,
    next_scan_time: null,
    last_trigger_detected: null,
    last_auto_claim_created: null,
    triggersDetected: [],
    scanIntervalMinutes: 15,
  });
  const [weatherMetadata, setWeatherMetadata] = useState<WeatherMetadataResponse | null>(null);
  const [payoutSummary, setPayoutSummary] = useState<PayoutSummaryResponse | null>(null);
  const [showToggleModal, setShowToggleModal] = useState(false);
  const [modalRiskData, setModalRiskData] = useState<ZoneRiskResponse | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const loadDashboardData = async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
    const user = getSessionUser();
    if (!user) return;

    if (showLoading) setLoading(true);
    setError("");
    setToggleError("");
    try {
      const [claimsData, policyData, riskData, premiumData, systemStatusData, weatherMetadataData, policyTermsData, payoutSummaryData] = await Promise.all([
        apiFetch<Claim[]>("/api/claim/history"),
        apiFetch<PolicyResponse>("/api/policy/current"),
        apiFetch<ZoneRiskResponse>("/api/risk/zone-risk"),
        apiFetch<Record<string, unknown>>("/api/policy/quote", {
          method: "POST",
          body: JSON.stringify({ userId: user.id })
        }),
        apiFetch<SystemStatusResponse>("/system/status"),
        apiFetch<WeatherMetadataResponse>("/api/risk/weather-metadata"),
        apiFetch<PolicyTermsResponse>("/api/policy/terms"),
        apiFetch<PayoutSummaryResponse>("/api/payout/summary"),
      ]);
      const workerData = await apiFetch<WorkerSummaryResponse>(`/api/worker/${user.id}/summary`);
      const policySummaryData = await apiFetch<PolicySummaryResponse>(`/api/worker/${user.id}/policy/summary`);
      const userZoneRisk = riskData.zones.find((zone) => zone.zone === user.zone) || riskData.zones[0];

      setClaims(claimsData);
      setPolicy(policyData.policy);
      setPremium(normalizePremiumResponse(premiumData));
      setRisk({
        label: userZoneRisk?.risk_level || "MEDIUM",
        reason: userZoneRisk?.reason || "No live risk reason returned",
        source: userZoneRisk?.source || "GeoShield Zone Risk Engine",
        lastUpdated: userZoneRisk?.last_updated || "",
        reliability: userZoneRisk?.reliability || "fallback"
      });
      setPolicyToggleState(workerData.shiftState || workerData.currentPolicy?.shiftState || "OFF");
      setPolicyHistory(workerData.recentToggles.slice(0, 3));
      setPolicySummary(policySummaryData);
      setSystemStatus(systemStatusData);
      setWeatherMetadata(weatherMetadataData);
      setPolicyTerms(policyTermsData);
      setPayoutSummary(payoutSummaryData);

      const latestReason = workerData.recentToggles[0]?.reason || "";
      if (latestReason.toLowerCase().includes("auto-shutoff")) {
        setAutoShutoffWarning("Your coverage was automatically paused after 12 hours. Toggle ON when you're back on shift.");
        setWarningDismissed(false);
      } else {
        setAutoShutoffWarning("");
        setWarningDismissed(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;

    void loadDashboardData();
    const polling = window.setInterval(() => {
      void loadDashboardData({ showLoading: false });
    }, 15000);

    return () => window.clearInterval(polling);
  }, [mounted]);

  if (!mounted) return null;

  const lastClaim = claims[0];
  const trustScore = lastClaim?.trustScore || 85;
  const currentScore = trustScore;
  const previousScore = claims[1]?.trustScore;
  const delta = previousScore !== undefined ? currentScore - previousScore : 0;
  const currentPolicyState = policyToggleState;

  const monitoringStatus = systemStatus.last_scan_time && systemStatus.next_scan_time && new Date(systemStatus.next_scan_time).getTime() > Date.now()
    ? "active"
    : "failure";

  const lastAutoClaim = systemStatus.last_auto_claim_created || null;

  const automationTimeline = [
    {
      title: "Trigger detected",
      description: systemStatus.last_trigger_detected?.trigger
        ? `Detected trigger: ${systemStatus.last_trigger_detected.trigger}`
        : "No trigger detected yet.",
      timestamp: systemStatus.last_trigger_detected?.detectedAt || systemStatus.last_scan_time,
      tone: systemStatus.last_trigger_detected?.trigger ? "success" : "warning",
    },
    {
      title: "Claim auto-created",
      description: lastAutoClaim
        ? `Auto claim created with status ${lastAutoClaim.status}`
        : "No auto claim has been created yet.",
      timestamp: lastAutoClaim?.createdAt || null,
      tone: lastAutoClaim ? ((lastAutoClaim.status || "").toUpperCase() === "REJECTED" ? "danger" : "success") : "warning",
    },
    {
      title: "Claim processed",
      description: lastClaim
        ? `${lastClaim.status} ${lastClaim.createdAt ? `(${formatRelativeTime(lastClaim.createdAt)})` : ""}`
        : "Claim processing pending.",
      timestamp: lastClaim?.createdAt || null,
      tone: lastClaim ? statusTone(lastClaim.status) : "warning",
    },
  ];

  // Determine contextual banner content
  const contextualBanner = (() => {
    // Priority 1: Weekly policy inactive
    if (!policy || policy.status?.toUpperCase() !== "ACTIVE") {
      return (
        <motion.div
          variants={itemVariants}
          className="mb-6 flex items-center justify-between rounded-lg border-l-4 border-amber-400 bg-amber-50 p-4 text-sm"
        >
          <p className="text-amber-800">
            You have no active policy. Activate weekly coverage to stay protected.
          </p>
          <Link
            href="/policy"
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
          >
            View Policy Options
          </Link>
        </motion.div>
      );
    }

    // Priority 2: Weekly policy active but micro-policy off
    if (currentPolicyState === "OFF") {
      return (
        <motion.div
          variants={itemVariants}
          className="mb-6 flex items-center justify-between rounded-lg border-l-4 border-blue-400 bg-blue-50 p-4 text-sm"
        >
          <p className="text-blue-800">
            Your weekly policy is active but shift coverage is OFF. Toggle ON when you start working.
          </p>
          <button
            onClick={() => {
              const element = document.getElementById("micro-policy-panel");
              element?.scrollIntoView({ behavior: "smooth" });
            }}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Activate Shift Coverage
          </button>
        </motion.div>
      );
    }

    // Priority 3: Policy ON, micro-policy ON, high risk
    if (risk.label === "HIGH") {
      return (
        <motion.div
          variants={itemVariants}
          className="mb-6 flex items-center justify-between rounded-lg border-l-4 border-red-400 bg-red-50 p-4 text-sm"
        >
          <p className="text-red-800">
            HIGH risk conditions in your zone. You're covered. Report any disruption immediately.
          </p>
          <Link
            href="/claims"
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Report Disruption
          </Link>
        </motion.div>
      );
    }

    // Priority 4: All good - no banner
    return null;
  })();

  const handleToggleConfirm = async () => {
    const user = getSessionUser();
    if (!user) return;

    try {
      const riskData = await apiFetch<ZoneRiskResponse>("/api/risk/zone-risk");
      const selectedZone = riskData.zones.find((zone) => zone.zone === user.zone) || riskData.zones[0];
      setModalRiskData({ zones: selectedZone ? [selectedZone] : [] });
      setShowToggleModal(true);
    } catch (err) {
      console.error("Could not fetch risk data for modal:", err);
      setModalRiskData({ zones: [{ zone: user.zone, risk_level: "MEDIUM", reason: "Unable to fetch live risk data" }] });
      setShowToggleModal(true);
    }
  };

  const confirmToggleOn = () => {
    setShowToggleModal(false);
    togglePolicy();
  };

  const cancelToggle = () => {
    setShowToggleModal(false);
  };

  const togglePolicy = async () => {
    const user = getSessionUser();
    if (!user) return;

    const nextState = currentPolicyState === "ON" ? "OFF" : "ON";
    setToggleLoading(true);
    setToggleError("");
    try {
      const result = await apiFetch<{ workerId: string; policy: { shiftState: "ON" | "OFF"; toggleCount?: number }; toggle: { previousState: "ON" | "OFF"; currentState: "ON" | "OFF"; reason?: string; createdAt: string } }>(`/api/worker/${user.id}/policy/toggle`, {
        method: "POST",
        body: JSON.stringify({ state: nextState, reason: nextState === "ON" ? "worker_started_shift" : "worker_ended_shift" }),
      });

      setPolicyToggleState(result.policy.shiftState || nextState);
      setPolicyHistory((current) => [result.toggle, ...current].slice(0, 3));
      await loadDashboardData({ showLoading: false });

      // Show toast notification
      if (nextState === "ON") {
        setToastMessage("Coverage active. You're protected until you end your shift.");
      } else {
        setToastMessage("Coverage paused. Toggle ON when your next shift starts.");
      }
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : "Could not update policy");
    } finally {
      setToggleLoading(false);
    }
  };

  return (
    <motion.main 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
    >
      <motion.section variants={itemVariants} className="mb-8 flex flex-col gap-4 rounded-4xl border border-white/10 bg-white/3 p-8 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 lg:flex-row lg:items-end lg:justify-between">
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

      {/* Contextual Banner */}
      {contextualBanner}

      {error ? <motion.div variants={itemVariants} className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200 light-mode:text-rose-700">{error}</motion.div> : null}
      {autoShutoffWarning && !warningDismissed ? (
        <motion.div variants={itemVariants} className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-amber-100 light-mode:text-amber-700">
          <div>
            <p className="text-sm font-bold">Auto-pause notice</p>
            <p className="mt-1 text-sm opacity-90">{autoShutoffWarning}</p>
          </div>
          <button
            onClick={() => setWarningDismissed(true)}
            className="rounded-full border border-amber-500/30 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-amber-100 transition hover:bg-amber-500/15 light-mode:text-amber-700"
          >
            Dismiss
          </button>
        </motion.div>
      ) : null}

      <motion.section variants={containerVariants} className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <motion.div variants={itemVariants} className={`rounded-[1.75rem] border p-6 shadow-lg transition-transform hover:scale-[1.02] ${toneClass[statusTone(policy?.status || "REJECTED")]}`}>
          <p className="text-xs font-bold uppercase tracking-[0.2em]">Current Policy Status</p>
          <h2 className="mt-4 text-3xl font-black">{policy?.status?.toUpperCase() || "NO ACTIVE POLICY"}</h2>
          <p className="mt-3 text-sm opacity-80">Coverage up to {formatCurrency(policy?.coverageAmount)}</p>
        </motion.div>
        
        <motion.div variants={itemVariants} className="rounded-[1.75rem] border border-white/10 bg-black/20 p-6 shadow-lg transition-transform hover:scale-[1.02] light-mode:border-black/10 light-mode:bg-white/80 group relative">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 light-mode:text-slate-500">Current Premium</p>
          <h2 className="mt-4 text-3xl font-black text-white light-mode:text-slate-900">{formatCurrency(premium?.final_premium || policy?.premiumPaid)}</h2>
          <Link href="/risk" className="mt-3 inline-flex text-sm font-semibold text-sky-300 light-mode:text-sky-700 hover:underline">See breakdown</Link>
          
          {/* Premium breakdown tooltip */}
          {premium && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 shadow-lg">
              <div className="font-semibold mb-1">Premium Breakdown</div>
              <div>Base: {formatCurrency(premium.base_premium)}</div>
              <div>Risk: +{formatCurrency(premium.risk_adjustment)}</div>
              <div>Fee: +{formatCurrency(premium.platform_fee)}</div>
              <div className="border-t border-slate-600 mt-1 pt-1 font-semibold">
                Total: {formatCurrency(premium.final_premium)}
              </div>
            </div>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className={`rounded-[1.75rem] border p-6 shadow-lg transition-transform hover:scale-[1.02] ${toneClass[statusTone(lastClaim?.status || "VERIFY")]}`}>
          <p className="text-xs font-bold uppercase tracking-[0.2em]">Last Claim Status</p>
          <h2 className="mt-4 text-3xl font-black">{lastClaim?.status || "NO CLAIMS"}</h2>
          <p className="mt-3 text-sm opacity-80">Most recent trigger: {lastClaim?.trigger || "None yet"}</p>
        </motion.div>

        <motion.div variants={itemVariants} className="rounded-[1.75rem] border border-white/10 bg-black/20 p-6 shadow-lg transition-transform hover:scale-[1.02] light-mode:border-black/10 light-mode:bg-white/80">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 light-mode:text-slate-500">Trust Score</p>
          <h2 className="mt-4 text-3xl font-black text-white light-mode:text-slate-900">{trustScore}/100</h2>
          {delta !== 0 && (
            <p className={`mt-2 text-sm font-bold ${delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {delta > 0 ? `↑ +${delta}` : `↓ ${delta}`}
            </p>
          )}
          <p className="mt-1 text-gray-500 text-xs">Maintained by 3 consecutive approved claims this week.</p>
        </motion.div>
      </motion.section>

      <motion.section variants={containerVariants} className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <motion.div variants={itemVariants} className="rounded-4xl border border-white/10 bg-white/3 p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300 light-mode:text-sky-700">Automation status</p>
              <h3 className="mt-3 text-2xl font-black text-white light-mode:text-slate-900">Auto trigger monitoring</h3>
              <p className="mt-2 text-sm text-white/60 light-mode:text-slate-600">Live status from the event scanner and backend automation engine.</p>
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold ${monitoringStatus === "active" ? "bg-emerald-500/15 text-emerald-200" : "bg-rose-500/15 text-rose-200"}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${monitoringStatus === "active" ? "bg-emerald-400" : "bg-rose-400"}`} />
              {monitoringStatus === "active" ? "Active monitoring" : "Monitor offline"}
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-black/10 p-4 light-mode:border-black/10 light-mode:bg-slate-50">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50 light-mode:text-slate-500">Last auto scan</p>
              <p className="mt-3 text-base font-black text-white light-mode:text-slate-900">{formatTimestamp(systemStatus.last_scan_time)}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/10 p-4 light-mode:border-black/10 light-mode:bg-slate-50">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50 light-mode:text-slate-500">Next scan</p>
              <p className="mt-3 text-base font-black text-white light-mode:text-slate-900">{formatTimestamp(systemStatus.next_scan_time)}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/10 p-4 light-mode:border-black/10 light-mode:bg-slate-50">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50 light-mode:text-slate-500">Last detected trigger</p>
              <p className="mt-3 text-base font-black text-white light-mode:text-slate-900">{systemStatus.last_trigger_detected?.trigger || "No trigger event detected yet."}</p>
              <p className="mt-1 text-xs text-white/50 light-mode:text-slate-500">Source: {systemStatus.last_trigger_detected?.source || "Unavailable"} | Reliability: {systemStatus.last_trigger_detected?.reliability || "unknown"}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/10 p-4 light-mode:border-black/10 light-mode:bg-slate-50">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50 light-mode:text-slate-500">Last auto-claim created</p>
              <p className="mt-3 text-base font-black text-white light-mode:text-slate-900">{formatTimestamp(systemStatus.last_auto_claim_created?.createdAt)}</p>
              <p className="mt-1 text-xs text-white/50 light-mode:text-slate-500">Status: {systemStatus.last_auto_claim_created?.status || "Unavailable"}</p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-black/10 p-4 light-mode:border-black/10 light-mode:bg-slate-50">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50 light-mode:text-slate-500">Weather API Status</p>
            {weatherMetadata ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-white/70 light-mode:text-slate-600">
                  <span className="font-semibold">Source:</span> {weatherMetadata.source_name}
                </p>
                <p className="text-sm text-white/70 light-mode:text-slate-600">
                  <span className="font-semibold">Updated at:</span> {formatTimestamp(weatherMetadata.last_updated_timestamp)}
                </p>
                <p className="text-sm text-white/70 light-mode:text-slate-600">
                  <span className="font-semibold">Location:</span> {weatherMetadata.location}
                </p>
                <p className="text-sm text-white/70 light-mode:text-slate-600">
                  <span className="font-semibold">Reliability:</span> {weatherMetadata.reliability_flag || "unknown"}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-white/60 light-mode:text-slate-600">Using fallback data</p>
            )}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="rounded-4xl border border-white/10 bg-white/3 p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300 light-mode:text-sky-700">Claim timeline</p>
              <h3 className="mt-3 text-2xl font-black text-white light-mode:text-slate-900">Automation pipeline</h3>
            </div>
            <span className="text-xs text-white/50 light-mode:text-slate-500">Updated every 15s</span>
          </div>

          <div className="mt-6 space-y-4">
            {automationTimeline.map((step) => (
              <div key={step.title} className="rounded-3xl border border-white/10 bg-black/10 p-4 light-mode:border-black/10 light-mode:bg-slate-50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-white light-mode:text-slate-900">{step.title}</p>
                    <p className="mt-2 text-sm text-white/70 light-mode:text-slate-600">{step.description}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClass[step.tone]}`}>{step.tone.toUpperCase()}</span>
                </div>
                <div className="mt-3 text-xs text-white/40 light-mode:text-slate-500">{step.timestamp ? formatTimestamp(step.timestamp) : "No timestamp available"}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <motion.div id="micro-policy-panel" variants={itemVariants} className="rounded-4xl border border-white/10 bg-white/3 p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300 light-mode:text-emerald-700">Micro-Policy</p>
              <h3 className="mt-3 text-2xl font-black text-white light-mode:text-slate-900">
                {currentPolicyState === "ON" ? "Coverage ON" : "Coverage OFF"}
              </h3>
              <p className="mt-2 text-sm text-white/60 light-mode:text-slate-600">
                {currentPolicyState === "ON"
                  ? "You are actively covered while working."
                  : "Coverage is paused until you start your shift."}
              </p>
            </div>
            <div className={`rounded-full px-3 py-1 text-xs font-bold ${currentPolicyState === "ON" ? "bg-green-50 text-green-600 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
              {currentPolicyState === "ON" ? "ACTIVE COVERAGE" : "NO COVERAGE"}
            </div>
          </div>

          <button
            onClick={() => {
              if (currentPolicyState === "ON") {
                togglePolicy();
              } else {
                handleToggleConfirm();
              }
            }}
            disabled={toggleLoading}
            className={`mt-5 w-full rounded-2xl px-5 py-4 text-sm font-black tracking-[0.08em] transition ${
              currentPolicyState === "ON"
                ? "bg-gray-500 text-white hover:bg-gray-600"
                : "bg-red-500 text-white hover:bg-red-600"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {toggleLoading ? "Updating coverage..." : currentPolicyState === "ON" ? "Pause Coverage" : "Activate Coverage Now"}
          </button>
          <p className="mt-3 text-xs text-white/45 light-mode:text-slate-500">
            This is not a settings switch. It is the worker declaring they are on the road and want coverage now.
          </p>
          {toggleError ? (
            <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 light-mode:text-rose-700">
              {toggleError}
            </div>
          ) : null}

          <div className="mt-6 space-y-3 text-sm text-white/70 light-mode:text-slate-600">
            <div className="flex items-center justify-between"><span>Active coverage hours</span><span className="font-bold">{policySummary?.activeCoverageHours ?? 0}h</span></div>
            <div className="flex items-center justify-between"><span>Full coverage monthly cost</span><span className="font-bold">{formatCurrency(policySummary?.fullCoverageMonthlyCost)}</span></div>
            <div className="flex items-center justify-between"><span>Micro-policy monthly cost</span><span className="font-bold" title={policySummary?.activeCoverageHours === 0 ? "Calculated after your first active shift" : undefined}>{policySummary?.activeCoverageHours === 0 ? "—" : formatCurrency(policySummary?.microPolicyMonthlyCost)}</span></div>
            <div className="flex items-center justify-between"><span>Estimated monthly saving</span><span className="font-bold text-emerald-300 light-mode:text-emerald-700">{formatCurrency(policySummary?.estimatedMonthlySaving)}</span></div>
            <div className="flex items-center justify-between"><span>Coverage efficiency</span><span className="font-bold">{policySummary?.activeCoverageHours === 0 ? "—" : `${policySummary?.coverageEfficiencyPercent ?? 0}%`}</span></div>
          </div>

          {policySummary?.activeCoverageHours === 0 && (
            <p className="mt-3 text-gray-500 text-sm">Toggle coverage ON during your next shift to start tracking real savings from your own coverage history.</p>
          )}

          <div className="mt-6 border-t border-white/10 pt-5 light-mode:border-black/10">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 light-mode:text-slate-500">Recent policy activity</h4>
              <span className="text-xs text-white/45 light-mode:text-slate-500">Last 3 entries</span>
            </div>
            <div className="mt-4 space-y-3">
              {policyHistory.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">
                  No policy toggles yet. Turn coverage ON to start the audit trail.
                </div>
              ) : (
                policyHistory.map((entry) => (
                  <div key={`${entry.createdAt}-${entry.currentState}`} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm light-mode:border-black/10 light-mode:bg-white">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold text-white light-mode:text-slate-900">
                        Turned {entry.currentState}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${entry.currentState === "ON" ? toneClass.success : toneClass.danger}`}>
                        {entry.currentState}
                      </span>
                    </div>
                    <div className="mt-2 text-white/60 light-mode:text-slate-500">
                      {formatRelativeTime(entry.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>

        <motion.div variants={containerVariants} className="space-y-6">
          <motion.div variants={itemVariants} className="rounded-4xl border border-white/10 bg-white/3 p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300 light-mode:text-emerald-700">Payout Summary</p>
                <h3 className="mt-3 text-2xl font-black text-white light-mode:text-slate-900">Your earnings are protected during disruptions</h3>
              </div>
              <Link href="/payouts" className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-200 light-mode:text-emerald-700 transition hover:bg-emerald-500/20">
                View All Payouts
              </Link>
            </div>

            {payoutSummary && payoutSummary.total_payout_received > 0 ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-emerald-200 light-mode:text-emerald-700">Total Protected Earnings</p>
                  <p className="mt-3 text-4xl font-black text-white light-mode:text-slate-900">💰 {formatCurrency(payoutSummary.total_payout_received)}</p>
                  <p className="mt-2 text-sm text-white/70 light-mode:text-slate-600">Coverage utilized: {payoutSummary.coverage_utilized_percent}%</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/10 p-5 light-mode:border-black/10 light-mode:bg-slate-50">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/50 light-mode:text-slate-500">Claims Approved</p>
                  <p className="mt-3 text-3xl font-black text-white light-mode:text-slate-900">📄 {payoutSummary.total_claims_approved}</p>
                  <p className="mt-2 text-sm text-white/70 light-mode:text-slate-600">Coverage status: {payoutSummary.coverage_status}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/10 p-5 light-mode:border-black/10 light-mode:bg-slate-50">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/50 light-mode:text-slate-500">Last Payout</p>
                  <p className="mt-3 text-lg font-black text-white light-mode:text-slate-900">{formatCurrency(payoutSummary.last_payout?.amount || 0)}</p>
                  <p className="mt-2 text-sm text-white/70 light-mode:text-slate-600">Method: {payoutSummary.last_payout?.method || "Unavailable"}</p>
                  <p className="mt-1 text-sm text-white/70 light-mode:text-slate-600">Transaction ID: {payoutSummary.last_payout?.transaction_id || "Unavailable"}</p>
                  <p className="mt-1 text-sm text-white/70 light-mode:text-slate-600">Time: {formatTimestamp(payoutSummary.last_payout?.timestamp)}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/10 p-5 light-mode:border-black/10 light-mode:bg-slate-50">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/50 light-mode:text-slate-500">Coverage Status</p>
                  <p className="mt-3 text-lg font-black text-white light-mode:text-slate-900">{payoutSummary.coverage_status}</p>
                  <p className="mt-2 text-sm text-white/70 light-mode:text-slate-600">Coverage amount: {formatCurrency(payoutSummary.active_policy.coverage_amount)}</p>
                  <p className="mt-1 text-sm text-white/70 light-mode:text-slate-600">Max payout/event: {formatCurrency(payoutSummary.active_policy.max_payout_per_event)}</p>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-3xl border border-dashed border-white/10 px-5 py-8 text-sm text-white/60 light-mode:border-black/10 light-mode:text-slate-600">
                No payouts yet. You're covered when disruptions occur.
              </div>
            )}
          </motion.div>

          <motion.div variants={itemVariants} className="rounded-4xl border border-white/10 bg-white/3 p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-xl overflow-hidden group">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 light-mode:text-slate-500">Risk Level</p>
            <h3 className="mt-3 text-3xl font-black text-white light-mode:text-slate-900 group-hover:text-indigo-400 transition-colors">{risk.label}</h3>
            <p className="mt-3 text-sm text-white/65 light-mode:text-slate-600">{risk.reason}</p>
            <div className="mt-4 space-y-1 text-xs text-white/55 light-mode:text-slate-500">
              <p>Source: {risk.source}</p>
              <p>Last updated: {formatTimestamp(risk.lastUpdated)}</p>
              <p>Reliability: {risk.reliability}</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="rounded-4xl border border-white/10 bg-white/3 p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 light-mode:text-slate-500">Policy Terms</p>
            <div className="mt-4 space-y-3 text-sm text-white/70 light-mode:text-slate-600">
              <div className="flex items-center justify-between"><span>Waiting period</span><span className="font-bold">{policyTerms?.waiting_period_hours ?? 24} hours after activation</span></div>
              <div className="flex items-center justify-between"><span>Max claims per week</span><span className="font-bold">{policyTerms?.max_claims_per_week ?? 1} claim</span></div>
              <div className="flex items-center justify-between"><span>Coverage rules</span><span className="font-bold">{policyTerms?.coverage_rules?.length ?? 0} rules</span></div>
              <div className="text-xs text-white/55 light-mode:text-slate-500">Exclusions: {policyTerms?.exclusions?.join(", ") || "Loading..."}</div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <div className="mt-8">
        <motion.section variants={itemVariants} className="rounded-4xl border border-white/10 bg-white/3 p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-2xl">
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
                  {claim.status === 'REJECTED' && claim.reasons && claim.reasons.length > 0 && (
                    <span className="text-red-400">Reason: {claim.reasons.join(', ')}</span>
                  )}
                </div>
                <div className="mt-2 text-xs text-white/50 light-mode:text-slate-500">
                  Source: {claim.externalData?.source || claim.externalData?.metadata?.source_name || "Unavailable"} | Updated: {formatTimestamp(claim.externalData?.lastUpdated || claim.externalData?.metadata?.last_updated_timestamp)}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>

      {/* Toggle Confirmation Modal */}
      {showToggleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="mx-4 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl light-mode:bg-white"
          >
            <h2 className="text-xl font-bold text-slate-900">
              Starting your shift in {getSessionUser()?.zone || "Delhi NCR"}
            </h2>

            <div className="mt-6 space-y-4">
              {/* Risk Level */}
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-700">Current risk level</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    modalRiskData?.zones[0]?.risk_level === "HIGH"
                      ? "bg-red-100 text-red-700"
                      : modalRiskData?.zones[0]?.risk_level === "MEDIUM"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-green-100 text-green-700"
                  }`}
                  style={{
                    backgroundColor:
                      modalRiskData?.zones[0]?.risk_level === "HIGH"
                        ? "#fee2e2"
                        : modalRiskData?.zones[0]?.risk_level === "MEDIUM"
                        ? "#fef3c7"
                        : "#d1fae5",
                    color:
                      modalRiskData?.zones[0]?.risk_level === "HIGH"
                        ? "#ef4444"
                        : modalRiskData?.zones[0]?.risk_level === "MEDIUM"
                        ? "#f59e0b"
                        : "#10b981",
                  }}
                >
                  {modalRiskData?.zones[0]?.risk_level || "MEDIUM"}
                </span>
              </div>

              {/* Active Disruption Events */}
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-700 mb-2">Active disruption events</p>
                <ul className="text-sm text-slate-600 space-y-1">
                  {modalRiskData?.zones[0]?.reason ? (
                    <li>• {modalRiskData.zones[0].reason}</li>
                  ) : (
                    <li>• No active disruptions detected</li>
                  )}
                </ul>
              </div>

              {/* Estimated Payout */}
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-medium text-slate-700">
                  If a covered disruption occurs today, your maximum configured protection is ₹{policy?.coverageAmount ?? "0"}.
                </p>
              </div>

              {/* Trust Score */}
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-700">
                  Your trust score: {trustScore}/100 — qualifies for {trustScore > 80 ? "instant" : "standard"} approval
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={cancelToggle}
                className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggleOn}
                disabled={toggleLoading}
                className="flex-1 rounded-2xl bg-red-500 px-4 py-3 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-60"
              >
                {toggleLoading ? "Starting..." : "Start Shift & Activate Coverage"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-6 right-6 z-50 rounded-2xl bg-slate-900 px-6 py-4 text-white shadow-lg"
        >
          <p className="text-sm font-medium">{toastMessage}</p>
        </motion.div>
      )}
    </motion.main>
  );
}
