import { NextResponse } from "next/server";
import { accountIdentityFromClerk, requireVerifiedClerkIdentity } from "@/lib/clerkIdentity";
import { getServerAccount } from "@/lib/serverUsage";

export const runtime = "nodejs";

export async function POST() {
  try {
    const clerk = await requireVerifiedClerkIdentity();

    if (!clerk.identity) {
      return NextResponse.json({ error: clerk.error }, { status: clerk.status });
    }

    const { account, databaseBacked } = await getServerAccount(accountIdentityFromClerk(clerk.identity));

    return NextResponse.json({
      account,
      databaseBacked,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load account usage.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
