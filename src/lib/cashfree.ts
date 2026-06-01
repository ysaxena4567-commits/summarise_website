export const CASHFREE_API_VERSION = "2025-01-01";
export const CASHFREE_PLAN = {
  id: "justflamsit-pro",
  name: "JustFlamsit Pro Monthly",
  amount: 199,
  currency: "INR",
  interval: "Monthly subscription access",
  description: "Unlock 50 monthly summaries, clean exports, priority processing, and early access.",
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
