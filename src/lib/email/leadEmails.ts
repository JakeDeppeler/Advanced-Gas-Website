import { site } from "@/lib/site";

/**
 * The two emails a website enquiry sends: the team's (to LEAD_NOTIFICATION_EMAIL)
 * and the customer's confirmation. Kept apart from the route so they can be
 * rendered and looked at without sending anything.
 *
 * Redone 28 Nov 2026 (Jake: "update the style of the email and how i see
 * it"). The team email leads with who, where and the call button, then what
 * they want quoted, one card per option, then their answers. It says plainly
 * when the lead did not reach the database, because then the email is the
 * only copy. Email clients ignore stylesheets, so every style is inline and
 * the layout is tables.
 */

export type LeadPhoto = { name: string; type: string; data: string };

/** One option from Find your system. */
export type LeadPick = { option: string; brand: string; model: string; size?: string; page?: string };

export type LeadDetails = {
  hpBrand?: string[]; hpStyle?: string[]; hpSize?: string[]; hpMaterial?: string[]; hpWifi?: string;
  splitBrand?: string[]; splitStyle?: string[]; splitHeadConfig?: Record<string, number>; splitSize?: string[];
  ductedSize?: string[]; ductedZones?: string[]; ductedTablet?: string;
  svcType?: string[]; svcStories?: string;
  /** The homepage forms: every question asked, worded as asked, with the answer picked. */
  answers?: Record<string, string>;
  /** Find your system: the options they want quoted. */
  picks?: LeadPick[];
  /** The same, as one line; the only form of it on leads from before picks. */
  pick?: string;
  findPage?: string;
  /** What they picked on the hero form's first steps, e.g. "Cooling · Split system · Service". */
  job?: string;
};

export type Lead = {
  service: string;
  summary?: string;
  details?: LeadDetails;
  name: string;
  phone: string;
  email: string;
  postcode?: string;
  address?: string;
  notes?: string;
  photos?: LeadPhoto[];
  photo?: LeadPhoto | null; // legacy single-photo
  hp?: string;
  /** The page the form was filled in on, and what brought them there. */
  pagePath?: string;
  utm?: Record<string, string>;
  propertyType?: string; timing?: string; suburb?: string;
};

const NAVY = "#050A30";
const ORANGE = "#C2521A";
const INK = "#1A1A1D";
const INK_2 = "#4A4A52";
const INK_3 = "#6B6B73";
const LINE = "#E8E3D6";
const BG = "#F4F1EA";
const SOFT = "#FAF8F3";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'SFMono-Regular',Menlo,Consolas,'Courier New',monospace";

/* ------------ what the lead is ------------ */

export function headline(d: Lead): string {
  const named: Record<string, string> = {
    hp: "Heat pump hot water", split: "Split system", ducted: "Ducted aircon", service: "Service / repair",
    water: "Water filtration", other: "Not sure / something else", "evaporative-cooling": "Evaporative cooling",
    "gas-hot-water": "Gas hot water", "gas-heating": "Gas heating", zoning: "Zoning & controls",
    "gas-plumbing": "Gas & plumbing", commercial: "Commercial",
  };
  return named[d.service] ?? d.service;
}

/* The old quote form's option ids, worded for people. */
const LABELS: Record<string, Record<string, string>> = {
  // "unsure" is the form's "Not sure" answer: the customer wants us to choose.
  hpBrand: { reclaim: "Reclaim", thermann: "Thermann", istore: "iStore", unsure: "Not sure, recommend one" },
  hpStyle: { aio: "All-in-one", split: "Split system" },
  hpSize: { small: "180 – 200 L", large: "275 – 300 L", xl: "315 – 400 L", unsure: "Not sure, size it for them" },
  hpMaterial: { stainless: "Stainless steel", glass: "Glass lined" },
  hpWifi: { yes: "Yes", no: "No" },
  splitBrand: { mitsu: "Mitsubishi Electric", kaden: "Kaden", unsure: "No preference" },
  splitStyle: { single: "Single head", multi: "Multi-head", unsure: "Not sure, design it for them" },
  splitSize: { "2.5": "2.5 kW", "3.5": "3.5 kW", "5.0": "5.0 kW", "7.1": "7.1 kW", "9.0": "9.0 kW", unsure: "Not sure, floor plan" },
  ductedSize: { "10": "10 kW", "14": "14 kW", "18": "18 kW", "20": "20 kW", unsure: "Not sure" },
  ductedZones: { "2": "2 zones", "3": "3 zones", "4": "4 zones", "5": "5 zones", "6": "6 zones", "8": "8 zones", "10": "10 zones", "12": "12 zones" },
  ductedTablet: { yes: "Yes, tablet controller", no: "No, standard controller" },
  svcType: { "gas-heater": "Gas heater", "hot-water": "Hot water", split: "Split system", "ducted-air": "Ducted aircon", evap: "Evaporative cooler" },
  svcStories: { single: "Single storey", double: "Double storey" },
};
const label = (field: string, id: string) => LABELS[field]?.[id] ?? id;
const labels = (field: string, ids?: string[] | string) =>
  !ids ? "" : typeof ids === "string" ? label(field, ids) : ids.map((id) => label(field, id)).join(", ");

/** The old quote form's fields, as question → answer rows. */
function legacyRows(d: Lead): Array<[string, string]> {
  const det = d.details || {};
  const rows: Array<[string, string]> = [];
  if (d.service === "hp") {
    rows.push(["Brand(s)", labels("hpBrand", det.hpBrand) || "Any"]);
    rows.push(["Style", labels("hpStyle", det.hpStyle) || "Any"]);
    rows.push(["Size range", labels("hpSize", det.hpSize) || "Any"]);
    if (det.hpMaterial?.length) rows.push(["Material", labels("hpMaterial", det.hpMaterial)]);
    if (det.hpWifi) rows.push(["Wi-Fi", label("hpWifi", det.hpWifi)]);
  } else if (d.service === "split") {
    rows.push(["Brand(s)", labels("splitBrand", det.splitBrand) || "Any"]);
    rows.push(["Style", labels("splitStyle", det.splitStyle) || "Any"]);
    if (det.splitHeadConfig && Object.keys(det.splitHeadConfig).length) {
      const layout = Object.entries(det.splitHeadConfig).map(([size, n]) => `${n} × ${size} kW`).join(" + ");
      const total = Object.entries(det.splitHeadConfig).reduce((sum, [size, n]) => sum + parseFloat(size) * n, 0);
      rows.push(["Multi-head", `${layout} (${total.toFixed(1)} kW total)`]);
    }
    if (det.splitSize?.length) rows.push(["Single-head sizes", labels("splitSize", det.splitSize)]);
  } else if (d.service === "ducted") {
    rows.push(["Size", labels("ductedSize", det.ductedSize) || "Any"]);
    rows.push(["Zones", labels("ductedZones", det.ductedZones) || "Any"]);
    if (det.ductedTablet) rows.push(["Controller", label("ductedTablet", det.ductedTablet)]);
  } else if (d.service === "service") {
    rows.push(["Appliance", labels("svcType", det.svcType) || "Not said"]);
    if (det.svcStories) rows.push(["Storeys", label("svcStories", det.svcStories)]);
  }
  return rows;
}

/** One line for the header and the portal. The homepage forms write their own. */
export function friendlySummary(d: Lead): string {
  const det = d.details || {};
  if (det.answers || det.picks) return d.summary || det.job || "";
  const rows = legacyRows(d);
  return rows.length ? rows.map(([k, v]) => `${k}: ${v}`).join(" · ") : d.summary || "";
}

/** The rows under "Their answers": what the form asked, or the old form's fields. */
function answerRows(d: Lead): Array<[string, string]> {
  const det = d.details || {};
  return det.answers ? Object.entries(det.answers) : legacyRows(d);
}

/**
 * The box under "What they want", when there are no option cards: the hero
 * form's job line ("Heating · Gas ducted heating · Repair a problem"), or the
 * summary a form without answer rows wrote (commercial, contact). Never a
 * repeat of the rows below it.
 */
function wantLine(d: Lead, summary: string): string {
  const det = d.details || {};
  if (det.job) return det.job;
  if (det.answers || legacyRows(d).length) return "";
  return summary;
}

/** The options to quote: Find your system's cards, or the one-line pick older leads carry. */
function picksOf(d: Lead): LeadPick[] {
  const det = d.details || {};
  if (det.picks?.length) return det.picks;
  if (det.pick) return [{ option: "", brand: "", model: det.pick, page: det.findPage }];
  return [];
}

const isServiceJob = (d: Lead) => d.service === "service" || /\b(service|repair|leak|safety check)\b/i.test(d.details?.job ?? "");
const urgentTiming = (t?: string) => !!t && /(today|urgent|as soon as possible|asap)/i.test(t);
const place = (d: Lead) => d.suburb || d.postcode || "SE Vic";
const pageName = (path: string) => (path === "/" ? "the homepage" : path);
const abs = (path: string) => (/^https?:/.test(path) ? path : `${site.url}${path.startsWith("/") ? "" : "/"}${path}`);

/* ------------ photos, shown in the email ------------ */

export type MailAttachment = { filename: string; content: string; content_id?: string; content_type?: string };

/*
 * "2 photos attached" meant opening each attachment to see the job. An
 * attachment carrying a content id is drawn wherever the HTML names it
 * (src="cid:…"), so the photos sit in the email itself. The form re-encodes
 * every photo as JPEG, but older forms send whatever the phone had; a type mail
 * clients can't draw inline (HEIC, a PDF) still goes, as a plain attachment.
 */
const INLINE_IMAGE = /^image\/(jpeg|png|gif|webp)$/;

export function photoAttachments(
  photos: Array<{ name?: string; type?: string; data?: string } | null | undefined>,
  fileName: (name: string | undefined, i: number) => string = (name, i) => name || `photo-${i + 1}.jpg`,
): { attachments: MailAttachment[]; cids: string[] } {
  const cids: string[] = [];
  const attachments = photos
    .filter((p): p is { name?: string; type?: string; data: string } => !!p?.data)
    .map((p, i) => {
      const filename = fileName(p.name, i);
      if (!INLINE_IMAGE.test(p.type ?? "")) return { filename, content: p.data };
      const cid = `photo-${i + 1}`;
      cids.push(cid);
      return { filename, content: p.data, content_id: cid, content_type: p.type };
    });
  return { attachments, cids };
}

/** The photos two to a row, then a line for any file that can't be shown. */
function photoGrid(cids: string[], total: number): string {
  // Table cells, not floats or flex: Outlook and Gmail both keep a table's columns.
  const cell = (k: number) => {
    const left = k % 2 === 0;
    const img = cids[k]
      ? `<img src="cid:${cids[k]}" width="264" alt="Photo ${k + 1} from the customer" style="display:block;width:100%;max-width:264px;height:auto;border:1px solid ${LINE};border-radius:10px;" />`
      : "";
    return `<td width="50%" style="width:50%;padding:0 ${left ? "6px" : "0"} 12px ${left ? "0" : "6px"};vertical-align:top;">${img}</td>`;
  };
  const rows: string[] = [];
  for (let k = 0; k < cids.length; k += 2) rows.push(`<tr>${cell(k)}${cell(k + 1)}</tr>`);
  const rest = total - cids.length;
  return `${rows.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.join("")}</table>` : ""}${rest > 0
    ? `<div style="font-size:14px;color:${INK_2};">${cids.length ? "Plus " : ""}${rest} ${rest === 1 ? "file" : "files"} attached to this email${cids.length ? " that can't be shown here" : ""}.</div>`
    : ""}`;
}

/* ------------ the team's email ------------ */

export function teamEmail(d: Lead, o: { summary: string; photoCount: number; photoIds?: string[]; stored: boolean }): { subject: string; html: string; text: string } {
  const picks = picksOf(d);
  const rows = answerRows(d);
  const want = wantLine(d, o.summary);
  // A repair's urgency is one of its answers already; don't say it twice.
  const showWhen = !!d.timing && !rows.some(([, v]) => v === d.timing);
  const tel = d.phone.replace(/[^\d+]/g, "");
  const map = d.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.address)}` : "";
  const utm = d.utm && Object.keys(d.utm).length
    ? ["utm_source", "utm_medium", "utm_campaign"].map((k) => d.utm?.[k]).filter(Boolean).join(" / ") || Object.values(d.utm).join(" / ")
    : "";
  const n = picks.length;
  const subject = `New quote: ${d.name} · ${place(d)} · ${headline(d)}${n > 1 ? ` (${n} options)` : ""}`;

  const btn = (href: string, text: string, solid: boolean) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 18px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;${solid ? `background:${ORANGE};color:#ffffff;` : "background:rgba(255,255,255,0.08);color:#ffffff;border:1px solid rgba(255,255,255,0.35);"}">${text}</a>`;

  const html = shell(subject, `
    <tr><td style="background:${NAVY};padding:26px 28px 18px;">
      <div style="font-family:${MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.6);">New quote request · website</div>
      <div style="font-size:26px;line-height:1.2;font-weight:800;color:#ffffff;margin-top:8px;">${esc(d.name)}</div>
      <div style="font-size:15px;color:rgba(255,255,255,0.8);margin-top:4px;">${esc(place(d))} · ${esc(headline(d))}${n > 1 ? ` · ${n} options` : ""}</div>
      ${urgentTiming(d.timing) ? `<div style="display:inline-block;margin-top:12px;padding:5px 10px;border-radius:999px;background:${ORANGE};color:#ffffff;font-size:12.5px;font-weight:700;">${esc(d.timing!)}</div>` : ""}
      <div style="margin-top:18px;">
        ${btn(`tel:${tel}`, `Call ${esc(d.phone)}`, true)}
        ${d.email ? btn(`mailto:${d.email}?subject=${encodeURIComponent(`Your ${site.name} quote`)}`, "Email", false) : ""}
        ${map ? btn(map, "Map", false) : ""}
      </div>
    </td></tr>

    ${n ? section(n > 1 ? `Quote for ${n} options` : "Quote for", picks.map((p) => card(p, true)).join("")) : want ? section("What they want", `
      <div style="background:${SOFT};border:1px solid ${LINE};border-radius:12px;padding:14px 16px;font-size:15px;line-height:1.5;color:${INK};font-weight:600;">${esc(want)}</div>`) : ""}

    ${rows.length ? section("Their answers", table(rows)) : ""}

    ${section("Contact", table([
      ["Name", esc(d.name)],
      ["Phone", `<a href="tel:${esc(tel)}" style="color:${NAVY};font-weight:700;text-decoration:none;">${esc(d.phone)}</a>`],
      ["Email", d.email ? `<a href="mailto:${esc(d.email)}" style="color:${NAVY};text-decoration:none;">${esc(d.email)}</a>` : `<span style="color:${INK_3};font-weight:400;">Not given</span>`],
      ...(d.address ? [["Address", `<a href="${esc(map)}" style="color:${NAVY};text-decoration:none;">${esc(d.address)}</a>`] as [string, string]] : []),
      ...(!d.address && (d.suburb || d.postcode) ? [["Suburb", esc(place(d))] as [string, string]] : []),
      ...(showWhen ? [["When", esc(d.timing!)] as [string, string]] : []),
      ...(d.propertyType ? [["Who", esc(d.propertyType)] as [string, string]] : []),
    ], true))}

    ${d.notes ? section("Notes", `<div style="background:${SOFT};border:1px solid ${LINE};border-radius:12px;padding:14px 16px;font-size:14.5px;line-height:1.55;color:${INK_2};">${esc(d.notes).replace(/\n/g, "<br />")}</div>`) : ""}

    ${o.photoCount ? section(o.photoCount === 1 ? "Their photo" : `Their photos (${o.photoCount})`, photoGrid(o.photoIds ?? [], o.photoCount)) : ""}

    <tr><td style="padding:18px 28px 26px;">
      <div style="border-top:1px solid ${LINE};padding-top:16px;font-size:12.5px;line-height:1.7;color:${INK_3};">
        ${o.stored
          ? `Saved to the portal. <a href="${site.url}/portal/leads" style="color:${NAVY};font-weight:700;">Open Leads →</a><br />`
          : `<span style="color:#B42318;font-weight:700;">Not saved to the portal: the database didn't take it. This email is the only copy.</span><br />`}
        ${d.pagePath ? `Sent from <a href="${esc(abs(d.pagePath))}" style="color:${INK_3};">${esc(pageName(d.pagePath))}</a>` : "Sent from the website"}${utm ? ` · came via ${esc(utm)}` : ""}
      </div>
    </td></tr>`);

  const text = [
    `NEW QUOTE REQUEST`,
    `${d.name} · ${place(d)} · ${headline(d)}`,
    d.timing ? `When: ${d.timing}` : null,
    ``,
    ...(n ? [`QUOTE FOR`, ...picks.map((p) => `- ${[p.option, `${p.brand} ${p.model}`.trim(), p.size].filter(Boolean).join(" · ")}`), ``] : want ? [want, ``] : []),
    ...(rows.length ? [`THEIR ANSWERS`, ...rows.map(([k, v]) => `${k}: ${v}`), ``] : []),
    `CONTACT`,
    `Name: ${d.name}`,
    `Phone: ${d.phone}`,
    `Email: ${d.email || "not given"}`,
    d.address ? `Address: ${d.address}` : `Suburb: ${place(d)}`,
    d.propertyType ? `Who: ${d.propertyType}` : null,
    d.notes ? `\nNOTES\n${d.notes}` : null,
    o.photoCount ? `\n${o.photoCount} photo${o.photoCount === 1 ? "" : "s"} attached.` : null,
    ``,
    o.stored ? `Saved to the portal: ${site.url}/portal/leads` : `NOT saved to the portal. This email is the only copy.`,
    d.pagePath ? `Sent from ${pageName(d.pagePath)}${utm ? ` · came via ${utm}` : ""}` : null,
  ].filter((x) => x != null).join("\n");

  return { subject, html, text };
}

/* ------------ the customer's confirmation ------------ */

export function customerEmail(d: Lead, summary: string): { subject: string; html: string; text: string } {
  const first = d.name.trim().split(" ")[0] || "there";
  const picks = picksOf(d).filter((p) => p.brand);
  const service = isServiceJob(d);
  const subject = `Thanks ${first}, we've got your ${service ? "request" : "quote request"}`;
  // Office hours from the site's own settings, so this can't drift from the contact page.
  const hrs = site.hours[0];
  const when = `within 12 business hours (${hrs.day.replace("-", " to ")}, ${ampm(hrs.open)} to ${ampm(hrs.close)})`;
  const steps: Array<[string, string]> = service
    ? [
        ["We call you", `${cap(when)}, to book a time that suits you.`],
        ["We come out", "A licensed technician from our own crew does the job."],
        ["No surprises", "Anything beyond the job is priced and agreed before we start."],
      ]
    : [
        ["We call you", `${cap(when)}, to talk it through.`],
        ["Free site check", "We look at the home and confirm the size and where everything goes."],
        ["Fixed price in writing", `One price${picks.length > 1 ? " for each option" : ""}, GST included${d.service === "hp" ? ", with the VEU rebate taken off where it's eligible" : ""}.`],
      ];

  const html = shell(subject, `
    <tr><td style="background:${NAVY};padding:30px 28px 26px;">
      <div style="font-family:${MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.6);">${esc(site.name)}</div>
      <div style="font-size:25px;line-height:1.2;font-weight:800;color:#ffffff;margin-top:8px;">Thanks ${esc(first)}, we've got your ${service ? "request" : "quote request"}.</div>
      <div style="font-size:15px;line-height:1.55;color:rgba(255,255,255,0.85);margin-top:10px;">We'll call you ${esc(when)}. Urgent? Ring <a href="tel:${site.phoneE164}" style="color:#FF9A62;font-weight:700;text-decoration:none;">${esc(site.phone)}</a>.</div>
    </td></tr>

    ${section("What you asked for", picks.length
      ? picks.map((p) => card(p, false)).join("")
      : `<div style="background:${SOFT};border:1px solid ${LINE};border-radius:12px;padding:14px 16px;">
          <div style="font-size:16px;font-weight:800;color:${NAVY};">${esc(headline(d))}</div>
          ${summary ? `<div style="font-size:14px;line-height:1.55;color:${INK_2};margin-top:4px;">${esc(summary)}</div>` : ""}
        </div>`)}

    ${section("What happens next", steps.map(([t, s], i) => `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;"><tr>
        <td style="width:34px;vertical-align:top;"><div style="width:24px;height:24px;border-radius:50%;background:${ORANGE};color:#ffffff;font-size:12px;font-weight:800;line-height:24px;text-align:center;">${i + 1}</div></td>
        <td style="vertical-align:top;"><div style="font-size:15px;font-weight:800;color:${NAVY};">${t}</div><div style="font-size:14px;line-height:1.5;color:${INK_2};margin-top:2px;">${esc(s)}</div></td>
      </tr></table>`).join(""))}

    <tr><td style="padding:6px 28px 28px;">
      <div style="border-top:1px solid ${LINE};padding-top:16px;font-size:14px;line-height:1.6;color:${INK_2};">
        Something not right? Reply to this email and we'll sort it out.<br />
        Cheers,<br /><strong style="color:${NAVY};">The ${esc(site.name)} team</strong>
      </div>
    </td></tr>`);

  const text = [
    `Hi ${first},`,
    ``,
    `Thanks, we've got your ${service ? "request" : "quote request"}. We'll call you ${when}. Urgent? Ring ${site.phone}.`,
    ``,
    `What you asked for:`,
    ...(picks.length ? picks.map((p) => `  - ${p.brand} ${p.model}${p.size ? ` (${p.size})` : ""}`) : [`  ${headline(d)}${summary ? `: ${summary}` : ""}`]),
    ``,
    `What happens next:`,
    ...steps.map(([t, s], i) => `  ${i + 1}. ${t}. ${s}`),
    ``,
    `Something not right? Reply to this email and we'll sort it out.`,
    ``,
    `Cheers,`,
    `The ${site.name} team`,
    `Pakenham VIC · ${site.url.replace(/^https?:\/\/(www\.)?/, "")}`,
  ].join("\n");

  return { subject, html, text };
}

/* ------------ photos added after the enquiry ------------ */

/** The short note when photos follow an enquiry already emailed, with the photos shown in it. */
export function photosEmail(l: { name?: string | null; phone?: string | null; suburb?: string | null; postcode?: string | null; headline?: string | null; summary?: string | null }, n: number, photoIds: string[] = []): { subject: string; html: string; text: string } {
  const who = l.name || "Website enquiry";
  const where = l.suburb || l.postcode || "SE Vic";
  const what = l.headline || "quote";
  const tel = (l.phone ?? "").replace(/[^\d+]/g, "");
  const subject = `Photos added: ${who} · ${where}`;
  const html = shell(subject, `
    <tr><td style="background:${NAVY};padding:24px 28px 18px;">
      <div style="font-family:${MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.6);">Photos added</div>
      <div style="font-size:22px;line-height:1.25;font-weight:800;color:#ffffff;margin-top:8px;">${n} photo${n === 1 ? "" : "s"} from ${esc(who)}</div>
      <div style="font-size:15px;color:rgba(255,255,255,0.8);margin-top:4px;">${esc(where)} · ${esc(what)}</div>
      ${tel ? `<div style="margin-top:16px;"><a href="tel:${esc(tel)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:${ORANGE};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Call ${esc(l.phone!)}</a></div>` : ""}
    </td></tr>
    ${l.summary ? section("Their enquiry", `<div style="background:${SOFT};border:1px solid ${LINE};border-radius:12px;padding:14px 16px;font-size:14.5px;line-height:1.5;color:${INK_2};">${esc(l.summary)}</div>`) : ""}
    ${section(n === 1 ? "Their photo" : `Their photos (${n})`, photoGrid(photoIds, n))}
    <tr><td style="padding:18px 28px 26px;">
      <div style="border-top:1px solid ${LINE};padding-top:16px;font-size:13px;line-height:1.7;color:${INK_3};">
        The full enquiry came through in the earlier email.
        <a href="${site.url}/portal/leads" style="color:${NAVY};font-weight:700;">Open Leads →</a>
      </div>
    </td></tr>`);
  const text = [
    `${n} photo${n === 1 ? "" : "s"} added to ${who}'s enquiry (${what}, ${where}). They're attached.`,
    l.summary ? `\n${l.summary}` : "",
    l.phone ? `\nPhone: ${l.phone}` : "",
    `\nThe full enquiry came through in the earlier email.`,
  ].join("");
  return { subject, html, text };
}

/* ------------ pieces ------------ */

function shell(title: string, body: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BG};font-family:${FONT};color:${INK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:20px 10px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">
          ${body}
        </table>
        <div style="padding:16px 12px 0;font-size:11px;line-height:1.6;color:${INK_3};">
          ${esc(site.legalName)} · 1 Sierra Circuit, Pakenham VIC 3810 · ${esc(site.phone)}
        </div>
      </td></tr>
    </table>
  </body>
</html>`;
}

function section(title: string, inner: string): string {
  return `
    <tr><td style="padding:22px 28px 4px;">
      <div style="font-family:${MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${INK_3};margin-bottom:10px;">${esc(title)}</div>
      ${inner}
    </td></tr>`;
}

/** One option, as a card: tier, brand and model, size, and (for the team) a link to its page. */
function card(p: LeadPick, link: boolean): string {
  const name = `${p.brand} ${p.model}`.trim();
  return `
      <div style="background:${SOFT};border:1px solid ${LINE};border-radius:12px;padding:12px 16px;margin-bottom:10px;">
        ${p.option ? `<div style="font-family:${MONO};font-size:10.5px;letter-spacing:0.1em;text-transform:uppercase;color:${ORANGE};">${esc(p.option)}</div>` : ""}
        <div style="font-size:17px;line-height:1.3;font-weight:800;color:${NAVY};margin-top:2px;">${esc(name)}</div>
        ${p.size || (link && p.page) ? `<div style="font-size:13.5px;color:${INK_2};margin-top:3px;">${p.size ? esc(p.size) : ""}${p.size && link && p.page ? " · " : ""}${link && p.page ? `<a href="${esc(abs(p.page))}" style="color:${NAVY};">See it on the site</a>` : ""}</div>` : ""}
      </div>`;
}

/** Question → answer rows. `raw` values are already HTML (links); the rest are escaped. */
function table(rows: Array<[string, string]>, raw = false): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.map(([k, v]) => `
        <tr>
          <td style="padding:9px 12px 9px 0;border-bottom:1px solid ${LINE};width:42%;vertical-align:top;font-size:13.5px;line-height:1.4;color:${INK_3};">${esc(k)}</td>
          <td style="padding:9px 0;border-bottom:1px solid ${LINE};vertical-align:top;font-size:15px;line-height:1.4;font-weight:600;color:${INK};">${raw ? v : esc(v)}</td>
        </tr>`).join("")}</table>`;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "07:00" → "7am", "15:30" → "3:30pm". */
function ampm(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const hr = h % 12 || 12;
  return `${hr}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
}

export function esc(s: string): string {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
