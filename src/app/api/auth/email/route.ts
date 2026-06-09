import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      error: "Legacy email authentication is disabled. Please use Clerk sign-in so email verification is handled securely.",
      redirectTo: "/sign-in",
    },
    { status: 410 },
  );
}
