"use client";

import { Check, Loader2, ShieldCheck, XCircle } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PRO_MONTHLY_SUMMARY_LIMIT, activateProPlan } from "@/lib/usage";

type VerifyResponse = {
  paid?: boolean;
  orderId?: string;
  orderStatus?: string;
  paymentId?: string | null;
  paymentStatus?: string | null;
  error?: string;
};

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || "";
  const [status, setStatus] = useState<"loading" | "paid" | "failed">("loading");
  const [details, setDetails] = useState<VerifyResponse>({});

  useEffect(() => {
    async function verifyPayment() {
      if (!orderId) {
        setStatus("failed");
        setDetails({ error: "Missing order ID." });
        return;
      }

      try {
        const response = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const data = (await response.json()) as VerifyResponse;

        setDetails(data);

        if (response.ok && data.paid) {
          window.localStorage.setItem(
            "justflamsit-payment",
            JSON.stringify({
              status: "paid",
              orderId,
              paymentId: data.paymentId,
              verifiedAt: new Date().toISOString(),
            }),
          );
          activateProPlan(orderId, data.paymentId);
          setStatus("paid");
        } else {
          setStatus("failed");
        }
      } catch {
        setStatus("failed");
        setDetails({ error: "Could not verify payment. Please contact support." });
      }
    }

    verifyPayment();
  }, [orderId]);

  const paid = status === "paid";

  return (
    <main className="min-h-screen bg-[#28282b] px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-3xl items-center justify-center">
        <section className="w-full rounded-2xl border border-white/10 bg-[#18181b] p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="flex items-start gap-4">
            <div className={`grid size-14 shrink-0 place-items-center rounded-xl ${paid ? "bg-[#c5b358] text-[#28282b]" : "bg-red-400/12 text-red-200"}`}>
              {status === "loading" ? <Loader2 className="animate-spin" size={26} /> : paid ? <Check size={28} /> : <XCircle size={28} />}
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c5b358]">Cashfree Checkout</p>
              <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
                {status === "loading" ? "Verifying your payment" : paid ? "Payment successful" : "Payment not completed"}
              </h1>
              <p className="mt-4 leading-7 text-zinc-300">
                {status === "loading"
                  ? "Please wait while JustFlamsit confirms your payment securely with Cashfree."
                  : paid
                    ? `Your payment was verified server-side. JustFlamsit Pro is active with ${PRO_MONTHLY_SUMMARY_LIMIT} summaries remaining this month.`
                    : details.error || "Cashfree has not marked this order as paid yet."}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldCheck size={18} className="text-[#c5b358]" />
              Verification details
            </div>
            <dl className="mt-4 grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">Order ID</dt>
                <dd className="mt-1 break-all font-semibold text-white">{orderId || "Not available"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Order status</dt>
                <dd className="mt-1 font-semibold text-white">{details.orderStatus || "Checking"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Payment status</dt>
                <dd className="mt-1 font-semibold text-white">{details.paymentStatus || (paid ? "SUCCESS" : "Not confirmed")}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Payment ID</dt>
                <dd className="mt-1 break-all font-semibold text-white">{details.paymentId || "Not available"}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/#summarizer" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#c5b358] px-5 text-sm font-semibold text-[#28282b] transition hover:bg-[#dbc966]">
              Continue to JustFlamsit
            </Link>
            {!paid && (
              <Link href="/payment/failed" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/10 px-5 text-sm font-semibold text-white transition hover:border-[#c5b358]/50">
                View failed payment help
              </Link>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#28282b] text-white" />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
