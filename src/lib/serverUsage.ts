import { get, put } from "@vercel/blob";
import { Redis } from "@upstash/redis";
import {
  FREE_SUMMARY_LIMIT,
  PRO_MONTHLY_SUMMARY_LIMIT,
  type UsageState,
} from "@/lib/usage";

type AccountRecord = UsageState & {
  email: string;
  updatedAt: string;
  proActivatedAt?: string;
  lastPaymentOrderId?: string;
  lastPaymentId?: string | null;
};

type ConsumeResult = {
  allowed: boolean;
  account: AccountRecord;
  databaseBacked: boolean;
};

type AccountStore =
  | { kind: "redis"; client: Redis }
  | { kind: "blob" }
  | null;

let accountStore: AccountStore | undefined;

function monthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || "";
}

function accountKey(email: string) {
  return `justflamsit:account:${email}`;
}

function accountBlobPath(email: string) {
  return `accounts/${Buffer.from(email).toString("base64url")}.json`;
}

function legacyAccountBlobPaths(email: string) {
  const encoded = encodeURIComponent(email);
  return [`accounts/${encoded}.json`, `accounts/${encodeURIComponent(encoded)}.json`];
}

function getAccountStore(): AccountStore {
  if (accountStore !== undefined) return accountStore;

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url && token) {
    accountStore = { kind: "redis", client: new Redis({ url, token }) };
    return accountStore;
  }

  if (process.env.BLOB_READ_WRITE_TOKEN || (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID)) {
    accountStore = { kind: "blob" };
    return accountStore;
  }

  accountStore = null;
  return accountStore;
}

export function isDatabaseConfigured() {
  return Boolean(getAccountStore());
}

function freshAccount(email: string): AccountRecord {
  return {
    email,
    plan: "free",
    freeUsed: 0,
    proUsed: 0,
    monthKey: monthKey(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeAccount(email: string, account?: Partial<AccountRecord> | null): AccountRecord {
  const currentMonth = monthKey();
  const normalized: AccountRecord = {
    ...freshAccount(email),
    ...account,
    email,
    plan: account?.plan === "pro" ? "pro" : "free",
    freeUsed: Math.min(Math.max(Number(account?.freeUsed ?? 0), 0), FREE_SUMMARY_LIMIT),
    proUsed: Math.max(Number(account?.proUsed ?? 0), 0),
    monthKey: account?.monthKey || currentMonth,
    updatedAt: new Date().toISOString(),
  };

  if (normalized.monthKey !== currentMonth) {
    normalized.monthKey = currentMonth;
    normalized.proUsed = 0;
  }

  return normalized;
}

export function remainingSummaries(account: UsageState) {
  if (account.plan === "pro") {
    return Math.max(PRO_MONTHLY_SUMMARY_LIMIT - account.proUsed, 0);
  }

  return Math.max(FREE_SUMMARY_LIMIT - account.freeUsed, 0);
}

async function readAccount(email: string) {
  const store = getAccountStore();

  if (!store) return null;

  if (store.kind === "redis") {
    return store.client.get<AccountRecord>(accountKey(email));
  }

  const paths = [accountBlobPath(email), ...legacyAccountBlobPaths(email)];

  for (const path of paths) {
    try {
      const blob = await get(path, { access: "private", useCache: false });
      if (!blob || blob.statusCode !== 200) continue;

      const text = await new Response(blob.stream).text();
      return JSON.parse(text) as AccountRecord;
    } catch {
      continue;
    }
  }

  return null;
}

async function writeAccount(account: AccountRecord) {
  const store = getAccountStore();

  if (!store) return;

  if (store.kind === "redis") {
    await store.client.set(accountKey(account.email), account);
    return;
  }

  await put(accountBlobPath(account.email), JSON.stringify(account), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function getServerAccount(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const store = getAccountStore();

  if (!normalizedEmail || !store) {
    return { account: freshAccount(normalizedEmail), databaseBacked: false };
  }

  const stored = await readAccount(normalizedEmail);
  const account = normalizeAccount(normalizedEmail, stored);
  await writeAccount(account);

  return { account, databaseBacked: true };
}

export async function consumeServerSummary(email: string): Promise<ConsumeResult> {
  const normalizedEmail = normalizeEmail(email);
  const store = getAccountStore();

  if (!normalizedEmail || !store) {
    return { allowed: true, account: freshAccount(normalizedEmail), databaseBacked: false };
  }

  const stored = await readAccount(normalizedEmail);
  const account = normalizeAccount(normalizedEmail, stored);

  if (remainingSummaries(account) <= 0) {
    await writeAccount(account);
    return { allowed: false, account, databaseBacked: true };
  }

  const nextAccount: AccountRecord = {
    ...account,
    freeUsed: account.plan === "free" ? Math.min(account.freeUsed + 1, FREE_SUMMARY_LIMIT) : account.freeUsed,
    proUsed: account.plan === "pro" ? Math.min(account.proUsed + 1, PRO_MONTHLY_SUMMARY_LIMIT) : account.proUsed,
    updatedAt: new Date().toISOString(),
  };

  await writeAccount(nextAccount);
  return { allowed: true, account: nextAccount, databaseBacked: true };
}

export async function activateServerPro(email: string, orderId: string, paymentId?: string | null) {
  const normalizedEmail = normalizeEmail(email);
  const store = getAccountStore();

  if (!normalizedEmail || !store) {
    return { account: freshAccount(normalizedEmail), databaseBacked: false };
  }

  const stored = await readAccount(normalizedEmail);
  const account = normalizeAccount(normalizedEmail, stored);

  if (account.plan === "pro" && account.lastPaymentOrderId === orderId) {
    return { account, databaseBacked: true };
  }

  const nextAccount: AccountRecord = {
    ...account,
    plan: "pro",
    proUsed: 0,
    monthKey: monthKey(),
    proActivatedAt: new Date().toISOString(),
    lastPaymentOrderId: orderId,
    lastPaymentId: paymentId,
    updatedAt: new Date().toISOString(),
  };

  await writeAccount(nextAccount);
  return { account: nextAccount, databaseBacked: true };
}
