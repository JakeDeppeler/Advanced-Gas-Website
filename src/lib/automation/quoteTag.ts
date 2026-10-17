import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { stFetch, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { loadSwitches, logAuto, type AutoEntry } from "./log";

/** Jobs fixed per run: a backlog clears over a few runs rather than all at once against ServiceTitan's rate limit. */
const PER_RUN = 25;

type Job = { id: number; job_number: string | null };

/**
 * Take "Awaiting Quote Approval" off a job once the quote has plainly been
 * answered: the job has been invoiced, it's booked in for a visit to come, or
 * a job has been booked from its quote. Left on, the tag sends the office
 * chasing customers who've already said yes.
 *
 * Read from the replica to find them, but each job's tags are read fresh from
 * ServiceTitan before the change, and only that one tag comes off: ServiceTitan
 * replaces a job's whole tag list on update, and the office's other tags stay.
 */
export async function clearApprovedQuoteTags(): Promise<{ removed: number; failed: number; skipped?: string }> {
  if (!(await loadSwitches()).quoteTag) return { removed: 0, failed: 0, skipped: "switched off" };
  const tags = await sbSelect<{ id: number; name: string | null }>("st_job_tags", q.select("id,name"));
  const tag = tags.find((t) => /awaiting\s+quote\s+approval/i.test(t.name ?? ""));
  if (!tag) return { removed: 0, failed: 0, skipped: "no such tag" };

  const tagged = await sbSelect<Job>("st_jobs", [q.select("id,job_number"), `raw->tagTypeIds=cs.[${tag.id}]`, "limit=1000"].join("&"));
  if (!tagged.length) return { removed: 0, failed: 0 };
  const ids = tagged.map((j) => j.id);
  const inList = (col: string, xs: (number | string)[]) => `${col}=in.(${xs.join(",")})`;
  const chunks = <T,>(xs: T[], n = 150) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
  const many = async <T,>(table: string, cols: string, col: string, xs: (number | string)[], extra: string[] = []) =>
    (await Promise.all(chunks(xs).map((c) => sbSelect<T>(table, [q.select(cols), inList(col, c), ...extra].join("&"))))).flat();

  const now = new Date().toISOString();
  const [invoiced, visits, ests] = await Promise.all([
    many<{ job_id: number }>("st_invoices", "job_id", "job_id", ids, ["total=gt.0"]),
    // Status filtered here rather than in the query: neq leaves out rows with no status at all.
    many<{ job_id: number; status: string | null }>("st_appointments", "job_id,status", "job_id", ids, [`start_at=gt.${now}`]).then((r) => r.filter((a) => a.status !== "Canceled")),
    many<{ id: number; job_id: number }>("st_estimates", "id,job_id", "job_id", ids),
  ]);
  const booked = ests.length
    ? await many<{ est: string | null; status: string | null }>("st_jobs", "est:raw->>createdFromEstimateId,status", "raw->>createdFromEstimateId", ests.map((e) => e.id))
    : [];
  const bookedEst = new Set(booked.filter((b) => b.status !== "Canceled").map((b) => Number(b.est)));
  const why = new Map<number, string>();
  for (const i of invoiced) why.set(i.job_id, "it's been invoiced");
  for (const v of visits) if (!why.has(v.job_id)) why.set(v.job_id, "it's booked in for a visit");
  for (const e of ests) if (bookedEst.has(e.id) && !why.has(e.job_id)) why.set(e.job_id, "a job's been booked from its quote");

  const log: AutoEntry[] = [];
  let removed = 0, failed = 0;
  for (const j of tagged.filter((t) => why.has(t.id)).slice(0, PER_RUN)) {
    const label = j.job_number ? `Job ${j.job_number}` : `Job ${j.id}`;
    try {
      const fresh = await stFetch<{ tagTypeIds?: number[] }>(stTenantPath("jpm", `jobs/${j.id}`));
      if (!Array.isArray(fresh.tagTypeIds)) throw new Error("ServiceTitan didn't return the job's tags");
      if (!fresh.tagTypeIds.includes(tag.id)) continue; // already off; the replica hasn't caught up
      await stSend("PATCH", stTenantPath("jpm", `jobs/${j.id}`), { tagTypeIds: fresh.tagTypeIds.filter((x) => x !== tag.id) });
      removed++;
      log.push({ at: new Date().toISOString(), kind: "quote-tag", ok: true, jobId: j.id, title: `${label}: took off "Awaiting Quote Approval"`, detail: `Because ${why.get(j.id)}.` });
    } catch (e) {
      failed++;
      log.push({ at: new Date().toISOString(), kind: "quote-tag", ok: false, jobId: j.id, title: `${label}: couldn't take off "Awaiting Quote Approval"`, detail: (e as Error).message.slice(0, 200) });
    }
  }
  await logAuto(log).catch(() => undefined);
  return { removed, failed };
}
