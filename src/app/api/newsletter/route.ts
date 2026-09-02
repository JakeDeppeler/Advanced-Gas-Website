import { NextResponse } from "next/server";
import { site } from "@/lib/site";

export const runtime = "nodejs";

type Signup = { email: string; hp?: string };

/** Send via the Resend REST endpoint (fetch), the same way the quote form
 *  and the portal sign-in do — so there's no `resend` SDK dependency. */
async function send(opts: { key: string; from: string; to: string[]; replyTo?: string; subject: string; html?: string; text: string }) {
  const body: Record<string, unknown> = { from: opts.from, to: opts.to, subject: opts.subject, text: opts.text };
  if (opts.html) body.html = opts.html;
  if (opts.replyTo) body.reply_to = opts.replyTo;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.error(`Newsletter email failed (${res.status}): ${await res.text().catch(() => "")}`);
  } catch (e) {
    console.error("Newsletter email threw", e);
  }
}

export async function POST(req: Request) {
  const data = (await req.json().catch(() => ({}))) as Signup;

  if (data.hp && data.hp.trim().length > 0) return NextResponse.json({ ok: true }); // honeypot
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return new NextResponse("Invalid email", { status: 400 });
  }

  const recipients = (process.env.LEAD_NOTIFICATION_EMAIL ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "Advanced Gas Website <onboarding@resend.dev>";

  if (apiKey && recipients.length > 0) {
    // 1) Internal notification
    await send({
      key: apiKey,
      from,
      to: recipients,
      subject: "Newsletter signup",
      text: `New newsletter signup: ${data.email}\n\n— Sent from ${site.url}`,
    });

    // 2) Welcome email to the subscriber
    await send({
      key: apiKey,
      from,
      to: [data.email],
      replyTo: recipients[0],
      subject: "You're on the list — Advanced Gas updates",
      html: `
        <div style="font-family:system-ui,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#0b1450;max-width:520px;margin:0 auto;padding:24px;">
          <h1 style="font-size:22px;margin:0 0 16px;">You're in.</h1>
          <p style="margin:0 0 14px;">Thanks for subscribing. We'll send a short email when the Victorian Energy Upgrades (VEU) rebate values change, plus the odd seasonal tip for keeping your gear running.</p>
          <p style="margin:0 0 14px;"><strong>One email a month, max.</strong> Local stuff only. Unsubscribe anytime.</p>
          <p style="margin:0 0 22px;">If you ever need a quote in the meantime, just call <a href="tel:${site.phoneE164}" style="color:#f36722;font-weight:700;text-decoration:none;">${site.phone}</a>.</p>
          <p style="margin:0;color:#5b6680;font-size:13px;">— ${site.name} · Pakenham VIC</p>
        </div>`,
      text: [
        "You're in.",
        "",
        "Thanks for subscribing. We'll send a short email when the Victorian Energy Upgrades (VEU) rebate values change, plus the odd seasonal tip for keeping your gear running.",
        "",
        "One email a month, max. Local stuff only. Unsubscribe anytime.",
        "",
        `If you ever need a quote in the meantime, just call ${site.phone}.`,
        "",
        `— ${site.name} · Pakenham VIC`,
      ].join("\n"),
    });
  } else {
    console.log("NEWSLETTER SIGNUP →", data.email);
  }

  return NextResponse.json({ ok: true });
}
