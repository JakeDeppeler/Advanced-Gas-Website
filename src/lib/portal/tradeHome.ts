import "server-only";
import { cache } from "react";
import { q, sbSelect } from "@/lib/dashboard/db";
import { QUOTE_CAP, quoteKey, quotes } from "@/lib/dashboard/metrics";
import { dbConfigured } from "@/lib/portal/db";
import { latestBoard } from "@/lib/portal/office";

/**
 * What the trade home says about one person's selling — read from the same
 * replica and by the same rules as the wall board, so a tech's own figure and
 * their line on the Team page can't disagree.
 */

/**
 * ServiceTitan's name for a portal user. Most match exactly; where the two
 * spellings drifted ("Winbank" in the portal, "Winbanks" in ServiceTitan) the
 * same first name and a surname one begins with the other is the same person.
 */
export function sameSeller(portal: string, st: string): boolean {
  const a = portal.trim().toLowerCase().split(/\s+/);
  const b = st.trim().toLowerCase().split(/\s+/);
  if (a.join(" ") === b.join(" ")) return true;
  if (a.length < 2 || b.length < 2 || a[0] !== b[0]) return false;
  const la = a[a.length - 1], lb = b[b.length - 1];
  return la.length >= 4 && lb.length >= 4 && (la.startsWith(lb) || lb.startsWith(la));
}

export type MyMonth = {
  /** Null when the board has no row for this person: nothing sold or quoted, or no match. */
  sold: number;
  soldJobs: number;
  quoted: number;
  quotedJobs: number;
  closeRate: number | null;
  month: string;
} | null;

/** This person's line on the board's leaderboard, this month. */
export const myMonth = cache(async (name: string): Promise<MyMonth> => {
  const snap = await latestBoard();
  const m = snap?.metrics;
  if (!m) return null;
  const row = m.salesLeaderboard.find((r) => sameSeller(name, r.name));
  const month = new Date().toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", month: "long" });
  if (!row) return { sold: 0, soldJobs: 0, quoted: 0, quotedJobs: 0, closeRate: null, month };
  return { sold: row.sold, soldJobs: row.soldJobs, quoted: row.quoted, quotedJobs: row.quotedJobs, closeRate: row.closeRate, month };
});

export type MyQuotes = { open: number; quiet: number; quietestDays: number | null; value: number } | null;

/**
 * Quotes this person wrote in the last 30 days that haven't closed: one per
 * job, not per option, and "quiet" when the newest option on the job is a week
 * old — the same rule the office's quiet-quotes list uses.
 */
export const myOpenQuotes = cache(async (name: string): Promise<MyQuotes> => {
  if (!dbConfigured()) return null;
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  try {
    const rows = quotes(await sbSelect<{
      id: number; total: number | null; created_on: string | null; job_id: number | null;
      customer_id: number | null; business_unit: string | null; created_by: string | null;
    }>("st_estimates", [
      q.select("id,total,created_on,job_id,customer_id,business_unit,created_by"),
      // A prefix match on first name and surname, then checked properly below.
      `created_by=ilike.${encodeURIComponent(`${parts[0]} ${parts[parts.length - 1].slice(0, 4)}`)}*`,
      q.isNull("sold_on"),
      q.notIn("status", ["Dismissed", "Expired"]),
      q.gte("created_on", since),
      q.lt("total", String(QUOTE_CAP)),
    ].join("&")));
    const jobs = new Map<string, { newest: number; value: number; n: number }>();
    for (const r of rows) {
      if (!r.created_by || !sameSeller(name, r.created_by) || !r.created_on) continue;
      const k = quoteKey(r);
      const j = jobs.get(k) ?? { newest: 0, value: 0, n: 0 };
      j.newest = Math.max(j.newest, Date.parse(r.created_on));
      j.value += Number(r.total ?? 0);
      j.n += 1;
      jobs.set(k, j);
    }
    const now = Date.now();
    const ages = [...jobs.values()].map((j) => Math.floor((now - j.newest) / 86_400_000));
    const quiet = ages.filter((a) => a >= 7);
    return {
      open: jobs.size,
      quiet: quiet.length,
      quietestDays: quiet.length ? Math.max(...quiet) : null,
      value: [...jobs.values()].reduce((s, j) => s + j.value / j.n, 0),
    };
  } catch {
    return null;
  }
});
