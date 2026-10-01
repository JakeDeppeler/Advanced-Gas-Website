import { NextResponse } from "next/server";
import { supabase, supabaseConfigured } from "@/lib/supabase";

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
  pagePath?: string;
  utm?: Record<string, string>;
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

  // Persist first. Email can fail, an inbox can be missed, but a stored lead is
  // still there tomorrow — and it's what every funnel metric on the dashboard is
  // computed from. A storage failure must not cost us the notification, so this
  // never throws.
  await storeLead(data);

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
          from: "Advanced Gas Website <admin@advancedgas.com>",
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

async function storeLead(d: Lead) {
  if (!supabaseConfigured()) {
    console.warn("Supabase not configured — lead not persisted, dashboard will undercount");
    return;
  }

  try {
    const { error } = await supabase().from("portal_leads").insert({
      source: "website",
      service: d.service,
      property_type: d.propertyType || null,
      timing: d.timing || null,
      suburb: d.suburb || null,
      postcode: d.postcode || null,
      name: d.name,
      phone: d.phone,
      email: d.email || null,
      notes: d.notes || null,
      page_path: d.pagePath || null,
      utm: d.utm ?? {},
    });
    if (error) console.error("Failed to store lead", error.message);
  } catch (e) {
    console.error("Failed to store lead", e);
  }
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
