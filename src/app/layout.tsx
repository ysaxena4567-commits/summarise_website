import type { Metadata } from "next";
import { Finlandica } from "next/font/google";
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
    <html
      lang="en"
      className={`${finlandica.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
      </body>
    </html>
  );
}
