/**
 * How long each kind of job should take, for the Daily pace page.
 *
 * The board compares a tech's hours against what the job was quoted to take,
 * and that quoted time comes from the labour lines on the invoice. Most service
 * work is billed without one: over thirty days only 76 of 268 timesheet spans
 * had quoted hours at all, which left three cards in five with nothing to
 * measure against.
 *
 * So the office can set a standard time per job type here, and any job whose
 * invoice carries no hours falls back to it. A quote still wins where there is
 * one — it is the figure the customer was actually given — and a type left
 * unset stays unset rather than defaulting to something nobody chose.
 */

import { getSettings, saveSettings } from "@/lib/portal/db";
import { q, sbSelect } from "@/lib/dashboard/db";
import { STANDARD_HOURS_KEY, normaliseStandardHours, type StandardHours } from "@/lib/dashboard/dailyPace";

export { STANDARD_HOURS_KEY, normaliseStandardHours, type StandardHours };

export type JobTypeRow = {
  name: string;
  /** Jobs of this type in the last 90 days, so the list sorts by what matters. */
  jobs: number;
  /** The standard set for it, or null. */
  hours: number | null;
  /** How many of its recent jobs already carry quoted hours from an invoice. */
  quoted: number;
};

export async function readStandardTimes(): Promise<{ rows: JobTypeRow[]; set: number }> {
  const [stored, types, recent, billed] = await Promise.all([
    getSettings<unknown>(STANDARD_HOURS_KEY).catch(() => null),
    sbSelect<{ name: string | null }>("st_job_types", q.select("name")).catch(() => []),
    sbSelect<{ id: number; job_type: string | null }>(
      "st_jobs",
      [q.select("id,job_type"), q.gte("created_on", new Date(Date.now() - 90 * 86_400_000).toISOString())].join("&"),
    ).catch(() => []),
    sbSelect<{ job_id: number | null; sold_hours: number | null }>(
      "st_invoices_billed",
      [q.select("job_id,sold_hours"), q.gte("invoice_date", new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10))].join("&"),
    ).catch(() => []),
  ]);

  const hours = normaliseStandardHours(stored);
  const quotedJobs = new Set(billed.filter((b) => Number(b.sold_hours ?? 0) > 0).map((b) => Number(b.job_id)));

  const count = new Map<string, { jobs: number; quoted: number }>();
  for (const j of recent) {
    const t = j.job_type;
    if (!t) continue;
    const got = count.get(t) ?? { jobs: 0, quoted: 0 };
    got.jobs++;
    if (quotedJobs.has(Number(j.id))) got.quoted++;
    count.set(t, got);
  }

  // Every type the lookup knows, plus any seen on a job but not in it, so a
  // type cannot quietly be missing from the page it is meant to be set on.
  const names = new Set<string>([
    ...types.map((t) => t.name).filter((n): n is string => !!n),
    ...count.keys(),
    ...Object.keys(hours),
  ]);

  const rows: JobTypeRow[] = [...names].map((name) => ({
    name,
    jobs: count.get(name)?.jobs ?? 0,
    quoted: count.get(name)?.quoted ?? 0,
    hours: hours[name] ?? null,
  }));

  // Busiest first: the office should spend its time on the types that actually
  // turn up, not on the one job of something from February.
  rows.sort((a, b) => b.jobs - a.jobs || a.name.localeCompare(b.name));
  return { rows, set: Object.keys(hours).length };
}

export async function saveStandardTimes(next: StandardHours): Promise<void> {
  await saveSettings(STANDARD_HOURS_KEY, normaliseStandardHours(next));
}
