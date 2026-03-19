"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('http://localhost:8000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
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
        <div className="min-h-screen bg-[#0d0f17] text-white font-sans flex items-center justify-center selection:bg-indigo-500/30">
            <div className="fixed inset-0 overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-600/10 blur-[130px] rounded-full"></div>
            </div>

            <main className="relative z-10 w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-5">
                        <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">Register</h1>
                    <p className="text-gray-400 mt-2 text-sm font-medium tracking-wide">Join GeoShield-AI Platform</p>
                </div>

                <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                    <form onSubmit={handleRegister} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-2">Email Address</label>
                            <input 
                                type="email" 
                                required
                                value={email} 
                                onChange={(e)=>setEmail(e.target.value)} 
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-2">Password</label>
                            <input 
                                type="password"
                                required 
                                value={password} 
                                onChange={(e)=>setPassword(e.target.value)} 
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full mt-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold tracking-wide transition-all hover:scale-[1.03] active:scale-[0.98] shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                        >
                            {loading ? 'Creating Account...' : 'Register as Worker'}
                        </button>
                        
                        <div className="text-center mt-6">
                            <Link href="/" className="text-sm text-gray-400 font-semibold hover:text-white transition-colors">← Back to Login</Link>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
