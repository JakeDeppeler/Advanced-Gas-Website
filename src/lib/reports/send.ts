import "server-only";
import { site } from "@/lib/site";
import type { Report } from "@/lib/reports/types";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The report as an email: the same sections the portal page shows, in a table a mail app can't rearrange. */
export function reportEmail(r: Report): { subject: string; html: string; text: string } {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || site.url).replace(/\/$/, "");
  const link = `${base}/portal/board/reports/${encodeURIComponent(r.key)}`;
  const subject = `${r.title} — ${r.headline}`;
  const tone = (t: string | null | undefined) => (t === "bad" ? "#b3261e" : t === "good" ? "#15803d" : "#050a30");

  const sections = r.sections.map((s) => `
    <h2 style="font-size:15px;margin:22px 0 6px;color:#050a30;">${esc(s.title)}</h2>
    <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
      ${s.lines.map((l) => `
      <tr>
        <td style="padding:8px 0;border-top:1px solid #ebe7de;color:#4b4a46;vertical-align:top;">${esc(l.label)}${l.sub ? `<div style="font-size:12px;color:#8b8a86;margin-top:2px;">${esc(l.sub)}</div>` : ""}</td>
        <td style="padding:8px 0;border-top:1px solid #ebe7de;text-align:right;font-weight:700;color:${tone(l.tone)};white-space:nowrap;vertical-align:top;">${esc(l.value)}</td>
      </tr>`).join("")}
    </table>`).join("");

  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f8;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:26px 18px;">
      <div style="background:#fff;border-radius:16px;padding:22px 24px;">
        <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#c2521a;font-weight:700;">Advanced Gas &amp; Aircon · ${esc(r.kind === "daily" ? "Daily" : r.kind === "weekly" ? "Weekly" : "Monthly")} report</div>
        <h1 style="font-size:21px;margin:8px 0 4px;color:#050a30;">${esc(r.title)}</h1>
        <p style="font-size:14px;line-height:1.5;color:#4b4a46;margin:0;">${esc(r.headline)}</p>
        ${sections}
        <a href="${esc(link)}" style="display:inline-block;margin-top:20px;background:#c2521a;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 18px;border-radius:10px;">Open it in the portal →</a>
        <p style="font-size:12px;color:#8b8a86;margin:16px 0 0;">The same figures as the wall board${r.figuresAt ? `, as they stood at ${esc(new Date(r.figuresAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" }))}` : ""}. Change who gets these on the Reports page.</p>
      </div>
    </div>
  </body></html>`;

  const text = [
    r.title, r.headline, "",
    ...r.sections.flatMap((s) => [s.title.toUpperCase(), ...s.lines.map((l) => `  ${l.label}: ${l.value}${l.sub ? ` (${l.sub})` : ""}`), ""]),
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
