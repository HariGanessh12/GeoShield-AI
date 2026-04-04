"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/utils/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [persona, setPersona] = useState("Food Delivery");
  const [zone, setZone] = useState("Delhi NCR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        authenticated: false,
        body: JSON.stringify({ email, password, persona, zone }),
      });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-81px)] items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <motion.main initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-3xl light-mode:border-black/10 light-mode:bg-white/80">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-sky-500 shadow-lg shadow-emerald-500/30">
            <svg className="h-9 w-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
          </div>
          <h1 className="text-4xl font-bold text-white light-mode:text-slate-900">Register</h1>
          <p className="mt-2 text-sm text-white/60 light-mode:text-slate-500">Set up your worker profile and start monitoring dynamic coverage.</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-5">
          <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-3.5 text-white outline-none light-mode:border-black/10 light-mode:bg-white light-mode:text-slate-900" />
          <input required type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-3.5 text-white outline-none light-mode:border-black/10 light-mode:bg-white light-mode:text-slate-900" />
          <select value={persona} onChange={(e) => setPersona(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-3.5 text-white outline-none light-mode:border-black/10 light-mode:bg-white light-mode:text-slate-900">
            <option value="Food Delivery">Food Delivery</option>
            <option value="Grocery Q-Commerce">Grocery Q-Commerce</option>
            <option value="E-commerce">E-commerce</option>
          </select>
          <select value={zone} onChange={(e) => setZone(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-3.5 text-white outline-none light-mode:border-black/10 light-mode:bg-white light-mode:text-slate-900">
            <option value="Delhi NCR">Delhi NCR</option>
            <option value="Mumbai South">Mumbai South</option>
            <option value="Bangalore Central">Bangalore Central</option>
          </select>
          {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 light-mode:text-rose-700">{error}</div> : null}
          <motion.button 
            type="submit" 
            disabled={loading} 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-4 font-bold text-white shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-shadow hover:shadow-emerald-500/40"
          >
            {loading ? "Creating account..." : "Register"}
          </motion.button>
        </form>
        <div className="mt-6 text-center text-sm text-white/55 light-mode:text-slate-500">
          <Link href="/login" className="font-bold text-emerald-300 light-mode:text-emerald-600">Back to sign in</Link>
        </div>
      </motion.main>
    </div>
  );
}
