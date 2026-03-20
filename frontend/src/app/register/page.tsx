"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { apiUrl } from '@/lib/api';

export default function RegisterPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [persona, setPersona] = useState('Food Delivery');
    const [zone, setZone] = useState('Delhi NCR');
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(apiUrl('/api/auth/register'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, persona, zone })
            });
            const data = await res.json();
            
            if (res.ok) {
                alert("Account created successfully! You can now sign in.");
                router.push('/');
            } else {
                alert("Registration failed: " + data.error);
            }
        } catch (err) {
            console.error("Registration request failed", err);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#0d0f17] text-white font-sans flex items-center justify-center selection:bg-emerald-500/30 overflow-hidden relative">
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
                        className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-5"
                    >
                        <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </motion.div>
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60"
                    >
                        Register
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="text-gray-400 mt-2 text-sm font-medium tracking-wide"
                    >
                        Join GeoShield-AI Platform
                    </motion.p>
                </div>

                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-[2.5rem] pointer-events-none"></div>
                    <form onSubmit={handleRegister} className="relative z-10 space-y-6">
                        <div className="space-y-2 group">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-2 group-focus-within:text-emerald-400 transition-colors">Email Address</label>
                            <input 
                                type="email" 
                                required
                                value={email} 
                                onChange={(e)=>setEmail(e.target.value)} 
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0d0f17] transition-all"
                            />
                        </div>
                        <div className="space-y-2 group">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-2 group-focus-within:text-emerald-400 transition-colors">Password</label>
                            <input 
                                type="password"
                                required 
                                value={password} 
                                onChange={(e)=>setPassword(e.target.value)} 
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0d0f17] transition-all"
                            />
                        </div>
                        <div className="space-y-2 group">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-2 group-focus-within:text-emerald-400 transition-colors">Delivery Persona</label>
                            <select 
                                value={persona} 
                                onChange={(e)=>setPersona(e.target.value)} 
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0d0f17] transition-all appearance-none"
                            >
                                <option value="Food Delivery">🍔 Zomato / Swiggy</option>
                                <option value="Grocery Q-Commerce">🛒 Zepto / Blinkit</option>
                                <option value="E-commerce">📦 Amazon / Flipkart</option>
                            </select>
                        </div>
                        <div className="space-y-2 group">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-2 group-focus-within:text-emerald-400 transition-colors">Primary Operating Zone</label>
                            <select 
                                value={zone} 
                                onChange={(e)=>setZone(e.target.value)} 
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0d0f17] transition-all appearance-none"
                            >
                                <option value="Delhi NCR">Delhi NCR</option>
                                <option value="Mumbai South">Mumbai South</option>
                                <option value="Bangalore Central">Bangalore Central</option>
                            </select>
                        </div>

                        <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit" 
                            disabled={loading}
                            className="w-full mt-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold tracking-wide shadow-lg shadow-emerald-500/20 disabled:opacity-50 relative overflow-hidden"
                        >
                            <span className="relative">{loading ? 'Creating Account...' : 'Register as Worker'}</span>
                        </motion.button>
                        
                        <div className="text-center mt-6">
                            <Link href="/" className="text-sm text-gray-400 font-semibold hover:text-white transition-colors">← Back to Login</Link>
                        </div>
                    </form>
                </motion.div>
            </motion.main>
        </div>
    );
}
