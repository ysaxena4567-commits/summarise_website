import { NextResponse } from "next/server";
import { getServerAccount, normalizeEmail, remainingSummaries } from "@/lib/serverUsage";

export const runtime = "nodejs";

type StatusBody = {
  email?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as StatusBody;
    const email = normalizeEmail(body.email);

    if (!email) {
      return NextResponse.json({ error: "Email is required for account usage sync." }, { status: 400 });
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
