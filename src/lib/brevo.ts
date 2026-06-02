import { magicLinkExpiresMinutes } from "@/lib/magicLinks";

type BrevoEmailResponse = {
  messageId?: string;
  message?: string;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured on the server.`);
  }

  return value;
}

export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    "https://www.justflamsit.com"
  ).replace(/\/$/, "");
}

function buildMagicLinkHtml(magicLink: string) {
  const expiryMinutes = magicLinkExpiresMinutes();

  return `<!doctype html>
<html>
  <body style="margin:0;background:#28282B;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#28282B;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#18181b;border:1px solid rgba(255,255,255,0.10);border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 10px;">
                <div style="display:inline-block;background:#C5B358;color:#28282B;border-radius:10px;padding:10px 12px;font-weight:700;">JustFlamsit</div>
                <h1 style="margin:24px 0 10px;font-size:28px;line-height:1.2;color:#ffffff;">Sign in to JustFlamsit</h1>
                <p style="margin:0;color:#d4d4d8;font-size:15px;line-height:1.7;">Click the secure magic link below to access your account, free summaries, and Pro plan.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px;">
                <a href="${magicLink}" style="display:inline-block;background:#C5B358;color:#28282B;text-decoration:none;font-weight:700;border-radius:10px;padding:14px 20px;">Sign in securely</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;">
                <p style="margin:0 0 12px;color:#a1a1aa;font-size:13px;line-height:1.7;">This link expires in ${expiryMinutes} minutes and can be used once.</p>
                <p style="margin:0;color:#71717a;font-size:12px;line-height:1.7;">If you did not request this email, you can safely ignore it. Your account will not be accessed.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendMagicLinkEmail(email: string, magicLink: string) {
  const apiKey = requiredEnv("BREVO_API_KEY");
  const fromEmail = requiredEnv("BREVO_FROM_EMAIL");
  const fromName = process.env.BREVO_FROM_NAME?.trim() || "JustFlamsit";

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: fromName,
        email: fromEmail,
      },
      to: [{ email }],
      subject: "Your JustFlamsit sign-in link",
      htmlContent: buildMagicLinkHtml(magicLink),
      textContent: `Sign in to JustFlamsit: ${magicLink}\n\nThis link expires in ${magicLinkExpiresMinutes()} minutes and can be used once.`,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as BrevoEmailResponse;

  if (!response.ok) {
    if (data.message?.toLowerCase().includes("unrecognised ip address")) {
      throw new Error("Email delivery is blocked by Brevo security settings. Please contact support.");
    }

    throw new Error(data.message || "Brevo could not send the magic link email.");
  }

  return data;
}
