import { NextResponse } from "next/server";
import { Resend } from "resend";
import { site } from "@/lib/site";

export const runtime = "nodejs";

type Signup = { email: string; hp?: string };

export async function POST(req: Request) {
  const data = (await req.json()) as Signup;

  if (data.hp && data.hp.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return new NextResponse("Invalid email", { status: 400 });
  }

  const recipients = (process.env.LEAD_NOTIFICATION_EMAIL ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? `Advanced Gas Website <onboarding@resend.dev>`;

  if (apiKey && recipients.length > 0) {
    try {
      const resend = new Resend(apiKey);

      // 1) Internal notification
      await resend.emails.send({
        from,
        to: recipients,
        subject: "Newsletter signup",
        text: `New newsletter signup: ${data.email}\n\n— Sent from ${site.url}`,
      });

      // 2) Welcome email back to the subscriber
      await resend.emails.send({
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
          </div>
        `,
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
    } catch (e) {
      console.error("Failed to email newsletter signup", e);
    }
  } else {
    console.log("NEWSLETTER SIGNUP →", data.email);
  }

  return NextResponse.json({ ok: true });
}
