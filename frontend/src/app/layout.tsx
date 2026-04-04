import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import ClientAppChrome from "@/components/ClientAppChrome";

export const metadata: Metadata = {
  metadataBase: new URL("https://geo-shield-ai.vercel.app"),
  title: "GeoShield AI — Real-Time Geospatial Threat Detection",
  description:
    "AI-powered platform for real-time disaster risk mapping, threat zone detection, and geospatial early warning alerts for emergency managers and city planners.",
  keywords: [
    "geospatial AI",
    "disaster risk",
    "threat detection",
    "flood mapping",
    "emergency management",
  ],
  openGraph: {
    title: "GeoShield AI — Real-Time Geospatial Threat Detection",
    description: "AI-powered real-time risk mapping and early warning system.",
    url: "https://geo-shield-ai.vercel.app",
    siteName: "GeoShield AI",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GeoShield AI",
    description: "AI-powered geospatial threat detection platform.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full">
        <ClientAppChrome>{children}</ClientAppChrome>
      </body>
    </html>
  );
}

