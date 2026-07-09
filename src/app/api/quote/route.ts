import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Photo = { name: string; type: string; data: string };

type Details = {
  hpBrand?: string[]; hpStyle?: string[]; hpSize?: string[]; hpMaterial?: string[]; hpWifi?: string;
  splitBrand?: string[]; splitStyle?: string[]; splitHeadConfig?: Record<string, number>; splitSize?: string[];
  ductedSize?: string[]; ductedZones?: string[]; ductedTablet?: string;
  svcType?: string[]; svcStories?: string;
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
  photo?: Photo | null; // legacy single-photo
  hp?: string;
  propertyType?: string; timing?: string; suburb?: string;
};

const NAVY = "#0b1450";
const ORANGE = "#f36722";
const INK = "#1a1a1d";
const INK_2 = "#4a4a52";
const INK_3 = "#7a7a82";
const LINE = "#ebe6d8";
const BG = "#faf8f3";

/* ------------ human-readable labels for the option ids ------------ */

const LABELS: Record<string, Record<string, string>> = {
  hpBrand: { reclaim: "Reclaim", thermann: "Thermann", istore: "iStore" },
  hpStyle: { aio: "All-in-one", split: "Split system" },
  hpSize: { small: "180 – 200 L", large: "275 – 300 L", xl: "315 – 400 L" },
  hpMaterial: { stainless: "Stainless steel", glass: "Glass lined" },
  hpWifi: { yes: "Yes", no: "No" },
  splitBrand: { mitsu: "Mitsubishi Electric", kaden: "Kaden", rinnai: "Rinnai" },
  splitStyle: { single: "Single head", multi: "Multi-head" },
  splitSize: {
    "2.5": "2.5 kW", "3.5": "3.5 kW", "5.0": "5.0 kW", "7.1": "7.1 kW", "9.0": "9.0 kW",
    unsure: "Not sure, floor plan",
  },
  ductedSize: { "10": "10 kW", "14": "14 kW", "18": "18 kW", "20": "20 kW", unsure: "Not sure" },
  ductedZones: { "2": "2 zones", "3": "3 zones", "4": "4 zones", "5": "5 zones", "6": "6 zones", "8": "8 zones", "10": "10 zones", "12": "12 zones" },
  ductedTablet: { yes: "Yes, Milieu Lab tablet", no: "No, standard controller" },
  svcType: {
    "gas-heater": "Gas heater", "hot-water": "Hot water", "split": "Split system",
    "ducted-air": "Ducted aircon", "evap": "Evaporative cooler",
  },
  svcStories: { single: "Single storey", double: "Double storey" },
};

function label(field: string, id: string) {
  return LABELS[field]?.[id] ?? id;
}
function labels(field: string, ids?: string[] | string) {
  if (!ids) return "";
  if (typeof ids === "string") return label(field, ids);
  return ids.map((id) => label(field, id)).join(", ");
}

/* ------------ POST handler ------------ */

export async function POST(req: Request) {
  const data = (await req.json()) as Lead;

  if (data.hp && data.hp.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  if (!data.name || !data.phone || !data.service) {
    return new NextResponse("Missing required fields", { status: 400 });
  }

  // Recipients, support comma-separated list, fall back to Jake so leads
  // aren't lost if LEAD_NOTIFICATION_EMAIL isn't set on Vercel.
  const envRecipients = (process.env.LEAD_NOTIFICATION_EMAIL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const to = envRecipients.length ? envRecipients : ["jake@advancedgas.com.au"];
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Advanced Gas Website <onboarding@resend.dev>";
  const replyTo = data.email || undefined;

  // Merge new + legacy photo shape into a single array.
  const allPhotos: Photo[] = [
    ...(Array.isArray(data.photos) ? data.photos : []),
    ...(data.photo ? [data.photo] : []),
  ];
  const attachments = allPhotos
    .filter((p): p is Photo => !!p?.data)
    .map((p, i) => ({ filename: p.name || `photo-${i + 1}.jpg`, content: p.data }));

  const summaryLine = friendlySummary(data);

  if (!key) {
    console.warn("RESEND_API_KEY missing, logging lead only.");
    console.log("NEW LEAD →\n" + fallbackText(data, summaryLine, allPhotos.length));
    return NextResponse.json({ ok: true });
  }

  // 1) Internal notification email to the team.
  const internalHtml = renderInternalEmail(data, summaryLine, allPhotos.length);
  const internalText = fallbackText(data, summaryLine, allPhotos.length);

  await sendResend({
    key,
    from,
    to,
    replyTo,
    subject: `New quote, ${data.name} · ${data.postcode || data.suburb || "SE Vic"} · ${headline(data)}`,
    html: internalHtml,
    text: internalText,
    attachments,
  });

  // 2) Customer confirmation email (only if we got a valid-looking email).
  if (data.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    const custHtml = renderCustomerEmail(data, summaryLine);
    const custText = fallbackCustomerText(data, summaryLine);
    await sendResend({
      key,
      from,
      to: [data.email],
      replyTo: to[0],
      subject: `Thanks ${data.name.split(" ")[0]}, we've got your quote request, Advanced Gas & Aircon`,
      html: custHtml,
      text: custText,
    });
  }

  return NextResponse.json({ ok: true });
}

/* ------------ Resend helper ------------ */

async function sendResend(opts: {
  key: string; from: string; to: string[]; replyTo?: string;
  subject: string; html: string; text: string;
  attachments?: Array<{ filename: string; content: string }>;
}) {
  const body: Record<string, unknown> = {
    from: opts.from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  };
  if (opts.replyTo) body.reply_to = opts.replyTo;
  if (opts.attachments?.length) body.attachments = opts.attachments;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`Resend send failed (${res.status}) to ${opts.to.join(", ")}: ${errText}`);
    }
  } catch (e) {
    console.error("Resend threw", e);
  }
}

/* ------------ Summaries ------------ */

function headline(d: Lead): string {
  if (d.service === "hp") return "Heat pump hot water";
  if (d.service === "split") return "Split system";
  if (d.service === "ducted") return "Ducted aircon";
  if (d.service === "service") return "Service / repair";
  return d.service;
}

function friendlySummary(d: Lead): string {
  const det = d.details || {};
  if (d.service === "hp") {
    const brand = labels("hpBrand", det.hpBrand) || "(any)";
    const style = labels("hpStyle", det.hpStyle) || "(any)";
    const size = labels("hpSize", det.hpSize) || "(any)";
    const material = labels("hpMaterial", det.hpMaterial);
    const wifi = det.hpWifi ? `WiFi: ${label("hpWifi", det.hpWifi)}` : "";
    return [
      `Brand: ${brand}`,
      `Style: ${style}`,
      `Size: ${size}`,
      material && `Material: ${material}`,
      wifi,
    ].filter(Boolean).join(" · ");
  }
  if (d.service === "split") {
    const brand = labels("splitBrand", det.splitBrand) || "(any)";
    const style = labels("splitStyle", det.splitStyle) || "(any)";
    const parts: string[] = [`Brand: ${brand}`, `Style: ${style}`];
    if (det.splitHeadConfig && Object.keys(det.splitHeadConfig).length > 0) {
      const layout = Object.entries(det.splitHeadConfig)
        .map(([size, count]) => `${count} × ${size} kW`).join(" + ");
      const total = Object.entries(det.splitHeadConfig)
        .reduce((sum, [size, count]) => sum + parseFloat(size) * count, 0);
      parts.push(`Multi-head: ${layout} (${total.toFixed(1)} kW total)`);
    }
    if (det.splitSize?.length) parts.push(`Single-head sizes: ${labels("splitSize", det.splitSize)}`);
    return parts.join(" · ");
  }
  if (d.service === "ducted") {
    return [
      `Size: ${labels("ductedSize", det.ductedSize) || "(any)"}`,
      `Zones: ${labels("ductedZones", det.ductedZones) || "(any)"}`,
      `Milieu tablet: ${det.ductedTablet ? label("ductedTablet", det.ductedTablet) : "(unknown)"}`,
    ].join(" · ");
  }
  if (d.service === "service") {
    return [
      `Appliance: ${labels("svcType", det.svcType) || "(unspecified)"}`,
      `Storeys: ${det.svcStories ? label("svcStories", det.svcStories) : "(unknown)"}`,
    ].join(" · ");
  }
  return d.summary || "";
}

function fallbackText(d: Lead, summary: string, photoCount: number) {
  return [
    `NEW QUOTE REQUEST`,
    ``,
    `Service:   ${headline(d)}`,
    `Summary:   ${summary}`,
    ``,
    `Name:      ${d.name}`,
    `Phone:     ${d.phone}`,
    `Email:     ${d.email || ","}`,
    `Postcode:  ${d.postcode || d.suburb || ","}`,
    d.address ? `Address:   ${d.address}` : null,
    ``,
    `Notes:     ${d.notes || ","}`,
    photoCount ? `Photos:    ${photoCount} attached` : null,
  ].filter(Boolean).join("\n");
}

function fallbackCustomerText(d: Lead, summary: string) {
  return [
    `Hi ${d.name.split(" ")[0]},`,
    ``,
    `Thanks for the quote request, we've got everything and one of the team will be back to you within 12 business hours.`,
    ``,
    `What you asked for:`,
    `  Service:   ${headline(d)}`,
    `  ${summary}`,
    ``,
    `What happens next:`,
    `  1. We'll price it and email a fixed quote back within 12 hrs.`,
    `  2. For bigger jobs (ducted, tricky retrofits) we'll pop out for a site check.`,
    `  3. Any questions before you commit? Just reply to this email.`,
    ``,
    `If it's urgent, call (03) 5947 8000, you'll speak to a real tradie.`,
    ``,
    `Cheers,`,
    `The Advanced Gas & Aircon team`,
    `Pakenham VIC · advancedgas.com.au`,
  ].join("\n");
}

/* ------------ HTML templates ------------ */

function shell(title: string, body: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px -12px rgba(11,20,80,0.15);">
            ${body}
          </table>
          <div style="padding:20px 24px 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:${INK_3};">
            Advanced Gas &amp; Airconditioning Services Pty Ltd · 1 Sierra Circuit, Pakenham VIC · advancedgas.com.au
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderInternalEmail(d: Lead, summary: string, photoCount: number): string {
  const det = d.details || {};
  const rows: Array<[string, string]> = [];

  if (d.service === "hp") {
    rows.push(["Brand(s)",   labels("hpBrand", det.hpBrand) || "(any)"]);
    rows.push(["Style",      labels("hpStyle", det.hpStyle) || "(any)"]);
    rows.push(["Size range", labels("hpSize", det.hpSize) || "(any)"]);
    if (det.hpMaterial?.length) rows.push(["Material", labels("hpMaterial", det.hpMaterial)]);
    if (det.hpWifi)             rows.push(["Wi-Fi",    label("hpWifi", det.hpWifi)]);
  } else if (d.service === "split") {
    rows.push(["Brand(s)", labels("splitBrand", det.splitBrand) || "(any)"]);
    rows.push(["Style",    labels("splitStyle", det.splitStyle) || "(any)"]);
    if (det.splitHeadConfig && Object.keys(det.splitHeadConfig).length) {
      const layout = Object.entries(det.splitHeadConfig)
        .map(([size, count]) => `${count} × ${size} kW`).join(" + ");
      const total = Object.entries(det.splitHeadConfig)
        .reduce((sum, [size, count]) => sum + parseFloat(size) * count, 0);
      rows.push(["Multi-head", `${layout} (${total.toFixed(1)} kW total)`]);
    }
    if (det.splitSize?.length) rows.push(["Single-head sizes", labels("splitSize", det.splitSize)]);
  } else if (d.service === "ducted") {
    rows.push(["Size",          labels("ductedSize", det.ductedSize) || "(any)"]);
    rows.push(["Zones",         labels("ductedZones", det.ductedZones) || "(any)"]);
    rows.push(["Milieu tablet", det.ductedTablet ? label("ductedTablet", det.ductedTablet) : "(unknown)"]);
  } else if (d.service === "service") {
    rows.push(["Appliance", labels("svcType", det.svcType) || "(unspecified)"]);
    rows.push(["Storeys",   det.svcStories ? label("svcStories", det.svcStories) : "(unknown)"]);
  }

  const rowsHtml = rows.map(([k, v]) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid ${LINE};color:${INK_3};font-size:12px;text-transform:uppercase;letter-spacing:0.06em;width:35%;vertical-align:top;">${escapeHtml(k)}</td>
      <td style="padding:8px 0;border-bottom:1px solid ${LINE};color:${INK};font-size:14.5px;font-weight:600;">${escapeHtml(v)}</td>
    </tr>`).join("");

  const body = `
    <tr>
      <td style="background:${NAVY};padding:24px 32px;color:#ffffff;">
        <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.55);font-family:'Courier New',monospace;">New quote request</div>
        <div style="font-size:22px;font-weight:800;margin-top:6px;">${escapeHtml(headline(d))}</div>
        <div style="font-size:14px;color:rgba(255,255,255,0.75);margin-top:4px;">${escapeHtml(summary)}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px 8px;">
        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${INK_3};margin-bottom:10px;">Customer</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14.5px;">
          <tr>
            <td style="padding:6px 0;color:${INK_3};width:35%;text-transform:uppercase;font-size:12px;letter-spacing:0.06em;">Name</td>
            <td style="padding:6px 0;color:${INK};font-weight:600;">${escapeHtml(d.name)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:${INK_3};text-transform:uppercase;font-size:12px;letter-spacing:0.06em;">Phone</td>
            <td style="padding:6px 0;color:${INK};font-weight:600;"><a href="tel:${escapeHtml(d.phone.replace(/\s/g, ""))}" style="color:${NAVY};text-decoration:none;">${escapeHtml(d.phone)}</a></td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:${INK_3};text-transform:uppercase;font-size:12px;letter-spacing:0.06em;">Email</td>
            <td style="padding:6px 0;color:${INK};font-weight:600;"><a href="mailto:${escapeHtml(d.email)}" style="color:${NAVY};text-decoration:none;">${escapeHtml(d.email || ",")}</a></td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:${INK_3};text-transform:uppercase;font-size:12px;letter-spacing:0.06em;">Postcode</td>
            <td style="padding:6px 0;color:${INK};font-weight:600;">${escapeHtml(d.postcode || d.suburb || ",")}</td>
          </tr>
          ${d.address ? `
          <tr>
            <td style="padding:6px 0;color:${INK_3};text-transform:uppercase;font-size:12px;letter-spacing:0.06em;">Address</td>
            <td style="padding:6px 0;color:${INK};font-weight:600;">${escapeHtml(d.address)}</td>
          </tr>` : ""}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 32px;">
        <div style="height:1px;background:${LINE};margin:8px 0 20px;"></div>
        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${INK_3};margin-bottom:10px;">What they want</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
      </td>
    </tr>
    ${d.notes ? `
    <tr>
      <td style="padding:16px 32px 8px;">
        <div style="height:1px;background:${LINE};margin:8px 0 20px;"></div>
        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${INK_3};margin-bottom:8px;">Notes</div>
        <div style="font-size:14.5px;color:${INK_2};line-height:1.55;background:${BG};padding:14px 16px;border-radius:8px;">${escapeHtml(d.notes)}</div>
      </td>
    </tr>` : ""}
    ${photoCount ? `
    <tr>
      <td style="padding:16px 32px 8px;">
        <div style="height:1px;background:${LINE};margin:8px 0 20px;"></div>
        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${INK_3};margin-bottom:8px;">Photos</div>
        <div style="font-size:14px;color:${INK_2};">${photoCount} photo${photoCount === 1 ? "" : "s"} attached to this email.</div>
      </td>
    </tr>` : ""}
    <tr>
      <td style="padding:24px 32px 28px;">
        <div style="height:1px;background:${LINE};margin:8px 0 20px;"></div>
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="border-radius:10px;background:${ORANGE};">
              <a href="mailto:${escapeHtml(d.email)}?subject=${encodeURIComponent(`Your Advanced Gas quote, ${headline(d)}`)}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;">Reply to ${escapeHtml(d.name.split(" ")[0])} →</a>
            </td>
            <td style="width:12px;"></td>
            <td style="border-radius:10px;background:${NAVY};">
              <a href="tel:${escapeHtml(d.phone.replace(/\s/g, ""))}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;">Call ${escapeHtml(d.phone)}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  return shell("New quote request", body);
}

function renderCustomerEmail(d: Lead, summary: string): string {
  const first = d.name.split(" ")[0];
  const body = `
    <tr>
      <td style="background:${NAVY};padding:32px 32px 26px;color:#ffffff;">
        <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.55);font-family:'Courier New',monospace;">Advanced Gas &amp; Aircon</div>
        <div style="font-size:26px;font-weight:800;margin-top:8px;line-height:1.15;">Thanks ${escapeHtml(first)}, we've got your quote request.</div>
        <div style="font-size:15px;color:rgba(255,255,255,0.80);margin-top:12px;line-height:1.55;">One of the team will be back to you within <strong style="color:#ffffff;">12 business hours</strong> with a fixed-price quote. If it's urgent, ring us on <a href="tel:+61359478000" style="color:${ORANGE};text-decoration:none;font-weight:700;">(03) 5947 8000</a>.</div>
      </td>
    </tr>
    <tr>
      <td style="padding:26px 32px 6px;">
        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${INK_3};margin-bottom:12px;">What you asked for</div>
        <div style="background:${BG};border-radius:10px;padding:16px 18px;">
          <div style="font-size:16px;font-weight:800;color:${NAVY};margin-bottom:6px;">${escapeHtml(headline(d))}</div>
          <div style="font-size:14px;color:${INK_2};line-height:1.55;">${escapeHtml(summary)}</div>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 32px 6px;">
        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${INK_3};margin-bottom:12px;">What happens next</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${[
            ["01", "Quote back in 12 hrs", "Fixed price emailed to you, VEU rebate already applied."],
            ["02", "Site visit if needed", "For bigger jobs we'll pop out for a proper look before we quote."],
            ["03", "Install &amp; walkthrough", "Clean install, old unit gone, we show you how the new one runs."],
          ].map(([n, t, d]) => `
          <tr>
            <td style="padding:10px 0;vertical-align:top;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:44px;vertical-align:top;">
                    <span style="display:inline-block;font-family:'Courier New',monospace;font-size:12px;font-weight:700;color:${ORANGE};letter-spacing:0.06em;">${n}</span>
                  </td>
                  <td>
                    <div style="font-size:15px;font-weight:800;color:${NAVY};line-height:1.2;">${t}</div>
                    <div style="font-size:13.5px;color:${INK_2};margin-top:3px;line-height:1.55;">${d}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`).join("")}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:22px 32px 28px;">
        <div style="height:1px;background:${LINE};margin:6px 0 18px;"></div>
        <div style="font-size:14px;color:${INK_2};line-height:1.55;">Not what you asked for? Just reply to this email and we&rsquo;ll sort it before we quote.</div>
        <div style="font-size:14px;color:${INK_2};margin-top:8px;">Cheers,<br /><strong style="color:${NAVY};">The Advanced Gas &amp; Aircon team</strong></div>
      </td>
    </tr>`;
  return shell("Thanks, quote request received", body);
}

/* ------------ util ------------ */

function escapeHtml(s: string): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
