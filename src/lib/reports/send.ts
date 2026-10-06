import "server-only";
import { site } from "@/lib/site";
import type { Report, ReportLine, ReportSection } from "@/lib/reports/types";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/*
 * The report as an email, dressed as the wall board: the cream ground, white
 * tiles, the navy lead tile, mono labels and the big figures.
 *
 * Mail apps are not browsers. Everything is a table with its style inline, so
 * Gmail and Outlook can't rearrange it; the one <style> block only stacks the
 * two-up tiles on a phone, and a client that drops it gets them side by side,
 * which still reads. Bars are table cells with a width, because that is the
 * one way of drawing a bar every mail app agrees on. The board's fonts are
 * asked for, and the stacks behind them are what Gmail and Outlook will show.
 */

const C = {
  plane: "#f9f8f3", surface: "#ffffff", navy: "#050a30", muted: "#6b6a68", hair: "#eae7dd", track: "#f3efe4",
  accent: "#f46722", goodBg: "#e4f2e8", goodInk: "#15803d", badBg: "#fdefe3", badInk: "#c2410c",
};
const SANS = "Manrope,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const DISPLAY = "Archivo,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

const label = (t: string, color: string = C.muted) =>
  `<div style="font-family:${MONO};font-size:11px;line-height:14px;letter-spacing:.14em;text-transform:uppercase;color:${color};">${esc(t)}</div>`;

const fig = (v: string, size: number, color: string = C.navy, cls = "") =>
  `<div${cls ? ` class="${cls}"` : ""} style="font-family:${DISPLAY};font-weight:800;font-size:${size}px;line-height:1.05;letter-spacing:-.02em;color:${color};white-space:nowrap;">${esc(v)}</div>`;

const subline = (t: string | undefined, color: string = C.muted) =>
  t ? `<div style="font-family:${SANS};font-size:13px;line-height:18px;color:${color};margin-top:8px;">${esc(t)}</div>` : "";

const card = (inner: string, bg: string = C.surface, pad = "20px 22px", fill = false) =>
  `<table role="presentation" width="100%"${fill ? ' height="100%"' : ""} cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;background:${bg};border-radius:16px;${fill ? "height:100%;" : ""}"><tr><td valign="top" style="padding:${pad};vertical-align:top;">${inner}</td></tr></table>`;

const gap = (h: number) => `<tr><td style="height:${h}px;line-height:${h}px;font-size:1px;">&nbsp;</td></tr>`;

/**
 * Two tiles a row, the same height — the cells carry a height so the cards
 * inside can fill them, which is the one way mail apps agree on. `stack`
 * puts them one under the other on a phone; small tiles stay two-up there.
 */
function twoUp(cells: string[], stack: boolean): string {
  const cls = stack ? ' class="rpt-col"' : ' class="rpt-half"';
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 2) {
    const [a, b] = [cells[i], cells[i + 1]];
    rows.push(`<tr>
      <td${cls} width="50%" height="100%" valign="top" style="width:50%;height:100%;padding:0 6px 12px 0;vertical-align:top;">${a}</td>
      <td${cls} width="50%" height="100%" valign="top" style="width:50%;height:100%;padding:0 0 12px 6px;vertical-align:top;">${b ?? ""}</td>
    </tr>`);
  }
  return `<table role="presentation" width="100%" height="1" cellpadding="0" cellspacing="0" border="0" style="height:1px;">${rows.join("")}</table>`;
}

function pill(text: string, tone: ReportLine["tone"]): string {
  const [bg, ink] = tone === "bad" ? [C.badBg, C.badInk] : tone === "good" ? [C.goodBg, C.goodInk] : [C.track, C.muted];
  return `<span style="display:inline-block;font-family:${SANS};font-weight:700;font-size:12px;line-height:16px;padding:4px 10px;border-radius:999px;background:${bg};color:${ink};white-space:nowrap;">${esc(text)}</span>`;
}

/**
 * A bar, filled to `bar` of the way, with a mark where the goal says it
 * should be by now. Cells of a table, widths in per cent; a zero-width cell is
 * left out rather than drawn as a sliver.
 */
function barRow(bar: number | null | undefined, mark: number | null | undefined, fill: string): string {
  const b = Math.round(Math.min(1, Math.max(0, bar ?? 0)) * 1000) / 10;
  const k = mark == null ? null : Math.round(Math.min(1, Math.max(0, mark)) * 1000) / 10;
  const seg = (w: number, color: string) => (w > 0 ? `<td width="${w}%" style="width:${w}%;height:10px;line-height:10px;font-size:1px;background:${color};">&nbsp;</td>` : "");
  const tick = `<td width="3" style="width:3px;height:10px;line-height:10px;font-size:1px;background:${C.navy};">&nbsp;</td>`;
  let cells: string;
  if (k == null || k <= 0 || k >= 100) cells = seg(b, fill) + seg(100 - b, C.track);
  else if (b < k) cells = seg(b, fill) + seg(k - b, C.track) + tick + seg(100 - k, C.track);
  else cells = seg(k, fill) + tick + seg(b - k, fill) + seg(100 - b, C.track);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-radius:5px;overflow:hidden;table-layout:fixed;margin-top:10px;"><tr>${cells}</tr></table>`;
}

function sectionHead(s: ReportSection): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="font-family:${DISPLAY};font-weight:800;font-size:19px;line-height:24px;color:${C.navy};padding-bottom:12px;border-bottom:1px solid ${C.hair};">${esc(s.title)}</td>
  </tr></table>`;
}

const noteLine = (s: ReportSection) =>
  s.note ? `<div style="font-family:${SANS};font-size:12px;line-height:17px;color:${C.muted};margin-top:14px;">${esc(s.note)}</div>` : "";

function hero(s: ReportSection): string {
  const tiles = s.lines.map((l, i) => {
    const dark = i === 0;
    return card(
      `${label(l.label, dark ? "#aab0d6" : C.muted)}
       <div style="height:14px;line-height:14px;font-size:1px;">&nbsp;</div>
       ${fig(l.value, 40, dark ? "#ffffff" : C.navy)}
       ${subline(l.sub, dark ? "#c9cde6" : C.muted)}`,
      dark ? C.navy : C.surface, "22px 22px 20px", true,
    );
  });
  return twoUp(tiles, true);
}

function tiles(s: ReportSection): string {
  return twoUp(s.lines.map((l) => card(
    `${label(l.label)}
     <div style="height:10px;line-height:10px;font-size:1px;">&nbsp;</div>
     ${fig(l.value, 28, l.tone === "bad" ? C.badInk : C.navy, "rpt-fig-sm")}
     ${subline(l.sub)}`,
    C.surface, "18px 20px", true,
  )), false);
}

function pace(s: ReportSection): string {
  const rows = s.lines.map((l, i) => `
    <tr><td style="padding:${i ? "18px" : "16px"} 0 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="bottom" style="vertical-align:bottom;">
          ${label(l.label)}
          <div style="height:6px;line-height:6px;font-size:1px;">&nbsp;</div>
          ${fig(l.value, 26)}
        </td>
        <td valign="bottom" align="right" style="vertical-align:bottom;text-align:right;">${l.status ? pill(l.status, l.tone) : ""}</td>
      </tr></table>
      ${l.bar != null ? barRow(l.bar, l.mark, l.tone === "bad" ? C.badInk : C.navy) : ""}
      ${subline(l.sub)}
    </td></tr>`).join("");
  return card(`${sectionHead(s)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>${noteLine(s)}`);
}

function rank(s: ReportSection): string {
  const rows = s.lines.map((l, i) => `
    <tr><td style="padding:14px 0 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="28" valign="top" style="width:28px;vertical-align:top;font-family:${MONO};font-size:12px;line-height:20px;color:${i === 0 ? C.accent : C.muted};">${String(i + 1).padStart(2, "0")}</td>
        <td valign="top" style="vertical-align:top;font-family:${SANS};font-weight:700;font-size:15px;line-height:20px;color:${C.navy};">${esc(l.label)}${l.sub ? `<div style="font-weight:400;color:${C.muted};font-size:13px;line-height:18px;">${esc(l.sub)}</div>` : ""}</td>
        <td valign="top" align="right" style="vertical-align:top;text-align:right;font-family:${DISPLAY};font-weight:800;font-size:17px;line-height:20px;color:${C.navy};white-space:nowrap;">${esc(l.value)}</td>
      </tr></table>
      ${l.bar != null ? barRow(l.bar, null, i === 0 ? C.accent : C.navy) : ""}
    </td></tr>`).join("");
  return card(`${sectionHead(s)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>${noteLine(s)}`);
}

function alerts(s: ReportSection): string {
  const rows = s.lines.map((l) => {
    const stripe = l.tone === "bad" ? C.badInk : l.tone === "good" ? C.goodInk : "#e0a52a";
    return `<tr><td style="padding:12px 0 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;background:${C.plane};border-radius:10px;"><tr>
        <td width="4" style="width:4px;background:${stripe};border-radius:10px 0 0 10px;font-size:1px;">&nbsp;</td>
        <td style="padding:12px 14px;">
          <div style="font-family:${SANS};font-weight:700;font-size:15px;line-height:20px;color:${C.navy};">${esc(l.label)}</div>
          ${l.sub ? `<div style="font-family:${SANS};font-size:13px;line-height:18px;color:${C.muted};margin-top:2px;">${esc(l.sub)}</div>` : ""}
        </td>
        <td align="right" style="padding:12px 14px;text-align:right;white-space:nowrap;">
          <div style="font-family:${DISPLAY};font-weight:800;font-size:20px;line-height:24px;color:${l.tone === "bad" ? C.badInk : C.navy};">${esc(l.value)}</div>
          ${l.status ? `<div style="margin-top:4px;">${pill(l.status, l.tone)}</div>` : ""}
        </td>
      </tr></table>
    </td></tr>`;
  }).join("");
  return card(`${sectionHead(s)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>${noteLine(s)}`);
}

/** The shape before layouts: label and figure down the page. Old kept reports still read this way. */
function list(s: ReportSection): string {
  const rows = s.lines.map((l, i) => `
    <tr>
      <td style="padding:12px 0;border-top:${i ? `1px solid ${C.hair}` : "0"};vertical-align:top;font-family:${SANS};font-size:14px;line-height:19px;color:${C.navy};">${esc(l.label)}${l.sub ? `<div style="font-size:12px;line-height:17px;color:${C.muted};margin-top:2px;">${esc(l.sub)}</div>` : ""}</td>
      <td align="right" style="padding:12px 0 12px 12px;border-top:${i ? `1px solid ${C.hair}` : "0"};vertical-align:top;text-align:right;white-space:nowrap;font-family:${DISPLAY};font-weight:800;font-size:17px;line-height:19px;color:${l.tone === "bad" ? C.badInk : l.tone === "good" ? C.goodInk : C.navy};">${esc(l.value)}</td>
    </tr>`).join("");
  return card(`${sectionHead(s)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:4px;">${rows}</table>${noteLine(s)}`);
}

function section(s: ReportSection): string {
  switch (s.layout) {
    case "hero": return hero(s);
    case "tiles": return `${s.title ? `<div style="font-family:${DISPLAY};font-weight:800;font-size:15px;line-height:20px;color:${C.navy};padding:2px 2px 10px;">${esc(s.title)}</div>` : ""}${tiles(s)}`;
    case "pace": return pace(s) + `<div style="height:12px;line-height:12px;font-size:1px;">&nbsp;</div>`;
    case "rank": return rank(s) + `<div style="height:12px;line-height:12px;font-size:1px;">&nbsp;</div>`;
    case "alerts": return alerts(s) + `<div style="height:12px;line-height:12px;font-size:1px;">&nbsp;</div>`;
    default: return list(s) + `<div style="height:12px;line-height:12px;font-size:1px;">&nbsp;</div>`;
  }
}

const BIG: Record<Report["kind"], string> = { daily: "Today", weekly: "The week", monthly: "The month" };
const KIND_LINE: Record<Report["kind"], string> = { daily: "Daily report", weekly: "Weekly report", monthly: "Monthly report" };

/** The report as an email. The portal shows this same HTML, so a preview is exactly what arrives. */
export function reportEmail(r: Report): { subject: string; html: string; text: string } {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || site.url).replace(/\/$/, "");
  const link = `${base}/portal/board/reports/${encodeURIComponent(r.key)}`;
  const subject = `${r.title} — ${r.headline}`;
  const at = r.figuresAt
    ? new Date(r.figuresAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" })
    : null;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${esc(subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@800&family=JetBrains+Mono:wght@500&family=Manrope:wght@400;700&display=swap" rel="stylesheet">
<style>
  @media (max-width: 520px) {
    .rpt-col { display: block !important; width: 100% !important; height: auto !important; padding: 0 0 12px 0 !important; }
    .rpt-half { padding-bottom: 10px !important; }
    .rpt-fig-sm { font-size: 22px !important; }
    .rpt-pad { padding-left: 12px !important; padding-right: 12px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.plane};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.plane};">${esc(r.headline)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.plane};">
<tr><td align="center" class="rpt-pad" style="padding:24px 16px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;">

  <tr><td>
    ${card(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="middle" style="vertical-align:middle;">
        <div style="font-family:${DISPLAY};font-weight:800;font-size:20px;line-height:20px;color:${C.navy};letter-spacing:-.01em;">Advanced</div>
        <div style="font-family:${SANS};font-weight:700;font-size:11px;line-height:14px;color:${C.accent};margin-top:2px;">Gas &amp; Aircon</div>
      </td>
      <td valign="middle" align="right" style="vertical-align:middle;text-align:right;">${label(KIND_LINE[r.kind], C.accent)}</td>
    </tr></table>
    <div style="height:18px;line-height:18px;font-size:1px;">&nbsp;</div>
    <div style="font-family:${DISPLAY};font-weight:800;font-size:34px;line-height:38px;color:${C.navy};letter-spacing:-.02em;">${esc(BIG[r.kind])}</div>
    <div style="font-family:${SANS};font-size:15px;line-height:20px;color:${C.muted};margin-top:4px;">${esc(r.periodLabel)}</div>`)}
  </td></tr>
  ${gap(12)}

  <tr><td>${r.sections.map(section).join("")}</td></tr>

  <tr><td>
    ${card(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="middle" style="vertical-align:middle;font-family:${MONO};font-size:12px;line-height:18px;color:#ffffff;letter-spacing:.06em;">
        <span style="color:#3ccf7e;">&#9679;</span>&nbsp; ${at ? `FIGURES AS AT ${esc(at.toUpperCase())}` : "THE BOARD'S FIGURES"}<br>
        <span style="color:#aab0d6;">THE SAME AS THE WALL BOARD</span>
      </td>
      <td valign="middle" align="right" style="vertical-align:middle;text-align:right;">
        <a href="${esc(link)}" style="display:inline-block;background:${C.accent};color:#ffffff;text-decoration:none;font-family:${SANS};font-weight:700;font-size:14px;line-height:18px;padding:11px 16px;border-radius:10px;white-space:nowrap;">Open in the portal &rarr;</a>
      </td>
    </tr></table>`, C.navy, "18px 20px")}
  </td></tr>
  <tr><td style="font-family:${SANS};font-size:12px;line-height:17px;color:${C.muted};padding:14px 4px 0;text-align:center;">
    Change who gets these on the Reports page in the team portal.
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    `${KIND_LINE[r.kind]} — ${BIG[r.kind]}, ${r.periodLabel}`, r.headline, "",
    ...r.sections.flatMap((s) => [s.title.toUpperCase(), ...s.lines.map((l) => `  ${l.label}: ${l.value}${l.status ? ` [${l.status}]` : ""}${l.sub ? ` (${l.sub})` : ""}`), ...(s.note ? [`  ${s.note}`] : []), ""]),
    at ? `Figures as at ${at}, the same as the wall board.` : "",
    `In the portal: ${link}`,
  ].join("\n");
  return { subject, html, text };
}

/** Send through Resend, as the sign-in links and the journal alerts do. */
export async function sendReportEmail(r: Report, to: string[]): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY missing" };
  if (!to.length) return { ok: false, error: "No one is on the report list" };
  const from = process.env.RESEND_FROM_EMAIL || "Advanced Gas Portal <onboarding@resend.dev>";
  const { subject, html, text } = reportEmail(r);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html, text }),
    });
    return res.ok ? { ok: true } : { ok: false, error: `Resend ${res.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}
