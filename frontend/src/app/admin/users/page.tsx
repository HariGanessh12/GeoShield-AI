"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiUrl } from '@/lib/api';

export default function AdminUsersDashboard() {
  const [users, setUsers] = useState<any[]>([]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(apiUrl('/api/auth/users'));
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error("Fetch users error", e);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      window.location.href = "/";
    } else {
      fetchUsers();
    }
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await fetch(apiUrl(`/api/auth/users/${userId}/role`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      fetchUsers();
    } catch (e) { }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await fetch(apiUrl(`/api/auth/users/${userId}`), { method: 'DELETE' });
      fetchUsers();
    } catch (e) { }
  };

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">User Access Control</h1>
              <p className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold">System Administrator</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-6 mr-4 border-r border-white/10 pr-6">
             <Link href="/admin" className="text-sm font-bold text-gray-500 hover:text-gray-300 transition-colors pb-1 border-b-2 border-transparent">Dashboard</Link>
             <Link href="/admin/users" className="text-sm font-bold text-white transition-colors border-b-2 border-indigo-500 pb-1">User Management</Link>
          </div>
          <button onClick={handleLogout} className="text-xs font-bold text-gray-400 hover:text-white transition-colors border border-white/10 hover:border-white/30 rounded-lg px-4 py-2">Sign Out</button>
        </div>
      </nav>

      <main className="relative z-10 max-w-[1200px] mx-auto px-6 py-12">
        <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 shadow-2xl">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                Registered Platform Users
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User Email</th>
                            <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Account Date</th>
                            <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role Access</th>
                            <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u) => (
                            <tr key={u._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                <td className="py-4 px-4 text-sm font-medium text-white/90">{u.email}</td>
                                <td className="py-4 px-4 text-xs text-center text-gray-400 font-semibold">{new Date(u.createdAt).toLocaleDateString()}</td>
                                <td className="py-4 px-4">
                                    <select 
                                        value={u.role} 
                                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg outline-none cursor-pointer ${u.role === 'admin' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'}`}
                                    >
                                        <option value="worker" className="bg-black text-white">Worker</option>
                                        <option value="admin" className="bg-black text-white">Admin</option>
                                    </select>
                                </td>
                                <td className="py-4 px-4 text-right">
                                    <button 
                                        onClick={() => handleDeleteUser(u._id)}
                                        className="text-xs font-bold text-rose-500 hover:text-rose-300 transition-colors bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg border border-transparent hover:border-rose-500/30"
                                    >
                                        Revoke Access
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr><td colSpan={4} className="py-8 text-center text-sm font-semibold text-gray-500">No users found in database.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </main>
    </div>
  );
}
