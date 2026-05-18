import { NextResponse } from "next/server";
import { Resend } from "resend";
import { site } from "@/lib/site";

export const runtime = "nodejs";

type Photo = { name: string; type: string; base64: string };

type Lead = {
  service: string;
  propertyType: string;
  timing: string;
  suburb: string;
  postcode: string;
  currentSystem?: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  photo?: Photo | null;
  hp: string;
};

// Friendly labels for the canonical service slugs the form submits.
const SERVICE_LABEL: Record<string, string> = {
  "heat-pump-installation": "heat pump hot water",
  "air-conditioning-installation": "split / ducted air conditioning",
  "aircon-servicing-repairs": "aircon service / repair",
  "gas-plumbing": "gas / hot water plumbing",
};

export async function POST(req: Request) {
  const data = (await req.json()) as Lead;

  // Honeypot — silently accept then drop bot submissions.
  if (data.hp && data.hp.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  if (!data.name || !data.phone || !data.service) {
    return new NextResponse("Missing required fields", { status: 400 });
  }

  // LEAD_NOTIFICATION_EMAIL is a comma-separated list — e.g.
  //   "admin@advancedgas.com.au, jake@advancedgas.com.au"
  // Resend accepts up to 50 recipients in a single send.
  const recipients = (process.env.LEAD_NOTIFICATION_EMAIL ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const apiKey = process.env.RESEND_API_KEY;
  // Default to Resend's sandbox sender until the user has verified
  // advancedgas.com.au and switched RESEND_FROM_EMAIL to admin@advancedgas.com.au.
  const from = process.env.RESEND_FROM_EMAIL ?? `Advanced Gas Website <onboarding@resend.dev>`;

  if (apiKey && recipients.length > 0) {
    try {
      const resend = new Resend(apiKey);

      // 1) Internal notification — to Jake / admin / etc.
      await resend.emails.send({
        from,
        to: recipients,
        subject: `New quote request — ${data.service} (${data.suburb || "South-East Vic"})`,
        replyTo: data.email || undefined,
        text: formatInternal(data),
        attachments: data.photo?.base64
          ? [{ filename: data.photo.name || "photo.jpg", content: data.photo.base64 }]
          : undefined,
      });

      // 2) Auto-reply to the customer — only when they supplied an email.
      if (data.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        const firstName = data.name.split(" ")[0] || data.name;
        await resend.emails.send({
          from,
          to: [data.email],
          replyTo: recipients[0],
          subject: `Got it ${firstName} — we'll be in touch soon`,
          html: customerAutoReply(data, firstName),
          text: customerAutoReplyText(data, firstName),
        });
      }
    } catch (e) {
      console.error("Failed to email lead", e);
    }
  } else {
    console.log("NEW LEAD →\n" + formatInternal(data));
    if (data.photo?.base64) {
      console.log(
        `  (photo attached: ${data.photo.name}, ${Math.round(
          data.photo.base64.length / 1024,
        )} KB base64)`,
      );
    }
  }

  return NextResponse.json({ ok: true });
}

function formatInternal(d: Lead) {
  return [
    `Service:   ${d.service}`,
    `Property:  ${d.propertyType}`,
    `Timing:    ${d.timing}`,
    `Suburb:    ${d.suburb} ${d.postcode}`,
    d.currentSystem ? `Current:   ${d.currentSystem}` : null,
    "",
    `Name:      ${d.name}`,
    `Phone:     ${d.phone}`,
    `Email:     ${d.email || "—"}`,
    "",
    `Notes:     ${d.notes || "—"}`,
    "",
    `— Sent from ${site.url}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function serviceLabel(slug: string) {
  return SERVICE_LABEL[slug] ?? slug;
}

function customerAutoReply(d: Lead, firstName: string) {
  const phoneHref = `tel:${site.phoneE164}`;
  return `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#0b1450;max-width:560px;margin:0 auto;padding:24px;">
      <h1 style="font-size:22px;margin:0 0 16px;color:#0b1450;">Thanks ${escapeHtml(firstName)} — we've got your request.</h1>
      <p style="margin:0 0 14px;">A real human from the Advanced Gas team will be in touch within <strong>2 business hours</strong> to confirm your details and book a free site check.</p>
      <p style="margin:0 0 18px;">Here's what you sent us:</p>
      <table style="border-collapse:collapse;width:100%;margin:0 0 22px;">
        <tbody>
          <tr><td style="padding:6px 0;color:#5b6680;width:120px;">Service</td><td style="padding:6px 0;"><strong>${escapeHtml(serviceLabel(d.service))}</strong></td></tr>
          ${d.suburb ? `<tr><td style="padding:6px 0;color:#5b6680;">Suburb</td><td style="padding:6px 0;">${escapeHtml(d.suburb)} ${escapeHtml(d.postcode || "")}</td></tr>` : ""}
          ${d.propertyType ? `<tr><td style="padding:6px 0;color:#5b6680;">Property</td><td style="padding:6px 0;">${escapeHtml(d.propertyType)}</td></tr>` : ""}
          ${d.currentSystem ? `<tr><td style="padding:6px 0;color:#5b6680;">Current</td><td style="padding:6px 0;">${escapeHtml(d.currentSystem)}</td></tr>` : ""}
          ${d.timing ? `<tr><td style="padding:6px 0;color:#5b6680;">Timing</td><td style="padding:6px 0;">${escapeHtml(d.timing)}</td></tr>` : ""}
          ${d.notes ? `<tr><td style="padding:6px 0;color:#5b6680;vertical-align:top;">Notes</td><td style="padding:6px 0;">${escapeHtml(d.notes)}</td></tr>` : ""}
          <tr><td style="padding:6px 0;color:#5b6680;">Phone</td><td style="padding:6px 0;">${escapeHtml(d.phone)}</td></tr>
        </tbody>
      </table>
      <p style="margin:0 0 6px;">Need us sooner? Give us a ring:</p>
      <p style="margin:0 0 22px;"><a href="${phoneHref}" style="color:#f36722;font-weight:700;text-decoration:none;">${site.phone}</a> — Mon–Fri 7 am – 5 pm, Sat 8 am – 2 pm.</p>
      <p style="margin:0;color:#5b6680;font-size:13px;">— Dean, Jake, Jye &amp; Kellie · ${site.name} · Pakenham VIC</p>
    </div>
  `;
}

function customerAutoReplyText(d: Lead, firstName: string) {
  return [
    `Thanks ${firstName} — we've got your request.`,
    "",
    "A real human from the Advanced Gas team will be in touch within 2 business hours to confirm your details and book a free site check.",
    "",
    "Here's what you sent us:",
    `  Service:  ${serviceLabel(d.service)}`,
    d.suburb ? `  Suburb:   ${d.suburb} ${d.postcode || ""}` : "",
    d.propertyType ? `  Property: ${d.propertyType}` : "",
    d.currentSystem ? `  Current:  ${d.currentSystem}` : "",
    d.timing ? `  Timing:   ${d.timing}` : "",
    d.notes ? `  Notes:    ${d.notes}` : "",
    `  Phone:    ${d.phone}`,
    "",
    `Need us sooner? Call ${site.phone} — Mon–Fri 7am–5pm, Sat 8am–2pm.`,
    "",
    `— Dean, Jake, Jye & Kellie · ${site.name} · Pakenham VIC`,
  ]
    .filter(Boolean)
    .join("\n");
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
