import "server-only";
import { q, sbSelect, sbUpdate } from "@/lib/dashboard/db";
import { graph, GraphError, outlookConfigured, userPath } from "@/lib/outlook/graph";
import { stList } from "@/lib/dashboard/servicetitan";
import { tagIds } from "@/lib/dashboard/onHoldTypes";
import { stJobUrl, toBillJobs } from "@/lib/dashboard/toBill";
import { sendEmail } from "@/lib/email/send";
import { site } from "@/lib/site";
import {
  GROUPS, HORIZON_DAYS, addDays, billingDays, callBackLine, jobLine, melDate, outstanding, spanLabel, subjectFor, telHref, visitLabel,
  type CallBackItem, type GroupKey, type ReminderGroup, type ReminderJob,
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

/** How long a call-back stays on the list unmarked before it's dropped as stale. */
const CALL_BACK_DAYS = 14;
const CALL_BACK_CATEGORY = "Call back";

/**
 * The call-backs still to make: asked for in the last fortnight, and the email
 * still flagged in Outlook. Each is checked live, so marking the flag complete
 * (or taking off the Call back category, or deleting the email) any time
 * before the morning email takes it off. If Outlook doesn't answer, it stays
 * on: a call-back left off is worse than one listed twice.
 */
async function openCallBacks(): Promise<CallBackItem[]> {
  type Row = { id: string; mailbox: string; message_id: string; callback_at: string; callback_name: string | null; callback_phone: string | null; callback_about: string | null; from_address: string | null; subject: string | null };
  const since = new Date(Date.now() - CALL_BACK_DAYS * 86_400_000).toISOString();
  const rows = await sbSelect<Row>("mail_drafts", [
    q.select("id,mailbox,message_id,callback_at,callback_name,callback_phone,callback_about,from_address,subject"),
    q.gte("callback_at", since), q.isNull("callback_done_at"), q.order("callback_at", "asc"), "limit=60",
  ].join("&"));
  const out: CallBackItem[] = [];
  for (const r of rows) {
    let doneHow: string | null = null;
    if (outlookConfigured()) {
      try {
        const msg = await graph<{ flag?: { flagStatus?: string }; categories?: string[] }>(`${userPath(r.mailbox)}/messages/${encodeURIComponent(r.message_id)}?$select=flag,categories`);
        if (msg.flag?.flagStatus === "complete") doneHow = "flag marked complete";
        else if (!(msg.categories ?? []).includes(CALL_BACK_CATEGORY) && msg.flag?.flagStatus !== "flagged") doneHow = "flag and Call back category taken off";
      } catch (e) {
        if (e instanceof GraphError && e.status === 404) doneHow = "email deleted";
      }
    }
    if (doneHow) {
      await sbUpdate("mail_drafts", `id=eq.${r.id}`, { callback_done_at: new Date().toISOString(), callback_done_how: doneHow }).catch(() => undefined);
      continue;
    }
    out.push({ at: r.callback_at, name: r.callback_name, phone: r.callback_phone, about: r.callback_about, from: r.from_address, mailbox: r.mailbox, subject: r.subject });
  }
  return out;
}

export type DailyReminder = { today: string; until: string; callBacks: CallBackItem[]; groups: ReminderGroup[]; liveTags: boolean; billing: { from: string; to: string }; olderUnbilled: number };

/**
 * live: read the listed jobs' tags from ServiceTitan (the email does; a page
 * showing the counts can use the copy, ten minutes behind at most).
 * callBacks: check the open call-backs in Outlook and mark the done ones.
 */
export async function buildDailyReminder(now = new Date(), opts: { live?: boolean; callBacks?: boolean } = {}): Promise<DailyReminder> {
  const { live: readLive = true, callBacks: withCallBacks = true } = opts;
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
  let liveTags = readLive;
  if (readLive) try {
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

  const callBacks = withCallBacks ? await openCallBacks().catch(() => []) : [];
  return { today, until, callBacks, groups, liveTags, billing, olderUnbilled };
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

/** When they asked in bold, the number as a link a phone can dial. */
function callBackHtml(c: CallBackItem, today: string): string {
  const tel = c.phone ? telHref(c.phone) : null;
  return [
    `<b>Asked ${esc(visitLabel(c.at, today).replace(/^(Today|Yesterday|Tomorrow)/, (w) => w.toLowerCase()))}</b>`,
    esc(c.name || c.from || ""),
    c.phone ? (tel ? `<a href="${esc(tel)}">${esc(c.phone)}</a>` : esc(c.phone)) : `<span style="color:#55555c">no number given, see the email</span>`,
    c.about || c.subject ? `<span style="color:#55555c">${esc(c.about || c.subject || "")}</span>` : null,
  ].filter(Boolean).join(" · ");
}

export function renderDailyReminder(r: DailyReminder): { subject: string; text: string; html: string } | null {
  const used = r.groups.filter((g) => g.jobs.length);
  if (!used.length && !r.callBacks.length) return null;
  const box = (c: CallBackItem) => c.mailbox.replace(/@.*/, "@");
  const more = (g: ReminderGroup) =>
    g.key === "billing"
      ? r.olderUnbilled ? `${r.olderUnbilled} older ${r.olderUnbilled === 1 ? "job is" : "jobs are"} still not billed as well.` : ""
      : g.later ? `${g.later} more with a visit after ${spanLabel({ from: r.until, to: r.until })}.` : "";
  const note = r.liveTags ? "" : "ServiceTitan didn't answer this morning, so the tags are from the portal's copy (at most ten minutes old at the time).";

  const text = [
    r.callBacks.length ? [`Call back (${r.callBacks.length})`, ...r.callBacks.map((c) => `- ${callBackLine(c, r.today)} (${box(c)})`)].join("\n") : "",
    ...used.map((g) => [
      `${g.title} (${g.jobs.length})`,
      ...g.jobs.map((j) => `- ${jobLine(j, r.today)}  ${stJobUrl(j.id)}`),
      more(g),
    ].filter(Boolean).join("\n")),
    note,
    `Done once the tag in ServiceTitan says so (Booked, Ordered) or the job is billed. A call-back comes off once its email's flag is marked complete in Outlook.`,
  ].filter(Boolean).join("\n\n");

  const callHtml = r.callBacks.length ? `
<h3 style="font-size:16px;margin:20px 0 6px">Call back <span style="font-weight:normal;color:#55555c">(${r.callBacks.length})</span></h3>
<ul style="margin:0;padding-left:20px">${r.callBacks.map((c) => `<li style="margin:4px 0">${callBackHtml(c, r.today)} <span style="color:#55555c">(${esc(box(c))})</span></li>`).join("")}</ul>` : "";
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1d">${callHtml}${used.map((g) => `
<h3 style="font-size:16px;margin:20px 0 6px">${esc(g.title)} <span style="font-weight:normal;color:#55555c">(${g.jobs.length})</span></h3>
<ul style="margin:0;padding-left:20px">${g.jobs.map((j) => `<li style="margin:4px 0">${htmlLine(j, r.today)}</li>`).join("")}</ul>
${more(g) || g.href ? `<p style="margin:6px 0 0;color:#55555c;font-size:14px">${esc(more(g))}${g.href ? ` <a href="${esc(site.url + g.href)}">Open in the portal</a>` : ""}</p>` : ""}`).join("")}
${note ? `<p style="margin-top:18px;color:#55555c;font-size:14px">${esc(note)}</p>` : ""}
<p style="margin-top:18px;color:#55555c;font-size:13px">A job comes off this list once its tag in ServiceTitan says it's done (Booked, Ordered) or it's billed. A call-back comes off once its email's flag is marked complete in Outlook.</p></div>`;

  return { subject: subjectFor(used, r.callBacks.length), text, html };
}

export async function sendDailyReminder(now = new Date()): Promise<{ sent: boolean; counts: Record<string, number>; error?: string }> {
  const r = await buildDailyReminder(now);
  const counts = { callBacks: r.callBacks.length, ...Object.fromEntries(r.groups.map((g) => [g.key, g.jobs.length])) };
  const mail = renderDailyReminder(r);
  if (!mail) return { sent: false, counts };
  const out = await sendEmail("daily-reminder", {
    from: process.env.RESEND_FROM_EMAIL || "Advanced Gas Website <onboarding@resend.dev>",
    to: REMINDER_TO, subject: mail.subject, text: mail.text, html: mail.html,
  });
  return out.ok ? { sent: true, counts } : { sent: false, counts, error: out.error };
}
