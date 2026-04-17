"use client";

import Link from "next/link";

type AdminTab = "dashboard" | "users" | "payouts";

type AdminCommandBarProps = {
  activeTab: AdminTab;
  onSignOut: () => void;
};

const tabs: Array<{ id: AdminTab; href: string; label: string }> = [
  { id: "dashboard", href: "/admin", label: "Dashboard" },
  { id: "users", href: "/admin/users", label: "User Management" },
  { id: "payouts", href: "/payouts", label: "Payouts" },
];

export function AdminCommandBar({ activeTab, onSignOut }: AdminCommandBarProps) {
  return (
    <nav className="relative z-10 border-b border-white/5 bg-[#0d0f17]/50 backdrop-blur-xl light-mode:border-black/5 light-mode:bg-white/50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-tr from-rose-500 to-orange-500 shadow-lg shadow-rose-500/30">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="bg-linear-to-r from-white to-white/60 bg-clip-text text-xl font-bold text-transparent light-mode:from-slate-900 light-mode:to-slate-600">
              Command Center
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400">Admin Privileges Active</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden gap-6 border-r border-white/10 pr-6 md:flex light-mode:border-black/10">
            {tabs.map((tab) => {
              const active = tab.id === activeTab;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`border-b-2 pb-1 text-sm font-bold transition-colors ${
                    active
                      ? "border-rose-500 text-white light-mode:text-slate-900"
                      : "border-transparent text-gray-500 hover:border-white/20 hover:text-gray-300 light-mode:text-slate-500 light-mode:hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
          <button
            onClick={onSignOut}
            className="rounded-lg border border-white/10 px-4 py-2 text-xs font-bold text-gray-400 transition-colors hover:border-white/30 hover:text-white light-mode:border-black/10 light-mode:text-slate-600 light-mode:hover:text-slate-900"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
