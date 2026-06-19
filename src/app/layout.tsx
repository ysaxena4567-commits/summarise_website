import type { Metadata } from "next";
import { Finlandica } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ClerkSessionBridge } from "./clerk-session-bridge";
import "./globals.css";

const finlandica = Finlandica({
  variable: "--font-finlandica",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://justflamsit.com"),
  title: {
    default: "JustFlamsit | AI Document Summarizer for PDFs, Reports & Research",
    template: "%s | JustFlamsit",
  },
  description:
    "Summarize PDFs, assignments, contracts, reports, and research papers in seconds with JustFlamsit, an AI-powered document summarization platform.",
  alternates: {
    canonical: "/",
  },
  keywords: [
    "AI document summarizer",
    "PDF summary generator",
    "research paper summarizer",
    "assignment summarizer",
    "report summarization",
    "JustFlamsit",
  ],
  openGraph: {
    title: "JustFlamsit | Turn Long Documents Into 1-Minute Insights",
    description:
      "Use AI to instantly summarize PDFs, reports, contracts, assignments, and research papers into concise, actionable insights.",
    url: "https://justflamsit.com",
    siteName: "JustFlamsit",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JustFlamsit | AI Document Summarizer",
    description:
      "Transform long files into fast, accurate, actionable summaries with AI.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const legacyAuthRedirectScript = `
(() => {
  if (location.pathname === "/sign-in" || location.pathname === "/sign-up") return;

  const legacyAuthText = [
    "create your free justflamsit account",
    "continue with email",
    "your usage is synced to this email"
  ];

  const pageHasLegacyAuthModal = () => {
    const text = document.body?.innerText?.replace(/\s+/g, " ").toLowerCase() || "";
    return legacyAuthText.some((item) => text.includes(item));
  };

  const redirectLegacyModal = () => {
    if (pageHasLegacyAuthModal()) {
      location.assign("/sign-up");
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", redirectLegacyModal, { once: true });
  } else {
    redirectLegacyModal();
  }

  new MutationObserver(redirectLegacyModal).observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("button,a,label") : null;
    const text = target?.textContent?.replace(/\s+/g, " ").trim().toLowerCase() || "";

    const wantsSignUp =
      text === "sign up" ||
      text === "start summarizing free" ||
      text.includes("create your free justflamsit account");

    const wantsSignIn =
      text === "log in" ||
      text === "continue with email" ||
      text === "continue with google" ||
      text.includes("google");

    if (wantsSignUp || wantsSignIn) {
      event.preventDefault();
      event.stopPropagation();
      location.assign(wantsSignUp ? "/sign-up" : "/sign-in");
    }
  }, true);
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "JustFlamsit",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "AI-powered document, PDF, report, assignment, and research paper summarization platform.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "1200",
    },
  };

  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      <html
        lang="en"
        className={`${finlandica.variable} h-full scroll-smooth antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />
          <script dangerouslySetInnerHTML={{ __html: legacyAuthRedirectScript }} />
          <ClerkSessionBridge />
          {children}
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
