/**
 * Held work: every open job that is waiting on something, and what it is
 * waiting on.
 *
 * **Why this page exists.** The board's other pages count what moved. This one
 * counts what hasn't, which is the question the office actually argues about on
 * a Monday: 44 quotes sitting with customers, 16 installs sold with the
 * materials never ordered, and a commercial job at Simpson Barracks tagged
 * urgent that has been open ninety days. None of that appears in a revenue
 * figure until it either lands or dies.
 *
 * **Where the reason comes from.** ServiceTitan has no "on hold because" field.
 * What it has is tags, and this office uses them for exactly that — `st_jobs.raw`
 * carries `tagTypeIds` and `st_job_tags` carries the names behind them (see
 * migration 0071). The names are the office's own words, so the rules about
 * which of them mean "held" are in `onHoldTypes.ts` and editable in the portal.
 *
 * **What is deliberately not counted.** The 92 `InProgress` jobs carrying no
 * tag at all, averaging 77 days. Those are almost certainly jobs nobody closed
 * out rather than jobs anybody is waiting on, and putting them on the wall as
 * held work would swamp the real list with a records-keeping problem. Same for
 * the untagged `Scheduled` ones: a job booked for Thursday is not held.
 */

import { q, sbSelect } from "./db";
import { getSettings } from "@/lib/portal/db";
// The same ceiling as every other quote figure on the board. Imported from
// metrics rather than copied: two definitions of "too big for this wall" would
// drift, and the Quotes page and this one would then disagree about one job.
import { QUOTE_CAP } from "./metrics";
import {
  HOLD_TAGS_KEY,
  holdRules,
  normaliseHoldTags,
  sortHeld,
  worstSide,
  type HeldJob,
  type HoldReason,
  type HoldSide,
  type OnHold,
} from "./onHoldTypes";

export * from "./onHoldTypes";

/** Statuses that can be held. Completed and Canceled work is nobody's problem. */
const OPEN = ["Scheduled", "InProgress", "Hold"];

type JobRow = {
  id: number;
  job_number: string | null;
  status: string | null;
  job_type: string | null;
  suburb: string | null;
  customer_name: string | null;
  created_on: string | null;
  /** `raw->tagTypeIds`, which PostgREST hands back as a JSON array. */
  tags: unknown;
};

const days = (from: string | null, now: Date) =>
  from ? Math.max(0, Math.round((now.getTime() - Date.parse(from)) / 86_400_000)) : 0;

/**
 * The held list. Null when nothing is held, which the page shows as a clear
 * board rather than a row of zeroes.
 */
export async function onHold(now: Date = new Date()): Promise<OnHold | null> {
  const [jobs, tags, savedRaw] = await Promise.all([
    sbSelect<JobRow>(
      "st_jobs",
      [
        q.select("id,job_number,status,job_type,suburb,customer_name,created_on,tags:raw->tagTypeIds"),
        `status=in.(${OPEN.join(",")})`,
      ].join("&"),
    ).catch(() => []),
    sbSelect<{ id: number; name: string | null }>("st_job_tags", q.select("id,name")).catch(() => []),
    getSettings<unknown>(HOLD_TAGS_KEY).catch(() => null),
  ]);

  if (jobs.length === 0) return null;

  const tagName = new Map(tags.map((t) => [Number(t.id), (t.name ?? "").trim()]).filter(([, n]) => !!n) as [number, string][]);
  const { side, configured } = holdRules(normaliseHoldTags(savedRaw), [...tagName.values()]);

  const held = jobs
    .map((j) => {
      const ids = Array.isArray(j.tags) ? j.tags : [];
      const reasons: string[] = [];
      const sides: HoldSide[] = [];
      for (const id of ids) {
        const name = tagName.get(Number(id));
        if (!name) continue;
        const s = side.get(name);
        if (!s) continue;
        reasons.push(name);
        sides.push(s);
      }
      return { j, reasons, sides };
    })
    .filter((x) => x.reasons.length > 0);

  if (held.length === 0) return null;

  /*
   * What the quote on a held job is worth.
   *
   * The average of its options, and the sold option's own total once one has
   * sold — the same rule the Quotes page uses for what is still out. Options
   * are good/better/best (one job here carries sixteen), so the top one is not
   * a figure to put on a wall, and the mean is the expected ticket. Capped like
   * everywhere else so a commercial fit-out cannot set the scale of a
   * residential board.
   */
  const jobIds = held.map((x) => Number(x.j.id));
  const estimates = jobIds.length
    ? await sbSelect<{ job_id: number | null; total: number | null; sold_on: string | null }>(
        "st_estimates",
        [q.select("job_id,total:total_inc,sold_on"), `job_id=in.(${jobIds.join(",")})`].join("&"),
      ).catch(() => [])
    : [];

  const priced = new Map<number, { sum: number; n: number; sold: number | null; biggest: number }>();
  for (const e of estimates) {
    if (e.job_id == null) continue;
    const k = Number(e.job_id);
    const total = Number(e.total ?? 0);
    const got = priced.get(k) ?? { sum: 0, n: 0, sold: null, biggest: 0 };
    got.sum += total;
    got.n += 1;
    got.biggest = Math.max(got.biggest, total);
    if (e.sold_on) got.sold = total;
    priced.set(k, got);
  }

  const list: HeldJob[] = held.map(({ j, reasons, sides }) => {
    const p = priced.get(Number(j.id));
    const value =
      !p || p.n === 0 || p.biggest >= QUOTE_CAP ? null : p.sold != null ? p.sold : p.sum / p.n;
    return {
      jobId: Number(j.id),
      jobNumber: j.job_number ?? null,
      what: j.job_type ?? "Job",
      who: j.customer_name ?? null,
      where: j.suburb ?? null,
      ageDays: days(j.created_on, now),
      value,
      // Oldest reason first would need a per-tag date, which ServiceTitan does
      // not carry. Alphabetical is at least stable, so a tile does not reshuffle
      // its own wording every thirty seconds.
      reasons: [...reasons].sort((a, b) => a.localeCompare(b)),
      side: worstSide(sides),
      sold: p?.sold != null,
    };
  });

  list.sort(sortHeld);

  const byReason = new Map<string, HoldReason>();
  for (const job of list) {
    for (const name of job.reasons) {
      const got = byReason.get(name) ?? { name, side: side.get(name) ?? "us", jobs: 0, value: 0, oldestDays: 0 };
      got.jobs += 1;
      got.value += job.value ?? 0;
      got.oldestDays = Math.max(got.oldestDays, job.ageDays);
      byReason.set(name, got);
    }
  }

  /*
   * Biggest first, not ours first.
   *
   * Ours-first read well until the page was looked at: the single largest
   * thing on the board — 44 quotes sitting with customers — fell off the
   * bottom behind eight smaller piles of our own, and the tile headed "what
   * we're waiting on" did not mention it. The side is on every band in words,
   * so the room can still tell the two apart; the order is just size.
   */
  const reasons = [...byReason.values()].sort(
    (a, b) => b.jobs - a.jobs || b.oldestDays - a.oldestDays || a.name.localeCompare(b.name),
  );

  const ours = list.filter((x) => x.side === "us");
  const theirs = list.filter((x) => x.side === "them");

  return {
    jobs: list,
    reasons,
    jobsOnUs: ours.length,
    jobsOnThem: theirs.length,
    valueOnUs: ours.reduce((n, x) => n + (x.value ?? 0), 0),
    valueOnThem: theirs.reduce((n, x) => n + (x.value ?? 0), 0),
    unpriced: list.filter((x) => x.value == null).length,
    configured,
  };
}
