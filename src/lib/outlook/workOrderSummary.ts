import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { sendEmail } from "@/lib/email/send";
import { loadSwitches, NOTIFY_DEFAULT } from "@/lib/automation/log";
import { site } from "@/lib/site";

/**
 * The end-of-day email: every work order the last day brought in and what
 * became of it (Jake, 5 Nov: "how do I know this is going to happen or has
 * happened"). The Work orders page has the same, any time; this is for
 * knowing without going to look.
 *
 * Besides the booked, duplicate and refused ones, it lists any email from a
 * work order platform that was read and judged not to be one, since that is
 * where a missed work order would be hiding. Nothing in the day, no email.
 */

type Row = {
  status: string; kind: string | null; agency: string | null; wo_number: string | null; address: string | null; subject: string | null;
  from_address: string | null; reason: string | null; st_booking_id: string | null; tenant_email_to: string | null; tenant_email_note: string | null;
  details: { job?: string } | null; source: string; st_job_number: string | null; location_how: string | null;
};

const PLATFORM = /@(?:[\w.-]+\.)?(propertyme\.com|tapihq\.com|propertytree\.com)$/i;
const KIND: Record<string, string> = { work_order: "Work order", quote_request: "Request to quote", quote_accepted: "Quote accepted" };
const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function sendWorkOrderSummary(): Promise<{ sent: boolean; count: number; error?: string }> {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const rows = await sbSelect<Row>("work_orders", [
    q.select("status,kind,agency,wo_number,address,subject,from_address,reason,st_booking_id,st_job_number,location_how,tenant_email_to,tenant_email_note,details,source"),
    q.gte("created_at", since), q.order("created_at", "asc"),
  ].join("&"));
  const booked = rows.filter((r) => r.status === "booked");
  const approved = rows.filter((r) => r.status === "duplicate" && (r.reason ?? "").startsWith("quote approved"));
  const dupes = rows.filter((r) => r.status === "duplicate" && !approved.includes(r));
  const failed = rows.filter((r) => r.status === "failed" || r.status === "working" || r.status === "needs_agency");
  const cancels = rows.filter((r) => r.status === "not" && (r.reason ?? "").startsWith("cancellation"));
  // Statements, invoices and payment notices from the platforms are never work
  // orders; listing them every day (six on 6 Nov) buried the one worth a look.
  const PAPERWORK = /\b(statement|invoice|receipt|remittance|payment)s?\b/i;
  const missed = rows.filter((r) => r.status === "not" && PLATFORM.test(r.from_address ?? "") && !cancels.includes(r) && !PAPERWORK.test(`${r.reason ?? ""} ${r.subject ?? ""}`));
  const count = booked.length + approved.length + dupes.length + failed.length + missed.length + cancels.length;
  if (!count) return { sent: false, count: 0 };

  const line = (r: Row) => {
    const what = [r.kind ? KIND[r.kind] ?? r.kind : "Work order", r.wo_number, r.agency ? `from ${r.agency}` : null].filter(Boolean).join(" ");
    return `${what}: ${r.address ?? r.subject ?? "no address"}${r.details?.job ? ` (${r.details.job})` : ""}`;
  };
  const sections: [string, Row[], (r: Row) => string][] = [
    ["Into ServiceTitan", booked, (r) => `${line(r)}. ${r.st_job_number ? `Job ${r.st_job_number}${r.location_how ? ` (${r.location_how})` : ""}, To Be Booked` : `Booking ${r.st_booking_id ?? "made"}`}. ${r.tenant_email_to ? `Tenant emailed (${r.tenant_email_to}).` : r.tenant_email_note ?? "Tenant not emailed."}`],
    ["Quotes approved (no new job: sell the estimate; admin was emailed)", approved, (r) => `${line(r)}.${r.st_job_number ? ` On job ${r.st_job_number}, pinned.` : " No job found for it."}`],
    ["Already in (a follow-up, reminder or resend)", dupes, (r) => `${line(r)}.${r.st_job_number ? ` Added to job ${r.st_job_number} as a note.` : ""}`],
    ["Cancellations", cancels, (r) => `${r.address ?? r.subject ?? ""}: ${(r.reason ?? "").replace(/^cancellation: /, "")}.`],
    ["Not in ServiceTitan yet", failed, (r) => `${line(r)}. ${r.reason ?? ""}`],
    ["From a work order platform, read as not a work order: check these", missed, (r) => `${r.subject ?? "(no subject)"}: ${r.reason ?? ""}. Mark it with the Outlook category "Work order" if it is one.`],
  ];
  const used = sections.filter(([, list]) => list.length);
  const text = [
    `Work orders, last 24 hours: ${booked.length} booked${dupes.length ? `, ${dupes.length} already in` : ""}${failed.length ? `, ${failed.length} not yet booked` : ""}.`,
    ...used.map(([title, list, f]) => `${title}\n${list.map((r) => `- ${f(r)}`).join("\n")}`),
    `All of them: ${site.url}/portal/work-orders`,
  ].join("\n\n");
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1d">${
    `<p><b>Work orders, last 24 hours:</b> ${booked.length} booked${dupes.length ? `, ${dupes.length} already in` : ""}${failed.length ? `, ${failed.length} not yet booked` : ""}.</p>`
  }${used.map(([title, list, f]) => `<h3 style="font-size:15px;margin:18px 0 6px">${esc(title)}</h3><ul style="margin:0;padding-left:20px">${list.map((r) => `<li>${esc(f(r))}</li>`).join("")}</ul>`).join("")}<p style="margin-top:18px"><a href="${esc(site.url)}/portal/work-orders">All of them in the portal</a></p></div>`;

  const raw = process.env.RESEND_FROM_EMAIL || "Advanced Gas Website <onboarding@resend.dev>";
  const to = (await loadSwitches().catch(() => null))?.notifyTo || NOTIFY_DEFAULT;
  const out = await sendEmail("work-order-summary", {
    from: raw, to: [to], subject: `Work orders today: ${booked.length} booked${failed.length ? `, ${failed.length} to check` : ""}`, text, html,
  });
  return out.ok ? { sent: true, count } : { sent: false, count, error: out.error };
}
