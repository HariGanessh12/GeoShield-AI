"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { apiFetch } from "@/utils/api-client";
import { getSessionUser } from "@/utils/auth";
import { formatCurrency } from "@/utils/format";

type PayoutRecord = {
  _id?: string;
  claimId: string;
  userId: string;
  amount: number;
  status: "SUCCESS" | "FAILED" | "PENDING";
  transactionId: string;
  paymentMethod: "UPI" | "BANK";
  provider: string;
  message: string;
  timestamp: string;
};

type ClaimsRecord = {
  _id: string;
  status: string;
  payout: number;
  transactionId?: string | null;
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

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [approvedClaims, setApprovedClaims] = useState<ClaimsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingClaimId, setProcessingClaimId] = useState<string | null>(null);
  const [banner, setBanner] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [payoutData, claimsData] = await Promise.all([
        apiFetch<{ payouts: PayoutRecord[] }>("/api/payout/history"),
        apiFetch<ClaimsRecord[]>("/api/claim/history"),
      ]);

      setPayouts(payoutData.payouts || []);
      setApprovedClaims((claimsData || []).filter((claim) => claim.status === "APPROVED"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load payouts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const triggerPayout = async (claimId: string, amount: number) => {
    const user = getSessionUser();
    if (!user) return;

    setProcessingClaimId(claimId);
    setBanner("");
    setError("");
    try {
      const result = await apiFetch<{ transaction_id: string; status: string; message: string }>("/api/payout/process", {
        method: "POST",
        body: JSON.stringify({
          claimId,
          userId: user.id,
          amount,
        }),
      });

      setBanner(result.message);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process payout");
    } finally {
      setProcessingClaimId(null);
    }
  };

  return (
    <motion.main initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-4xl border border-white/10 bg-white/3 p-8 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300 light-mode:text-emerald-700">Payments</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-black text-white light-mode:text-slate-900">Payout Center</h1>
            <p className="mt-3 max-w-2xl text-white/65 light-mode:text-slate-600">Simulated Payment (Razorpay-ready). Review completed payouts and trigger settlement for approved claims.</p>
          </div>
          <Link href="/claims" className="text-sm font-semibold text-sky-300 light-mode:text-sky-700 hover:underline">Back to claims</Link>
        </div>
      </section>

      {banner ? (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100 light-mode:text-emerald-700">
          {banner}
        </motion.div>
      ) : null}
      {error ? <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200 light-mode:text-rose-700">{error}</div> : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-4xl border border-white/10 bg-white/3 p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-xl">
          <h2 className="text-2xl font-black text-white light-mode:text-slate-900">Approved claims awaiting settlement</h2>
          <div className="mt-6 space-y-4">
            {loading ? <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">Loading approved claims...</div> : null}
            {!loading && approvedClaims.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">No approved claims available.</div> : null}
            {approvedClaims.map((claim) => (
              <div key={claim._id} className="rounded-2xl border border-white/10 bg-black/20 p-5 light-mode:border-black/10 light-mode:bg-white">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-white light-mode:text-slate-900">Claim {claim._id}</div>
                    <div className="text-xs text-white/50 light-mode:text-slate-500">Approved for settlement</div>
                  </div>
                  <span className="text-sm font-bold text-white light-mode:text-slate-900">{formatCurrency(claim.payout)}</span>
                </div>
                {claim.transactionId ? (
                  <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 light-mode:text-emerald-700">
                    Payout completed | Txn {claim.transactionId}
                  </div>
                ) : (
                  <button
                    onClick={() => triggerPayout(claim._id, claim.payout)}
                    disabled={processingClaimId === claim._id}
                    className="mt-4 w-full rounded-2xl bg-emerald-500 px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {processingClaimId === claim._id ? "Processing payout..." : "Process payout"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-4xl border border-white/10 bg-white/3 p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70 shadow-xl">
          <h2 className="text-2xl font-black text-white light-mode:text-slate-900">Payout ledger</h2>
          <div className="mt-6 space-y-4">
            {loading ? <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">Loading payout ledger...</div> : null}
            {!loading && payouts.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">No payouts recorded yet.</div> : null}
            {payouts.map((payout) => (
              <motion.div key={payout.transactionId} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl border border-white/10 bg-black/20 p-5 light-mode:border-black/10 light-mode:bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-bold text-white light-mode:text-slate-900">Claim {payout.claimId}</div>
                    <div className="text-xs text-white/50 light-mode:text-slate-500">{formatTimestamp(payout.timestamp)}</div>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-bold ${payout.status === "SUCCESS" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>
                    {payout.status}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-5 text-sm text-white/70 light-mode:text-slate-600">
                  <span>Amount: {formatCurrency(payout.amount)}</span>
                  <span>Method: {payout.paymentMethod}</span>
                  <span>Transaction ID: {payout.transactionId}</span>
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/75 light-mode:border-black/10 light-mode:text-slate-600">
                  {payout.message}
                </div>
                <div className="mt-3 text-xs text-white/50 light-mode:text-slate-500">{payout.provider}</div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </motion.main>
  );
}
