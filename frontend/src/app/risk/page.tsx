"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/api-client";
import { getSessionUser } from "@/utils/auth";
import { formatCurrency } from "@/utils/format";

type ZoneRiskResponse = {
  zones: Array<{
    lat?: number;
    lng?: number;
    risk_level: string;
    reason: string;
  }>;
};

type PremiumResponse = {
  weekly_premium_inr: number;
  expected_loss_inr: number;
  risk_margin_inr: number;
  platform_fee_inr: number;
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
          apiFetch<PremiumResponse>("/api/risk/premium-breakdown", {
            method: "POST",
            body: JSON.stringify({
              weather: inputs.weather,
              traffic: inputs.traffic,
              location: inputs.location,
              persona_type: "FOOD_DELIVERY",
            }),
          }),
        ]);
        setRisk(riskData.zones);
        setPremium(premiumData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load risk data");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300 light-mode:text-sky-700">Risk engine</p>
        <h1 className="mt-3 text-4xl font-black text-white light-mode:text-slate-900">Risk and premium breakdown</h1>
        <p className="mt-3 max-w-2xl text-white/65 light-mode:text-slate-600">
          Live zone signals and premium components for <span className="font-bold text-white light-mode:text-slate-900">{zone}</span>.
        </p>
      </section>

      {error ? <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200 light-mode:text-rose-700">{error}</div> : null}

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70">
          <h2 className="text-2xl font-black text-white light-mode:text-slate-900">Zone signals</h2>
          <div className="mt-6 space-y-4">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">
                Loading zone risks...
              </div>
            ) : null}
            {!loading &&
              risk.map((item, index) => (
                <div key={`${item.risk_level}-${index}`} className="rounded-2xl border border-white/10 bg-black/20 p-5 light-mode:border-black/10 light-mode:bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-lg font-bold text-white light-mode:text-slate-900">{item.risk_level}</div>
                    <div className="text-xs text-white/50 light-mode:text-slate-500">
                      {item.lat?.toFixed(2)}, {item.lng?.toFixed(2)}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-white/65 light-mode:text-slate-600">{item.reason}</p>
                </div>
              ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/70">
          <h2 className="text-2xl font-black text-white light-mode:text-slate-900">Premium model</h2>
          {premium ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl border border-indigo-500/20 bg-indigo-500/10 p-6 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300 light-mode:text-indigo-700">Weekly premium</p>
                <p className="mt-3 text-5xl font-black text-white light-mode:text-slate-900">{formatCurrency(premium.weekly_premium_inr)}</p>
              </div>
              <div className="space-y-3 text-sm text-white/70 light-mode:text-slate-600">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 light-mode:border-black/10">
                  <span>Expected loss</span>
                  <span>{formatCurrency(premium.expected_loss_inr)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 light-mode:border-black/10">
                  <span>Risk margin</span>
                  <span>{formatCurrency(premium.risk_margin_inr)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 light-mode:border-black/10">
                  <span>Platform fee</span>
                  <span>{formatCurrency(premium.platform_fee_inr)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-white/50 light-mode:border-black/10 light-mode:text-slate-500">
              Premium data unavailable right now.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
