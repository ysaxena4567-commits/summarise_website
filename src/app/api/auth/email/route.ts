import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, createAuthToken, secureCookieOptions } from "@/lib/auth";
import { getServerAccount, normalizeEmail } from "@/lib/serverUsage";

export const runtime = "nodejs";

type EmailLoginBody = {
  email?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as EmailLoginBody;
    const email = normalizeEmail(body.email);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    await getServerAccount(email);

    const response = NextResponse.json({
      user: {
        email,
        provider: "email",
        emailVerified: true,
      },
    });

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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not sign in right now.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
