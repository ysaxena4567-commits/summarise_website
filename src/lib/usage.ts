export const FREE_SUMMARY_LIMIT = 3;
export const PRO_MONTHLY_SUMMARY_LIMIT = 50;
export const USAGE_STORAGE_KEY = "justflamsit-usage";
export const PLAN_STORAGE_KEY = "justflamsit-plan";

export type PlanStatus = "free" | "pro";

export type UsageState = {
  plan: PlanStatus;
  freeUsed: number;
  proUsed: number;
  monthKey: string;
};

type StoredPlan = {
  plan?: PlanStatus;
  orderId?: string;
  paymentId?: string | null;
  activatedAt?: string;
};

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

function writeUsage(usage: UsageState) {
  window.localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(usage));
}

export function storeUsageState(usage: UsageState) {
  if (typeof window === "undefined") return usage;

  writeUsage(usage);
  return usage;
}

export function getUsageState(): UsageState {
  const storedUsage = readJson<Partial<UsageState>>(USAGE_STORAGE_KEY);
  const storedPlan = readJson<StoredPlan>(PLAN_STORAGE_KEY);
  const monthKey = currentMonthKey();
  const plan: PlanStatus = storedPlan?.plan === "pro" ? "pro" : "free";
  const usage: UsageState = {
    plan,
    freeUsed: Math.min(Math.max(Number(storedUsage?.freeUsed ?? 0), 0), FREE_SUMMARY_LIMIT),
    proUsed: Math.max(Number(storedUsage?.proUsed ?? 0), 0),
    monthKey: storedUsage?.monthKey || monthKey,
  };

  if (usage.monthKey !== monthKey) {
    usage.monthKey = monthKey;
    usage.proUsed = 0;
  }

  if (typeof window !== "undefined") {
    writeUsage(usage);
  }

  return usage;
}

export function getRemainingSummaries(usage: UsageState) {
  if (usage.plan === "pro") {
    return Math.max(PRO_MONTHLY_SUMMARY_LIMIT - usage.proUsed, 0);
  }

  return Math.max(FREE_SUMMARY_LIMIT - usage.freeUsed, 0);
}

export function canGenerateSummary(usage: UsageState) {
  return getRemainingSummaries(usage) > 0;
}

export function recordSuccessfulSummary(usage: UsageState) {
  const nextUsage: UsageState = {
    ...usage,
    monthKey: usage.monthKey || currentMonthKey(),
    freeUsed: usage.plan === "free" ? Math.min(usage.freeUsed + 1, FREE_SUMMARY_LIMIT) : usage.freeUsed,
    proUsed: usage.plan === "pro" ? Math.min(usage.proUsed + 1, PRO_MONTHLY_SUMMARY_LIMIT) : usage.proUsed,
  };

  writeUsage(nextUsage);
  return nextUsage;
}

export function activateProPlan(orderId: string, paymentId?: string | null) {
  const plan: StoredPlan = {
    plan: "pro",
    orderId,
    paymentId,
    activatedAt: new Date().toISOString(),
  };
  const usage: UsageState = {
    plan: "pro",
    freeUsed: readJson<Partial<UsageState>>(USAGE_STORAGE_KEY)?.freeUsed ?? 0,
    proUsed: 0,
    monthKey: currentMonthKey(),
  };

  window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plan));
  writeUsage(usage);
  return usage;
}
