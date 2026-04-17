"use client";
import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { clearSession, getSessionUser } from "@/utils/auth";
import { apiFetch } from "@/utils/api-client";
import { formatCurrency } from "@/utils/format";

type AdminDashboardResponse = {
  financials: {
    total_users: number;
    avg_premium: number;
    total_premium_collected: number;
    total_claims_paid: number;
    profit: number;
    loss_ratio: number;
    status: string;
  };
  claims: {
    total: number;
    approved: number;
    approvalRate: number;
  };
  demographics: Array<{ _id: string; userCount: number }>;
  predictiveAnalytics: Array<{ id: string; risk: string; description: string; expectedImpact: number }>;
};

type ReviewClaim = {
  _id: string;
  trigger: string;
  status: string;
  claimAmount: number;
  payout: number;
  transactionId?: string | null;
  payoutStatus?: string;
  createdAt: string;
  workerId: string;
  resolutionNote?: string;
};

function lossRatioTheme(lossRatio = 0) {
  if (lossRatio > 1) return { tone: "Red", label: "Critical", className: "border-rose-500/30 bg-rose-500/10 text-rose-200" };
  if (lossRatio >= 0.7) return { tone: "Yellow", label: "Watchlist", className: "border-amber-500/30 bg-amber-500/10 text-amber-200" };
  return { tone: "Green", label: "Sustainable", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [dashboard, setDashboard] = React.useState<AdminDashboardResponse | null>(null);
  const [queue, setQueue] = React.useState<ReviewClaim[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [reviewingClaimId, setReviewingClaimId] = React.useState<string | null>(null);
  const [actionMessage, setActionMessage] = React.useState<string>("");
  const [actionError, setActionError] = React.useState<string>("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const user = getSessionUser();
    if (user?.role !== "admin") {
      router.replace("/");
      return;
    }
    void loadAdminData();
  }, [mounted, router]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [dashboardData, queueData] = await Promise.all([
        apiFetch<AdminDashboardResponse>("/api/metrics/admin-dashboard"),
        apiFetch<{ claims: ReviewClaim[] }>("/api/claim/admin/review-queue"),
      ]);
      setDashboard(dashboardData);
      setQueue(queueData.claims || []);
    } finally {
      setLoading(false);
    }
  };

  const reviewClaim = async (claimId: string, status: "APPROVED" | "REJECTED") => {
    setReviewingClaimId(claimId);
    setActionMessage("");
    setActionError("");
    try {
      await apiFetch(`/api/claim/admin/${claimId}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setActionMessage(`Claim ${status === "APPROVED" ? "approved" : "rejected"} successfully.`);
      await loadAdminData();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not update claim review.");
    } finally {
      setReviewingClaimId(null);
    }
  };

  const handleLogout = () => {
    clearSession();
    router.replace("/");
  };

  if (!mounted) return null;

  const lossRatio = dashboard?.financials.loss_ratio ?? 0;
  const ratioView = lossRatioTheme(lossRatio);

  return (
    <div className="min-h-screen bg-[rgb(var(--background-start-rgb))] text-[rgb(var(--foreground-rgb))] font-sans selection:bg-indigo-500/30">
      <div className="fixed inset-0 overflow-hidden z-0 pointer-events-none">
        <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full light-mode:bg-indigo-600/5"></motion.div>
        <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, -5, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-rose-900/10 blur-[120px] rounded-full light-mode:bg-rose-900/5"></motion.div>
      </div>

      <nav className="relative z-10 border-b border-white/5 backdrop-blur-xl bg-[#0d0f17]/50 light-mode:border-black/5 light-mode:bg-white/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-white to-white/60 light-mode:from-slate-900 light-mode:to-slate-600">Command Center</h1>
              <p className="text-[10px] uppercase tracking-widest text-rose-400 font-bold">Admin Privileges Active</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex gap-6 mr-4 border-r border-white/10 pr-6 light-mode:border-black/10">
              <Link href="/admin" className="text-sm font-bold text-white transition-colors border-b-2 border-rose-500 pb-1 light-mode:text-slate-900">Dashboard</Link>
              <Link href="/admin/users" className="text-sm font-bold text-gray-500 hover:text-gray-300 transition-colors pb-1 border-b-2 border-transparent hover:border-white/20 light-mode:text-slate-500 light-mode:hover:text-slate-900">User Management</Link>
              <Link href="/payouts" className="text-sm font-bold text-gray-500 hover:text-gray-300 transition-colors pb-1 border-b-2 border-transparent hover:border-white/20 light-mode:text-slate-500 light-mode:hover:text-slate-900">Payouts</Link>
            </div>
            <button onClick={handleLogout} className="text-xs font-bold text-gray-400 hover:text-white transition-colors border border-white/10 hover:border-white/30 rounded-lg px-4 py-2 light-mode:border-black/10 light-mode:text-slate-600 light-mode:hover:text-slate-900">Sign Out</button>
          </div>
        </div>
      </nav>

      <motion.main initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, staggerChildren: 0.1 }} className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="bg-white/2 border border-white/5 rounded-3xl p-6 shadow-2xl hover:bg-white/4 transition-colors light-mode:bg-white light-mode:border-black/5 light-mode:shadow-xl">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider light-mode:text-slate-500">Total Claims Processed</span>
            <span className="block text-4xl font-black mt-2 text-white light-mode:text-slate-900">{loading ? "..." : dashboard?.claims.total ?? 0}</span>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="bg-rose-500/10 border border-rose-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden light-mode:bg-rose-50 light-mode:border-rose-200">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <span className="text-rose-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2 relative z-10 light-mode:text-rose-600">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shadow-[0_0_8px_rgba(251,113,133,0.8)] light-mode:shadow-none light-mode:bg-rose-500"></span>
              Claims Pending Review
            </span>
            <span className="block text-4xl font-black mt-2 text-white relative z-10 light-mode:text-rose-700">{loading ? "..." : queue.filter((claim) => claim.status === "VERIFY").length}</span>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className={`border rounded-3xl p-6 shadow-2xl ${ratioView.className}`}>
            <span className="text-xs font-bold uppercase tracking-wider">Loss Ratio</span>
            <span className="block text-4xl font-black mt-2">{loading ? "..." : `${(lossRatio * 100).toFixed(1)}%`}</span>
            <span className="block text-sm font-semibold mt-1">{loading ? "Loading..." : `${ratioView.tone}: ${ratioView.label}`}</span>
            <p className="mt-4 text-sm">Loss Ratio: {loading ? "..." : `${(lossRatio * 100).toFixed(0)}% (${ratioView.label})`}</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white/2 backdrop-blur-2xl border border-white/5 rounded-4xl p-8 shadow-2xl hover:border-white/10 transition-colors light-mode:bg-white/80 light-mode:border-black/5 light-mode:shadow-xl xl:col-span-2">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 border-b border-white/5 pb-4 light-mode:border-black/5 light-mode:text-slate-900">
              <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              Live claims review queue
            </h3>
            {actionMessage ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 light-mode:border-emerald-200 light-mode:bg-emerald-50 light-mode:text-emerald-700">{actionMessage}</div> : null}
            {actionError ? <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 light-mode:border-rose-200 light-mode:bg-rose-50 light-mode:text-rose-700">{actionError}</div> : null}

            <div className="mb-6 rounded-3xl border border-white/10 bg-black/20 p-5 light-mode:border-black/10 light-mode:bg-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45 light-mode:text-slate-500">Financial Overview</p>
                  <h4 className="mt-2 text-2xl font-black text-white light-mode:text-slate-900">Portfolio sustainability</h4>
                </div>
                <span className={`rounded-full px-3 py-2 text-xs font-bold ${ratioView.className}`}>{ratioView.label}</span>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 light-mode:border-black/10 light-mode:bg-slate-50">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45 light-mode:text-slate-500">Total Premium</p>
                  <p className="mt-2 text-2xl font-black text-white light-mode:text-slate-900">{formatCurrency(dashboard?.financials.total_premium_collected ?? 0)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 light-mode:border-black/10 light-mode:bg-slate-50">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45 light-mode:text-slate-500">Total Claims Paid</p>
                  <p className="mt-2 text-2xl font-black text-white light-mode:text-slate-900">{formatCurrency(dashboard?.financials.total_claims_paid ?? 0)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 light-mode:border-black/10 light-mode:bg-slate-50">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45 light-mode:text-slate-500">Profit</p>
                  <p className="mt-2 text-2xl font-black text-white light-mode:text-slate-900">{formatCurrency(dashboard?.financials.profit ?? 0)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 light-mode:border-black/10 light-mode:bg-slate-50">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45 light-mode:text-slate-500">Average Premium</p>
                  <p className="mt-2 text-2xl font-black text-white light-mode:text-slate-900">{formatCurrency(dashboard?.financials.avg_premium ?? 0)}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-white/75 light-mode:text-slate-600">Loss Ratio: {(lossRatio * 100).toFixed(0)}% ({ratioView.label})</p>
            </div>

            <div className="space-y-4">
              {queue.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">No claims available for review.</div>
              ) : (
                queue.map((claim) => (
                  <div key={claim._id} className="rounded-2xl border border-white/10 bg-black/20 p-5 light-mode:border-black/10 light-mode:bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-white light-mode:text-slate-900">{claim.trigger}</div>
                        <div className="text-xs text-white/50 light-mode:text-slate-500">Worker {claim.workerId} · {new Date(claim.createdAt).toLocaleString()}</div>
                      </div>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-white/80 light-mode:border-black/10 light-mode:text-slate-700">{claim.status}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-5 text-sm text-white/70 light-mode:text-slate-600">
                      <span>Claimed: {formatCurrency(claim.claimAmount)}</span>
                      <span>Payout: {formatCurrency(claim.payout)}</span>
                      {claim.transactionId ? <span>Txn: {claim.transactionId}</span> : null}
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button onClick={() => reviewClaim(claim._id, "APPROVED")} disabled={reviewingClaimId === claim._id} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">
                        {reviewingClaimId === claim._id ? "Processing..." : "Approve"}
                      </button>
                      <button onClick={() => reviewClaim(claim._id, "REJECTED")} disabled={reviewingClaimId === claim._id} className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-200 transition hover:bg-rose-500/20 light-mode:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60">
                        {reviewingClaimId === claim._id ? "Processing..." : "Reject"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white/2 backdrop-blur-2xl border border-white/5 rounded-4xl p-8 shadow-2xl hover:border-white/10 transition-colors light-mode:bg-white/80 light-mode:border-black/5 light-mode:shadow-xl xl:col-span-1">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 border-b border-white/5 pb-4 light-mode:border-black/5 light-mode:text-slate-900">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              Predictive Insights
            </h3>
            <div className="space-y-4">
              {!dashboard?.predictiveAnalytics ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">Loading insights...</div>
              ) : (
                dashboard.predictiveAnalytics.map((insight) => (
                  <div key={insight.id} className={`rounded-2xl border ${insight.risk === 'HIGH' ? 'border-rose-500/30' : insight.risk === 'MEDIUM' ? 'border-amber-500/30' : 'border-emerald-500/30'} bg-black/20 p-5 light-mode:bg-white`}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${insight.risk === 'HIGH' ? 'bg-rose-500/20 text-rose-300 light-mode:text-rose-700' : insight.risk === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300 light-mode:text-amber-700' : 'bg-emerald-500/20 text-emerald-300 light-mode:text-emerald-700'}`}>{insight.risk} RISK</span>
                      <span className="text-xs font-bold text-white/50 light-mode:text-slate-500">Impact: {formatCurrency(insight.expectedImpact)}</span>
                    </div>
                    <p className="text-sm text-white/80 light-mode:text-slate-700 leading-relaxed">{insight.description}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </motion.main>
    </div>
  );
}
