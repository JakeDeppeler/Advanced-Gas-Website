import { q, sbSelect } from "./db";
import { onHold } from "./onHold";

/**
 * Every job in ServiceTitan, three ways: open, on hold, completed.
 *
 * On hold is the board's definition and then some: a job ServiceTitan has put
 * on Hold, or an open job carrying one of the hold tags (waiting on parts, on
 * the customer, on an agent's approval — Settings › On hold). Open is
 * Scheduled or In progress and not on hold. Completed is newest first.
 *
 * Jobs copied across from the old system when ServiceTitan went in came with
 * whatever status they had, and a hundred-odd of them still read Scheduled or
 * In progress from June. They're kept apart (`old`) so the open list is the
 * work that's actually open; one click shows them too.
 */

export type JobFilter = "open" | "hold" | "done";

export type ListedJob = {
  id: number;
  jobNumber: string | null;
  jobType: string | null;
  customer: string | null;
  suburb: string | null;
  status: string | null;
  createdOn: string | null;
  completedOn: string | null;
  nextVisit: string | null;
  /** Why it's held, from its tags; empty when ServiceTitan's own Hold status is all there is. */
  holdReasons: string[];
  /** Copied in from the old system rather than booked in ServiceTitan. */
  old: boolean;
};

export type JobList = { filter: JobFilter; jobs: ListedJob[]; counts: Record<JobFilter, number>; oldHidden: number; capped: boolean };

const DONE_LIMIT = 300;
// ServiceTitan's own job numbers start at 20000; the old system's were below.
const isOld = (j: { job_number: string | null; job_type: string | null }) => !j.job_type || Number(j.job_number) < 20000;
// PostgREST's or=() is split on commas and brackets; a search term never needs them.
const clean = (s: string) => s.replace(/[(),*%\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);

type Row = { id: number; job_number: string | null; job_type: string | null; customer_name: string | null; suburb: string | null; status: string | null; created_on: string | null; completed_on: string | null };
const COLS = "id,job_number,job_type,customer_name,suburb,status,created_on,completed_on";

export async function listJobs(filter: JobFilter, opts: { search?: string; withOld?: boolean } = {}): Promise<JobList> {
  const term = clean(opts.search ?? "");
  const like = term.length >= 2 ? `&or=(${["job_number", "customer_name", "suburb"].map((c) => `${c}.ilike.${encodeURIComponent(`*${term}*`)}`).join(",")})` : "";

  const [openRows, held, doneRows] = await Promise.all([
    sbSelect<Row>("st_jobs", `select=${COLS}&status=in.(Scheduled,InProgress,Hold)${like}&limit=5000`),
    onHold().catch(() => null),
    filter === "done"
      ? sbSelect<Row>("st_jobs", `select=${COLS}&status=eq.Completed${like}&order=completed_on.desc.nullslast&limit=${DONE_LIMIT}`)
      : Promise.resolve([] as Row[]),
  ]);

  const reasons = new Map((held?.jobs ?? []).map((h) => [h.jobId, h.reasons]));
  const onHoldNow = (r: Row) => r.status === "Hold" || reasons.has(Number(r.id));
  const holdRows = openRows.filter(onHoldNow);
  const openOnly = openRows.filter((r) => !onHoldNow(r));

  const pick = filter === "hold" ? holdRows : filter === "open" ? openOnly : doneRows;
  const oldHidden = filter === "done" || opts.withOld ? 0 : pick.filter(isOld).length;
  const rows = filter === "done" || opts.withOld ? pick : pick.filter((r) => !isOld(r));

  const ids = rows.map((r) => Number(r.id));
  const next = new Map<number, string | null>();
  for (let i = 0; i < ids.length && filter !== "done"; i += 200) {
    const visits = await sbSelect<{ job_id: number; start_at: string | null }>("job_next_appointment", `select=job_id,start_at&job_id=in.(${ids.slice(i, i + 200).join(",")})`).catch(() => []);
    for (const v of visits) next.set(Number(v.job_id), v.start_at);
  }

  const jobs: ListedJob[] = rows.map((r) => ({
    id: Number(r.id), jobNumber: r.job_number, jobType: r.job_type, customer: r.customer_name, suburb: r.suburb, status: r.status,
    createdOn: r.created_on, completedOn: r.completed_on, nextVisit: next.get(Number(r.id)) ?? null,
    holdReasons: reasons.get(Number(r.id)) ?? [], old: isOld(r),
  }));
  if (filter === "open") {
    // The next visit first, then the oldest booking: what's coming, then what's been waiting.
    jobs.sort((a, b) => (a.nextVisit ?? "9999").localeCompare(b.nextVisit ?? "9999") || (a.createdOn ?? "").localeCompare(b.createdOn ?? ""));
  } else if (filter === "hold") {
    jobs.sort((a, b) => (a.createdOn ?? "").localeCompare(b.createdOn ?? ""));
  }

  const counted = (list: Row[]) => (opts.withOld ? list.length : list.filter((r) => !isOld(r)).length);
  return {
    filter,
    jobs,
    counts: { open: counted(openOnly), hold: counted(holdRows), done: filter === "done" ? doneRows.length : 0 },
    oldHidden,
    capped: filter === "done" && doneRows.length >= DONE_LIMIT,
  };
}
