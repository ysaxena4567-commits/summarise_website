import { del, get, put } from "@vercel/blob";
import { Redis } from "@upstash/redis";
import {
  FREE_SUMMARY_LIMIT,
  PRO_ACCESS_DAYS,
  PRO_MONTHLY_SUMMARY_LIMIT,
  type UsageState,
} from "@/lib/usage";

type AccountRecord = UsageState & {
  email: string;
  updatedAt: string;
  proActivatedAt?: string;
  proExpiresAt?: string;
  lastPaymentOrderId?: string;
  lastPaymentId?: string | null;
};

type ConsumeResult = {
  allowed: boolean;
  account: AccountRecord;
  databaseBacked: boolean;
};

type AccountMutationResult = {
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

function addThirtyDays(date: Date) {
  return new Date(date.getTime() + PRO_ACCESS_DAYS * 24 * 60 * 60 * 1000);
}

function isExpired(date?: string) {
  return Boolean(date && Number.isFinite(Date.parse(date)) && Date.parse(date) <= Date.now());
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

function accountLockKey(email: string) {
  return `justflamsit:account-lock:${email}`;
}

function accountLockBlobPath(email: string) {
  return `accounts/locks/${Buffer.from(email).toString("base64url")}.lock`;
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
  const rawPlan = account?.plan === "pro" ? "pro" : "free";
  const fallbackExpiresAt =
    rawPlan === "pro" && account?.proActivatedAt
      ? addThirtyDays(new Date(account.proActivatedAt)).toISOString()
      : undefined;
  const proExpiresAt = account?.proExpiresAt || fallbackExpiresAt;
  const proExpired = rawPlan === "pro" && isExpired(proExpiresAt);
  const plan: UsageState["plan"] = rawPlan === "pro" && !proExpired ? "pro" : "free";
  const normalized: AccountRecord = {
    ...freshAccount(email),
    ...account,
    email,
    plan,
    freeUsed: proExpired
      ? FREE_SUMMARY_LIMIT
      : Math.min(Math.max(Number(account?.freeUsed ?? 0), 0), FREE_SUMMARY_LIMIT),
    proUsed: plan === "pro" ? Math.max(Number(account?.proUsed ?? 0), 0) : 0,
    monthKey: account?.monthKey || currentMonth,
    proExpiresAt: plan === "pro" ? proExpiresAt : undefined,
    updatedAt: new Date().toISOString(),
  };

  if (normalized.plan === "free" && normalized.monthKey !== currentMonth) {
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

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireAccountLock(email: string, store: Exclude<AccountStore, null>) {
  const lockValue = crypto.randomUUID();
  const lockExpiresAt = Date.now() + 15_000;
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    try {
      if (store.kind === "redis") {
        const acquired = await store.client.set(accountLockKey(email), lockValue, {
          nx: true,
          ex: 15,
        });

        if (acquired) {
          return { kind: "redis" as const, key: accountLockKey(email), value: lockValue, client: store.client };
        }
      } else {
        const path = accountLockBlobPath(email);
        await put(path, JSON.stringify({ value: lockValue, expiresAt: lockExpiresAt }), {
          access: "private",
          addRandomSuffix: false,
          allowOverwrite: false,
          contentType: "application/json",
        });
        return { kind: "blob" as const, path, value: lockValue };
      }
    } catch {
      // Another request owns the lock. Retry briefly so concurrent payments/summaries serialize per account.
      if (store.kind === "blob") {
        try {
          const path = accountLockBlobPath(email);
          const blob = await get(path, { access: "private", useCache: false });
          const text = blob?.statusCode === 200 ? await new Response(blob.stream).text() : "";
          const lock = JSON.parse(text) as { expiresAt?: number };

          if (Number(lock.expiresAt ?? 0) <= Date.now()) {
            await del(path);
          }
        } catch {
          // Keep retrying; the active request may still finish and release the lock.
        }
      }
    }

    await wait(125 + Math.floor(Math.random() * 125));
  }

  throw new Error("Your account is already processing another request. Please try again in a few seconds.");
}

async function releaseAccountLock(lock: Awaited<ReturnType<typeof acquireAccountLock>>) {
  try {
    if (lock.kind === "redis") {
      const currentValue = await lock.client.get<string>(lock.key);
      if (currentValue === lock.value) {
        await lock.client.del(lock.key);
      }
      return;
    }

    const blob = await get(lock.path, { access: "private", useCache: false });
    const text = blob?.statusCode === 200 ? await new Response(blob.stream).text() : "";
    const currentLock = JSON.parse(text) as { value?: string };

    if (currentLock.value === lock.value) {
      await del(lock.path);
    }
  } catch {
    // Lock expiry/cleanup is best-effort; Redis locks expire automatically and Blob locks are retried around.
  }
}

async function withAccountLock<T>(email: string, task: () => Promise<T>) {
  const store = getAccountStore();

  if (!store) return task();

  const lock = await acquireAccountLock(email, store);

  try {
    return await task();
  } finally {
    await releaseAccountLock(lock);
  }
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

  return withAccountLock(normalizedEmail, async () => {
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
  });
}

export async function refundServerSummary(email: string): Promise<AccountMutationResult> {
  const normalizedEmail = normalizeEmail(email);
  const store = getAccountStore();

  if (!normalizedEmail || !store) {
    return { account: freshAccount(normalizedEmail), databaseBacked: false };
  }

  return withAccountLock(normalizedEmail, async () => {
    const stored = await readAccount(normalizedEmail);
    const account = normalizeAccount(normalizedEmail, stored);
    const nextAccount: AccountRecord = {
      ...account,
      freeUsed: account.plan === "free" ? Math.max(account.freeUsed - 1, 0) : account.freeUsed,
      proUsed: account.plan === "pro" ? Math.max(account.proUsed - 1, 0) : account.proUsed,
      updatedAt: new Date().toISOString(),
    };

    await writeAccount(nextAccount);
    return { account: nextAccount, databaseBacked: true };
  });
}

export async function activateServerPro(email: string, orderId: string, paymentId?: string | null) {
  const normalizedEmail = normalizeEmail(email);
  const store = getAccountStore();

  if (!normalizedEmail || !store) {
    return { account: freshAccount(normalizedEmail), databaseBacked: false };
  }

  return withAccountLock(normalizedEmail, async () => {
    const stored = await readAccount(normalizedEmail);
    const account = normalizeAccount(normalizedEmail, stored);
    const activatedAt = new Date();

    if (account.plan === "pro" && account.lastPaymentOrderId === orderId) {
      return { account, databaseBacked: true };
    }

    const nextAccount: AccountRecord = {
      ...account,
      plan: "pro",
      proUsed: 0,
      monthKey: monthKey(),
      proActivatedAt: activatedAt.toISOString(),
      proExpiresAt: addThirtyDays(activatedAt).toISOString(),
      lastPaymentOrderId: orderId,
      lastPaymentId: paymentId,
      updatedAt: new Date().toISOString(),
    };

    await writeAccount(nextAccount);
    return { account: nextAccount, databaseBacked: true };
  });
}
