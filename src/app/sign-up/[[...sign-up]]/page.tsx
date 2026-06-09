import { SignUp } from "@clerk/nextjs";
import { FileText, ShieldCheck, Sparkles } from "lucide-react";

const isProduction = process.env.NODE_ENV === "production";

const clerkAppearance = {
  variables: {
    colorPrimary: "#c5b358",
    colorBackground: "#101012",
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
    card: "border-0 bg-transparent shadow-none",
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton: "border-white/15 bg-white/[0.07] text-white hover:bg-white/[0.12]",
    dividerLine: "bg-white/20",
    dividerText: "text-[#f8f7f0]",
    formFieldLabel: "text-white",
    formFieldInput: "border-[#c5b358]/45 bg-[#fffdf3] text-[#171719] placeholder:text-zinc-600 focus:border-[#c5b358]",
    formButtonPrimary: "bg-[#c5b358] text-[#171719] hover:bg-[#dbc966]",
    footer: "bg-transparent border-t border-white/10",
    footerActionText: "text-[#f8f7f0]",
    footerActionLink: "text-[#f2e7a5] hover:text-white",
    identityPreviewText: "text-white",
    formResendCodeLink: "text-[#f2e7a5] hover:text-white",
    otpCodeFieldInput: "border-[#c5b358]/45 bg-[#fffdf3] text-[#171719]",
    formFieldErrorText: "text-red-300",
    alertText: "text-white",
    alternativeMethodsBlockButton: "border-white/15 bg-white/[0.07] text-white hover:bg-white/[0.12]",
  },
};

const clerkCss = `
  .cl-rootBox { width: 100% !important; }
  .cl-card { width: 100% !important; background: transparent !important; border: 0 !important; box-shadow: none !important; }
  .cl-header { display: none !important; }
  .cl-main { gap: 1.2rem !important; }
  .cl-headerTitle, .cl-formHeaderTitle { color: #ffffff !important; font-weight: 800 !important; opacity: 1 !important; }
  .cl-headerSubtitle, .cl-formHeaderSubtitle { color: #f2e7a5 !important; opacity: 1 !important; }
  .cl-formFieldLabel, .cl-dividerText, .cl-footerActionText, .cl-identityPreviewText, .cl-userPreviewText, .cl-alternativeMethodsBlockButtonText { color: #ffffff !important; opacity: 1 !important; }
  .cl-footerActionLink, .cl-formResendCodeLink, .cl-internal-ttumny { color: #f2e7a5 !important; opacity: 1 !important; font-weight: 800 !important; }
  .cl-formFieldInput { min-height: 3rem !important; background: #fffdf3 !important; color: #171719 !important; border: 1px solid rgba(197, 179, 88, 0.62) !important; box-shadow: none !important; }
  .cl-formFieldInput::placeholder { color: #52525b !important; opacity: 1 !important; }
  .cl-formButtonPrimary { min-height: 3rem !important; background: #c5b358 !important; color: #171719 !important; font-weight: 850 !important; box-shadow: 0 16px 40px rgba(197, 179, 88, 0.22) !important; }
  .cl-formButtonPrimary:hover { background: #dbc966 !important; }
  .cl-socialButtonsBlockButton, .cl-alternativeMethodsBlockButton { min-height: 3rem !important; background: rgba(255,255,255,0.075) !important; border: 1px solid rgba(255,255,255,0.16) !important; color: #ffffff !important; }
  .cl-socialButtonsBlockButton:hover, .cl-alternativeMethodsBlockButton:hover { background: rgba(255,255,255,0.13) !important; border-color: rgba(197,179,88,0.55) !important; }
  .cl-dividerLine { background: rgba(255,255,255,0.22) !important; }
  .cl-footer { background: transparent !important; border-top: 1px solid rgba(255,255,255,0.1) !important; padding-top: 1.25rem !important; }
  .cl-formFieldErrorText, .cl-alertText { color: #fecaca !important; opacity: 1 !important; }
  .cl-otpCodeFieldInput { background: #fffdf3 !important; color: #171719 !important; border-color: rgba(197, 179, 88, 0.62) !important; }
  ${isProduction ? ".cl-developmentMode, .cl-badge { display: none !important; }" : ".cl-developmentMode, .cl-badge { color: #ff8a3d !important; opacity: 1 !important; font-weight: 800 !important; }"}
`;

export default function SignUpPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#28282b] px-4 py-8 text-white sm:px-6 lg:px-8">
      <style dangerouslySetInnerHTML={{ __html: clerkCss }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(197,179,88,0.2),transparent_32%),radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.06),transparent_30%)]" />
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
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">Welcome back to JustFlamsit</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-6 text-[#f2e7a5] sm:text-base">
              Sign in to continue turning long documents into clear insights.
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
              Secure verified account
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
              <FileText size={16} className="text-[#c5b358]" />
              No document content stored
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
