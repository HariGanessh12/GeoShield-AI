"use client";

import dynamic from "next/dynamic";

const AppChrome = dynamic(
  () => import("./app-chrome").then((mod) => mod.AppChrome),
  {
    ssr: false,
    loading: () => <div className="min-h-screen bg-[#0d0f17]" />,
  },
);

export default function ClientAppChrome({ children }: { children: React.ReactNode }) {
  return <AppChrome>{children}</AppChrome>;
}
