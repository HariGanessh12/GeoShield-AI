"use client";
import React, { useState } from 'react';

export default function WorkerDashboard() {
  const [claimResult, setClaimResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [triggerType, setTriggerType] = useState('HEATWAVE');

  const simulateDisruption = async () => {
    setLoading(true);
    setClaimResult(null);
    try {
      const res = await fetch('http://localhost:8000/api/claim/auto-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId: 'u101',
          disruptionFactor: { type: triggerType, severity: 0.85, lossAmount: 400, location_mismatch: false },
          userProfile: { reputation: 85, claims_history: [100, 150] } // Mock passing fairness data
        })
      });
      const data = await res.json();
      setClaimResult(data.decision);
    } catch (e) {
      setClaimResult({ status: 'ERROR', reasons: ['Failed to reach backend API.'] });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0d0f17] text-white font-sans selection:bg-indigo-500/30">
      {/* Background gradients */}
      <div className="fixed inset-0 overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[60%] bg-emerald-600/10 blur-[130px] rounded-full"></div>
      </div>

      <nav className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-white/5 backdrop-blur-xl bg-[#0d0f17]/50">
        <div className="flex items-center gap-3 hover:scale-105 transition-transform cursor-default">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">GeoShield-AI</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 shadow-[0_0_10px_rgba(99,102,241,0.1)]">
            <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Market Crash Defense: ACTIVE</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
             <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-sm font-semibold tracking-wide text-emerald-400">Coverage Active</span>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-[1400px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white/[0.02] backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 shadow-2xl transition-all hover:bg-white/[0.03] duration-500">
              <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2 text-white/90">Weekly Premium Breakdown</h2>
                    <p className="text-gray-400 mb-8 max-w-xl text-sm leading-relaxed">Dynamically calculated via AI. Genuine workers build reputation for trust-bonus grace buffers ensuring platform fairness.</p>
                  </div>
                  <div className="hidden sm:block text-right">
                    <span className="block text-sm font-bold text-gray-500 uppercase tracking-wider">Reputation Level</span>
                    <span className="text-2xl font-bold text-emerald-400 drop-shadow-lg">85/100</span>
                  </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/20 relative overflow-hidden">
                  <span className="block text-indigo-300 text-sm font-medium mb-3">Protected Earnings</span>
                  <span className="text-5xl font-bold text-white tracking-tight">₹3,500</span>
                  <span className="block text-xs font-semibold text-indigo-400/80 mt-3 pt-3 border-t border-indigo-500/20">Max Weekly Coverage</span>
                </div>
                
                <div className="p-6 rounded-3xl bg-black/40 border border-white/10">
                  <div className="flex justify-between items-start mb-3">
                    <span className="block text-gray-400 text-sm font-medium">Dynamic Cost</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white/70">RISK: LOW</span>
                  </div>
                  <span className="block text-3xl font-bold text-white tracking-tight mb-4">₹72.50</span>
                  
                  {/* EXPLAINABILITY FOR PRICING */}
                  <div className="space-y-1.5 mt-4 pt-4 border-t border-white/10">
                    <div className="flex justify-between text-xs font-semibold text-gray-400">
                      <span>Base Factor:</span>
                      <span className="text-white">₹50.00</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-gray-400">
                      <span>Weather Risk Index:</span>
                      <span className="text-rose-400">+₹12.00</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-gray-400">
                      <span>High-Risk Location:</span>
                      <span className="text-amber-400">+₹10.50</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white/[0.02] backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
              <div className="flex justify-between items-start sm:items-center mb-8 flex-col sm:flex-row gap-4">
                <div>
                  <h3 className="text-xl font-semibold mb-1">Parametric API Disruption Simulator</h3>
                  <p className="text-sm text-gray-400">Select a disruption trigger to test the AI evaluation pipeline</p>
                </div>
                <select 
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                  className="bg-black/50 border border-white/20 text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-3 w-48 font-bold text-sm tracking-wide"
                >
                  <option value="HEAVY_RAIN">🌧 Heavy Rain API</option>
                  <option value="HEATWAVE">🌡 Extreme Heat API</option>
                  <option value="POLLUTION">🌫 Severe AQI API</option>
                  <option value="CURFEW">🚫 Curfew Protocol</option>
                  <option value="PLATFORM_OUTAGE">📉 App Outage</option>
                </select>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-3xl bg-black/20 border border-indigo-500/10 relative z-10 transition-all hover:border-indigo-500/30 group">
                <div className="shrink-0 h-16 w-16 rounded-[1rem] bg-indigo-500/20 flex items-center justify-center shadow-lg border border-indigo-500/30 group-hover:scale-105 transition-transform">
                  <svg className="text-indigo-400 w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h4 className="text-lg font-bold text-white mb-1">Trigger Signal: {triggerType}</h4>
                  <p className="text-gray-400 text-sm">Testing the parametric sequence. Triggers Isolation Forests & generates Trust Score natively.</p>
                </div>
                <div className="shrink-0 flex justify-end">
                  <button 
                    onClick={simulateDisruption}
                    disabled={loading}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50"
                  >
                    {loading ? 'Evaluating Model...' : 'Simulate Auto-Claim'}
                  </button>
                </div>
              </div>

              {/* 🥇 EXPLAINABILITY DISPLAY AREA 🥇 */}
              {claimResult && (
                <div className={`mt-6 p-6 rounded-2xl border backdrop-blur-lg shadow-xl outline outline-4 outline-offset-[-4px] ${
                  claimResult.status === 'APPROVED' ? 'bg-emerald-500/10 border-emerald-500/30 outline-emerald-500/10' 
                  : claimResult.status === 'VERIFY' ? 'bg-amber-500/10 border-amber-500/30 outline-amber-500/10'
                  : 'bg-rose-500/10 border-rose-500/30 outline-rose-500/10'
                }`}>
                  <div className="flex justify-between items-start mb-5 border-b border-white/10 pb-5">
                      <div>
                          <h5 className={`font-black tracking-tight text-xl mb-1 ${claimResult.status === 'APPROVED' ? 'text-emerald-400' : claimResult.status === 'VERIFY' ? 'text-amber-400' : 'text-rose-400'}`}>
                            {claimResult.status === 'APPROVED' ? '✨ Claim Approved Instantly!' : claimResult.status === 'VERIFY' ? '⚠️ Claim Flagged for Manual Review' : '❌ Claim Rejected (Fraud Risk)'}
                          </h5>
                          <p className="text-sm text-gray-300 font-medium">Payout Route: <span className="text-white ml-1 px-2 py-0.5 bg-white/10 rounded">{claimResult.payout}</span></p>
                      </div>
                      <div className="text-right">
                          <span className="block text-[10px] uppercase text-gray-400 font-bold mb-1 tracking-wider">Final Trust Score</span>
                          <span className={`text-4xl font-black drop-shadow-md ${claimResult.trust_score >= 80 ? 'text-emerald-400' : claimResult.trust_score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                              {claimResult.trust_score}<span className="text-xl text-white/30">/100</span>
                          </span>
                      </div>
                  </div>
                  
                  <div>
                      <span className="block text-[11px] uppercase tracking-wider text-white/50 font-bold mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        AI Decision Reasoning
                      </span>
                      <ul className="space-y-2.5">
                        {claimResult.reasons?.map((reason: string, idx: number) => (
                           <li key={idx} className="flex items-start gap-3 bg-black/30 p-3.5 rounded-xl border border-white/5 shadow-inner">
                              <span className="text-white/30 pt-0.5">↳</span>
                              <span className={`text-sm font-semibold tracking-wide ${reason.includes('Bonus') || reason.includes('Grace') ? 'text-indigo-300' : reason.includes('anomaly') || reason.includes('mismatch') || reason.includes('below') ? 'text-rose-300' : 'text-emerald-200'}`}>
                                 {reason}
                              </span>
                           </li>
                        ))}
                      </ul>
                  </div>
                </div>
              )}
            </section>
          </div>
          
          <div className="space-y-8">
            <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 shadow-2xl h-full">
              <h3 className="text-xl font-semibold text-white/90 mb-6 border-b border-white/10 pb-4">Core Strengths</h3>
              
              <div className="space-y-8">
                 <div className="group">
                    <h4 className="text-sm font-bold text-indigo-400 mb-2 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                       Market Crash Defense
                    </h4>
                    <p className="text-xs text-gray-400 leading-relaxed mb-4">GeoShield-AI natively mitigates identical mass-claims utilizing **NetworkX Graph Clustering** to detect bot networks.</p>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                       <div className="w-full h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                    </div>
                 </div>

                 <div className="pt-6 border-t border-white/10">
                    <h4 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                       Fairness & Grace Buffer
                    </h4>
                    <p className="text-xs text-gray-400 leading-relaxed">Top-rated delivery partners automatically receive dynamic Grace Buffers preventing strict automated rejection during anomalous behavior.</p>
                 </div>
                 
                 <div className="pt-6 border-t border-white/10">
                    <h4 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                       Real-time Orchestration
                    </h4>
                    <p className="text-xs text-gray-400 leading-relaxed">No manual form entries. Every policy runs dynamically, checking constraints off-chain seamlessly without human bias.</p>
                 </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
