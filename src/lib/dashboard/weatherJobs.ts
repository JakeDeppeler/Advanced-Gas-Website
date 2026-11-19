import "server-only";

import { TZ } from "@/lib/dashboard/dates";
import { PAGE, q, sbSelect } from "@/lib/dashboard/db";
import { DEFAULT_JOB_HOURS, needsOf, weatherMatters, type BookedJob } from "@/lib/dashboard/weatherJobsTypes";
import { CHECK_SHUT_SECONDS, checkEverySeconds } from "@/lib/dashboard/weatherTypes";

/*
 * The diary, for as far ahead as the forecast reaches.
 *
 * One read of the appointments, one of the jobs behind them, one of the job
 * types for their slot lengths. The filtering down to weather-sensitive work
 * happens here rather than in the query, because the rule that decides it is
 * a set of patterns over the type's name and belongs with the other rules
 * where the check script can reach it.
 */

/**
 * The week from today, which is what Jake asked the check to cover and also
 * as far as the forecast usefully reaches.
 */
const DAYS_AHEAD = 7;

/*
 * The diary is read on the same clock as the forecast — half-hourly through
 * the working day, four-hourly outside it.
 *
 * "A weather check every 30 minutes against jobs" is one operation, not two,
 * and the two halves disagreeing would be worse than either being slow. It
 * also takes three table reads off every thirty-second snapshot recompute,
 * which is what this was doing before.
 */
let lastRead: { at: number; value: BookedJob[] } | null = null;

function holdFor(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(now);
  const num = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? NaN);
  const minute = num("hour") * 60 + num("minute");
  return Number.isFinite(minute) ? checkEverySeconds(minute) : CHECK_SHUT_SECONDS;
}

/**
 * Appointment statuses that are still work somebody expects to do.
 *
 * "Hold" is excluded on purpose. A held job is already not going ahead, so
 * putting it on a page headed "what the weather might move" would be the
 * board inventing a weather problem for a job that has an office problem.
 */
const LIVE_STATUSES = new Set(["Scheduled", "Dispatched", "Working", "InProgress"]);

type ApptRow = { job_id: number | null; start_at: string | null; status: string | null; active: boolean | null };
type JobRow = { id: number; job_number: string | null; job_type: string | null; job_type_id: number | null; status: string | null; suburb: string | null };
type TypeRow = { id: number; raw: { duration?: number | null } | null };

/** The Melbourne date and hour of a UTC instant. */
function melbourneParts(iso: string): { date: string; hour: number } | null {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(t);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const hour = Number(get("hour")) % 24;
  return date.length === 10 && Number.isFinite(hour) ? { date, hour } : null;
}

/**
 * Every booked job in the next week that the weather has a bearing on.
 *
 * Returns an empty list rather than throwing: the page says "nothing booked
 * that the weather touches", which is a true and useful thing for it to say,
 * and a failed read is reported by the source light beside it.
 */
export async function readBookedJobs(now: Date = new Date()): Promise<BookedJob[]> {
  if (lastRead && now.getTime() - lastRead.at < holdFor(now) * 1000) return lastRead.value;

  const from = now.toISOString();
  const to = new Date(now.getTime() + DAYS_AHEAD * 86_400_000).toISOString();

  const appts = await sbSelect<ApptRow>(
    "st_appointments",
    [q.select("job_id,start_at,status,active"), q.gte("start_at", from), q.lt("start_at", to), PAGE].join("&"),
  );

  /** Remember whatever we worked out, including that there was nothing. */
  const keep = (value: BookedJob[]): BookedJob[] => {
    lastRead = { at: now.getTime(), value };
    return value;
  };

  const live = appts.filter(
    (a) => a.job_id != null && a.start_at && a.active !== false && LIVE_STATUSES.has(String(a.status ?? "")),
  );
  if (live.length === 0) return keep([]);

  // One row per job: a job with two appointments in the week is listed at the
  // earlier of them, because that is the one the weather would move first.
  const earliest = new Map<number, string>();
  for (const a of live) {
    const id = Number(a.job_id);
    const at = String(a.start_at);
    const held = earliest.get(id);
    if (!held || at < held) earliest.set(id, at);
  }

  const ids = [...earliest.keys()];
  const jobs = await sbSelect<JobRow>(
    "st_jobs",
    [
      q.select("id,job_number,job_type,job_type_id,status,suburb"),
      `id=in.(${ids.join(",")})`,
      PAGE,
    ].join("&"),
  );

  const wanted = jobs.filter(
    (j) =>
      j.job_type != null &&
      // The job's own status, as well as the appointment's: a canceled job can
      // keep a Scheduled appointment row behind it.
      String(j.status ?? "") !== "Canceled" &&
      weatherMatters(needsOf(j.job_type)),
  );
  if (wanted.length === 0) return keep([]);

  /*
   * The slot the office booked, which is how long somebody is actually on the
   * roof. The same `raw.duration` the Crew and Job types pages read as "time
   * allowed" — one definition of a job's length across the board.
   */
  const typeIds = [...new Set(wanted.map((j) => j.job_type_id).filter((v): v is number => v != null))];
  const types = typeIds.length
    ? await sbSelect<TypeRow>("st_job_types", [q.select("id,raw"), `id=in.(${typeIds.join(",")})`, PAGE].join("&"))
    : [];
  const slotOf = new Map<number, number>();
  for (const t of types) {
    const secs = Number(t.raw?.duration ?? 0);
    if (Number.isFinite(secs) && secs > 0) slotOf.set(Number(t.id), secs / 3600);
  }

  const out: BookedJob[] = [];
  for (const j of wanted) {
    const at = earliest.get(Number(j.id));
    const when = at ? melbourneParts(at) : null;
    if (!when) continue;
    const slot = j.job_type_id != null ? slotOf.get(Number(j.job_type_id)) : undefined;
    out.push({
      jobId: Number(j.id),
      number: j.job_number ? String(j.job_number) : String(j.id),
      type: String(j.job_type),
      suburb: j.suburb ?? null,
      date: when.date,
      hour: when.hour,
      /*
       * A multi-day slot is clamped to the day for the "does it rain during
       * this job" question — a ducted refrigerated install is booked for
       * twenty hours, and asking "does it rain between 7am and 3am tomorrow"
       * would put rain on every one of them.
       *
       * But the fact that it IS multi-day is kept, because the day after
       * matters to a job that opens a ceiling on day one.
       */
      hours: Math.min(slot ?? DEFAULT_JOB_HOURS, 10),
      multiDay: (slot ?? DEFAULT_JOB_HOURS) > 10,
    });
  }
  return keep(out.sort((a, b) => a.date.localeCompare(b.date) || a.hour - b.hour));
}
