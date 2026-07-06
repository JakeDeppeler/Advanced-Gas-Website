import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Photo = { name: string; type: string; data: string };

type Details = {
  hpBrand?: string; hpStyle?: string; hpSize?: string; hpMaterial?: string; hpWifi?: string;
  splitBrand?: string; splitStyle?: string; splitHeadConfig?: Record<string, number> | string; splitSize?: string;
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
  photos?: Photo[];
  photo?: Photo | null; // legacy
  hp?: string;
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

  // Recipients — support comma-separated list.
  const to = (process.env.LEAD_NOTIFICATION_EMAIL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const key = process.env.RESEND_API_KEY;
  // Resend requires a verified sender. Default falls back to Resend's
  // sandbox address which always works — override once your domain is
  // verified by setting RESEND_FROM_EMAIL in Vercel.
  const from = process.env.RESEND_FROM_EMAIL || "Advanced Gas Website <onboarding@resend.dev>";

  // Merge new + legacy photo shape.
  const attachments: Array<{ filename: string; content: string }> = [];
  const allPhotos: Photo[] = [
    ...(Array.isArray(data.photos) ? data.photos : []),
    ...(data.photo ? [data.photo] : []),
  ];
  allPhotos.forEach((p, i) => {
    if (p?.data) {
      attachments.push({
        filename: p.name || `photo-${i + 1}.jpg`,
        content: p.data,
      });
    }
  });

  if (to.length && key) {
    try {
      const body: Record<string, unknown> = {
        from,
        to,
        subject: `New quote — ${data.summary || data.service} (${data.postcode || data.suburb || "SE Vic"})`,
        text: format(data, allPhotos.length),
      };
      if (attachments.length) body.attachments = attachments;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error(`Resend send failed (${res.status}): ${errText}`);
        // Fall through so we don't drop the lead — log it too so it's recoverable.
        console.log("NEW LEAD →\n" + format(data, allPhotos.length));
      }
    } catch (e) {
      console.error("Resend threw", e);
      console.log("NEW LEAD →\n" + format(data, allPhotos.length));
    }
  } else {
    // No Resend configured — log to Vercel logs so leads aren't lost.
    if (!key) console.warn("RESEND_API_KEY missing — logging lead only.");
    if (!to.length) console.warn("LEAD_NOTIFICATION_EMAIL missing — logging lead only.");
    console.log("NEW LEAD →\n" + format(data, allPhotos.length));
  }

  return NextResponse.json({ ok: true });
}

function format(d: Lead, photoCount: number) {
  const details = d.details || {};
  const detailLines = Object.entries(details)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `  ${k.padEnd(14)} ${JSON.stringify(v)}`);

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
    photoCount ? `Photos:    ${photoCount} attached` : null,
  ].filter(Boolean).join("\n");
}
