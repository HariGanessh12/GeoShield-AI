"use client";
import React, { useEffect } from 'react';
import Link from 'next/link';

export default function AdminDashboard() {
  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      window.location.href = "/";
    }
  }, []);

  const handleLogout = () => {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[#0d0f17] text-white font-sans selection:bg-indigo-500/30">
      <div className="fixed inset-0 overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-rose-900/10 blur-[120px] rounded-full"></div>
      </div>

      <nav className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-white/5 backdrop-blur-xl bg-[#0d0f17]/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">Command Center</h1>
              <p className="text-[10px] uppercase tracking-widest text-rose-400 font-bold">Admin Privileges Active</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-6 mr-4 border-r border-white/10 pr-6">
             <Link href="/admin" className="text-sm font-bold text-white transition-colors border-b-2 border-rose-500 pb-1">Dashboard</Link>
             <Link href="/admin/users" className="text-sm font-bold text-gray-500 hover:text-gray-300 transition-colors pb-1 border-b-2 border-transparent hover:border-white/20">User Management</Link>
          </div>
          <button onClick={handleLogout} className="text-xs font-bold text-gray-400 hover:text-white transition-colors border border-white/10 hover:border-white/30 rounded-lg px-4 py-2">Sign Out</button>
        </div>
      </nav>

      <main className="relative z-10 max-w-[1400px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-2xl">
                <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Claims Processed</span>
                <span className="block text-4xl font-black mt-2 text-white">4,291</span>
            </div>
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-3xl p-6 shadow-2xl">
                <span className="text-rose-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
                    Active Fraud Alerts
                </span>
                <span className="block text-4xl font-black mt-2 text-white">124</span>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-2xl">
                <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">High Risk Zones</span>
                <span className="block text-xl font-bold mt-2 text-amber-400">Delhi NCR (Heatwave)</span>
                <span className="block text-sm font-semibold mt-1 text-white/50">Mumbai South (Rain)</span>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
            <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 shadow-2xl max-w-4xl">
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                    <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Network Fraud Rings Detected
                </h3>
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-sm font-bold text-rose-400 uppercase tracking-widest">Graph Clustering Attack</span>
                        <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] font-black rounded border border-rose-500/30 uppercase">Blocked</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed font-medium mb-6">
                        <strong className="text-white">14 users</strong> detected sharing identical device IDs across 3 states during a localized rain event. NetworkX identified strong component linkage indicating a coordinated network ring attack.
                    </p>
                    <div className="flex gap-4">
                        <button className="flex-1 py-2.5 rounded-xl bg-rose-500/20 text-rose-400 font-bold text-sm border border-rose-500/50 cursor-default">Nullified All (14)</button>
                        <button className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/50 font-bold text-sm border border-white/10 hover:bg-white/10 hover:text-white transition-colors">Inspect Nodes</button>
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}
