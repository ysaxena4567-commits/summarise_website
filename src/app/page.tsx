"use client";

import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  Clipboard,
  Clock3,
  CreditCard,
  Download,
  FileText,
  FileUp,
  Loader2,
  LockKeyhole,
  LogIn,
  Mail,
  Menu,
  Play,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  FREE_SUMMARY_LIMIT,
  canGenerateSummary,
  getRemainingSummaries,
  getUsageState,
  recordSuccessfulSummary,
  storeUsageState,
  type UsageState,
} from "@/lib/usage";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Use Cases", href: "#use-cases" },
  { label: "Upgrade", href: "#upgrade" },
  { label: "FAQ", href: "#faq" },
];

const features = [
  "PDF, DOCX, and TXT upload support",
  "Grounded summaries from uploaded content",
  "Key points, action items, dates, and risks",
  "Usage and Pro status connected to Clerk identity",
];

const faqs = [
  ["Which auth system does JustFlamsit use?", "JustFlamsit uses Clerk for sign-in, sign-up, email verification, Google login, sessions, and user identity."],
  ["Can I use the first free summary without signing in?", "The app keeps the first flow simple, but saving usage, payments, history, and account data requires a verified Clerk email."],
  ["Are uploaded documents stored?", "No. Files are sent only for summary generation and are not stored as account history content."],
];

type UploadedFile = {
  id: string;
  file: File;
};

type AuthUser = {
  userId: string;
  email: string;
  name?: string;
  emailVerified: boolean;
};

type AccountStatusResponse = {
  account?: UsageState;
  databaseBacked?: boolean;
  error?: string;
};

type SummarizeResponse = {
  summary?: string;
  error?: string;
  usage?: UsageState;
  databaseBacked?: boolean;
  upgradeRequired?: boolean;
};

type PaymentOrderResponse = {
  orderId?: string;
  paymentSessionId?: string;
  mode?: "sandbox" | "production";
  error?: string;
};

type CashfreeCheckout = {
  checkout: (options: {
    paymentSessionId: string;
    redirectTarget?: "_self" | "_blank" | "_top" | "_modal";
  }) => Promise<unknown> | void;
};

declare global {
  interface Window {
    Cashfree?: (options: { mode: "sandbox" | "production" }) => CashfreeCheckout;
  }
}

function Logo() {
  return (
    <a href="#top" className="flex items-center gap-3" aria-label="JustFlamsit home">
      <span className="grid size-10 place-items-center rounded-lg border border-[#c5b358]/40 bg-[#c5b358] text-[#28282b] shadow-[0_0_32px_rgba(197,179,88,0.28)]">
        <Sparkles size={20} strokeWidth={2.4} />
      </span>
      <span className="text-xl font-semibold tracking-normal text-white">JustFlamsit</span>
    </a>
  );
}

function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#c5b358] px-5 text-sm font-semibold text-[#28282b] shadow-[0_18px_50px_rgba(197,179,88,0.22)] transition hover:-translate-y-0.5 hover:bg-[#dbc966] focus:outline-none focus:ring-2 focus:ring-[#c5b358] focus:ring-offset-2 focus:ring-offset-[#28282b]"
    >
      {children}
      <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
    </a>
  );
}

function Header({ authUser }: { authUser: AuthUser | null }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#28282b]/86 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8" aria-label="Primary navigation">
        <Logo />
        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="text-sm font-medium text-zinc-300 transition hover:text-white">
              {item.label}
            </a>
          ))}
        </div>
        <div className="hidden md:block">
          {authUser ? (
            <div className="inline-flex min-h-11 items-center gap-3 rounded-lg border border-white/10 px-3 text-sm font-semibold text-zinc-200">
              <UserButton />
              <span>{authUser.email.split("@")[0]}</span>
            </div>
          ) : (
            <SignInButton mode="redirect">
              <button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#c5b358] px-4 text-sm font-semibold text-[#28282b] transition hover:bg-[#dbc966]">
                <LogIn size={17} />
                Sign in
              </button>
            </SignInButton>
          )}
        </div>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-lg border border-white/10 text-white md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>
      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#28282b] px-4 py-5 md:hidden">
          <div className="flex flex-col gap-4">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="text-base font-medium text-zinc-200" onClick={() => setMobileOpen(false)}>
                {item.label}
              </a>
            ))}
            {authUser ? (
              <div className="inline-flex min-h-12 items-center justify-center gap-3 rounded-lg border border-white/10 px-4 text-sm font-semibold text-white">
                <UserButton />
                {authUser.email.split("@")[0]}
              </div>
            ) : (
              <SignInButton mode="redirect">
                <button type="button" onClick={() => setMobileOpen(false)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#c5b358] px-4 text-sm font-semibold text-[#28282b]">
                  <LogIn size={17} />
                  Sign in
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUsageLabel(usage: UsageState) {
  const remaining = getRemainingSummaries(usage);
  return usage.plan === "pro"
    ? `${remaining} summaries remaining in your Pro period`
    : `${remaining} of ${FREE_SUMMARY_LIMIT} trial summaries remaining`;
}

async function fetchAccountUsage() {
  const response = await fetch("/api/account/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const data = (await response.json()) as AccountStatusResponse;

  if (!response.ok || !data.account) {
    throw new Error(data.error || "Unable to sync account usage.");
  }

  return {
    usage: storeUsageState(data.account),
    databaseBacked: Boolean(data.databaseBacked),
  };
}

function SummaryOutput({ summary }: { summary: string }) {
  if (!summary) {
    return <p className="text-sm leading-7 text-zinc-500">Your grounded AI summary will appear here after upload.</p>;
  }

  return (
    <div className="space-y-3">
      {summary
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => {
          if (line.startsWith("## ")) {
            return <h3 key={`${line}-${index}`} className="pt-3 text-xl font-semibold text-white">{line.replace(/^##\s+/, "")}</h3>;
          }
          return <p key={`${line}-${index}`} className="text-sm leading-7 text-zinc-300">{line.replace(/^[-*]\s+/, "").replace(/\*\*/g, "")}</p>;
        })}
    </div>
  );
}

function SummarizerSection({ authUser }: { authUser: AuthUser | null }) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [instructions, setInstructions] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [databaseBacked, setDatabaseBacked] = useState(false);
  const [isUsageSyncing, setIsUsageSyncing] = useState(false);
  const [usage, setUsage] = useState<UsageState>(() => {
    if (typeof window === "undefined") return { plan: "free", freeUsed: 0, proUsed: 0, monthKey: "" };
    return getUsageState();
  });

  useEffect(() => {
    if (!authUser?.emailVerified) {
      setUsage(getUsageState());
      return;
    }

    const timer = window.setTimeout(async () => {
      setIsUsageSyncing(true);
      try {
        const synced = await fetchAccountUsage();
        setUsage(synced.usage);
        setDatabaseBacked(synced.databaseBacked);
      } catch {
        setError("Could not sync your verified Clerk account usage. Refresh or try again in a moment.");
      } finally {
        setIsUsageSyncing(false);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [authUser?.emailVerified, authUser?.userId]);

  const addSupportedFiles = useCallback((nextFiles: File[]) => {
    const supportedFiles = nextFiles.filter((file) => /\.(pdf|docx|txt)$/i.test(file.name));

    if (supportedFiles.length !== nextFiles.length) {
      setError("Only PDF, DOCX, and TXT files are supported.");
    } else {
      setError("");
    }

    setUploadedFiles((current) => {
      const existing = new Set(current.map((item) => `${item.file.name}-${item.file.size}`));
      const unique = supportedFiles
        .filter((file) => !existing.has(`${file.name}-${file.size}`))
        .map((file) => ({ id: `${file.name}-${file.size}-${crypto.randomUUID()}`, file }));
      return [...current, ...unique].slice(0, 5);
    });
  }, []);

  const requireClerkSignIn = () => {
    window.location.assign("/sign-in");
  };

  const addFiles = (fileList: FileList | File[]) => {
    if (!authUser?.email) {
      setError("Sign in with Clerk first to upload documents securely.");
      requireClerkSignIn();
      return;
    }
    addSupportedFiles(Array.from(fileList));
  };

  const summarizeFiles = async () => {
    if (!authUser?.email) {
      setError("Sign in with Clerk first to start summarizing.");
      requireClerkSignIn();
      return;
    }

    if (!authUser.emailVerified) {
      setError("Verify your email in Clerk before saving usage, payment, or history details.");
      requireClerkSignIn();
      return;
    }

    if (!uploadedFiles.length) {
      setError("Upload at least one PDF, DOCX, or TXT file first.");
      return;
    }

    let currentUsage = usage;

    try {
      setIsUsageSyncing(true);
      const synced = await fetchAccountUsage();
      currentUsage = synced.usage;
      setUsage(currentUsage);
      setDatabaseBacked(synced.databaseBacked);
    } catch {
      setError("Could not verify your remaining summaries. Please refresh and try again.");
      setIsUsageSyncing(false);
      return;
    }

    setIsUsageSyncing(false);

    if (!canGenerateSummary(currentUsage)) {
      setError("Your current summary limit is finished. Upgrade to continue.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSummary("");
    setCopied(false);

    try {
      const formData = new FormData();
      uploadedFiles.forEach(({ file }) => formData.append("files", file));
      formData.append("instructions", instructions.trim());

      const response = await fetch("/api/summarize", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as SummarizeResponse;

      if (!response.ok || !data.summary) {
        if (response.status === 401) requireClerkSignIn();
        if (response.status === 402 || data.upgradeRequired) {
          throw new Error(data.error || "Your current summary limit is finished. Upgrade to continue.");
        }
        throw new Error(data.error || "The document could not be summarized.");
      }

      setSummary(data.summary);
      if (data.usage) {
        setUsage(storeUsageState(data.usage));
        setDatabaseBacked(Boolean(data.databaseBacked));
      } else {
        setUsage(recordSuccessfulSummary(currentUsage));
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const copySummary = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const downloadSummary = () => {
    if (!summary) return;
    const content = `JustFlamsit AI Summary\nGenerated: ${new Date().toLocaleString()}\n\n${summary}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "justflamsit-summary.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section id="summarizer" className="border-b border-white/10 bg-[#202024] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c5b358]">AI Summarizer</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Upload files and review the summary side by side</h2>
            <p className="mt-3 text-base leading-7 text-zinc-300">PDFs, DOCX, and TXT files are processed only for summary generation.</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#c5b358]/30 bg-[#c5b358]/10 px-3 py-2 text-sm font-semibold text-[#f2e7a5]">
              {isUsageSyncing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {isUsageSyncing ? "Syncing Clerk usage..." : formatUsageLabel(usage)}
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              {databaseBacked ? "Usage is synced to your verified Clerk email." : "Verified Clerk email is required for account usage sync."}
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-stretch">
          <div className="rounded-2xl border border-white/10 bg-[#161618] p-4 shadow-2xl shadow-black/20 sm:p-5">
            <label
              htmlFor="document-upload"
              onClick={(event) => {
                if (!authUser?.email) {
                  event.preventDefault();
                  requireClerkSignIn();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                addFiles(event.dataTransfer.files);
              }}
              className={`flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition ${
                isDragging ? "border-[#c5b358] bg-[#c5b358]/10" : "border-white/15 bg-white/[0.03] hover:border-[#c5b358]/60 hover:bg-white/[0.05]"
              }`}
            >
              <span className="grid size-14 place-items-center rounded-xl bg-[#c5b358] text-[#28282b] shadow-[0_18px_45px_rgba(197,179,88,0.18)]">
                <FileUp size={26} />
              </span>
              <span className="mt-5 text-xl font-semibold text-white">Drag and drop files here</span>
              <span className="mt-2 max-w-md text-sm leading-6 text-zinc-400">Upload up to 5 files. Supported formats: PDF, DOCX, and TXT.</span>
              <span className="mt-5 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white">Browse files</span>
              <input
                id="document-upload"
                type="file"
                multiple
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="sr-only"
                onChange={(event) => {
                  if (event.target.files) addFiles(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
            </label>

            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-3">
                {uploadedFiles.map(({ id, file }) => (
                  <div key={id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#c5b358]/12 text-[#c5b358]"><FileText size={18} /></span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{file.name}</p>
                        <p className="text-xs text-zinc-500">{formatBytes(file.size)}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setUploadedFiles((current) => current.filter((item) => item.id !== id))} className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 text-zinc-300 transition hover:border-red-400/50 hover:text-red-300" aria-label={`Remove ${file.name}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="mt-4 flex gap-3 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
                <AlertTriangle size={18} className="mt-1 shrink-0" />
                {error}
              </div>
            )}

            <label htmlFor="summary-instructions" className="mt-5 block text-sm font-semibold text-white">Summary instructions</label>
            <textarea
              id="summary-instructions"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Example: make it short, include key points, focus on deadlines, or extract action items."
              className="mt-2 min-h-28 w-full resize-y rounded-xl border border-white/10 bg-[#0f0f11] px-4 py-3 text-sm leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-[#c5b358]/70 focus:ring-2 focus:ring-[#c5b358]/15"
            />

            <button type="button" onClick={summarizeFiles} disabled={isLoading || isUsageSyncing} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#c5b358] px-5 text-sm font-semibold text-[#28282b] transition hover:bg-[#dbc966] disabled:cursor-not-allowed disabled:opacity-70">
              {isLoading || isUsageSyncing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {isLoading ? "Summarizing" : isUsageSyncing ? "Checking usage" : "Generate Summary"}
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#161618] p-4 shadow-2xl shadow-black/20 sm:p-5">
            <div className="flex h-full min-h-[34rem] flex-col rounded-xl border border-white/10 bg-[#0f0f11] p-4">
              <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">AI Summary Output</p>
                  <p className="mt-1 text-xs text-zinc-500">Executive summary, key points, action items, and risks.</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={copySummary} disabled={!summary} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-semibold text-zinc-200 transition hover:border-[#c5b358]/50 disabled:cursor-not-allowed disabled:opacity-45">
                    <Clipboard size={16} />
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button type="button" onClick={downloadSummary} disabled={!summary} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-semibold text-zinc-200 transition hover:border-[#c5b358]/50 disabled:cursor-not-allowed disabled:opacity-45">
                    <Download size={16} />
                    Download
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto pt-4">
                {isLoading ? (
                  <div className="space-y-3">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
                    <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-white/10" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                  </div>
                ) : (
                  <SummaryOutput summary={summary} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function loadCashfreeSdk() {
  return new Promise<void>((resolve, reject) => {
    if (window.Cashfree) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>("script[data-cashfree-sdk]");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Cashfree checkout could not load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.dataset.cashfreeSdk = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Cashfree checkout could not load."));
    document.head.appendChild(script);
  });
}

function PricingSection({ authUser }: { authUser: AuthUser | null }) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [isStartingPayment, setIsStartingPayment] = useState(false);

  const startCheckout = async () => {
    if (!authUser?.email) {
      window.location.assign("/sign-in");
      return;
    }

    if (!authUser.emailVerified) {
      setPaymentError("Verify your email in Clerk before upgrading.");
      window.location.assign("/sign-in");
      return;
    }

    setIsStartingPayment(true);
    setPaymentError("");

    try {
      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, customerPhone }),
      });
      const data = (await response.json()) as PaymentOrderResponse;

      if (!response.ok || !data.paymentSessionId) {
        throw new Error(data.error || "Unable to start Cashfree checkout.");
      }

      await loadCashfreeSdk();
      if (!window.Cashfree) throw new Error("Cashfree checkout is unavailable. Please try again.");

      const cashfree = window.Cashfree({ mode: data.mode ?? "sandbox" });
      cashfree.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: "_self" });
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Payment could not be started.");
      setIsStartingPayment(false);
    }
  };

  return (
    <section id="upgrade" className="border-y border-white/10 bg-[#202024] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c5b358]">Upgrade</p>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Upgrade to JustFlamsit Pro with Clerk verified identity</h2>
          <p className="mt-4 text-base leading-8 text-zinc-300">Payment, subscription status, and usage are attached to your Clerk user ID and verified email.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {["Clerk verified email required", "Server-side payment verification", "No secret keys in browser", "No uploaded document storage"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-semibold text-zinc-200">
                <Check size={16} className="text-[#c5b358]" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#161618] p-5 shadow-2xl shadow-black/20">
          <div className="rounded-xl border border-[#c5b358]/30 bg-[#c5b358]/[0.08] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">JustFlamsit Pro</h3>
                <p className="mt-1 text-sm text-zinc-400">For regular document work</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-4xl font-semibold text-white">Rs. 199</p>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f2e7a5]">per month</p>
              </div>
            </div>
            <ul className="mt-5 space-y-3 text-sm text-zinc-200">
              {["50 summaries per month", "Clean exports", "Priority processing", "Early access to new features"].map((item) => (
                <li key={item} className="flex items-center gap-3"><Check size={16} className="text-[#c5b358]" />{item}</li>
              ))}
            </ul>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label>
                <span className="text-sm font-semibold text-zinc-200">Name</span>
                <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} type="text" placeholder="Your name" className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-[#0f0f11] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#c5b358]/70" />
              </label>
              <label>
                <span className="text-sm font-semibold text-zinc-200">Phone</span>
                <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} type="tel" placeholder="10 digit phone number" className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-[#0f0f11] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#c5b358]/70" />
              </label>
            </div>

            {paymentError && (
              <div className="mt-4 flex gap-3 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm leading-6 text-red-100">
                <AlertTriangle size={17} className="mt-1 shrink-0" />
                {paymentError}
              </div>
            )}

            <button type="button" onClick={startCheckout} disabled={isStartingPayment} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#c5b358] px-5 text-sm font-semibold text-[#28282b] transition hover:bg-[#dbc966] disabled:cursor-not-allowed disabled:opacity-70">
              {isStartingPayment ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
              {authUser ? "Upgrade with Cashfree" : "Sign in to upgrade"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { user, isLoaded } = useUser();
  const primaryEmail = user?.primaryEmailAddress;
  const authUser: AuthUser | null =
    isLoaded && user && primaryEmail?.emailAddress
      ? {
          userId: user.id,
          email: primaryEmail.emailAddress.toLowerCase(),
          name: user.fullName || user.firstName || undefined,
          emailVerified: primaryEmail.verification?.status === "verified",
        }
      : null;

  return (
    <main id="top" className="min-h-screen overflow-hidden bg-[#28282b] text-white">
      <Header authUser={authUser} />

      <section className="relative border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(197,179,88,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_35%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1fr_0.92fr] lg:items-center lg:px-8 lg:pb-28 lg:pt-24">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#c5b358]/35 bg-[#c5b358]/10 px-3 py-2 text-sm font-semibold text-[#f2e7a5] shadow-[0_0_32px_rgba(197,179,88,0.08)]">
              <BadgeCheck size={16} />
              Clerk-secured document intelligence
            </div>
            <h1 className="mt-7 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-normal text-white sm:text-6xl lg:text-7xl">Turn 100-page documents into 1-minute insights</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-200 sm:text-xl">Use AI to summarize reports, PDFs, assignments, contracts, research papers, and lengthy files into clear, actionable summaries.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {authUser ? <PrimaryLink href="#summarizer">Open summarizer</PrimaryLink> : <PrimaryLink href="/sign-up">Start free</PrimaryLink>}
              <a href="#how-it-works" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/15 px-5 text-sm font-semibold text-white transition hover:border-[#c5b358]/70 hover:bg-white/5">
                <Play size={16} fill="currentColor" />
                See how it works
              </a>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-5 text-sm text-zinc-300">
              <span className="flex items-center gap-2"><LockKeyhole size={17} className="text-[#c5b358]" /> Clerk verified identity</span>
              <span className="flex items-center gap-2"><Clock3 size={17} className="text-[#c5b358]" /> Summaries in seconds</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/12 bg-[#1d1d20]/95 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.42)]">
            <div className="rounded-xl border border-white/10 bg-[#0f0f11] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c5b358]">Workspace preview</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Summary intelligence</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">Upload documents, verify identity with Clerk, and keep usage tied to your account.</p>
              <div className="mt-5 grid gap-3">
                {["Research paper.pdf", "Quarterly report.pdf", "Contract draft.docx"].map((file, index) => (
                  <div key={file} className="rounded-lg border border-white/10 bg-[#252529] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-zinc-100">{file}</p>
                      <Check size={16} className="shrink-0 text-[#c5b358]" />
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-[#c5b358]" style={{ width: `${92 - index * 13}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Trust indicators" className="border-b border-white/10 bg-[#232326]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 py-6 sm:px-6 md:grid-cols-4 lg:px-8">
          {[
            { icon: ShieldCheck, label: "Clerk Auth" },
            { icon: Sparkles, label: "AI Powered" },
            { icon: Zap, label: "Fast Results" },
            { icon: LockKeyhole, label: "Privacy Focused" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-zinc-200">
              <Icon size={18} className="text-[#c5b358]" />
              {label}
            </div>
          ))}
        </div>
      </section>

      <SummarizerSection authUser={authUser} />
      <PricingSection authUser={authUser} />

      <section id="features" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c5b358]">Features</p>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Everything routes through Clerk</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature} className="rounded-lg border border-white/10 bg-white/[0.04] p-5 text-sm font-semibold leading-6 text-zinc-200">
                <Check size={18} className="mb-4 text-[#c5b358]" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-white/10 bg-[#202024] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c5b358]">How It Works</p>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Secure summary flow</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              ["Sign in with Clerk", "Use Clerk email verification, OTP/magic link, or Google login."],
              ["Upload documents", "Files are processed only for summary generation."],
              ["Save account data", "Usage, payment, subscription, feedback, and history metadata use your Clerk user ID and verified email."],
            ].map(([title, copy], index) => (
              <div key={title} className="rounded-lg border border-white/10 bg-[#28282b] p-7">
                <span className="text-5xl font-semibold text-[#c5b358]">0{index + 1}</span>
                <h3 className="mt-6 text-2xl font-semibold text-white">{title}</h3>
                <p className="mt-4 leading-7 text-zinc-300">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="use-cases" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-[#c5b358]/30 bg-[linear-gradient(135deg,rgba(197,179,88,0.18),rgba(255,255,255,0.04))] p-8 text-center shadow-2xl shadow-black/25 sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f2e7a5]">Start Free</p>
          <h2 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">Stop reading hundreds of pages. Start getting answers.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-zinc-200">Join students, professionals, and researchers using Clerk-secured JustFlamsit accounts.</p>
          <div className="mt-8 flex justify-center">
            {authUser ? <PrimaryLink href="#summarizer">Open summarizer</PrimaryLink> : <PrimaryLink href="/sign-up">Get started</PrimaryLink>}
          </div>
        </div>
      </section>

      <section id="faq" className="border-y border-white/10 bg-[#202024] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c5b358]">FAQ</p>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Authentication questions</h2>
          <div className="mt-8 space-y-3">
            {faqs.map(([question, answer]) => (
              <details key={question} className="group rounded-lg border border-white/10 bg-[#28282b] p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-white">
                  {question}
                  <ChevronDown size={20} className="shrink-0 text-[#c5b358] transition group-open:rotate-180" />
                </summary>
                <p className="mt-4 leading-7 text-zinc-300">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#c5b358]/20 bg-[#151517] px-4 py-12 text-zinc-300 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Logo />
            <p className="mt-3 text-sm leading-6 text-zinc-400">AI-powered document intelligence secured by Clerk.</p>
          </div>
          <a href="mailto:support@justflamsit.com" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:border-[#c5b358]/60 hover:text-white">
            <Mail size={17} className="text-[#c5b358]" />
            support@justflamsit.com
          </a>
        </div>
      </footer>
    </main>
  );
}
