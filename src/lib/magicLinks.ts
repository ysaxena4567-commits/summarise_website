import crypto from "node:crypto";
import { del, get, put } from "@vercel/blob";
import { Redis } from "@upstash/redis";
import { normalizeEmail } from "@/lib/serverUsage";

const MAGIC_LINK_TTL_SECONDS = 15 * 60;

type MagicLinkRecord = {
  email: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
};

type MagicLinkStore =
  | { kind: "redis"; client: Redis }
  | { kind: "blob" }
  | null;

let magicLinkStore: MagicLinkStore | undefined;

function getMagicLinkStore(): MagicLinkStore {
  if (magicLinkStore !== undefined) return magicLinkStore;

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url && token) {
    magicLinkStore = { kind: "redis", client: new Redis({ url, token }) };
    return magicLinkStore;
  }

  if (process.env.BLOB_READ_WRITE_TOKEN || (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID)) {
    magicLinkStore = { kind: "blob" };
    return magicLinkStore;
  }

  magicLinkStore = null;
  return magicLinkStore;
}

function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("base64url");
}

function magicLinkKey(hash: string) {
  return `justflamsit:magic-link:${hash}`;
}

function magicLinkBlobPath(hash: string) {
  return `magic-links/${hash}.json`;
}

async function writeMagicLink(record: MagicLinkRecord) {
  const store = getMagicLinkStore();

  if (!store) {
    throw new Error("Magic link storage is not configured.");
  }

  if (store.kind === "redis") {
    await store.client.set(magicLinkKey(record.tokenHash), record, { ex: MAGIC_LINK_TTL_SECONDS });
    return;
  }

  await put(magicLinkBlobPath(record.tokenHash), JSON.stringify(record), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

async function readMagicLink(hash: string) {
  const store = getMagicLinkStore();

  if (!store) return null;

  if (store.kind === "redis") {
    return store.client.get<MagicLinkRecord>(magicLinkKey(hash));
  }

  try {
    const blob = await get(magicLinkBlobPath(hash), { access: "private", useCache: false });
    if (!blob || blob.statusCode !== 200) return null;

    const text = await new Response(blob.stream).text();
    return JSON.parse(text) as MagicLinkRecord;
  } catch {
    return null;
  }
}

async function deleteMagicLink(hash: string) {
  const store = getMagicLinkStore();

  if (!store) return;

  if (store.kind === "redis") {
    await store.client.del(magicLinkKey(hash));
    return;
  }

  await del(magicLinkBlobPath(hash));
}

export function createMagicToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export async function storeMagicLink(email: string, token: string) {
  const normalizedEmail = normalizeEmail(email);
  const hash = tokenHash(token);
  const now = Date.now();

  if (!normalizedEmail) {
    throw new Error("A valid email is required.");
  }

  await writeMagicLink({
    email: normalizedEmail,
    tokenHash: hash,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + MAGIC_LINK_TTL_SECONDS * 1000).toISOString(),
  });
}

export async function verifyMagicLinkToken(token: string) {
  const hash = tokenHash(token);
  const record = await readMagicLink(hash);

  if (!record || record.tokenHash !== hash) {
    return null;
  }

  await deleteMagicLink(hash);

  if (new Date(record.expiresAt).getTime() < Date.now()) {
    return null;
  }

  return normalizeEmail(record.email);
}

export function magicLinkExpiresMinutes() {
  return Math.floor(MAGIC_LINK_TTL_SECONDS / 60);
}
