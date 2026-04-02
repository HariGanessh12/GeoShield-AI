"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { apiFetch } from "@/utils/api-client";
import { clearSession } from "@/utils/auth";

type AdminUser = {
  _id: string;
  email: string;
  createdAt: string;
  role: "worker" | "admin";
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function AdminUsersDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<AdminUser[]>('/api/auth/users');
      setUsers(data);
    } catch (e) {
      console.error("Fetch users error", e);
    } finally {
      setLoading(false);
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
      await apiFetch(`/api/auth/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      });
      await fetchUsers();
    } catch {
      console.error("Role update failed for user", userId);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await apiFetch(`/api/auth/users/${userId}`, { method: 'DELETE' });
      await fetchUsers();
    } catch {
      console.error("Delete user failed for user", userId);
    }
  };

  const handleLogout = () => {
      clearSession();
      window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--background-start-rgb))] text-[rgb(var(--foreground-rgb))] font-sans selection:bg-indigo-500/30">
      <div className="fixed inset-0 overflow-hidden z-0 pointer-events-none">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
          className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full light-mode:bg-indigo-600/5"
        ></motion.div>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-rose-900/10 blur-[120px] rounded-full light-mode:bg-rose-900/5"
        ></motion.div>
      </div>

      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-white/5 backdrop-blur-xl bg-[#0d0f17]/50 light-mode:border-black/5 light-mode:bg-white/50"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 light-mode:from-slate-900 light-mode:to-slate-600">User Access Control</h1>
              <p className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold light-mode:text-indigo-600">System Administrator</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-6 mr-4 border-r border-white/10 pr-6 light-mode:border-black/10">
             <Link href="/admin" className="text-sm font-bold text-gray-400 hover:text-white transition-colors pb-1 border-b-2 border-transparent light-mode:text-slate-500 light-mode:hover:text-slate-900">Dashboard</Link>
             <Link href="/admin/users" className="text-sm font-bold text-white transition-colors border-b-2 border-indigo-500 pb-1 light-mode:text-slate-900">User Management</Link>
          </div>
          <button onClick={handleLogout} className="text-xs font-bold text-gray-400 hover:text-white transition-colors border border-white/10 hover:border-white/30 rounded-lg px-4 py-2 light-mode:border-black/10 light-mode:text-slate-600 light-mode:hover:text-slate-900 transition-all hover:bg-white/5">Sign Out</button>
        </div>
      </motion.nav>

      <motion.main 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative z-10 max-w-[1200px] mx-auto px-6 py-12"
      >
        <motion.div variants={itemVariants} className="bg-white/[0.02] backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 shadow-2xl light-mode:bg-white light-mode:border-black/5 light-mode:shadow-xl">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 border-b border-white/5 pb-4 light-mode:border-black/5 light-mode:text-slate-900">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                Registered Platform Users
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 light-mode:border-black/10">
                            <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider light-mode:text-slate-500">User Email</th>
                            <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center light-mode:text-slate-500">Account Date</th>
                            <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider light-mode:text-slate-500">Role Access</th>
                            <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right light-mode:text-slate-500">Actions</th>
                        </tr>
                    </thead>
                    <motion.tbody variants={containerVariants}>
                        {users.map((u) => (
                            <motion.tr 
                              key={u._id} 
                              variants={itemVariants}
                              className="border-b border-white/5 hover:bg-white/[0.02] transition-colors light-mode:border-black/5 light-mode:hover:bg-slate-50"
                            >
                                <td className="py-4 px-4 text-sm font-medium text-white/90 light-mode:text-slate-900">{u.email}</td>
                                <td className="py-4 px-4 text-xs text-center text-gray-400 font-semibold light-mode:text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                                <td className="py-4 px-4">
                                    <select 
                                        value={u.role} 
                                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg outline-none cursor-pointer transition-all ${u.role === 'admin' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500 light-mode:bg-emerald-50 light-mode:text-emerald-700' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:border-indigo-500 light-mode:bg-indigo-50 light-mode:text-indigo-700'}`}
                                    >
                                        <option value="worker" className="bg-black text-white light-mode:bg-white light-mode:text-slate-900">Worker</option>
                                        <option value="admin" className="bg-black text-white light-mode:bg-white light-mode:text-slate-900">Admin</option>
                                    </select>
                                </td>
                                <td className="py-4 px-4 text-right">
                                    <button 
                                        onClick={() => handleDeleteUser(u._id)}
                                        className="text-xs font-bold text-rose-500 hover:text-rose-300 transition-colors bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg border border-transparent hover:border-rose-500/30 light-mode:bg-rose-50 light-mode:text-rose-600 light-mode:hover:bg-rose-100 transition-all"
                                    >
                                        Revoke Access
                                    </button>
                                </td>
                            </motion.tr>
                        ))}
                        {!loading && users.length === 0 && (
                            <tr><td colSpan={4} className="py-8 text-center text-sm font-semibold text-gray-500 light-mode:text-slate-400">No users found in database.</td></tr>
                        )}
                        {loading && (
                            <tr><td colSpan={4} className="py-8 text-center text-sm font-semibold text-gray-500 light-mode:text-slate-400 font-bold animate-pulse text-indigo-400">Loading platform users...</td></tr>
                        )}
                    </motion.tbody>
                </table>
            </div>
        </motion.div>
      </motion.main>
    </div>
  );
}
