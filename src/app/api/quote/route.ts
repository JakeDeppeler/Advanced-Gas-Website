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
  name: string;
  phone: string;
  email: string;
  notes: string;
  photo?: Photo | null;
  hp: string;
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
      await resend.emails.send({
        from,
        to: recipients,
        subject: `New quote request — ${data.service} (${data.suburb || "South-East Vic"})`,
        replyTo: data.email || undefined,
        text: format(data),
        attachments: data.photo?.base64
          ? [{ filename: data.photo.name || "photo.jpg", content: data.photo.base64 }]
          : undefined,
      });
    } catch (e) {
      console.error("Failed to email lead", e);
    }
  } else {
    console.log("NEW LEAD →\n" + format(data));
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

function format(d: Lead) {
  return [
    `Service:   ${d.service}`,
    `Property:  ${d.propertyType}`,
    `Timing:    ${d.timing}`,
    `Suburb:    ${d.suburb} ${d.postcode}`,
    "",
    `Name:      ${d.name}`,
    `Phone:     ${d.phone}`,
    `Email:     ${d.email || "—"}`,
    "",
    `Notes:     ${d.notes || "—"}`,
    "",
    `— Sent from ${site.url}`,
  ].join("\n");
}
