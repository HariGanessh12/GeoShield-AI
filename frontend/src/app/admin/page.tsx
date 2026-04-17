"use client";
import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { clearSession } from "@/utils/auth";
import { apiFetch } from "@/utils/api-client";
import { formatCurrency } from "@/utils/format";

type AdminDashboardResponse = {
  financials: {
    totalPremium: number;
    totalClaims: number;
    lossRatio: number;
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
  createdAt: string;
  workerId: string;
  resolutionNote?: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [dashboard, setDashboard] = React.useState<AdminDashboardResponse | null>(null);
  const [queue, setQueue] = React.useState<ReviewClaim[]>([]);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const role = localStorage.getItem("role");
    if (role !== "admin") {
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
    await apiFetch(`/api/claim/admin/${claimId}/review`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await loadAdminData();
  };

  const handleLogout = () => {
      clearSession();
      router.replace("/");
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[rgb(var(--background-start-rgb))] text-[rgb(var(--foreground-rgb))] font-sans selection:bg-indigo-500/30">
      <div className="fixed inset-0 overflow-hidden z-0 pointer-events-none">
        <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full light-mode:bg-indigo-600/5"></motion.div>
        <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, -5, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-rose-900/10 blur-[120px] rounded-full light-mode:bg-rose-900/5"></motion.div>
      </div>

      <nav className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-white/5 backdrop-blur-xl bg-[#0d0f17]/50 light-mode:border-black/5 light-mode:bg-white/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 light-mode:from-slate-900 light-mode:to-slate-600">Command Center</h1>
              <p className="text-[10px] uppercase tracking-widest text-rose-400 font-bold">Admin Privileges Active</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-6 mr-4 border-r border-white/10 pr-6 light-mode:border-black/10">
             <Link href="/admin" className="text-sm font-bold text-white transition-colors border-b-2 border-rose-500 pb-1 light-mode:text-slate-900">Dashboard</Link>
             <Link href="/admin/users" className="text-sm font-bold text-gray-500 hover:text-gray-300 transition-colors pb-1 border-b-2 border-transparent hover:border-white/20 light-mode:text-slate-500 light-mode:hover:text-slate-900">User Management</Link>
          </div>
          <button onClick={handleLogout} className="text-xs font-bold text-gray-400 hover:text-white transition-colors border border-white/10 hover:border-white/30 rounded-lg px-4 py-2 light-mode:border-black/10 light-mode:text-slate-600 light-mode:hover:text-slate-900">Sign Out</button>
        </div>
      </nav>

      <motion.main 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, staggerChildren: 0.1 }}
        className="relative z-10 max-w-[1400px] mx-auto px-6 py-12"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-2xl hover:bg-white/[0.04] transition-colors light-mode:bg-white light-mode:border-black/5 light-mode:shadow-xl"
            >
                <span className="text-gray-400 text-xs font-bold uppercase tracking-wider light-mode:text-slate-500">Total Claims Processed</span>
                <span className="block text-4xl font-black mt-2 text-white light-mode:text-slate-900">{loading ? "..." : dashboard?.claims.total ?? 0}</span>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-rose-500/10 border border-rose-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden light-mode:bg-rose-50 light-mode:border-rose-200"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <span className="text-rose-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2 relative z-10 light-mode:text-rose-600">
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shadow-[0_0_8px_rgba(251,113,133,0.8)] light-mode:shadow-none light-mode:bg-rose-500"></span>
                    Claims Pending Review
                </span>
                <span className="block text-4xl font-black mt-2 text-white relative z-10 light-mode:text-rose-700">{loading ? "..." : queue.filter((claim) => claim.status === "VERIFY").length}</span>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-2xl hover:bg-white/[0.04] transition-colors light-mode:bg-white light-mode:border-black/5 light-mode:shadow-xl"
            >
                <span className="text-gray-400 text-xs font-bold uppercase tracking-wider light-mode:text-slate-500">Portfolio Status</span>
                <span className="block text-xl font-bold mt-2 text-amber-400 light-mode:text-amber-600">{loading ? "Loading..." : dashboard?.financials.status ?? "N/A"}</span>
                <span className="block text-sm font-semibold mt-1 text-white/50 light-mode:text-slate-400">Loss ratio {(dashboard?.financials.lossRatio ?? 0) * 100}%</span>
            </motion.div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/[0.02] backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 shadow-2xl hover:border-white/10 transition-colors light-mode:bg-white/80 light-mode:border-black/5 light-mode:shadow-xl xl:col-span-2"
            >
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 border-b border-white/5 pb-4 light-mode:border-black/5 light-mode:text-slate-900">
                    <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Live claims review queue
                </h3>
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 light-mode:border-black/10 light-mode:bg-white">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45 light-mode:text-slate-500">Premium Collected</p>
                    <p className="mt-2 text-2xl font-black text-white light-mode:text-slate-900">{formatCurrency(dashboard?.financials.totalPremium)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 light-mode:border-black/10 light-mode:bg-white">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45 light-mode:text-slate-500">Claims Paid</p>
                    <p className="mt-2 text-2xl font-black text-white light-mode:text-slate-900">{formatCurrency(dashboard?.financials.totalClaims)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 light-mode:border-black/10 light-mode:bg-white">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45 light-mode:text-slate-500">Approval Rate</p>
                    <p className="mt-2 text-2xl font-black text-white light-mode:text-slate-900">{dashboard?.claims.approvalRate?.toFixed(1) ?? "0.0"}%</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {queue.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">
                      No claims available for review.
                    </div>
                  ) : (
                    queue.map((claim) => (
                      <div key={claim._id} className="rounded-2xl border border-white/10 bg-black/20 p-5 light-mode:border-black/10 light-mode:bg-white">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold text-white light-mode:text-slate-900">{claim.trigger}</div>
                            <div className="text-xs text-white/50 light-mode:text-slate-500">
                              Worker {claim.workerId} · {new Date(claim.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-white/80 light-mode:border-black/10 light-mode:text-slate-700">
                            {claim.status}
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-5 text-sm text-white/70 light-mode:text-slate-600">
                          <span>Claimed: {formatCurrency(claim.claimAmount)}</span>
                          <span>Payout: {formatCurrency(claim.payout)}</span>
                        </div>
                        <div className="mt-4 flex gap-3">
                          <button onClick={() => reviewClaim(claim._id, "APPROVED")} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-400">
                            Approve
                          </button>
                          <button onClick={() => reviewClaim(claim._id, "REJECTED")} className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-200 transition hover:bg-rose-500/20 light-mode:text-rose-700">
                            Reject
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white/[0.02] backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 shadow-2xl hover:border-white/10 transition-colors light-mode:bg-white/80 light-mode:border-black/5 light-mode:shadow-xl xl:col-span-1"
            >
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 border-b border-white/5 pb-4 light-mode:border-black/5 light-mode:text-slate-900">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    Predictive Insights
                </h3>
                
                <div className="space-y-4">
                  {!dashboard?.predictiveAnalytics ? (
                    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">
                      Loading insights...
                    </div>
                  ) : (
                    dashboard.predictiveAnalytics.map((insight) => (
                      <div key={insight.id} className={`rounded-2xl border ${insight.risk === 'HIGH' ? 'border-rose-500/30' : insight.risk === 'MEDIUM' ? 'border-amber-500/30' : 'border-emerald-500/30'} bg-black/20 p-5 light-mode:bg-white`}>
                        <div className="flex items-center justify-between gap-3 mb-2">
                           <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${insight.risk === 'HIGH' ? 'bg-rose-500/20 text-rose-300 light-mode:text-rose-700' : 'bg-amber-500/20 text-amber-300 light-mode:text-amber-700'}`}>
                             {insight.risk} RISK
                           </span>
                           <span className="text-xs font-bold text-white/50 light-mode:text-slate-500">Impact: {formatCurrency(insight.expectedImpact)}</span>
                        </div>
                        <p className="text-sm text-white/80 light-mode:text-slate-700 leading-relaxed">
                          {insight.description}
                        </p>
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
