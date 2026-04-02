import type { Metadata } from "next";
import "./globals.css";
import { AppChrome } from "@/components/app-chrome";
import AuthWrapper from "@/components/AuthWrapper";

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
