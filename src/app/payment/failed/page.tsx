import { AlertTriangle, ArrowLeft, CreditCard, Mail } from "lucide-react";
import Link from "next/link";

export default function PaymentFailedPage() {
  return (
    <main className="min-h-screen bg-[#28282b] px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-3xl items-center justify-center">
        <section className="w-full rounded-2xl border border-white/10 bg-[#18181b] p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-red-400/12 text-red-200">
              <AlertTriangle size={28} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c5b358]">Cashfree Checkout</p>
              <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Payment failed or was cancelled</h1>
              <p className="mt-4 leading-7 text-zinc-300">
                Your upgrade was not activated because Cashfree did not confirm a successful payment. You can safely try again from the JustFlamsit upgrade section.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
              <CreditCard size={20} className="text-[#c5b358]" />
              <h2 className="mt-3 text-lg font-semibold">Try again</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Use the Buy/Upgrade button again and complete the hosted Cashfree checkout.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
              <Mail size={20} className="text-[#c5b358]" />
              <h2 className="mt-3 text-lg font-semibold">Need help?</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Contact support@justflamsit.com with your order details if money was deducted.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/#upgrade" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#c5b358] px-5 text-sm font-semibold text-[#28282b] transition hover:bg-[#dbc966]">
              <ArrowLeft size={16} />
              Back to upgrade
            </Link>
            <a
              href="mailto:support@justflamsit.com?subject=JustFlamsit%20Payment%20Support&body=Hi%20JustFlamsit%20Support%2C%0A%0AI%20need%20help%20with%20a%20payment.%20My%20order%20details%20are%3A%0A%0A"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/10 px-5 text-sm font-semibold text-white transition hover:border-[#c5b358]/50"
            >
              Contact support
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
