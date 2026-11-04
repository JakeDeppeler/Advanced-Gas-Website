import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";

/**
 * What ServiceTitan knows about whoever sent the email, for the draft.
 *
 * This is what the off-the-shelf drafting tools can't do: "when's my tech
 * coming?" answered from the booking, not with "I'll check". The sender is
 * matched on their email address against customer and site contacts (the
 * indexed match_key from 0095), and a job number in the subject is looked up
 * directly, which is how the office and the builders refer to jobs.
 *
 * Read from the replica the dashboard sync keeps, so it is at most a sync
 * behind. Only what a customer could be told is passed on: the job, its
 * status and the booked arrival window. Nothing about money.
 */

type Job = { id: number; job_number: string | null; status: string | null; job_type: string | null; customer_id: number | null; customer_name: string | null; suburb: string | null; created_on: string | null; completed_on: string | null };
type Appt = { job_id: number; start_at: string | null; arrival_window_start: string | null; arrival_window_end: string | null; status: string | null };

const JOB_COLS = "id,job_number,status,job_type,customer_id,customer_name,suburb,created_on,completed_on";

const when = (iso: string | null, withTime = true) => {
  const t = Date.parse(iso ?? "");
  if (!Number.isFinite(t)) return null;
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(t);
};

const time = (iso: string | null) => {
  const t = Date.parse(iso ?? "");
  return Number.isFinite(t) ? new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", hour: "numeric", minute: "2-digit" }).format(t) : null;
};

export async function customerContext(from: string, subject: string): Promise<string> {
  const email = from.trim().toLowerCase();
  const nums = [...new Set([...subject.matchAll(/(?<![\d$.,])(\d{5,6})(?![\d,.])/g)].map((m) => m[1]))].slice(0, 3);

  const [cust, loc, named] = await Promise.all([
    sbSelect<{ customer_id: number }>("st_customer_contacts", [q.select("customer_id"), q.eq("match_key", email)].join("&")).catch(() => []),
    sbSelect<{ location_id: number }>("st_location_contacts", [q.select("location_id"), q.eq("match_key", email)].join("&")).catch(() => []),
    nums.length ? sbSelect<Job>("st_jobs", [q.select(JOB_COLS), `job_number=in.(${nums.join(",")})`].join("&")).catch(() => []) : Promise.resolve([] as Job[]),
  ]);

  const custIds = [...new Set(cust.map((c) => c.customer_id).filter(Boolean))].slice(0, 5);
  const locIds = [...new Set(loc.map((l) => l.location_id).filter(Boolean))].slice(0, 5);

  const [byCust, byLoc] = await Promise.all([
    custIds.length ? sbSelect<Job>("st_jobs", [q.select(JOB_COLS), `customer_id=in.(${custIds.join(",")})`, q.order("created_on", "desc", "last"), "limit=6"].join("&")).catch(() => []) : Promise.resolve([] as Job[]),
    locIds.length ? sbSelect<Job>("st_jobs", [q.select(JOB_COLS), `location_id=in.(${locIds.join(",")})`, q.order("created_on", "desc", "last"), "limit=6"].join("&")).catch(() => []) : Promise.resolve([] as Job[]),
  ]);

  const known = custIds.length > 0 || locIds.length > 0;
  const jobs = new Map<number, Job & { named: boolean }>();
  for (const j of named) jobs.set(j.id, { ...j, named: true });
  for (const j of [...byCust, ...byLoc]) if (!jobs.has(j.id)) jobs.set(j.id, { ...j, named: false });
  const list = [...jobs.values()].slice(0, 8);
  if (!known && !list.length) return "";

  const appts = list.length
    ? await sbSelect<Appt>("st_appointments", [q.select("job_id,start_at,arrival_window_start,arrival_window_end,status"), `job_id=in.(${list.map((j) => j.id).join(",")})`, "active=is.true", q.order("start_at", "asc", "last")].join("&")).catch(() => [])
    : [];

  const now = Date.now();
  const lines = list.map((j) => {
    const next = appts.find((a) => a.job_id === j.id && Date.parse(a.start_at ?? "") >= now - 12 * 3600 * 1000);
    const parts = [
      `Job ${j.job_number ?? j.id}${j.named ? " (the number in the subject)" : ""}`,
      j.job_type,
      j.suburb,
      j.customer_name ? `customer: ${j.customer_name}` : null,
      `status: ${j.status ?? "unknown"}`,
      j.created_on ? `opened ${when(j.created_on, false)}` : null,
      j.completed_on ? `completed ${when(j.completed_on, false)}` : null,
    ];
    if (next) {
      const window = next.arrival_window_start && next.arrival_window_end ? `arrival window ${time(next.arrival_window_start)}–${time(next.arrival_window_end)}` : null;
      parts.push(`booked for ${when(next.start_at)}${window ? `, ${window}` : ""}`);
    }
    return `- ${parts.filter(Boolean).join(" · ")}`;
  });

  return [
    known ? `The sender's email address is on a customer record in ServiceTitan.` : `The sender isn't matched to a customer in ServiceTitan by email.`,
    lines.length ? `Their jobs, newest first:\n${lines.join("\n")}` : "No jobs found for them.",
  ].join("\n");
}
