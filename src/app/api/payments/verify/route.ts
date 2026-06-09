import { NextResponse } from "next/server";
import { accountIdentityFromClerk, type ClerkIdentity, requireVerifiedClerkIdentity } from "@/lib/clerkIdentity";
import { CASHFREE_PLAN, getCashfreeBaseUrl, getCashfreeHeaders } from "@/lib/cashfree";
import { activateServerPro, normalizeEmail } from "@/lib/serverUsage";
import { clientIp, rateLimit, readJsonWithLimit, requireSameOrigin } from "@/lib/security";

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
  customer_details?: {
    customer_email?: string;
  };
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

async function verifyOrder(orderId: string, signedInIdentity: ClerkIdentity) {
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

  const orderAmountMatches = Number(order.order_amount) === CASHFREE_PLAN.amount;
  const orderCurrencyMatches = order.order_currency === CASHFREE_PLAN.currency;
  const paymentAmountMatches = Number(paidPayment?.payment_amount) === CASHFREE_PLAN.amount;
  const paymentCurrencyMatches = paidPayment?.payment_currency === CASHFREE_PLAN.currency;
  const paid =
    order.order_status === "PAID" &&
    Boolean(paidPayment) &&
    orderAmountMatches &&
    orderCurrencyMatches &&
    paymentAmountMatches &&
    paymentCurrencyMatches;
  const customerEmail = normalizeEmail(order.customer_details?.customer_email);

  if (!customerEmail || customerEmail !== signedInIdentity.email) {
    throw new Error("This payment does not match your signed-in account.");
  }

  const activation =
    paid
      ? await activateServerPro(accountIdentityFromClerk(signedInIdentity), orderId, paidPayment?.cf_payment_id)
      : null;

  return {
    paid,
    orderId,
    customerEmail,
    orderStatus: order.order_status ?? "UNKNOWN",
    cfOrderId: order.cf_order_id ?? null,
    paymentId: paidPayment?.cf_payment_id ?? null,
    paymentStatus: paidPayment?.payment_status ?? null,
    paymentTime: paidPayment?.payment_time ?? null,
    account: activation?.account ?? null,
    databaseBacked: activation?.databaseBacked ?? false,
    plan: CASHFREE_PLAN,
  };
}

export async function POST(request: Request) {
  try {
    const originError = requireSameOrigin(request);
    if (originError) return originError;

    const clerk = await requireVerifiedClerkIdentity();
    const signedInEmail = clerk.identity?.email || "";
    const rateLimitError = rateLimit({
      key: `payment-verify:${signedInEmail || clientIp(request)}`,
      limit: 12,
      windowMs: 10 * 60 * 1000,
    });
    if (rateLimitError) return rateLimitError;

    const body = await readJsonWithLimit<VerifyBody>(request, 2_048);
    const orderId = body.orderId?.trim();

    if (!orderId || !isValidOrderId(orderId)) {
      return NextResponse.json({ error: "A valid JustFlamsit order ID is required." }, { status: 400 });
    }

    if (!clerk.identity) {
      return NextResponse.json({ error: clerk.error }, { status: clerk.status });
    }

    const result = await verifyOrder(orderId, clerk.identity);
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
