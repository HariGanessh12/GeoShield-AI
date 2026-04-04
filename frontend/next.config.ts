import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || undefined;
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "https://geoshield-ai-2.onrender.com";

let apiOrigin = apiBaseUrl;
try {
  apiOrigin = new URL(apiBaseUrl).origin;
} catch {
  // Keep the raw value if an unexpected non-URL value slips through at build time.
}

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://api.mapbox.com",
      "style-src 'self' 'unsafe-inline' https://api.mapbox.com",
      "img-src 'self' data: blob: https://*.mapbox.com https://*.openstreetmap.org https://tile.openstreetmap.org",
      `connect-src 'self' ${apiOrigin} https://*.onrender.com https://api.mapbox.com https://events.mapbox.com https://*.openstreetmap.org https://tile.openstreetmap.org`,
      "worker-src blob:",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
];

const nextConfig: NextConfig = {
  basePath,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
