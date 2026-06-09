import { NextResponse } from "next/server";
import { accountIdentityFromClerk, requireVerifiedClerkIdentity } from "@/lib/clerkIdentity";
import { recordFeedbackMetadata } from "@/lib/serverUsage";
import { readJsonWithLimit, requireSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

type FeedbackBody = {
  rating?: number;
  message?: string;
  context?: string;
};

export async function POST(request: Request) {
  try {
    const originError = requireSameOrigin(request);
    if (originError) return originError;

    const verified = await requireVerifiedClerkIdentity();

    if (!verified.identity) {
      return NextResponse.json({ error: verified.error }, { status: verified.status });
    }

    const body = await readJsonWithLimit<FeedbackBody>(request, 8_192);
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const context = typeof body.context === "string" ? body.context.trim().slice(0, 80) : undefined;
    const rating = Number.isFinite(Number(body.rating)) ? Number(body.rating) : undefined;

    const saved = await recordFeedbackMetadata(accountIdentityFromClerk(verified.identity), {
      rating,
      messageLength: message.length,
      context,
    });

    return NextResponse.json({
      ok: true,
      account: saved.account,
      databaseBacked: saved.databaseBacked,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save feedback metadata.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
