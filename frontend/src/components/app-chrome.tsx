"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { useIsHydrated, useSessionUser } from "@/utils/client-state";

const publicRoutes = new Set(["/", "/register"]);

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useIsHydrated();
  const user = useSessionUser();
  const isPublic = publicRoutes.has(pathname);
  const shouldBlockRender =
    !hydrated ||
    (!user && !isPublic) ||
    (Boolean(user) && pathname === "/") ||
    (user?.role !== "admin" && pathname.startsWith("/admin"));

  useEffect(() => {
    if (!hydrated) return;
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
  }, [hydrated, isPublic, pathname, router, user]);

  if (shouldBlockRender) return <div className="min-h-screen bg-[#0d0f17]" />;

  return (
    <div className="min-h-screen bg-[rgb(var(--background-start-rgb))] text-[rgb(var(--foreground-rgb))]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-10%] top-[-15%] h-112 w-md rounded-full bg-sky-500/12 blur-[130px] light-mode:bg-sky-500/15" />
        <div className="absolute right-[-10%] top-[10%] h-96 w-96 rounded-full bg-indigo-500/12 blur-[120px] light-mode:bg-indigo-500/15" />
        <div className="absolute bottom-[-15%] left-[25%] h-120 w-120 rounded-full bg-emerald-500/10 blur-[140px] light-mode:bg-emerald-500/15" />
      </div>
      <Navbar />
      {children}
    </div>
  );
}
