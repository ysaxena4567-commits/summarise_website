import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { GOOGLE_STATE_COOKIE_NAME, secureCookieOptions } from "@/lib/auth";

export const runtime = "nodejs";

function originFromRequest(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";

  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(new URL("/?auth_error=google_not_configured", request.url));
  }

  const origin = originFromRequest(request);
  const state = crypto.randomBytes(24).toString("base64url");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  response.cookies.set(GOOGLE_STATE_COOKIE_NAME, state, secureCookieOptions(10 * 60));

  return response;
}
