import { NextResponse } from "next/server";
import {
  CASHFREE_PLAN,
  getCashfreeBaseUrl,
  getCashfreeEnv,
  getCashfreeHeaders,
} from "@/lib/cashfree";
import { getAuthUserFromRequest } from "@/lib/auth";
import { normalizeEmail } from "@/lib/serverUsage";
import { clientIp, rateLimit, readJsonWithLimit, requireSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

type CreateOrderBody = {
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
};

type CashfreeOrderResponse = {
  order_id?: string;
  payment_session_id?: string;
  order_status?: string;
  message?: string;
};

function cleanPhone(phone?: string) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return digits.length >= 10 ? digits.slice(-10) : "9999999999";
}

function cleanCustomerId(email?: string) {
  const base = email?.split("@")[0]?.replace(/[^a-zA-Z0-9_-]/g, "") || "guest";
  return `${base}_${Date.now()}`.slice(0, 45);
}

function getOrigin(request: Request) {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  if (configuredSiteUrl) {
    return configuredSiteUrl;
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  try {
    const originError = requireSameOrigin(request);
    if (originError) return originError;

    const verifiedUser = getAuthUserFromRequest(request);
    const customerEmail = normalizeEmail(verifiedUser?.email);
    const rateLimitError = rateLimit({
      key: `payment-create:${customerEmail || clientIp(request)}`,
      limit: 6,
      windowMs: 10 * 60 * 1000,
    });
    if (rateLimitError) return rateLimitError;

    const body = await readJsonWithLimit<CreateOrderBody>(request, 4_096);

    if (!customerEmail) {
      return NextResponse.json(
        { error: "Please sign in before starting Cashfree checkout." },
        { status: 401 },
      );
    }

    const orderId = `JFS_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
    const origin = getOrigin(request);

    const response = await fetch(`${getCashfreeBaseUrl()}/orders`, {
      method: "POST",
      headers: getCashfreeHeaders(),
      body: JSON.stringify({
        order_id: orderId,
        order_amount: CASHFREE_PLAN.amount,
        order_currency: CASHFREE_PLAN.currency,
        order_note: CASHFREE_PLAN.name,
        customer_details: {
          customer_id: cleanCustomerId(customerEmail),
          customer_name: body.customerName?.trim() || "JustFlamsit User",
          customer_email: customerEmail,
          customer_phone: cleanPhone(body.customerPhone),
        },
        order_meta: {
          return_url: `${origin}/payment/success?order_id=${orderId}`,
        },
        order_tags: {
          plan_id: CASHFREE_PLAN.id,
          product: "JustFlamsit",
        },
      }),
    });

    const data = (await response.json()) as CashfreeOrderResponse;

    if (!response.ok || !data.payment_session_id || !data.order_id) {
      return NextResponse.json(
        {
          error:
            data.message ||
            "Cashfree could not create a payment order. Check Cashfree credentials and environment settings, then try again.",
        },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json({
      orderId: data.order_id,
      paymentSessionId: data.payment_session_id,
      plan: CASHFREE_PLAN,
      mode: getCashfreeEnv(),
      status: data.order_status ?? "ACTIVE",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create Cashfree order.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
