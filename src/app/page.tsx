"use client";

import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BookOpenText,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clipboard,
  Clock3,
  Download,
  FileSearch,
  FileText,
  FileUp,
  GraduationCap,
  Landmark,
  Layers3,
  LogIn,
  Loader2,
  LockKeyhole,
  Mail,
  Menu,
  Microscope,
  Play,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Use Cases", href: "#use-cases" },
  { label: "FAQ", href: "#faq" },
];

const heroBenefits = [
  "Save hours of reading",
  "Instant AI summaries",
  "Works with PDFs & documents",
  "Accurate key insights",
];

const mockFiles = [
  { name: "Research paper.pdf", pages: "42 pages" },
  { name: "Quarterly report.pdf", pages: "96 pages" },
  { name: "Contract draft.docx", pages: "18 pages" },
];

const mockInsights = [
  "Top opportunity: automate tier-one support intake.",
  "Risk signal: onboarding delays could affect Q3 revenue.",
  "Decision point: shift budget toward workflow tooling.",
];

const trustItems = [
  { icon: ShieldCheck, label: "Secure Processing" },
  { icon: Sparkles, label: "AI Powered" },
  { icon: Zap, label: "Fast Results" },
  { icon: LockKeyhole, label: "Privacy Focused" },
  { icon: BadgeCheck, label: "Enterprise Ready" },
];

const painPoints = [
  "Reports keep stacking up faster than teams can read them.",
  "Research papers hide the answer behind pages of dense context.",
  "Assignments, contracts, and PDFs slow down every decision.",
  "Key details get missed when attention is already stretched thin.",
];

const features: Array<{ title: string; copy: string; icon: LucideIcon }> = [
  { title: "AI Document Summarization", copy: "Convert long documents into clean summaries with sections, actions, and key takeaways.", icon: FileText },
  { title: "PDF Summary Generator", copy: "Upload PDF files and receive structured, readable summaries in seconds.", icon: FileSearch },
  { title: "Research Paper Analysis", copy: "Surface methods, findings, limitations, and citations without losing the academic signal.", icon: Microscope },
  { title: "Assignment Summaries", copy: "Break down class notes, prompts, and submissions into study-ready briefs.", icon: GraduationCap },
  { title: "Report Condensation", copy: "Turn business reports into executive summaries your team can scan quickly.", icon: BriefcaseBusiness },
  { title: "Key Point Extraction", copy: "Pull out themes, decisions, risks, deadlines, and next steps automatically.", icon: Sparkles },
  { title: "Executive Summaries", copy: "Create polished leadership-ready recaps from complex source material.", icon: Landmark },
  { title: "Instant Insights", copy: "Ask what matters and move from upload to answer with less friction.", icon: Zap },
  { title: "Multi-File Processing", copy: "Compare multiple documents and consolidate important themes in one view.", icon: Layers3 },
  { title: "Secure Uploads", copy: "Built for privacy-conscious document workflows and professional teams.", icon: LockKeyhole },
];

const benefits = [
  "Save time on every document-heavy task",
  "Increase productivity across research and review cycles",
  "Learn faster from dense academic and professional material",
  "Make better decisions with the signal separated from the noise",
  "Reduce information overload before it slows momentum",
  "Improve research efficiency without sacrificing context",
];

const useCases: Array<{ title: string; copy: string; icon: LucideIcon }> = [
  { title: "Students", copy: "Summarize assignments, lecture notes, textbooks, and PDFs into study guides that are easier to review.", icon: GraduationCap },
  { title: "Researchers", copy: "Extract hypotheses, findings, methodology, and gaps from papers before deciding what deserves deep reading.", icon: Microscope },
  { title: "Consultants", copy: "Condense client reports, discovery notes, and market research into clear briefing documents.", icon: BriefcaseBusiness },
  { title: "Business Teams", copy: "Transform long updates, product docs, and meeting packs into quick decisions and next steps.", icon: UsersRound },
  { title: "Law Professionals", copy: "Review contracts, case documents, and legal research faster while preserving critical details.", icon: Landmark },
  { title: "Content Creators", copy: "Turn source material into outlines, angles, and high-signal briefs for faster production.", icon: BookOpenText },
];

const faqs = [
  ["How accurate are JustFlamsit summaries?", "JustFlamsit is designed to preserve the main argument, important details, and actionable takeaways. You can use summaries as a fast reading layer while keeping the original file available for verification."],
  ["What file formats are supported?", "The landing experience is built for PDFs, documents, reports, assignments, research papers, and long-form text files. Product integrations can extend supported formats over time."],
  ["Is my data secure?", "The site positions privacy and secure upload workflows as core product expectations, with messaging built for students, professionals, and enterprise teams handling sensitive files."],
  ["Can I summarize research papers?", "Yes. The research workflow highlights findings, methodology, limitations, themes, and useful context so academics can triage papers faster."],
  ["Is there a free plan?", "The primary call to action invites visitors to start summarizing free, reducing sign-up friction for first-time users."],
  ["How long does processing take?", "The product messaging emphasizes instant results for common document summarization workflows, helping users move from upload to useful summary quickly."],
  ["Can I upload large documents?", "The experience is written around lengthy PDFs, reports, contracts, assignments, and research papers, including documents that would normally take hours to read."],
  ["Who is this platform for?", "JustFlamsit is for students, researchers, consultants, business teams, legal professionals, content creators, and anyone who needs answers from long documents."],
];

type UploadedFile = {
  id: string;
  file: File;
};

type SummarizeResponse = {
  summary?: string;
  error?: string;
  documents?: Array<{ name: string; characters: number }>;
};

type AuthUser = {
  email: string;
  provider: "email" | "gmail";
};

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

function LoginModal({
  onLogin,
  onClose,
}: {
  onLogin: (user: AuthUser) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const cleanEmail = email.trim().toLowerCase();

  const loginWithEmail = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    onLogin({ email: cleanEmail, provider: cleanEmail.endsWith("@gmail.com") ? "gmail" : "email" });
  };

  const loginWithGmail = () => {
    if (!cleanEmail) {
      setError("Enter your Gmail address below, then continue with Gmail.");
      return;
    }

    if (!cleanEmail.endsWith("@gmail.com")) {
      setError("Use a Gmail address for Gmail login.");
      return;
    }

    onLogin({ email: cleanEmail, provider: "gmail" });
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#18181b] p-6 shadow-2xl shadow-black/45">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#c5b358]">Welcome</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Log in to JustFlamsit</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Sign in before uploading documents and generating summaries.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-lg border border-white/10 text-zinc-300 transition hover:text-white"
            aria-label="Close login"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={loginWithEmail} className="mt-6 space-y-3">
          <label htmlFor="login-email" className="text-sm font-semibold text-zinc-200">
            Email address
          </label>
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3">
            <Mail size={18} className="text-[#c5b358]" />
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
              placeholder="you@gmail.com"
              className="min-h-12 w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
            />
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button
            type="button"
            onClick={loginWithGmail}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white transition hover:border-[#c5b358]/50 hover:bg-white/[0.07]"
          >
            <Mail size={18} />
            Continue with Gmail
          </button>
          <button
            type="submit"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#c5b358] px-4 text-sm font-semibold text-[#28282b] transition hover:bg-[#dbc966]"
          >
            <LogIn size={18} />
            Continue with Email
          </button>
        </form>
      </div>
    </div>
  );
}

function CtaButton({ href = "#summarizer", children = "Start Summarizing Free" }) {
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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderSummary(summary: string) {
  return summary
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      if (line.startsWith("## ")) {
        return (
          <h3 key={`${line}-${index}`} className="mt-6 text-xl font-semibold text-white first:mt-0">
            {line.replace(/^##\s+/, "")}
          </h3>
        );
      }

      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <p key={`${line}-${index}`} className="pl-4 text-sm leading-7 text-zinc-300 before:mr-2 before:text-[#c5b358] before:content-['•']">
            {line.replace(/^[-*]\s+/, "").replace(/\*\*/g, "")}
          </p>
        );
      }

      return (
        <p key={`${line}-${index}`} className="text-sm leading-7 text-zinc-300">
          {line.replace(/\*\*/g, "")}
        </p>
      );
    });
}

function SummarizerSection() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const addFiles = (fileList: FileList | File[]) => {
    const nextFiles = Array.from(fileList);
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
        .map((file) => ({
          id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
          file,
        }));

      return [...current, ...unique].slice(0, 5);
    });
  };

  const removeFile = (id: string) => {
    setUploadedFiles((current) => current.filter((item) => item.id !== id));
  };

  const summarizeFiles = async () => {
    if (!uploadedFiles.length) {
      setError("Upload at least one PDF, DOCX, or TXT file first.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSummary("");
    setCopied(false);

    try {
      const formData = new FormData();
      uploadedFiles.forEach(({ file }) => formData.append("files", file));

      const response = await fetch("/api/summarize", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as SummarizeResponse;

      if (!response.ok || !data.summary) {
        throw new Error(data.error || "The document could not be summarized.");
      }

      setSummary(data.summary);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const copySummary = async () => {
    if (!summary) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary);
      } else {
        throw new Error("Clipboard API unavailable");
      }
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = summary;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const downloadSummary = () => {
    if (!summary) return;

    const content = `JustFlamsit AI Summary\nGenerated: ${new Date().toLocaleString()}\n\n${summary}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    window.setTimeout(() => {
      const link = document.createElement("a");
      link.href = url;
      link.download = "justflamsit-summary.txt";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 0);
  };

  return (
    <section id="summarizer" className="border-b border-white/10 bg-[#202024] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c5b358]">AI Summarizer</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Upload files and review the summary side by side</h2>
            <p className="mt-3 text-base leading-7 text-zinc-300">
              PDFs, DOCX, and TXT files are processed with Gemini using only the content in your documents.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:w-[28rem]">
            {["Grounded output", "Copy or download"].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm font-medium text-zinc-200">
                <Check size={16} className="text-[#c5b358]" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-stretch">
          <div className="rounded-2xl border border-white/10 bg-[#161618] p-4 shadow-2xl shadow-black/20 sm:p-5">
            <label
              htmlFor="document-upload"
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
                isDragging
                  ? "border-[#c5b358] bg-[#c5b358]/10"
                  : "border-white/15 bg-white/[0.03] hover:border-[#c5b358]/60 hover:bg-white/[0.05]"
              }`}
            >
              <span className="grid size-14 place-items-center rounded-xl bg-[#c5b358] text-[#28282b] shadow-[0_18px_45px_rgba(197,179,88,0.18)]">
                <FileUp size={26} />
              </span>
              <span className="mt-5 text-xl font-semibold text-white">Drag and drop files here</span>
              <span className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
                Upload up to 5 files. Supported formats: PDF, DOCX, and TXT. Max 10MB per file.
              </span>
              <span className="mt-5 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white">
                Browse files
              </span>
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
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#c5b358]/12 text-[#c5b358]">
                        <FileText size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{file.name}</p>
                        <p className="text-xs text-zinc-500">{formatBytes(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(id)}
                      className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 text-zinc-300 transition hover:border-red-400/50 hover:text-red-300"
                      aria-label={`Remove ${file.name}`}
                    >
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

            <button
              type="button"
              onClick={summarizeFiles}
              disabled={isLoading}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#c5b358] px-5 text-sm font-semibold text-[#28282b] transition hover:bg-[#dbc966] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Summarizing with Gemini
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate Summary
                </>
              )}
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#161618] p-4 shadow-2xl shadow-black/20 sm:p-5">
            <div className="flex h-full min-h-[34rem] flex-col rounded-xl border border-white/10 bg-[#0f0f11] p-4">
              <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">AI Summary Output</p>
                  <p className="mt-1 text-xs text-zinc-500">Executive summary, key points, dates, people, action items, and risks.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={copySummary}
                    disabled={!summary}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-semibold text-zinc-200 transition hover:border-[#c5b358]/50 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Clipboard size={16} />
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={downloadSummary}
                    disabled={!summary}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-semibold text-zinc-200 transition hover:border-[#c5b358]/50 disabled:cursor-not-allowed disabled:opacity-45"
                  >
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
                ) : summary ? (
                  <div className="summary-output">{renderSummary(summary)}</div>
                ) : (
                  <p className="text-sm leading-7 text-zinc-500">
                    Your grounded Gemini summary will appear here after upload.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c5b358]">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">{title}</h2>
      <p className="mt-5 text-base leading-8 text-zinc-300 sm:text-lg">{copy}</p>
    </div>
  );
}

function ProductMockup() {
  return (
    <div className="relative lg:pt-4">
      <div className="absolute -left-10 top-16 hidden h-40 w-40 rounded-full bg-[#c5b358]/10 blur-3xl lg:block" />
      <div className="absolute -right-4 bottom-6 hidden h-48 w-48 rounded-full bg-white/5 blur-3xl lg:block" />
      <div className="relative rounded-2xl border border-white/12 bg-[#1d1d20]/95 p-3 shadow-[0_30px_90px_rgba(0,0,0,0.42)]">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0f0f11]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-[#ff6868]" />
              <span className="size-3 rounded-full bg-[#f3c85d]" />
              <span className="size-3 rounded-full bg-[#60d98b]" />
            </div>
            <span className="rounded-md bg-[#c5b358]/14 px-3 py-1 text-xs font-bold text-[#f4e9a4]">
              AI Dashboard Preview
            </span>
          </div>

          <div className="bg-[radial-gradient(circle_at_20%_0%,rgba(197,179,88,0.11),transparent_34%),linear-gradient(145deg,#222226,#121214)] p-5 sm:p-7">
            <div className="rounded-xl border border-white/14 bg-[#171719]/78 p-4 shadow-inner shadow-white/[0.03] sm:p-5">
              <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c5b358]">Workspace</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Summary intelligence</h2>
                  <p className="mt-1 text-sm text-zinc-400">4 files analyzed in 38 seconds</p>
                </div>
                <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
                  <div className="rounded-lg border border-[#c5b358]/25 bg-[#c5b358]/10 px-4 py-3">
                    <p className="text-2xl font-semibold text-[#f0df83]">95%</p>
                    <p className="text-xs text-zinc-400">time saved</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
                    <p className="text-2xl font-semibold text-white">12</p>
                    <p className="text-xs text-zinc-400">key points</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-white">Uploaded files</h3>
                    <span className="rounded-md bg-white/7 px-2 py-1 text-xs text-zinc-300">Secure</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {mockFiles.map((file, index) => (
                      <div key={file.name} className="rounded-lg border border-white/10 bg-[#252529] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-zinc-100">{file.name}</p>
                            <p className="mt-1 text-xs text-zinc-500">{file.pages}</p>
                          </div>
                          <Check size={16} className="shrink-0 text-[#c5b358]" />
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-[#c5b358]" style={{ width: `${92 - index * 11}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-[#c5b358]/35 bg-[#c5b358]/[0.08] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c5b358]">Executive summary</p>
                    <p className="mt-3 text-lg font-semibold leading-7 text-white">
                      Margin improved, but support volume is now the constraint slowing enterprise onboarding.
                    </p>
                  </div>
                  <div className="grid gap-3">
                    {mockInsights.map((insight) => (
                      <div key={insight} className="flex gap-3 rounded-lg border border-white/10 bg-[#101012]/75 p-3 text-sm leading-6 text-zinc-200">
                        <Sparkles size={17} className="mt-1 shrink-0 text-[#c5b358]" />
                        {insight}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute -bottom-5 left-6 right-6 hidden rounded-lg border border-white/10 bg-[#151517]/90 px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur md:flex md:items-center md:justify-between">
          <span className="text-sm font-medium text-zinc-300">Reading time reduced from 3h 20m to 4m</span>
          <span className="rounded-md bg-[#c5b358] px-3 py-1 text-xs font-bold text-[#28282b]">Ready to share</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedUser = window.localStorage.getItem("justflamsit-user");

      if (storedUser) {
        setAuthUser(JSON.parse(storedUser) as AuthUser);
      } else {
        setShowLogin(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const handleLogin = (user: AuthUser) => {
    window.localStorage.setItem("justflamsit-user", JSON.stringify(user));
    setAuthUser(user);
    setShowLogin(false);
  };

  const handleLogout = () => {
    window.localStorage.removeItem("justflamsit-user");
    setAuthUser(null);
    setShowLogin(true);
  };

  return (
    <main id="top" className="min-h-screen overflow-hidden bg-[#28282b] text-white">
      {showLogin && !authUser && <LoginModal onLogin={handleLogin} onClose={() => setShowLogin(false)} />}
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
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-semibold text-zinc-200 transition hover:border-[#c5b358]/50 hover:text-white"
              >
                <UserRound size={17} className="text-[#c5b358]" />
                {authUser.email.split("@")[0]}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowLogin(true)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#c5b358] px-4 text-sm font-semibold text-[#28282b] transition hover:bg-[#dbc966]"
              >
                <LogIn size={17} />
                Log in
              </button>
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
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-semibold text-white"
                >
                  <UserRound size={17} />
                  Log out {authUser.email.split("@")[0]}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    setShowLogin(true);
                  }}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#c5b358] px-4 text-sm font-semibold text-[#28282b]"
                >
                  <LogIn size={17} />
                  Log in
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <section className="relative border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(197,179,88,0.12),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1fr_0.78fr] lg:items-center lg:px-8 lg:pb-24 lg:pt-20">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#c5b358]/35 bg-[#c5b358]/10 px-3 py-2 text-sm font-semibold text-[#f2e7a5] shadow-[0_0_32px_rgba(197,179,88,0.08)]">
              <BadgeCheck size={16} />
              Trusted by document-heavy teams and researchers
            </div>
            <h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-normal text-white sm:text-6xl lg:text-6xl">
              Turn 100-page documents into 1-minute insights
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-200 sm:text-xl">
              Use AI to instantly summarize reports, PDFs, assignments, contracts, research papers, and lengthy files into clear, actionable summaries.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <CtaButton />
              <a href="#how-it-works" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/15 px-5 text-sm font-semibold text-white transition hover:border-[#c5b358]/70 hover:bg-white/5">
                <Play size={16} fill="currentColor" />
                See How It Works
              </a>
            </div>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
              {heroBenefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-3 text-sm font-medium text-zinc-200">
                  <span className="grid size-6 place-items-center rounded-md bg-[#c5b358]/15 text-[#c5b358]">
                    <Check size={15} />
                  </span>
                  {benefit}
                </div>
              ))}
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-5 text-sm text-zinc-300">
              <span className="flex items-center gap-2"><UsersRound size={17} className="text-[#c5b358]" /> 12,000+ active readers</span>
              <span className="flex items-center gap-2"><Clock3 size={17} className="text-[#c5b358]" /> summaries in seconds</span>
            </div>
          </div>

          <div className="hidden lg:block">
            <ProductMockup />
          </div>
        </div>
      </section>

      <section aria-label="Trust indicators" className="border-b border-white/10 bg-[#232326]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 py-6 sm:px-6 md:grid-cols-5 lg:px-8">
          {trustItems.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-zinc-200">
              <Icon size={18} className="text-[#c5b358]" />
              {label}
            </div>
          ))}
        </div>
      </section>

      <SummarizerSection />

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c5b358]">The Problem</p>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-5xl">Reading long documents wastes valuable time</h2>
            <p className="mt-5 text-lg leading-8 text-zinc-300">
              When every PDF demands full attention, research slows down, decisions wait, and important details get buried under too much text.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {painPoints.map((point) => (
              <div key={point} className="rounded-lg border border-white/10 bg-white/[0.04] p-5 transition hover:-translate-y-1 hover:border-[#c5b358]/45">
                <CircleDollarSign className="text-[#c5b358]" size={24} />
                <p className="mt-4 text-base leading-7 text-zinc-200">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#202024] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionIntro eyebrow="The Solution" title="AI that reads everything for you" copy="JustFlamsit turns dense source files into structured summaries, key insights, and next steps so you can understand faster and act sooner." />
          <div className="mt-12 grid gap-4 md:grid-cols-4">
            {["Long Document", "AI Analysis", "Smart Summary", "Actionable Insights"].map((step, index) => (
              <div key={step} className="relative rounded-lg border border-white/10 bg-[#28282b] p-6 text-center">
                <div className="mx-auto grid size-12 place-items-center rounded-lg bg-[#c5b358] text-lg font-bold text-[#28282b]">{index + 1}</div>
                <h3 className="mt-5 text-xl font-semibold text-white">{step}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">Clean, guided transformation from file overload to decision-ready clarity.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionIntro eyebrow="Features" title="Everything you need to summarize serious documents" copy="Built for students, professionals, researchers, and teams that need trustworthy summaries without a slow manual review cycle." />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {features.map(({ title, copy, icon: Icon }) => (
              <article key={title} className="rounded-lg border border-white/10 bg-white/[0.04] p-5 transition hover:-translate-y-1 hover:border-[#c5b358]/45 hover:bg-white/[0.06]">
                <Icon size={24} className="text-[#c5b358]" />
                <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-white/10 bg-[#202024] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionIntro eyebrow="How It Works" title="From upload to insight in three steps" copy="The workflow is simple enough for first-time users and structured enough for document-heavy teams." />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              ["Upload Document", "Drop in a PDF, report, assignment, contract, or research paper."],
              ["AI Processes Content", "JustFlamsit identifies structure, meaning, key points, and useful context."],
              ["Receive Instant Summary", "Get a clear summary with insights, highlights, and next steps."],
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

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c5b358]">Benefits</p>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-5xl">Spend less time reading and more time deciding</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-zinc-200">
                <Check size={18} className="mt-1 shrink-0 text-[#c5b358]" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="use-cases" className="border-y border-white/10 bg-[#202024] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionIntro eyebrow="Use Cases" title="Made for anyone drowning in long files" copy="Every workflow is written around a real outcome: faster comprehension, better context, and fewer missed details." />
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {useCases.map(({ title, copy, icon: Icon }) => (
              <article key={title} className="rounded-lg border border-white/10 bg-[#28282b] p-6">
                <Icon size={28} className="text-[#c5b358]" />
                <h3 className="mt-5 text-2xl font-semibold text-white">{title}</h3>
                <p className="mt-3 leading-7 text-zinc-300">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-2xl font-semibold leading-9 text-white sm:text-3xl">
            JustFlamsit is currently in early access.
          </p>
          <p className="mt-4 text-lg leading-8 text-zinc-300">
            We&apos;re actively improving AI summaries based on user feedback.
          </p>
        </div>
      </section>

      <section id="faq" className="border-y border-white/10 bg-[#202024] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <SectionIntro eyebrow="FAQ" title="Questions before your first summary" copy="Clear answers for visitors who need speed, trust, and practical document support before they start." />
          <div className="mt-10 space-y-3">
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

      <section id="final-cta" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-[#c5b358]/30 bg-[linear-gradient(135deg,rgba(197,179,88,0.18),rgba(255,255,255,0.04))] p-8 text-center shadow-2xl shadow-black/25 sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f2e7a5]">Start Free</p>
          <h2 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">Stop reading hundreds of pages. Start getting answers.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-zinc-200">
            Join professionals, students, and researchers who use AI to summarize documents in seconds.
          </p>
          <div className="mt-8 flex justify-center">
            <CtaButton />
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#202024] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <Logo />
            <p className="mt-4 max-w-md text-sm leading-6 text-zinc-400">
              AI-powered document, file, report, and assignment summarization for people who need concise, actionable insight.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Navigate</h3>
              <div className="mt-3 flex flex-col gap-2 text-sm text-zinc-400">
                {navItems.map((item) => <a key={item.href} href={item.href} className="hover:text-white">{item.label}</a>)}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Company</h3>
              <div className="mt-3 flex flex-col gap-2 text-sm text-zinc-400">
                <a href="mailto:hello@justflamsit.com" className="hover:text-white">Contact</a>
                <a href="#" className="hover:text-white">Privacy Policy</a>
                <a href="#" className="hover:text-white">Terms</a>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Trust</h3>
              <div className="mt-3 flex flex-col gap-2 text-sm text-zinc-400">
                <span>Secure uploads</span>
                <span>Privacy focused</span>
                <span>Enterprise ready</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 pt-6 text-sm text-zinc-500">
          Copyright 2026 JustFlamsit. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
