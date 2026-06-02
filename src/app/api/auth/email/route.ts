import { NextResponse } from "next/server";
import { getSiteUrl, sendMagicLinkEmail } from "@/lib/brevo";
import { createMagicToken, magicLinkExpiresMinutes, storeMagicLink } from "@/lib/magicLinks";
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

    const token = createMagicToken();
    await storeMagicLink(email, token);
    await getServerAccount(email);

    const magicLink = `${getSiteUrl()}/api/auth/magic/verify?token=${encodeURIComponent(token)}`;
    const delivery = await sendMagicLinkEmail(email, magicLink);

    console.info("JustFlamsit magic link accepted by Brevo", {
      messageId: delivery.messageId || "unknown",
      emailDomain: email.split("@")[1] || "unknown",
    });

    return NextResponse.json({
      ok: true,
      email,
      expiresInMinutes: magicLinkExpiresMinutes(),
      message: "Check your email for a secure JustFlamsit sign-in link.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send the magic link right now.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
