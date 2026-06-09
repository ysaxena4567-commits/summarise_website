import { NextResponse } from "next/server";
import { getClerkIdentity } from "@/lib/clerkIdentity";

export const runtime = "nodejs";

export async function GET() {
  const identity = await getClerkIdentity();

  return NextResponse.json({
    user: identity
      ? {
          userId: identity.userId,
          email: identity.email,
          provider: "clerk",
          name: identity.name,
          emailVerified: identity.emailVerified,
        }
      : null,
  });
}
