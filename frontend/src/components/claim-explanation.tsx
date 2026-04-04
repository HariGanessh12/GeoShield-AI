"use client";

import { scoreTone } from "@/utils/format";

type Adjustment = {
  label: string;
  value: number;
};

type ClaimExplanationProps = {
  reasons?: string[];
  adjustments?: Adjustment[];
  score?: number;
  confidence?: number;
};

export function ClaimExplanation({ reasons = [], adjustments = [], score = 0, confidence }: ClaimExplanationProps) {
  const computedAdjustments = adjustments.length ? adjustments : reasons.map((reason) => {
    const negative = /mismatch|fraud|reject|anomaly|below|inactive|not covered/i.test(reason);
    return { label: reason, value: negative ? -15 : 10 };
  });

  const scoreClass = scoreTone(score) === "success" ? "text-emerald-400" : scoreTone(score) === "warning" ? "text-amber-400" : "text-rose-400";

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-6 light-mode:border-black/10 light-mode:bg-black/3">
      <div className="mb-5 flex items-end justify-between gap-4 border-b border-white/10 pb-4 light-mode:border-black/10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 light-mode:text-slate-500">Claim explanation</p>
          <h3 className="mt-2 text-xl font-bold text-white light-mode:text-slate-900">Decision breakdown</h3>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 light-mode:text-slate-500">Final score</p>
          <p className={`text-4xl font-black ${scoreClass}`}>{score}</p>
        </div>
      </div>
      <div className="space-y-3">
        {computedAdjustments.map((item) => (
          <div key={`${item.label}-${item.value}`} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-4 py-3 light-mode:border-black/10 light-mode:bg-white">
            <span className="text-sm font-medium text-white/85 light-mode:text-slate-800">{item.label}</span>
            <span className={`text-sm font-black ${item.value >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{item.value >= 0 ? "+" : ""}{item.value}</span>
          </div>
        ))}
        {computedAdjustments.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">No score modifiers were returned for this decision.</div> : null}
      </div>
      {typeof confidence === "number" ? <div className="mt-5 rounded-2xl bg-indigo-500/10 px-4 py-3 text-sm text-indigo-200 light-mode:bg-indigo-500/10 light-mode:text-indigo-700">AI confidence: {confidence.toFixed(0)}%</div> : null}
    </div>
  );
}
