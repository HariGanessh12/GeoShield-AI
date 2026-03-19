"use client";
import React from 'react';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-[#0a0a0d] text-white p-8 font-sans">
      <header className="mb-10 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-emerald-400">GeoShield Command Center</h1>
          <p className="text-gray-400 mt-2">Platform Overview & Risk Analytics</p>
        </div>
        <div className="flex flex-wrap gap-4">
           <span className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium">System Health: <span className="text-emerald-400 animate-pulse inline-block ml-1">99.9%</span></span>
           <span className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium">Active Policies: <span className="text-indigo-400 ml-1">142,509</span></span>
        </div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/20 shadow-lg relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
          <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-colors"></div>
          <h3 className="text-indigo-300 font-semibold mb-1 relative z-10">Total Loss Ratio (YTD)</h3>
          <p className="text-5xl font-bold relative z-10">42.8%</p>
          <p className="text-xs font-medium text-indigo-400/60 mt-3 relative z-10">Target Benchmark: &lt;60%</p>
        </div>
        
        <div className="p-6 rounded-3xl bg-rose-500/5 border border-rose-500/20 shadow-lg relative overflow-hidden group hover:border-rose-500/40 transition-colors">
          <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-rose-500/20 rounded-full blur-3xl group-hover:bg-rose-500/30 transition-colors"></div>
          <h3 className="text-rose-300 font-semibold mb-1 relative z-10">Active Fraud Alerts</h3>
          <p className="text-5xl font-bold text-white relative z-10">124</p>
          <p className="text-xs font-medium text-rose-400/60 mt-3 relative z-10">Isolated via NetworkX Graph Models</p>
        </div>
        
        <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
          <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl group-hover:bg-emerald-500/30 transition-colors"></div>
          <h3 className="text-emerald-300 font-semibold mb-1 relative z-10">Total Premiums Collected</h3>
          <p className="text-5xl font-bold relative z-10">₹12.4M</p>
          <p className="text-xs font-medium text-emerald-400/60 mt-3 relative z-10">+12% vs last month</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors shadow-xl">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Live Risk Zones
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-5 rounded-2xl bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/10 transition-colors cursor-pointer group">
              <div>
                <p className="font-bold text-lg text-rose-200 group-hover:text-rose-100 transition-colors">Delhi NCR</p>
                <p className="text-sm font-medium text-rose-400/60 mt-1">Severe Heatwave • 46°C</p>
              </div>
              <span className="px-4 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 font-bold text-xs uppercase tracking-wider shadow-[0_0_10px_rgba(244,63,94,0.15)]">Critical Trigger active</span>
            </div>
            
            <div className="flex justify-between items-center p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 transition-colors cursor-pointer group">
              <div>
                <p className="font-bold text-lg text-amber-200 group-hover:text-amber-100 transition-colors">Mumbai South</p>
                <p className="text-sm font-medium text-amber-400/60 mt-1">Heavy Rainfall Alert Forecasted</p>
              </div>
              <span className="px-4 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs uppercase tracking-wider">Elevated Risk PRE-ALERT</span>
            </div>
          </div>
        </div>

        <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors shadow-xl">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
             <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Fraud Analysis Queue
          </h3>
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/10 hover:border-rose-500/20 transition-all">
              <div className="flex justify-between items-center mb-3">
                <span className="text-base font-bold text-white tracking-wide">Graph Clustering Attack</span>
                <span className="px-3 py-1 bg-rose-500/20 rounded-md text-xs text-rose-400 font-bold">Trust Score: 12</span>
              </div>
              <p className="text-sm font-medium text-gray-400 leading-relaxed mb-5">14 users detected sharing identical device IDs across 3 states during a localized rain event. NetworkX identified strong component linkage indicating coordinated fraud ring.</p>
              <div className="flex gap-3">
                <button className="flex-1 text-sm py-2.5 bg-rose-500 text-white rounded-xl font-bold tracking-wide hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20">Reject All (14)</button>
                <button className="flex-1 text-sm py-2.5 bg-white/5 text-white rounded-xl font-bold tracking-wide hover:bg-white/10 border border-white/10 transition-colors">Inspect Nodes Graph</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
