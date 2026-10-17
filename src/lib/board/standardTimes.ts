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
import { q, sbSelect, sbUpdate } from "@/lib/dashboard/db";
import { stFetch, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { STANDARD_HOURS_KEY, normaliseStandardHours, type StandardHours } from "@/lib/dashboard/dailyPace";
import { VEU_REBATE_KEY, normaliseRebate } from "@/lib/dashboard/soldMarginTypes";

export { STANDARD_HOURS_KEY, normaliseStandardHours, type StandardHours };

/**
 * What a VEU rebate is worth per job.
 *
 * A VEU job is sold at a reduced price because the rebate covers the rest, so
 * on the estimate alone it reads thin and sometimes below cost — the accounting,
 * not the selling. The rebate is real income and nothing in ServiceTitan
 * records it, so it is set here. Unset means not counted: the board says the
 * rebate is missing rather than assuming a figure nobody chose.
 */
export async function readVeuRebate(): Promise<number | null> {
  return normaliseRebate(await getSettings<unknown>(VEU_REBATE_KEY).catch(() => null));
}

export async function saveVeuRebate(amount: number | null): Promise<void> {
  await saveSettings(VEU_REBATE_KEY, amount == null ? null : normaliseRebate(amount));
}

export type JobTypeRow = {
  name: string;
  /** Where the time came from: ServiceTitan's job type, or set here only. */
  from: "servicetitan" | "portal" | null;
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
    sbSelect<{ name: string | null; duration: string | null }>("st_job_types", q.select("name,duration:raw->>duration")).catch(() => []),
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
  const st = stHours(types);
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
  for (const n of [...names]) if (!count.has(n) && hours[n] == null && st[n] == null && !types.some((t) => t.name === n)) names.delete(n);

  const rows: JobTypeRow[] = [...names].map((name) => ({
    name,
    jobs: count.get(name)?.jobs ?? 0,
    quoted: count.get(name)?.quoted ?? 0,
    // Set here wins (a save ServiceTitan refused stays here); otherwise ServiceTitan's own duration.
    hours: hours[name] ?? st[name] ?? null,
    from: hours[name] != null ? "portal" as const : st[name] != null ? "servicetitan" as const : null,
  }));

  // Busiest first: the office should spend its time on the types that actually
  // turn up, not on the one job of something from February.
  rows.sort((a, b) => b.jobs - a.jobs || a.name.localeCompare(b.name));
  return { rows, set: rows.filter((r) => r.hours != null).length };
}

export async function saveStandardTimes(next: StandardHours): Promise<void> {
  await saveSettings(STANDARD_HOURS_KEY, normaliseStandardHours(next));
}

/** Job type durations from ServiceTitan, in hours; 0 means "not set" there. */
export function stHours(types: Array<{ name: string | null; duration: string | null }>): StandardHours {
  const out: StandardHours = {};
  for (const t of types) {
    const secs = Number(t.duration ?? 0);
    if (t.name && Number.isFinite(secs) && secs > 0) out[t.name] = Math.round((secs / 3600) * 100) / 100;
  }
  return out;
}

/**
 * Write a job type's duration in ServiceTitan, so the time is set in one
 * place and dispatch books the right length of slot too. The replica row is
 * updated to match, so the page shows it before the next sync. Throws with
 * ServiceTitan's refusal; the caller keeps the time here in that case.
 */
export async function pushDurationToServiceTitan(name: string, hours: number | null): Promise<void> {
  const rows = await sbSelect<{ id: number; raw: Record<string, unknown> | null }>("st_job_types", [q.select("id,raw"), `name=eq.${encodeURIComponent(name)}`].join("&"));
  const row = rows[0];
  if (!row) throw new Error("That job type isn't in ServiceTitan");
  const duration = hours == null ? 0 : Math.round(hours * 3600);
  await stSend("PATCH", stTenantPath("jpm", `job-types/${row.id}`), { duration });
  // Read it back: ServiceTitan can answer 200 and ignore a field.
  const back = await stFetch<{ duration?: number }>(stTenantPath("jpm", `job-types/${row.id}`));
  if (Number(back.duration ?? -1) !== duration) throw new Error("ServiceTitan didn't keep the new time");
  await sbUpdate("st_job_types", `id=eq.${row.id}`, { raw: { ...(row.raw ?? {}), duration } }).catch(() => undefined);
}
