"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('admin@gmail.com');
    const [password, setPassword] = useState('password');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('http://localhost:8000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            
            if (res.ok) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("role", data.user.role);
                
                if (data.user.role === 'admin') {
                    router.push('/admin');
                } else {
                    router.push('/dashboard');
                }
            } else {
                alert("Login failed: " + data.error);
            }
        } catch (err) {
            console.error("Login request failed", err);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#0d0f17] text-white font-sans flex items-center justify-center selection:bg-indigo-500/30 overflow-hidden relative">
            <div className="fixed inset-0 overflow-hidden z-0 pointer-events-none">
                <motion.div 
                    animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }} 
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full"
                />
                <motion.div 
                    animate={{ scale: [1, 1.2, 1], rotate: [0, -5, 0] }} 
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-600/10 blur-[130px] rounded-full"
                />
            </div>

            <motion.main 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md p-8"
            >
                <div className="text-center mb-8">
                    <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
                        className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-5"
                    >
                        <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </motion.div>
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60"
                    >
                        GeoShield-AI
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="text-gray-400 mt-2 text-sm font-medium tracking-wide"
                    >
                        Parametric Authentication Layer
                    </motion.p>
                </div>

                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-[2.5rem] pointer-events-none"></div>
                    <form onSubmit={handleLogin} className="relative z-10 space-y-6">
                        <div className="space-y-2 group">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-2 group-focus-within:text-indigo-400 transition-colors">Email Address</label>
                            <input 
                                type="email" 
                                value={email} 
                                onChange={(e)=>setEmail(e.target.value)} 
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0d0f17] transition-all"
                            />
                        </div>
                        <div className="space-y-2 group">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-2 group-focus-within:text-indigo-400 transition-colors">Password</label>
                            <input 
                                type="password" 
                                value={password} 
                                onChange={(e)=>setPassword(e.target.value)} 
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0d0f17] transition-all"
                            />
                        </div>

                        <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit" 
                            disabled={loading}
                            className="w-full mt-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold tracking-wide shadow-lg shadow-indigo-500/20 disabled:opacity-50 relative overflow-hidden"
                        >
                            <span className="relative">{loading ? 'Authenticating...' : 'Sign In'}</span>
                        </motion.button>
                        
                        <div className="text-center mt-6">
                            <span className="text-sm text-gray-500">New worker? </span>
                            <Link href="/register" className="text-sm text-indigo-400 font-bold hover:text-indigo-300 transition-colors">Register Account</Link>
                        </div>
                    </form>
                </motion.div>
            </motion.main>
        </div>
    );
}
