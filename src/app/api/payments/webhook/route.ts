import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { CASHFREE_PLAN, getCashfreeBaseUrl, getCashfreeHeaders } from "@/lib/cashfree";
import { activateServerPro, normalizeEmail } from "@/lib/serverUsage";

export const runtime = "nodejs";

const MAX_WEBHOOK_BYTES = 64 * 1024;
const WEBHOOK_REPLAY_WINDOW_MS = 5 * 60 * 1000;

type CashfreeWebhookPayload = {
  type?: string;
  event?: string;
  data?: {
    order?: {
      order_id?: string;
      order_amount?: number | string;
      order_currency?: string;
      order_status?: string;
    };
    payment?: {
      cf_payment_id?: string;
      payment_status?: string;
      payment_amount?: number | string;
      payment_currency?: string;
      customer_email?: string;
    };
    customer_details?: {
      customer_email?: string;
    };
  };
  customer_email?: string;
};

type CashfreeOrderLookup = {
  order_status?: string;
  order_amount?: number | string;
  order_currency?: string;
  customer_details?: {
    customer_email?: string;
  };
  message?: string;
};

type CashfreePaymentLookup = {
  cf_payment_id?: string;
  payment_status?: string;
  is_captured?: boolean;
  payment_amount?: number | string;
  payment_currency?: string;
  customer_email?: string;
};

function getWebhookSecret() {
  return process.env.CASHFREE_WEBHOOK_SECRET || process.env.CASHFREE_SECRET_KEY || "";
}

function timingSafeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyCashfreeSignature(rawBody: string, signature: string | null, timestamp: string | null) {
  const secret = getWebhookSecret();
  const timestampMs = timestamp ? Number(timestamp) * 1000 : 0;

  if (!secret || !signature || !timestamp) return false;
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > WEBHOOK_REPLAY_WINDOW_MS) {
    return false;
  }

  const computedSignature = crypto
    .createHmac("sha256", secret)
    .update(timestamp + rawBody)
    .digest("base64");

  return timingSafeEqual(computedSignature, signature);
}

function extractWebhookEmail(payload: CashfreeWebhookPayload) {
  return normalizeEmail(
    payload.data?.customer_details?.customer_email ||
      payload.data?.payment?.customer_email ||
      payload.customer_email,
  );
}

function extractOrderId(payload: CashfreeWebhookPayload) {
  return payload.data?.order?.order_id?.trim() || "";
}

function webhookLooksPaid(payload: CashfreeWebhookPayload) {
  const paymentStatus = payload.data?.payment?.payment_status;
  const orderStatus = payload.data?.order?.order_status;
  const amount = Number(payload.data?.payment?.payment_amount ?? payload.data?.order?.order_amount);
  const currency = payload.data?.payment?.payment_currency || payload.data?.order?.order_currency;

  return (
    paymentStatus === "SUCCESS" &&
    (!orderStatus || orderStatus === "PAID") &&
    amount === CASHFREE_PLAN.amount &&
    currency === CASHFREE_PLAN.currency
  );
}

async function verifyOrderWithCashfree(orderId: string) {
  const orderResponse = await fetch(`${getCashfreeBaseUrl()}/orders/${orderId}`, {
    method: "GET",
    headers: getCashfreeHeaders(),
    cache: "no-store",
  });
  const order = (await orderResponse.json()) as CashfreeOrderLookup;

  if (!orderResponse.ok) {
    throw new Error(order.message || "Cashfree order lookup failed.");
  }

  const paymentsResponse = await fetch(`${getCashfreeBaseUrl()}/orders/${orderId}/payments`, {
    method: "GET",
    headers: getCashfreeHeaders(),
    cache: "no-store",
  });
  const payments = paymentsResponse.ok ? ((await paymentsResponse.json()) as CashfreePaymentLookup[]) : [];
  const paidPayment = payments.find(
    (payment) => payment.payment_status === "SUCCESS" || payment.is_captured === true,
  );
  const orderPaid = order.order_status === "PAID";
  const orderAmountMatches = Number(order.order_amount) === CASHFREE_PLAN.amount;
  const orderCurrencyMatches = order.order_currency === CASHFREE_PLAN.currency;
  const paymentAmountMatches = Number(paidPayment?.payment_amount) === CASHFREE_PLAN.amount;
  const paymentCurrencyMatches = paidPayment?.payment_currency === CASHFREE_PLAN.currency;

  return {
    paid: Boolean(
      orderPaid &&
        paidPayment &&
        orderAmountMatches &&
        orderCurrencyMatches &&
        paymentAmountMatches &&
        paymentCurrencyMatches,
    ),
    email: normalizeEmail(order.customer_details?.customer_email || paidPayment?.customer_email),
    paymentId: paidPayment?.cf_payment_id ?? null,
  };
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "cashfree-webhook" });
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);

    if (contentLength > MAX_WEBHOOK_BYTES) {
      return NextResponse.json({ error: "Webhook payload is too large." }, { status: 413 });
    }

    const rawBody = await request.text();

    if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) {
      return NextResponse.json({ error: "Webhook payload is too large." }, { status: 413 });
    }

    const signature = request.headers.get("x-webhook-signature");
    const timestamp = request.headers.get("x-webhook-timestamp");

    if (!verifyCashfreeSignature(rawBody, signature, timestamp)) {
      return NextResponse.json({ error: "Invalid Cashfree webhook signature." }, { status: 400 });
    }

    const payload = JSON.parse(rawBody) as CashfreeWebhookPayload;
    const orderId = extractOrderId(payload);

    if (!orderId) {
      return NextResponse.json({ ok: true, ignored: "missing_order_id" });
    }

    if (!webhookLooksPaid(payload)) {
      return NextResponse.json({ ok: true, ignored: "not_success_payment" });
    }

    const verified = await verifyOrderWithCashfree(orderId);

    if (!verified.paid) {
      return NextResponse.json({ ok: true, ignored: "cashfree_not_paid" });
    }

    const email = verified.email || extractWebhookEmail(payload);

    if (!email) {
      return NextResponse.json({ ok: true, ignored: "missing_customer_email" });
    }

    const activation = await activateServerPro(email, orderId, verified.paymentId);

    return NextResponse.json({
      ok: true,
      activated: true,
      email,
      orderId,
      databaseBacked: activation.databaseBacked,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cashfree webhook processing failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
