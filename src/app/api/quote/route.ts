import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Photo = { name: string; type: string; data: string };

type Details = {
  hpBrand?: string; hpStyle?: string; hpSize?: string; hpMaterial?: string; hpWifi?: string;
  splitBrand?: string; splitStyle?: string; splitHeads?: string; splitSize?: string;
  ductedSize?: string; ductedZones?: string; ductedTablet?: string;
  svcType?: string; svcStories?: string;
};

type Lead = {
  service: string;
  summary?: string;
  details?: Details;
  name: string;
  phone: string;
  email: string;
  postcode?: string;
  address?: string;
  notes?: string;
  photo?: Photo | null;
  hp?: string;
  // legacy fields (older submitters)
  propertyType?: string; timing?: string; suburb?: string;
};

export async function POST(req: Request) {
  const data = (await req.json()) as Lead;

  if (data.hp && data.hp.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  if (!data.name || !data.phone || !data.service) {
    return new NextResponse("Missing required fields", { status: 400 });
  }

  const to = process.env.LEAD_NOTIFICATION_EMAIL;
  const key = process.env.RESEND_API_KEY;

  if (to && key) {
    try {
      const body: Record<string, unknown> = {
        from: "Advanced Gas Website <admin@advancedgas.com>",
        to: [to],
        subject: `New quote — ${data.summary || data.service} (${data.postcode || data.suburb || "SE Vic"})`,
        text: format(data),
      };
      if (data.photo?.data) {
        body.attachments = [
          { filename: data.photo.name || "current-system.jpg", content: data.photo.data },
        ];
      }
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
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
  const details = d.details || {};
  const detailLines = Object.entries(details)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `  ${k.padEnd(14)} ${v}`);

  return [
    `Service:   ${d.service}`,
    d.summary ? `Summary:   ${d.summary}` : null,
    "",
    "Details:",
    ...(detailLines.length ? detailLines : ["  (none)"]),
    "",
    `Name:      ${d.name}`,
    `Phone:     ${d.phone}`,
    `Email:     ${d.email || "—"}`,
    `Postcode:  ${d.postcode || d.suburb || "—"}`,
    d.address ? `Address:   ${d.address}` : null,
    "",
    `Notes:     ${d.notes || "—"}`,
    d.photo ? `Photo:     attached (${d.photo.name})` : null,
  ].filter(Boolean).join("\n");
}
