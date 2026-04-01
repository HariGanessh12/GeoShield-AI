"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { getSessionUser } from "@/utils/auth";

const publicRoutes = new Set(["/", "/register"]);

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const user = getSessionUser();
    const isPublic = publicRoutes.has(pathname);

    if (!user && !isPublic) {
      router.replace("/");
      return;
    }
    if (user && pathname === "/") {
      router.replace(user.role === "admin" ? "/admin" : "/dashboard");
      return;
    }
    if (user?.role !== "admin" && pathname.startsWith("/admin")) {
      router.replace("/dashboard");
      return;
    }

    setReady(true);
  }, [pathname, router]);

  if (!ready) return <div className="min-h-screen bg-[#0d0f17]" />;

  return (
    <div className="min-h-screen bg-[#0d0f17] text-white light-mode:bg-[#f5f7fb] light-mode:text-slate-900">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-10%] top-[-15%] h-[28rem] w-[28rem] rounded-full bg-sky-500/12 blur-[130px] light-mode:bg-sky-300/40" />
        <div className="absolute right-[-10%] top-[10%] h-[24rem] w-[24rem] rounded-full bg-indigo-500/12 blur-[120px] light-mode:bg-indigo-300/35" />
        <div className="absolute bottom-[-15%] left-[25%] h-[30rem] w-[30rem] rounded-full bg-emerald-500/10 blur-[140px] light-mode:bg-emerald-200/35" />
      </div>
      <Navbar />
      {children}
    </div>
  );
}
