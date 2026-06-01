export const CASHFREE_API_VERSION = "2025-01-01";
export const CASHFREE_PLAN = {
  id: "justflamsit-pro",
  name: "JustFlamsit Pro Early Access",
  amount: 1,
  currency: "INR",
  interval: "One-time secure checkout",
  description: "Unlock premium document summarization access for early users.",
};

type CashfreeEnv = "sandbox" | "production";

export function getCashfreeEnv(): CashfreeEnv {
  return process.env.CASHFREE_ENV?.toLowerCase() === "production" ? "production" : "sandbox";
}

export function getCashfreeBaseUrl() {
  return getCashfreeEnv() === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

export function getCashfreeCredentials() {
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;

  if (!appId || !secretKey) {
    throw new Error("Cashfree credentials are not configured on the server.");
  }

  return { appId, secretKey };
}

export function getCashfreeHeaders() {
  const { appId, secretKey } = getCashfreeCredentials();

  return {
    "Content-Type": "application/json",
    "x-api-version": CASHFREE_API_VERSION,
    "x-client-id": appId,
    "x-client-secret": secretKey,
  };
}
