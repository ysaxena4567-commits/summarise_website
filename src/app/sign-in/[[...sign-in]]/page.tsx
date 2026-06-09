import { SignIn } from "@clerk/nextjs";
import { Sparkles } from "lucide-react";

const clerkAppearance = {
  variables: {
    colorPrimary: "#c5b358",
    colorBackground: "#18181b",
    colorText: "#f8f7f0",
    colorTextSecondary: "#d8d2b8",
    colorInputBackground: "#f8f7f0",
    colorInputText: "#28282b",
    colorNeutral: "#f8f7f0",
    borderRadius: "0.5rem",
    fontFamily: "var(--font-finlandica), system-ui, sans-serif",
  },
  elements: {
    rootBox: "w-full max-w-md",
    card: "border border-white/10 bg-[#18181b] shadow-2xl shadow-black/45",
    headerTitle: "text-[#f8f7f0]",
    headerSubtitle: "text-[#d8d2b8]",
    socialButtonsBlockButton: "border-white/15 bg-white/[0.05] text-[#f8f7f0] hover:bg-white/[0.09]",
    dividerLine: "bg-white/15",
    dividerText: "text-[#d8d2b8]",
    formFieldLabel: "text-[#f8f7f0]",
    formFieldInput: "border-white/10 bg-[#f8f7f0] text-[#28282b] placeholder:text-zinc-500 focus:border-[#c5b358]",
    formButtonPrimary: "bg-[#c5b358] text-[#28282b] hover:bg-[#dbc966]",
    footer: "bg-[#101012] border-t border-white/10",
    footerActionText: "text-[#d8d2b8]",
    footerActionLink: "text-[#f2e7a5] hover:text-white",
    identityPreviewText: "text-[#f8f7f0]",
    formResendCodeLink: "text-[#f2e7a5] hover:text-white",
    otpCodeFieldInput: "border-white/15 bg-[#f8f7f0] text-[#28282b]",
    formFieldErrorText: "text-red-300",
    alertText: "text-[#f8f7f0]",
    alternativeMethodsBlockButton: "border-white/15 bg-white/[0.05] text-[#f8f7f0] hover:bg-white/[0.09]",
  },
};

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-[#28282b] px-4 py-10 text-white sm:py-14">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col items-center justify-center gap-8">
        <a href="/" className="flex items-center gap-3" aria-label="JustFlamsit home">
          <span className="grid size-11 place-items-center rounded-lg border border-[#c5b358]/40 bg-[#c5b358] text-[#28282b] shadow-[0_0_32px_rgba(197,179,88,0.28)]">
            <Sparkles size={21} strokeWidth={2.4} />
          </span>
          <span className="text-2xl font-semibold text-white">JustFlamsit</span>
        </a>

        <div className="w-full max-w-md rounded-2xl border border-[#c5b358]/25 bg-[#101012]/70 p-3 shadow-2xl shadow-black/35">
          <SignIn
            appearance={clerkAppearance}
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/"
            forceRedirectUrl="/"
          />
        </div>
      </div>
    </main>
  );
}
