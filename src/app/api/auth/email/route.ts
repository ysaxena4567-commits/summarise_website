import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/sign-up", request.url));
}

export async function POST() {
  return NextResponse.json(
    {
      error: "Email authentication and verification are handled by Clerk. Please continue on the Clerk sign-up page to verify your email securely.",
      redirectTo: "/sign-up",
      provider: "clerk",
    },
    { status: 401 },
  );
}
