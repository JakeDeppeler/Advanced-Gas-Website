import { NextResponse } from "next/server";

export const runtime = "nodejs";

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

  const to = process.env.LEAD_NOTIFICATION_EMAIL;
  const key = process.env.RESEND_API_KEY;

  // If Resend is configured, send the lead by email.
  // Otherwise log to server console — Vercel logs are tail-able and you'll never lose a lead.
  if (to && key) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Advanced Gas Leads <onboarding@resend.dev>",
          to: [to],
          subject: `New quote request — ${data.service} (${data.suburb || "South-East Vic"})`,
          text: format(data),
        }),
      });
    } catch (e) {
      console.error("Failed to email lead", e);
    }
  } else {
    console.log("NEW LEAD →\n" + format(data));
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
  ].join("\n");
}
