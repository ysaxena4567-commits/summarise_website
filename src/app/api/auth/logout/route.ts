import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, secureCookieOptions } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, "", { ...secureCookieOptions(0), maxAge: 0 });
  return response;
}
