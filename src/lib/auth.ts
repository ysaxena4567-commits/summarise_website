import crypto from "node:crypto";

export const AUTH_COOKIE_NAME = "justflamsit-auth";
export const GOOGLE_STATE_COOKIE_NAME = "justflamsit-google-state";

export type ServerAuthUser = {
  email: string;
  provider: "email" | "google";
  name?: string;
  picture?: string;
  emailVerified: true;
};

const AUTH_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

function base64Url(input: string) {
  return Buffer.from(input).toString("base64url");
}

function fromBase64Url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function authSecret() {
  return process.env.AUTH_SECRET || "";
}

function sign(value: string) {
  const secret = authSecret();

  if (!secret) {
    throw new Error("AUTH_SECRET is not configured on the server.");
  }

  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createAuthToken(user: ServerAuthUser) {
  const payload = base64Url(
    JSON.stringify({
      ...user,
      iat: Date.now(),
      exp: Date.now() + AUTH_MAX_AGE_MS,
    }),
  );

  return `${payload}.${sign(payload)}`;
}

export function parseAuthToken(token?: string | null): ServerAuthUser | null {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(sign(payload), signature)) return null;

  try {
    const data = JSON.parse(fromBase64Url(payload)) as Partial<ServerAuthUser> & { exp?: number; iat?: number };
    const email = data.email?.trim().toLowerCase();

    if (!email || (data.provider !== "google" && data.provider !== "email") || data.emailVerified !== true) return null;
    if (!data.exp || data.exp <= Date.now()) return null;

    return {
      email,
      provider: data.provider,
      name: data.name,
      picture: data.picture,
      emailVerified: true,
    };
  } catch {
    return null;
  }
}

export function getAuthUserFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`));

  if (!cookie) return null;

  return parseAuthToken(decodeURIComponent(cookie.slice(AUTH_COOKIE_NAME.length + 1)));
}

export function secureCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: true,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
