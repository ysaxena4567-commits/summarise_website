import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
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
        value: "camera=(), microphone=(), geolocation=(), payment=()",
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
          "form-action 'self' https://*.cashfree.com https://*.cashfreepayments.com",
          "script-src 'self' 'unsafe-inline' https://sdk.cashfree.com https://va.vercel-scripts.com https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https: https://img.clerk.com",
          "font-src 'self' data:",
          "connect-src 'self' https://*.cashfree.com https://*.cashfreepayments.com https://vitals.vercel-insights.com https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
          "frame-src https://*.cashfree.com https://*.cashfreepayments.com https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
          "upgrade-insecure-requests",
        ].join("; "),
      },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
