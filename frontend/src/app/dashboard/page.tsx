"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiUrl } from '@/lib/api';

export default function WorkerDashboard() {
  const [claimResult, setClaimResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [triggerType, setTriggerType] = useState('HEATWAVE');
  
  const [claimsHistory, setClaimsHistory] = useState<any[]>([]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(apiUrl('/api/claim/history'));
      if (res.ok) {
        const data = await res.json();
        setClaimsHistory(data);
      }
    } catch (e) {
      console.error("Could not fetch claim history dynamically");
    }
  };

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "worker") {
      window.location.href = "/";
    } else {
      fetchHistory();
    }
  }, []);

  const simulateDisruption = async () => {
    setLoading(true);
    setClaimResult(null);
    try {
      const token = localStorage.getItem("token");
      let realWorkerId = 'u101';
      if (token) {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          const payload = JSON.parse(jsonPayload);
          realWorkerId = payload.id;
      }

      const res = await fetch(apiUrl('/api/claim/auto-trigger'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId: realWorkerId,
          disruptionFactor: { type: triggerType, severity: 0.85, lossAmount: 400, location_mismatch: false }
        })
      });
      const data = await res.json();
      setClaimResult(data.decision);
      
      fetchHistory(); 
    } catch (e) {
      setClaimResult({ status: 'ERROR', reasons: ['Failed to reach backend API.'] });
    }
    setLoading(false);
  };

  const handleLogout = () => {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[#0d0f17] text-white font-sans selection:bg-indigo-500/30">
      <div className="fixed inset-0 overflow-hidden z-0 pointer-events-none">
        <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full"></motion.div>
        <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, -5, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/20 blur-[120px] rounded-full"></motion.div>
        <motion.div animate={{ scale: [1, 1.15, 1], rotate: [0, 8, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute bottom-[-10%] left-[20%] w-[60%] h-[60%] bg-emerald-600/10 blur-[130px] rounded-full"></motion.div>
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
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse"></span>
            <span className="text-xs uppercase font-black text-indigo-300 tracking-wider">🛡️ Market Crash Defense System ACTIVE</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
             <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <a href="/dashboard/policy" className="text-sm font-semibold tracking-wide text-emerald-400 hover:text-emerald-300 transition-colors">Manage Coverage</a>
          </div>
          <button onClick={handleLogout} className="text-xs font-bold text-gray-400 hover:text-white transition-colors border border-white/10 rounded-lg px-3 py-1.5">Sign Out</button>
        </div>
      </nav>

      <motion.main 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, staggerChildren: 0.1 }}
        className="relative z-10 max-w-[1400px] mx-auto px-6 py-12"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            <motion.section 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white/[0.02] backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 shadow-2xl transition-all hover:bg-white/[0.04] duration-500"
            >
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
                <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/20 relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <span className="relative z-10 block text-indigo-300 text-sm font-medium mb-3">Protected Earnings</span>
                  <span className="relative z-10 text-5xl font-bold text-white tracking-tight drop-shadow-md group-hover:scale-105 origin-left transition-transform inline-block">₹3,500</span>
                  <span className="relative z-10 block text-xs font-semibold text-indigo-400/80 mt-3 pt-3 border-t border-indigo-500/20">Max Weekly Coverage</span>
                </div>
                
                <div className="p-6 rounded-3xl bg-black/40 border border-white/10 group hover:border-white/20 transition-colors relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10 flex justify-between items-start mb-3">
                    <span className="block text-gray-400 text-sm font-medium">Dynamic Cost</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">RISK: LOW</span>
                  </div>
                  <span className="relative z-10 block text-3xl font-bold text-white tracking-tight mb-4 group-hover:text-emerald-50 transition-colors">₹72.50</span>
                  
                  {/* EXPLAINABILITY FOR PRICING */}
                  <div className="relative z-10 space-y-1.5 mt-4 pt-4 border-t border-white/10">
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
            </motion.section>

            <motion.section 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white/[0.02] backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="flex justify-between items-start sm:items-center mb-8 flex-col sm:flex-row gap-4">
                <div>
                  <h3 className="text-xl font-semibold mb-1">Parametric Disruption Simulator</h3>
                  <p className="text-sm text-gray-400">Select a disruption trigger to test the AI evaluation pipeline</p>
                </div>
                <select 
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                  className="bg-black/50 border border-white/20 text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-3 w-48 font-bold text-sm tracking-wide transition-all outline-none hover:bg-black/70"
                >
                  <option value="HEAVY_RAIN">🌧 Heavy Rain Trigger</option>
                  <option value="HEATWAVE">🌡 Heatwave Trigger</option>
                  <option value="POLLUTION">🌫 Pollution Trigger</option>
                  <option value="CURFEW">🚫 Mobility Restriction</option>
                  <option value="PLATFORM_OUTAGE">📉 Platform Outage</option>
                </select>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-3xl bg-black/20 border border-indigo-500/10 relative z-10 transition-all hover:border-indigo-500/30 group">
                <div className="shrink-0 h-16 w-16 rounded-[1rem] bg-indigo-500/20 flex items-center justify-center shadow-lg border border-indigo-500/30 group-hover:scale-110 transition-transform duration-300">
                  <svg className="text-indigo-400 w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h4 className="text-lg font-bold text-white mb-1">Disruption Event: {triggerType}</h4>
                  <p className="text-gray-400 text-sm">Testing the parametric sequence. Triggers Isolation Forests & generates Explainable Trust Score natively.</p>
                </div>
                <div className="shrink-0 flex justify-end">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={simulateDisruption}
                    disabled={loading}
                    className="overflow-hidden relative px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]"
                  >
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></span>
                    <span className="relative">{loading ? 'Evaluating Model...' : 'Simulate Auto-Claim'}</span>
                  </motion.button>
                </div>
              </div>

              {/* EXPLAINABILITY DISPLAY AREA */}
              <AnimatePresence>
              {claimResult && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: -20 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4, type: "spring", bounce: 0.4 }}
                  className={`mt-6 p-6 rounded-2xl border backdrop-blur-lg shadow-xl outline outline-4 outline-offset-[-4px] overflow-hidden ${
                  claimResult.status === 'APPROVED' ? 'bg-emerald-500/10 border-emerald-500/30 outline-emerald-500/10' 
                  : claimResult.status === 'VERIFY' || claimResult.status === 'FLAGGED' ? 'bg-amber-500/10 border-amber-500/30 outline-amber-500/10'
                  : 'bg-rose-500/10 border-rose-500/30 outline-rose-500/10'
                }`}>
                  <div className="flex justify-between items-start mb-5 border-b border-white/10 pb-5">
                      <div>
                          <h5 className={`font-black tracking-tight text-xl mb-1 ${claimResult.status === 'APPROVED' ? 'text-emerald-400' : (claimResult.status === 'VERIFY' || claimResult.status === 'FLAGGED')  ? 'text-amber-400' : 'text-rose-400'}`}>
                            {claimResult.status === 'APPROVED' ? '✨ Claim Approved Instantly!' : (claimResult.status === 'VERIFY' || claimResult.status === 'FLAGGED') ? '⚠️ Verification Required' : '❌ Claim Rejected (Fraud Risk)'}
                          </h5>
                          <p className="text-sm text-gray-300 font-medium">Payout Route: <span className="text-white ml-1 px-2 py-0.5 bg-white/10 rounded">{claimResult.payout}</span></p>
                      </div>
                      <div className="text-right">
                          <span className="block text-[10px] uppercase text-gray-400 font-bold mb-1 tracking-wider">Final Trust Score</span>
                          <motion.span 
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: "spring", delay: 0.2 }}
                              className={`inline-block text-4xl font-black drop-shadow-md ${claimResult.trust_score >= 80 ? 'text-emerald-400' : claimResult.trust_score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}
                          >
                              {claimResult.trust_score}<span className="text-xl text-white/30">/100</span>
                          </motion.span>
                      </div>
                  </div>
                  
                  <div>
                      <span className="block text-[11px] uppercase tracking-wider text-white/50 font-bold mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Explainable AI Logic:
                      </span>
                      <ul className="space-y-2.5">
                        {claimResult.reasons?.map((reason: string, idx: number) => (
                           <motion.li 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.3 + (idx * 0.1) }}
                              key={idx} 
                              className="flex items-start gap-3 bg-black/30 p-3.5 rounded-xl border border-white/5 shadow-inner"
                           >
                              <span className="text-white/30 pt-0.5">↳</span>
                              <span className={`text-sm font-semibold tracking-wide ${reason.includes('Bonus') || reason.includes('Grace') ? 'text-indigo-300' : reason.includes('anomaly') || reason.includes('mismatch') || reason.includes('below') ? 'text-rose-300' : 'text-emerald-200'}`}>
                                 {reason}
                              </span>
                           </motion.li>
                        ))}
                      </ul>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </motion.section>
          </div>
          
          <div className="space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white/[0.02] backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 shadow-2xl h-full flex flex-col"
            >
              <h3 className="text-xl font-semibold text-white/90 mb-6 border-b border-white/10 pb-4">Live Transaction History</h3>
              
              <div className="space-y-4 flex-1">
                {claimsHistory.length === 0 && <p className="text-gray-500 text-sm">No recent transactions fetched.</p>}
                
                <AnimatePresence>
                {claimsHistory.map((item, i) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    key={i} 
                    className="flex flex-col p-4 rounded-2xl bg-black/20 hover:bg-white/[0.05] transition-all cursor-pointer border border-white/5 hover:border-white/10 hover:shadow-lg hover:-translate-y-1 group"
                  >
                    <div className="flex gap-4 mb-2">
                        <div className={`w-12 h-12 rounded-[1rem] flex flex-col items-center justify-center shrink-0 shadow-inner overflow-hidden relative ${item.status === 'APPROVED' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-amber-400 to-amber-600'}`}>
                           <div className="w-full h-1/2 bg-white/20 absolute top-0 mix-blend-overlay"></div>
                           <svg className="w-5 h-5 text-white/90 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             {item.status === 'APPROVED' ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                           </svg>
                        </div>
                        <div className="flex-1 flex flex-col justify-center">
                          <div className="flex justify-between items-start mb-0.5">
                            <h4 className="text-sm font-bold text-white/90 group-hover:text-white transition-colors">Event: {item.trigger}</h4>
                            <span className={`text-sm font-bold tracking-tight ${item.status === 'APPROVED' ? 'text-emerald-400' : 'text-amber-400'}`}>{item.status === 'APPROVED' ? `+₹${item.payout}` : '₹0'}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                            <p className="text-gray-500 font-medium">Trust Score: {item.trustScore}/100</p>
                            <span className="text-white/30 font-semibold uppercase text-[9px]">{new Date(item.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                    </div>

                    {item.reasons && item.reasons.length > 0 && (
                       <div className="mt-2 text-[12px] font-medium p-3 bg-black/40 rounded-xl border border-white/5">
                          <span className="text-white/40 block mb-1 text-[10px] uppercase font-bold tracking-wider">AI Decision Logic:</span>
                          {item.reasons.slice(0, 2).map((r: string, idx: number) => (
                             <div key={idx} className={`leading-relaxed ${r.includes('anomaly') || r.includes('mismatch') || r.includes('below') ? 'text-rose-400/90' : 'text-emerald-400/90'}`}>
                               <span className="opacity-50 mr-1">•</span> {r}
                             </div>
                          ))}
                       </div>
                    )}
                  </motion.div>
                ))}
                </AnimatePresence>
              </div>
              
              <div className="mt-8 border-t border-white/10 pt-6">
                 <div className="group p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 shadow-lg hover:bg-indigo-500/20 transition-colors">
                    <h4 className="text-sm font-bold text-indigo-400 mb-2 flex items-center gap-2">
                       <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_10px_rgba(99,102,241,1)]"></span>
                       🛡️ Market Crash Defense System
                    </h4>
                    <p className="text-xs text-gray-400 leading-relaxed font-semibold group-hover:text-gray-300 transition-colors">Native graph theory isolates & blocks simultaneous large-scale claims spanning identical sub-networks.</p>
                 </div>
              </div>
              
            </motion.div>
          </div>

        </div>
      </motion.main>
    </div>
  );
}
