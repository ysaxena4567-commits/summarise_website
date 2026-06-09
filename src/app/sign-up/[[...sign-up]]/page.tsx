import { SignUp } from "@clerk/nextjs";
import { BookOpenText, FileText, ShieldCheck, Sparkles } from "lucide-react";

const clerkAppearance = {
  variables: {
    colorPrimary: "#c5b358",
    colorBackground: "transparent",
    colorText: "#ffffff",
    colorTextSecondary: "#f2e7a5",
    colorInputBackground: "#fffdf3",
    colorInputText: "#171719",
    colorNeutral: "#f8f7f0",
    borderRadius: "0.5rem",
    fontFamily: "var(--font-finlandica), system-ui, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    card: "w-full bg-transparent shadow-none border-0 p-0",
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    main: "gap-5",
    socialButtonsBlockButton:
      "min-h-12 border border-white/15 bg-white/[0.07] text-white hover:bg-white/[0.12] hover:border-[#c5b358]/60",
    dividerLine: "bg-white/20",
    dividerText: "text-white font-semibold",
    formFieldLabel: "text-white font-semibold",
    formFieldInput:
      "min-h-12 border border-[#c5b358]/55 bg-[#fffdf3] text-[#171719] placeholder:text-zinc-600 shadow-none focus:border-[#c5b358]",
    formButtonPrimary:
      "min-h-12 bg-[#c5b358] text-[#171719] font-bold shadow-[0_16px_40px_rgba(197,179,88,0.22)] hover:bg-[#dbc966]",
    footer: "bg-transparent border-t border-white/10 pt-5",
    footerActionText: "text-white font-semibold",
    footerActionLink: "text-[#f2e7a5] font-bold hover:text-white",
    identityPreviewText: "text-white",
    formResendCodeLink: "text-[#f2e7a5] font-bold hover:text-white",
    otpCodeFieldInput:
      "border border-[#c5b358]/55 bg-[#fffdf3] text-[#171719] shadow-none",
    formFieldErrorText: "text-red-300 font-semibold",
    alertText: "text-red-100 font-semibold",
    alternativeMethodsBlockButton:
      "min-h-12 border border-white/15 bg-white/[0.07] text-white hover:bg-white/[0.12] hover:border-[#c5b358]/60",
  },
};

export default function SignUpPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#28282b] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(197,179,88,0.22),transparent_32%),radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.06),transparent_30%)]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col items-center justify-center gap-7">
        <a href="/" className="flex items-center gap-3" aria-label="JustFlamsit home">
          <span className="grid size-12 place-items-center rounded-lg border border-[#c5b358]/45 bg-[#c5b358] text-[#28282b] shadow-[0_0_40px_rgba(197,179,88,0.34)]">
            <Sparkles size={22} strokeWidth={2.5} />
          </span>
          <span className="text-2xl font-semibold text-white sm:text-3xl">JustFlamsit</span>
        </a>

        <section className="w-full max-w-[31rem] rounded-2xl border border-[#c5b358]/35 bg-[#101012]/92 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.48)] backdrop-blur sm:p-7">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c5b358]">AI document workspace</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">Welcome to JustFlamsit</h1>
            <p className="mx-auto mt-3 max-w-sm text-base font-semibold leading-7 text-[#f2e7a5]">
              Turn long documents into clear insights in minutes.
            </p>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-300">
              Sign in securely to save summaries, track usage, and manage your account.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4 sm:p-5">
            <SignUp
              appearance={clerkAppearance}
              signInUrl="/sign-in"
              fallbackRedirectUrl="/"
              forceRedirectUrl="/"
            />
          </div>

          <div className="mt-5 grid gap-3 text-xs font-semibold leading-5 text-zinc-300 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
              <ShieldCheck size={16} className="text-[#c5b358]" />
              Verified Clerk sessions
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
              <FileText size={16} className="text-[#c5b358]" />
              No document content stored
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 sm:col-span-2">
              <BookOpenText size={16} className="text-[#c5b358]" />
              Built for students, researchers, and document-heavy teams
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
