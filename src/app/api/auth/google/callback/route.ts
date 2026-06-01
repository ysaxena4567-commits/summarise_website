import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  GOOGLE_STATE_COOKIE_NAME,
  createAuthToken,
  secureCookieOptions,
  type ServerAuthUser,
} from "@/lib/auth";

export const runtime = "nodejs";

type GoogleTokenResponse = {
  id_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleTokenInfo = {
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  aud?: string;
  error?: string;
  error_description?: string;
};

function originFromRequest(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";

  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;
  return new URL(request.url).origin;
}

function errorRedirect(request: Request, code: string) {
  return NextResponse.redirect(new URL(`/?auth_error=${code}`, request.url));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${GOOGLE_STATE_COOKIE_NAME}=`))
    ?.slice(GOOGLE_STATE_COOKIE_NAME.length + 1);

  if (!code || !state || !storedState || state !== decodeURIComponent(storedState)) {
    return errorRedirect(request, "google_state_failed");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return errorRedirect(request, "google_not_configured");
  }

  const origin = originFromRequest(request);
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${origin}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;

  if (!tokenResponse.ok || !tokenData.id_token) {
    return errorRedirect(request, "google_token_failed");
  }

  const infoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${tokenData.id_token}`, {
    cache: "no-store",
  });
  const info = (await infoResponse.json()) as GoogleTokenInfo;
  const verified = info.email_verified === true || info.email_verified === "true";

  if (!infoResponse.ok || info.aud !== clientId || !info.email || !verified) {
    return errorRedirect(request, "google_email_failed");
  }

  const user: ServerAuthUser = {
    email: info.email.trim().toLowerCase(),
    provider: "google",
    name: info.name,
    picture: info.picture,
    emailVerified: true,
  };
  const response = NextResponse.redirect(new URL("/#summarizer", request.url));

  response.cookies.set(AUTH_COOKIE_NAME, createAuthToken(user), secureCookieOptions(60 * 60 * 24 * 30));
  response.cookies.set(GOOGLE_STATE_COOKIE_NAME, "", { ...secureCookieOptions(0), maxAge: 0 });

  return response;
}
