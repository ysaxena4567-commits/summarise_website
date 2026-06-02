import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { getServerAccount, normalizeEmail, remainingSummaries } from "@/lib/serverUsage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const verifiedUser = getAuthUserFromRequest(request);
    const email = normalizeEmail(verifiedUser?.email);

    if (!email) {
      return NextResponse.json({ error: "Please sign in to sync account usage." }, { status: 401 });
    }

    const { account, databaseBacked } = await getServerAccount(email);

    return NextResponse.json({
      account,
      remaining: remainingSummaries(account),
      databaseBacked,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load account usage.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
