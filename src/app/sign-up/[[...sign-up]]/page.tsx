import { SignUp } from "@clerk/nextjs";
import { Sparkles } from "lucide-react";

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
    rootBox: "w-full max-w-md",
    card: "border border-[#c5b358]/40 bg-[#101012] shadow-2xl shadow-black/45",
    headerTitle: "text-white",
    headerSubtitle: "text-[#f2e7a5]",
    socialButtonsBlockButton: "border-white/15 bg-white/[0.07] text-white hover:bg-white/[0.12]",
    dividerLine: "bg-white/20",
    dividerText: "text-[#f8f7f0]",
    formFieldLabel: "text-white",
    formFieldInput: "border-[#c5b358]/40 bg-[#fffdf3] text-[#171719] placeholder:text-zinc-600 focus:border-[#c5b358]",
    formButtonPrimary: "bg-[#c5b358] text-[#171719] hover:bg-[#dbc966]",
    footer: "bg-[#0b0b0d] border-t border-white/10",
    footerActionText: "text-[#f8f7f0]",
    footerActionLink: "text-[#f2e7a5] hover:text-white",
    identityPreviewText: "text-white",
    formResendCodeLink: "text-[#f2e7a5] hover:text-white",
    otpCodeFieldInput: "border-[#c5b358]/40 bg-[#fffdf3] text-[#171719]",
    formFieldErrorText: "text-red-300",
    alertText: "text-white",
    alternativeMethodsBlockButton: "border-white/15 bg-white/[0.07] text-white hover:bg-white/[0.12]",
  },
};

const clerkCss = `
  .cl-rootBox { width: 100% !important; max-width: 28rem !important; }
  .cl-card { background: #101012 !important; border: 1px solid rgba(197, 179, 88, 0.45) !important; box-shadow: 0 28px 80px rgba(0, 0, 0, 0.48) !important; }
  .cl-headerTitle, .cl-formHeaderTitle { color: #ffffff !important; font-weight: 800 !important; opacity: 1 !important; }
  .cl-headerSubtitle, .cl-formHeaderSubtitle { color: #f2e7a5 !important; opacity: 1 !important; }
  .cl-formFieldLabel, .cl-dividerText, .cl-footerActionText, .cl-identityPreviewText, .cl-userPreviewText, .cl-alternativeMethodsBlockButtonText { color: #ffffff !important; opacity: 1 !important; }
  .cl-footerActionLink, .cl-formResendCodeLink, .cl-internal-ttumny { color: #f2e7a5 !important; opacity: 1 !important; font-weight: 800 !important; }
  .cl-formFieldInput { background: #fffdf3 !important; color: #171719 !important; border: 1px solid rgba(197, 179, 88, 0.55) !important; box-shadow: none !important; }
  .cl-formFieldInput::placeholder { color: #52525b !important; opacity: 1 !important; }
  .cl-formButtonPrimary { background: #c5b358 !important; color: #171719 !important; font-weight: 800 !important; box-shadow: none !important; }
  .cl-formButtonPrimary:hover { background: #dbc966 !important; }
  .cl-socialButtonsBlockButton, .cl-alternativeMethodsBlockButton { background: rgba(255,255,255,0.07) !important; border: 1px solid rgba(255,255,255,0.16) !important; color: #ffffff !important; }
  .cl-socialButtonsBlockButton:hover, .cl-alternativeMethodsBlockButton:hover { background: rgba(255,255,255,0.12) !important; }
  .cl-dividerLine { background: rgba(255,255,255,0.2) !important; }
  .cl-footer { background: #0b0b0d !important; border-top: 1px solid rgba(255,255,255,0.1) !important; }
  .cl-badge, .cl-internal-1dauvpw { color: #ff8a3d !important; opacity: 1 !important; font-weight: 800 !important; }
  .cl-formFieldErrorText, .cl-alertText { color: #fecaca !important; opacity: 1 !important; }
  .cl-otpCodeFieldInput { background: #fffdf3 !important; color: #171719 !important; border-color: rgba(197, 179, 88, 0.55) !important; }
`;

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-[#28282b] px-4 py-10 text-white sm:py-14">
      <style dangerouslySetInnerHTML={{ __html: clerkCss }} />
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col items-center justify-center gap-8">
        <a href="/" className="flex items-center gap-3" aria-label="JustFlamsit home">
          <span className="grid size-11 place-items-center rounded-lg border border-[#c5b358]/40 bg-[#c5b358] text-[#28282b] shadow-[0_0_32px_rgba(197,179,88,0.28)]">
            <Sparkles size={21} strokeWidth={2.4} />
          </span>
          <span className="text-2xl font-semibold text-white">JustFlamsit</span>
        </a>

        <section className="w-full max-w-md rounded-2xl border border-[#c5b358]/30 bg-[#101012]/80 p-3 shadow-2xl shadow-black/35">
          <div className="px-3 pb-4 pt-2 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c5b358]">Create Account</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Join JustFlamsit</h1>
            <p className="mt-2 text-sm leading-6 text-[#f2e7a5]">Create your account to save verified summary and usage details.</p>
          </div>
          <SignUp
            appearance={clerkAppearance}
            signInUrl="/sign-in"
            fallbackRedirectUrl="/"
            forceRedirectUrl="/"
          />
        </section>
      </div>
    </main>
  );
}
