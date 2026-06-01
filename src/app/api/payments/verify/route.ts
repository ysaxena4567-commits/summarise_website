import { NextResponse } from "next/server";
import { CASHFREE_PLAN, getCashfreeBaseUrl, getCashfreeHeaders } from "@/lib/cashfree";

export const runtime = "nodejs";

type VerifyBody = {
  orderId?: string;
};

type CashfreeOrder = {
  order_id?: string;
  order_status?: string;
  order_amount?: number;
  order_currency?: string;
  cf_order_id?: string;
  message?: string;
};

type CashfreePayment = {
  cf_payment_id?: string;
  payment_status?: string;
  is_captured?: boolean;
  payment_amount?: number;
  payment_currency?: string;
  payment_time?: string;
};

function isValidOrderId(orderId: string) {
  return /^JFS_[a-zA-Z0-9_]+$/.test(orderId);
}

async function verifyOrder(orderId: string) {
  const orderResponse = await fetch(`${getCashfreeBaseUrl()}/orders/${orderId}`, {
    method: "GET",
    headers: getCashfreeHeaders(),
    cache: "no-store",
  });

  const order = (await orderResponse.json()) as CashfreeOrder;

  if (!orderResponse.ok) {
    throw new Error(order.message || "Cashfree order verification failed.");
  }

  const paymentsResponse = await fetch(`${getCashfreeBaseUrl()}/orders/${orderId}/payments`, {
    method: "GET",
    headers: getCashfreeHeaders(),
    cache: "no-store",
  });

  const payments = paymentsResponse.ok ? ((await paymentsResponse.json()) as CashfreePayment[]) : [];
  const paidPayment = payments.find(
    (payment) => payment.payment_status === "SUCCESS" || payment.is_captured === true,
  );

  const amountMatches = Number(order.order_amount) === CASHFREE_PLAN.amount;
  const currencyMatches = order.order_currency === CASHFREE_PLAN.currency;
  const paid = order.order_status === "PAID" && Boolean(paidPayment) && amountMatches && currencyMatches;

  return {
    paid,
    orderId,
    orderStatus: order.order_status ?? "UNKNOWN",
    cfOrderId: order.cf_order_id ?? null,
    paymentId: paidPayment?.cf_payment_id ?? null,
    paymentStatus: paidPayment?.payment_status ?? null,
    paymentTime: paidPayment?.payment_time ?? null,
    plan: CASHFREE_PLAN,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as VerifyBody;
    const orderId = body.orderId?.trim();

    if (!orderId || !isValidOrderId(orderId)) {
      return NextResponse.json({ error: "A valid JustFlamsit order ID is required." }, { status: 400 });
    }

    const result = await verifyOrder(orderId);
    const response = NextResponse.json(result);

    if (result.paid) {
      response.cookies.set("justflamsit-payment", `paid:${orderId}`, {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to verify Cashfree payment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
