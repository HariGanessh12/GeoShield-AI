"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/utils/api-client";
import { saveSession } from "@/utils/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<{ user: { id: string; email: string; role: "worker" | "admin"; personaType?: string; zone?: string } }>("/api/auth/login", {
        method: "POST",
        authenticated: false,
        body: JSON.stringify({ email, password }),
      });
      saveSession(data.user);
      router.push(data.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-81px)] items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <motion.main initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-3xl light-mode:border-slate-200 light-mode:bg-white/85">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-emerald-400 shadow-lg shadow-indigo-500/30 light-mode:shadow-indigo-500/20">
            <svg className="h-9 w-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h1 className="text-4xl font-bold text-white light-mode:text-slate-950">GeoShield AI</h1>
          <p className="mt-2 text-sm text-white/60 light-mode:text-slate-500">Sign in to monitor coverage, claims, and live risk.</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/45 light-mode:text-slate-500">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-3.5 text-white outline-none transition focus:border-indigo-400 light-mode:border-slate-200 light-mode:bg-slate-50 light-mode:text-slate-900" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/45 light-mode:text-slate-500">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-3.5 text-white outline-none transition focus:border-indigo-400 light-mode:border-slate-200 light-mode:bg-slate-50 light-mode:text-slate-900" />
          </div>
          {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 light-mode:border-rose-200 light-mode:bg-rose-50 light-mode:text-rose-700">{error}</div> : null}
          <button type="submit" disabled={loading} className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-500 py-4 font-bold text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50 light-mode:from-slate-950 light-mode:to-slate-800">{loading ? "Authenticating..." : "Sign In"}</button>
        </form>
        <div className="mt-6 text-center text-sm text-white/55 light-mode:text-slate-500">
          New worker? <Link href="/register" className="font-bold text-indigo-300 light-mode:text-indigo-600">Create account</Link>
        </div>
      </motion.main>
    </div>
  );
}

