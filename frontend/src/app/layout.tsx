import type { Metadata } from "next";
import "./globals.css";
import dynamic from "next/dynamic";
import AuthWrapper from "@/components/AuthWrapper";

const AppChrome = dynamic(
  () => import("@/components/app-chrome").then((mod) => mod.AppChrome),
  {
    ssr: false,
    loading: () => <div className="min-h-screen bg-[#0d0f17]" />,
  },
);

export const metadata: Metadata = {
  title: "GeoShield-AI",
  description: "AI-powered parametric protection workflows for gig workers.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full">
        <AuthWrapper>
          <AppChrome>{children}</AppChrome>
        </AuthWrapper>
      </body>
    </html>
  );
}
