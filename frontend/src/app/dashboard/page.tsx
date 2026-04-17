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

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [policy, setPolicy] = useState<PolicyResponse["policy"]>(null);
  const [premium, setPremium] = useState<PremiumResponse | null>(null);
  const [policySummary, setPolicySummary] = useState<PolicySummaryResponse | null>(null);
  const [risk, setRisk] = useState({ label: "Loading", reason: "Fetching live zone signal" });
  const [policyToggleState, setPolicyToggleState] = useState<"ON" | "OFF">("OFF");
  const [policyHistory, setPolicyHistory] = useState<WorkerSummaryResponse["recentToggles"]>([]);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [toggleError, setToggleError] = useState("");
  const [autoShutoffWarning, setAutoShutoffWarning] = useState("");
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
      const inputs = zoneInputs[user.zone || "Delhi NCR"] || zoneInputs["Delhi NCR"];
      const [claimsData, policyData, riskData, premiumData] = await Promise.all([
        apiFetch<Claim[]>("/api/claim/history"),
        apiFetch<PolicyResponse>("/api/policy/current"),
        apiFetch<ZoneRiskResponse>("/api/risk/zone-risk"),
        apiFetch<Record<string, unknown>>("/api/risk/premium-breakdown", {
          method: "POST",
          body: JSON.stringify({
            weather: inputs.weather,
            traffic: inputs.traffic,
            location: inputs.location,
            persona_type: user.personaType || "FOOD_DELIVERY"
          })
        }),
      ]);
      const workerData = await apiFetch<WorkerSummaryResponse>(`/api/worker/${user.id}/summary`);
      const policySummaryData = await apiFetch<PolicySummaryResponse>(`/api/worker/${user.id}/policy/summary`);

      setClaims(claimsData);
      setPolicy(policyData.policy);
      setPremium(normalizePremiumResponse(premiumData));
      setRisk({ label: riskData.zones[0]?.risk_level || "MEDIUM", reason: riskData.zones[0]?.reason || "No live risk reason returned" });
      setPolicyToggleState(workerData.shiftState || workerData.currentPolicy?.shiftState || "OFF");
      setPolicyHistory(workerData.recentToggles.slice(0, 3));
      setPolicySummary(policySummaryData);

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
  }, [mounted]);

  if (!mounted) return null;

  const lastClaim = claims[0];
  const trustScore = lastClaim?.trustScore || 85;
  const currentScore = trustScore;
  const previousScore = claims[1]?.trustScore;
  const delta = previousScore !== undefined ? currentScore - previousScore : 0;
  const currentPolicyState = policyToggleState;

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
      // Fetch current risk data for the modal
      const riskData = await apiFetch<ZoneRiskResponse>("/api/risk/zone-risk");
      setModalRiskData(riskData);
      setShowToggleModal(true);
    } catch (err) {
      console.error("Could not fetch risk data for modal:", err);
      // Still show modal with default data
      setModalRiskData({ zones: [{ risk_level: "MEDIUM", reason: "Unable to fetch live risk data" }] });
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
          {delta !== 0 && (
            <p className={`mt-2 text-sm font-bold ${delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {delta > 0 ? `↑ +${delta}` : `↓ ${delta}`}
            </p>
          )}
          <p className="mt-1 text-gray-500 text-xs">Maintained by 3 consecutive approved claims this week.</p>
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
            <p className="mt-3 text-gray-500 text-sm">Toggle coverage ON during your next shift to start tracking savings. Workers save an average of 38% compared to always-on plans.</p>
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
          <motion.div variants={itemVariants} className="rounded-4xl border border-white/10 bg-white/3 p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-xl overflow-hidden group">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 light-mode:text-slate-500">Risk Level</p>
            <h3 className="mt-3 text-3xl font-black text-white light-mode:text-slate-900 group-hover:text-indigo-400 transition-colors">{risk.label}</h3>
            <p className="mt-3 text-sm text-white/65 light-mode:text-slate-600">{risk.reason}</p>
          </motion.div>

          <motion.div variants={itemVariants} className="rounded-4xl border border-white/10 bg-white/3 p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 light-mode:text-slate-500">Premium Snapshot</p>
            <div className="mt-4 space-y-3 text-sm text-white/70 light-mode:text-slate-600">
              <div className="flex items-center justify-between"><span>Expected loss</span><span className="font-bold">{formatCurrency(premium?.expected_loss_inr)}</span></div>
              <div className="flex items-center justify-between"><span>Risk margin</span><span className="font-bold">{formatCurrency(premium?.risk_margin_inr)}</span></div>
              <div className="flex items-center justify-between"><span>Platform fee</span><span className="font-bold">{formatCurrency(premium?.platform_fee_inr)}</span></div>
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
                  If you experience {modalRiskData?.zones[0]?.reason?.toLowerCase() || "a disruption"} today, estimated payout: ₹{policy?.coverageAmount ? Math.round(policy.coverageAmount * 0.8) : "2,500"}
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
