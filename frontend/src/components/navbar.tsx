"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import ThemeToggle from "@/app/ThemeToggle";
import { clearSession, type SessionUser } from "@/utils/auth";

type NavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/policy", label: "Policies" },
  { href: "/claims", label: "Claims" },
  { href: "/risk", label: "Risk & Premium" },
  { href: "/admin", label: "Admin", adminOnly: true },
];

export function Navbar({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLoggedOut = !user;

  const visibleItems = useMemo(
    () => navItems.filter((item) => !item.adminOnly || user?.role === "admin"),
    [user],
  );

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const showPublicAuthLinks = pathname === "/" || pathname === "/demo" || pathname === "/privacy";
  const authHref = pathname === "/register" ? "/login" : "/register";
  const authLabel = pathname === "/register" ? "Sign In" : pathname === "/login" ? "Register" : "Sign Up";

  const handleLogout = () => {
    clearSession();
    window.dispatchEvent(new Event("storage"));
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0d0f17]/75 backdrop-blur-2xl light-mode:border-black/10 light-mode:bg-white/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        {isLoggedOut ? (
          <>
            <div className="flex items-center gap-2">
              <Link href="/" className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/75 transition hover:border-white/30 hover:text-white light-mode:border-black/10 light-mode:text-slate-600 light-mode:hover:border-black/20 light-mode:hover:text-slate-900">
                Home
              </Link>
              {showPublicAuthLinks ? (
                <>
                  <Link href="/login" className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/75 transition hover:border-white/30 hover:text-white light-mode:border-black/10 light-mode:text-slate-600 light-mode:hover:border-black/20 light-mode:hover:text-slate-900">
                    Sign In
                  </Link>
                  <Link href="/register" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:scale-105 active:scale-95">
                    Register
                  </Link>
                </>
              ) : (
                <Link href={authHref} className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/75 transition hover:border-white/30 hover:text-white light-mode:border-black/10 light-mode:text-slate-600 light-mode:hover:border-black/20 light-mode:hover:text-slate-900">
                  {authLabel}
                </Link>
              )}
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </>
        ) : (
          <>
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 via-sky-500 to-emerald-400 shadow-lg shadow-indigo-500/30">
                <span className="text-sm font-black text-white">GS</span>
              </div>
              <div>
                <div className="text-sm font-black uppercase tracking-[0.2em] text-white light-mode:text-slate-900">GeoShield AI</div>
                <div className="text-[11px] text-white/50 light-mode:text-slate-500">Real-time geospatial threat detection</div>
              </div>
            </Link>

            <nav className="hidden items-center gap-2 md:flex">
              {visibleItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive(item.href)
                      ? "bg-white text-slate-900 light-mode:bg-slate-900 light-mode:text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white light-mode:text-slate-600 light-mode:hover:bg-black/5 light-mode:hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-right md:block light-mode:border-black/10 light-mode:bg-black/5">
                <div className="max-w-48 truncate text-sm font-semibold text-white light-mode:text-slate-900">{user.email}</div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/50 light-mode:text-slate-500">{user.role}</div>
              </div>
              <button onClick={handleLogout} className="hidden rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/75 transition hover:border-white/30 hover:text-white md:block light-mode:border-black/10 light-mode:text-slate-600 light-mode:hover:border-black/20 light-mode:hover:text-slate-900">Logout</button>
              <button onClick={() => setMobileOpen((current) => !current)} className="rounded-full border border-white/10 p-2 text-white md:hidden light-mode:border-black/10 light-mode:text-slate-900" aria-label="Toggle navigation">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
      {mobileOpen && !isLoggedOut ? (
        <div className="border-t border-white/10 px-4 py-4 md:hidden light-mode:border-black/10">
          <div className="flex flex-col gap-2">
            {visibleItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isActive(item.href) ? "bg-white text-slate-900 light-mode:bg-slate-900 light-mode:text-white" : "bg-white/5 text-white/70 light-mode:bg-black/5 light-mode:text-slate-700"}`}>
                {item.label}
              </Link>
            ))}
            <button onClick={handleLogout} className="rounded-2xl border border-white/10 px-4 py-3 text-left text-sm font-semibold text-white/75 light-mode:border-black/10 light-mode:text-slate-700">Logout</button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
