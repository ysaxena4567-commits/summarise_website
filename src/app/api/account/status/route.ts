import { NextResponse } from "next/server";
import { accountIdentityFromClerk, requireVerifiedClerkIdentity } from "@/lib/clerkIdentity";
import { getServerAccount, remainingSummaries } from "@/lib/serverUsage";

export const runtime = "nodejs";

export async function POST() {
  try {
    const verified = await requireVerifiedClerkIdentity();

    if (!verified.identity) {
      return NextResponse.json({ error: verified.error }, { status: verified.status });
    }

    const accountIdentity = accountIdentityFromClerk(verified.identity);
    const { account, databaseBacked } = await getServerAccount(accountIdentity);

    return NextResponse.json({
      account: {
        ...account,
        userId: verified.identity.userId,
        email: verified.identity.email,
        emailVerified: verified.identity.emailVerified,
      },
      identity: {
        userId: verified.identity.userId,
        email: verified.identity.email,
        emailVerified: verified.identity.emailVerified,
      },
      remaining: remainingSummaries(account),
      databaseBacked,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load account usage.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
