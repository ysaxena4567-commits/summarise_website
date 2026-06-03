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
  proExpiresAt?: string;
};

type StoredPlan = {
  plan?: PlanStatus;
  orderId?: string;
  paymentId?: string | null;
  activatedAt?: string;
  proExpiresAt?: string;
};

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function addOneMonth(date: Date) {
  const next = new Date(date);
  const originalDay = next.getDate();

  next.setDate(1);
  next.setMonth(next.getMonth() + 1);

  const lastDayOfTargetMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(originalDay, lastDayOfTargetMonth));

  return next;
}

function isExpired(date?: string) {
  return Boolean(date && Number.isFinite(Date.parse(date)) && Date.parse(date) <= Date.now());
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
  window.localStorage.setItem(
    PLAN_STORAGE_KEY,
    JSON.stringify({
      plan: usage.plan,
      proExpiresAt: usage.proExpiresAt,
      activatedAt: new Date().toISOString(),
    }),
  );
  return usage;
}

export function getUsageState(): UsageState {
  const storedUsage = readJson<Partial<UsageState>>(USAGE_STORAGE_KEY);
  const storedPlan = readJson<StoredPlan>(PLAN_STORAGE_KEY);
  const monthKey = currentMonthKey();
  const fallbackExpiresAt =
    storedPlan?.activatedAt && storedPlan.plan === "pro"
      ? addOneMonth(new Date(storedPlan.activatedAt)).toISOString()
      : undefined;
  const proExpiresAt = storedUsage?.proExpiresAt || storedPlan?.proExpiresAt || fallbackExpiresAt;
  const proExpired =
    (storedPlan?.plan === "pro" || storedUsage?.plan === "pro") && isExpired(proExpiresAt);
  const plan: PlanStatus =
    (storedPlan?.plan === "pro" || storedUsage?.plan === "pro") && !proExpired
      ? "pro"
      : "free";
  const usage: UsageState = {
    plan,
    freeUsed: proExpired
      ? FREE_SUMMARY_LIMIT
      : Math.min(Math.max(Number(storedUsage?.freeUsed ?? 0), 0), FREE_SUMMARY_LIMIT),
    proUsed: plan === "pro" ? Math.max(Number(storedUsage?.proUsed ?? 0), 0) : 0,
    monthKey: storedUsage?.monthKey || monthKey,
    proExpiresAt: plan === "pro" ? proExpiresAt : undefined,
  };

  if (usage.plan === "free" && usage.monthKey !== monthKey) {
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
  const activatedAt = new Date();
  const proExpiresAt = addOneMonth(activatedAt).toISOString();
  const plan: StoredPlan = {
    plan: "pro",
    orderId,
    paymentId,
    activatedAt: activatedAt.toISOString(),
    proExpiresAt,
  };
  const usage: UsageState = {
    plan: "pro",
    freeUsed: readJson<Partial<UsageState>>(USAGE_STORAGE_KEY)?.freeUsed ?? 0,
    proUsed: 0,
    monthKey: currentMonthKey(),
    proExpiresAt,
  };

  window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plan));
  writeUsage(usage);
  return usage;
}
