import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  compress: true,
  devIndicators: false,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31_536_000,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  poweredByHeader: false,
  async headers() {
    const immutableAssetHeaders = [
      {
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable",
      },
    ];
    const securityHeaders = [
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "X-DNS-Prefetch-Control",
        value: "on",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "base-uri 'self'",
          "object-src 'none'",
          "frame-ancestors 'none'",
          "form-action 'self'",
          "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https: https://img.clerk.com",
          "font-src 'self' data:",
          "connect-src 'self' https://vitals.vercel-insights.com https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
          "frame-src https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
          "upgrade-insecure-requests",
        ].join("; "),
      },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/dashboard-preview.png",
        headers: immutableAssetHeaders,
      },
      {
        source: "/file.svg",
        headers: immutableAssetHeaders,
      },
      {
        source: "/globe.svg",
        headers: immutableAssetHeaders,
      },
      {
        source: "/next.svg",
        headers: immutableAssetHeaders,
      },
      {
        source: "/vercel.svg",
        headers: immutableAssetHeaders,
      },
      {
        source: "/window.svg",
        headers: immutableAssetHeaders,
      },
      {
        source: "/pdf.min.js",
        headers: immutableAssetHeaders,
      },
      {
        source: "/pdf.worker.min.js",
        headers: immutableAssetHeaders,
      },
    ];
  },
};

export default nextConfig;
