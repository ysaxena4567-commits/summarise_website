import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, createAuthToken, secureCookieOptions } from "@/lib/auth";
import { getSiteUrl } from "@/lib/brevo";
import { verifyMagicLinkToken } from "@/lib/magicLinks";
import { getServerAccount } from "@/lib/serverUsage";

export const runtime = "nodejs";

function redirectTo(path: string) {
  return NextResponse.redirect(new URL(path, getSiteUrl()));
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const email = token ? await verifyMagicLinkToken(token) : null;

  if (!email) {
    return redirectTo("/?auth_error=magic_link_invalid");
  }

  await getServerAccount(email);

  const response = redirectTo("/?auth=magic#summarizer");
  response.cookies.set(
    AUTH_COOKIE_NAME,
    createAuthToken({
      email,
      provider: "email",
      emailVerified: true,
    }),
    secureCookieOptions(60 * 60 * 24 * 30),
  );

  return response;
}
