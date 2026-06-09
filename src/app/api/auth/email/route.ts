import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/sign-in", request.url));
}

export async function POST() {
  return NextResponse.json(
    {
      error: "Email authentication is handled by Clerk. Please continue on the Clerk sign-in page to verify your email securely.",
      redirectTo: "/sign-in",
      provider: "clerk",
    },
    { status: 401 },
  );
}
