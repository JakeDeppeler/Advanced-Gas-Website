import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

// Hit GET /api/test-email after deploying to confirm the Resend
// + LEAD_NOTIFICATION_EMAIL config works end to end.
// Returns JSON with status + the Resend message id so you can verify.
export async function GET() {
  const recipients = (process.env.LEAD_NOTIFICATION_EMAIL ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? `Advanced Gas Website <onboarding@resend.dev>`;

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "RESEND_API_KEY not set" }, { status: 500 });
  }
  if (recipients.length === 0) {
    return NextResponse.json(
      { ok: false, error: "LEAD_NOTIFICATION_EMAIL not set" },
      { status: 500 },
    );
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to: recipients,
      subject: "Advanced Gas — test email",
      html: `
        <p>This is a test email from the Advanced Gas website.</p>
        <p>If you're reading this in your inbox, the Resend integration is working:</p>
        <ul>
          <li><strong>Recipients:</strong> ${recipients.join(", ")}</li>
          <li><strong>From:</strong> ${from}</li>
        </ul>
        <p>Quote form submissions and newsletter signups will arrive the same way.</p>
      `,
    });
    if (result.error) {
      return NextResponse.json(
        { ok: false, from, recipients, resendError: result.error },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, from, recipients, id: result.data?.id });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
