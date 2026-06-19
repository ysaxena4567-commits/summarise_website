export const USAGE_STORAGE_KEY = "justflamsit-usage";

export type UsageState = {
  freeUsed: number;
  monthKey: string;
  summaryCount?: number;
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

function normalizeUsage(usage?: Partial<UsageState> | null): UsageState {
  const summaryCount = Math.max(Number(usage?.summaryCount ?? usage?.freeUsed ?? 0), 0);

  return {
    freeUsed: summaryCount,
    summaryCount,
    monthKey: usage?.monthKey || currentMonthKey(),
  };
}

function writeUsage(usage: UsageState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(normalizeUsage(usage)));
}

export function storeUsageState(usage: UsageState) {
  const normalized = normalizeUsage(usage);
  writeUsage(normalized);
  return normalized;
}

export function getUsageState(): UsageState {
  const storedUsage = readJson<Partial<UsageState>>(USAGE_STORAGE_KEY);
  const usage = normalizeUsage(storedUsage);
  writeUsage(usage);
  return usage;
}

export function recordSuccessfulSummary(usage: UsageState) {
  const current = normalizeUsage(usage);
  const nextUsage: UsageState = {
    ...current,
    freeUsed: current.freeUsed + 1,
    summaryCount: (current.summaryCount ?? current.freeUsed) + 1,
    monthKey: current.monthKey || currentMonthKey(),
  };

  writeUsage(nextUsage);
  return nextUsage;
}
