import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { stList } from "@/lib/dashboard/servicetitan";
import { tagIds } from "@/lib/dashboard/onHoldTypes";
import { stJobUrl, toBillJobs } from "@/lib/dashboard/toBill";
import { sendEmail } from "@/lib/email/send";
import { site } from "@/lib/site";
import {
  GROUPS, HORIZON_DAYS, addDays, billingDays, jobLine, melDate, outstanding, spanLabel, subjectFor, visitLabel,
  type GroupKey, type ReminderGroup, type ReminderJob,
} from "./dailyTypes";

/**
 * The morning to-do email to Jake and admin@ (rules in dailyTypes.ts): each
 * group a heading, under it the jobs, soonest first, each linking to the job
 * in ServiceTitan.
 *
 * The tags are read live from ServiceTitan for the jobs on the list, not only
 * from the synced copy: a bin booked at 6pm yesterday shouldn't still be
 * asked for at 7:30. If ServiceTitan doesn't answer, the copy is used (it is
 * at most ten minutes behind) and the email says so.
 */

export const REMINDER_TO = ["jake@advancedgas.com.au", "admin@advancedgas.com.au"];

const OPEN = ["Scheduled", "InProgress", "Hold", "Dispatched", "Working"];
const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type JobRow = { id: number; job_number: string | null; status: string | null; customer_name: string | null; suburb: string | null; job_type: string | null; location_id: number | null; tags: unknown };

async function streets(locationIds: number[]): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  for (let i = 0; i < locationIds.length; i += 100) {
    const rows = await sbSelect<{ id: number; street: string | null }>(
      "st_locations", ["select=id,street:raw->address->>street", `id=in.(${locationIds.slice(i, i + 100).join(",")})`].join("&"),
    ).catch(() => []);
    for (const r of rows) if (r.street) out.set(Number(r.id), r.street.trim());
  }
  return out;
}

export type DailyReminder = { today: string; until: string; groups: ReminderGroup[]; liveTags: boolean; billing: { from: string; to: string }; olderUnbilled: number };

export async function buildDailyReminder(now = new Date()): Promise<DailyReminder> {
  const today = melDate(now);
  const until = addDays(today, HORIZON_DAYS);

  const [tags, open] = await Promise.all([
    sbSelect<{ id: number; name: string | null }>("st_job_tags", "select=id,name"),
    sbSelect<JobRow>("st_jobs", [q.select("id,job_number,status,customer_name,suburb,job_type,location_id,tags:raw->tagTypeIds"), `status=in.(${OPEN.join(",")})`, "limit=5000"].join("&")),
  ]);
  const nameOf = new Map(tags.map((t) => [Number(t.id), (t.name ?? "").trim()]));
  const groupsOf = (ids: number[]) => outstanding(ids.map((x) => nameOf.get(x) ?? "").filter(Boolean));

  let candidates = open.map((j) => ({ ...j, keys: groupsOf(tagIds(j.tags)) })).filter((j) => j.keys.length);

  // The same jobs, as ServiceTitan has them right now.
  let liveTags = true;
  try {
    const live = new Map<number, { jobStatus?: string; tagTypeIds?: number[] }>();
    const ids = candidates.map((j) => j.id);
    for (let i = 0; i < ids.length; i += 50) {
      const rows = await stList<{ id: number; jobStatus?: string; tagTypeIds?: number[] }>("jpm", "jobs", { ids: ids.slice(i, i + 50).join(",") }, 1);
      for (const r of rows) live.set(Number(r.id), r);
    }
    if (ids.length && !live.size) throw new Error("no jobs came back");
    candidates = candidates
      .map((j) => {
        const l = live.get(j.id);
        if (!l) return j;
        return { ...j, status: l.jobStatus ?? j.status, keys: Array.isArray(l.tagTypeIds) ? groupsOf(l.tagTypeIds) : j.keys };
      })
      .filter((j) => OPEN.includes(j.status ?? "") && j.keys.length);
  } catch {
    liveTags = false;
  }

  const visits = new Map<number, string>();
  const ids = candidates.map((j) => j.id);
  for (let i = 0; i < ids.length; i += 200) {
    const rows = await sbSelect<{ job_id: number; start_at: string }>("job_next_appointment", [q.select("job_id,start_at"), `job_id=in.(${ids.slice(i, i + 200).join(",")})`].join("&"));
    for (const r of rows) visits.set(Number(r.job_id), r.start_at);
  }

  // A job with no visit booked (a quote waiting on approval) isn't today's
  // job yet; it shows up once it is booked within the week.
  const dated = candidates.filter((j) => visits.has(j.id));
  const soon = dated.filter((j) => melDate(visits.get(j.id)!) <= until);
  const street = await streets([...new Set(soon.map((j) => j.location_id).filter((x): x is number => !!x))]);
  const asJob = (j: (typeof candidates)[number]): ReminderJob => ({
    id: j.id, jobNumber: j.job_number, customer: j.customer_name, jobType: j.job_type, visit: visits.get(j.id) ?? null,
    where: [j.location_id ? street.get(j.location_id) : null, j.suburb].filter(Boolean).join(", ") || null,
  });

  const groups: ReminderGroup[] = GROUPS.map((g) => {
    const mine = (list: typeof candidates) => list.filter((j) => j.keys.includes(g.key as GroupKey));
    return {
      key: g.key, title: g.title, href: g.href,
      jobs: mine(soon).map(asJob).sort((a, b) => Date.parse(a.visit!) - Date.parse(b.visit!)),
      later: mine(dated).length - mine(soon).length,
    };
  });

  // Finished, still at a $0 invoice: the previous working day's, listed; any older, counted.
  const billing = billingDays(today);
  const unbilled = await toBillJobs();
  const fresh = unbilled.filter((r) => { const d = melDate(r.at); return d >= billing.from && d <= billing.to; });
  const olderUnbilled = unbilled.filter((r) => melDate(r.at) < billing.from).length;
  groups.push({
    key: "billing",
    title: `Finished ${spanLabel(billing)}, not billed`,
    href: "/portal/jobs?tab=notbilled",
    later: 0,
    jobs: fresh.map((r) => ({ id: r.id, jobNumber: r.jobNumber, customer: r.customer ?? null, where: r.suburb, jobType: r.jobType, visit: null })),
  });

  return { today, until, groups, liveTags, billing, olderUnbilled };
}

/** The day in bold, so the list scans by when; only the job number is the link. */
function htmlLine(j: ReminderJob, today: string): string {
  const who = [j.customer?.trim(), j.where?.trim()].filter(Boolean).join(", ");
  return [
    j.visit ? `<b>${esc(visitLabel(j.visit, today))}</b>` : null,
    `<a href="${esc(stJobUrl(j.id))}">Job ${esc(String(j.jobNumber ?? j.id))}</a>`,
    who ? esc(who) : null,
    j.jobType ? `<span style="color:#55555c">${esc(j.jobType)}</span>` : null,
  ].filter(Boolean).join(" · ");
}

export function renderDailyReminder(r: DailyReminder): { subject: string; text: string; html: string } | null {
  const used = r.groups.filter((g) => g.jobs.length);
  if (!used.length) return null;
  const more = (g: ReminderGroup) =>
    g.key === "billing"
      ? r.olderUnbilled ? `${r.olderUnbilled} older ${r.olderUnbilled === 1 ? "job is" : "jobs are"} still not billed as well.` : ""
      : g.later ? `${g.later} more with a visit after ${spanLabel({ from: r.until, to: r.until })}.` : "";
  const note = r.liveTags ? "" : "ServiceTitan didn't answer this morning, so the tags are from the portal's copy (at most ten minutes old at the time).";

  const text = [
    ...used.map((g) => [
      `${g.title} (${g.jobs.length})`,
      ...g.jobs.map((j) => `- ${jobLine(j, r.today)}  ${stJobUrl(j.id)}`),
      more(g),
    ].filter(Boolean).join("\n")),
    note,
    `Done once the tag in ServiceTitan says so (Booked, Ordered) or the job is billed.`,
  ].filter(Boolean).join("\n\n");

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1d">${used.map((g) => `
<h3 style="font-size:16px;margin:20px 0 6px">${esc(g.title)} <span style="font-weight:normal;color:#55555c">(${g.jobs.length})</span></h3>
<ul style="margin:0;padding-left:20px">${g.jobs.map((j) => `<li style="margin:4px 0">${htmlLine(j, r.today)}</li>`).join("")}</ul>
${more(g) || g.href ? `<p style="margin:6px 0 0;color:#55555c;font-size:14px">${esc(more(g))}${g.href ? ` <a href="${esc(site.url + g.href)}">Open in the portal</a>` : ""}</p>` : ""}`).join("")}
${note ? `<p style="margin-top:18px;color:#55555c;font-size:14px">${esc(note)}</p>` : ""}
<p style="margin-top:18px;color:#55555c;font-size:13px">A job comes off this list once its tag in ServiceTitan says it's done (Booked, Ordered) or it's billed.</p></div>`;

  return { subject: subjectFor(used), text, html };
}

export async function sendDailyReminder(now = new Date()): Promise<{ sent: boolean; counts: Record<string, number>; error?: string }> {
  const r = await buildDailyReminder(now);
  const counts = Object.fromEntries(r.groups.map((g) => [g.key, g.jobs.length]));
  const mail = renderDailyReminder(r);
  if (!mail) return { sent: false, counts };
  const out = await sendEmail("daily-reminder", {
    from: process.env.RESEND_FROM_EMAIL || "Advanced Gas Website <onboarding@resend.dev>",
    to: REMINDER_TO, subject: mail.subject, text: mail.text, html: mail.html,
  });
  return out.ok ? { sent: true, counts } : { sent: false, counts, error: out.error };
}
