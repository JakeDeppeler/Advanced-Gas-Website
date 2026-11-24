import "server-only";
import { stFetch, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { logAuto } from "@/lib/automation/log";

/**
 * A job's own summary in ServiceTitan, from a request queued in the
 * job_summary_queue setting: { jobs: [{ jobId, summary, why? }] }.
 *
 * Jake, 22 Nov: the short summary written for job 20801's install pack, put on
 * the job itself. The job write-up page writes quote and invoice summaries but
 * never the job's, and there's no page for this yet, so a queued row is the
 * request (put there at Jake's asking). Each one is done once and taken off the
 * queue; what it replaced is kept in job_summary_done, so it can be put back.
 *
 * A request says what it expects to replace (onlyIf), and a summary that has
 * changed since is left alone. The first run wrote over the office's own edit
 * of 20801's summary, made between the request and the write (22 Nov); it was
 * put back from job_summary_done. Only force writes without that check.
 */
const QUEUE = "job_summary_queue";
const DONE = "job_summary_done";

type Ask = { jobId: number; summary: string; why?: string; onlyIf?: string; force?: boolean };
type Done = { jobId: number; at: string; ok: boolean; previous?: string; error?: string; why?: string };

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** As ServiceTitan holds a summary: HTML, a paragraph each. */
const html = (t: string) => t.trim().split(/\n{2,}/).map((p) => esc(p).replace(/\n/g, "<br>")).join("<br><br>");
const plain = (h: string | null | undefined) => (h ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div)>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

export async function applyJobSummaryQueue(deadline: number): Promise<{ done: number }> {
  const q = (await getSettings<{ jobs?: Ask[] }>(QUEUE).catch(() => null))?.jobs ?? [];
  const asks = q.filter((a) => Number.isInteger(a?.jobId) && typeof a?.summary === "string" && a.summary.trim());
  if (!asks.length) return { done: 0 };
  const done = (await getSettings<{ jobs?: Done[] }>(DONE).catch(() => null))?.jobs ?? [];
  const left: Ask[] = [];
  let n = 0;
  for (const a of asks) {
    if (Date.now() > deadline - 10_000) { left.push(a); continue; }
    const path = stTenantPath("jpm", `jobs/${a.jobId}`);
    const want = plain(html(a.summary));
    const r: Done = { jobId: a.jobId, at: new Date().toISOString(), ok: false, why: a.why };
    try {
      const job = await stFetch<{ summary?: string | null; jobNumber?: string }>(path);
      r.previous = job.summary ?? "";
      if (!a.force && (a.onlyIf == null || plain(job.summary) !== plain(a.onlyIf))) {
        r.error = a.onlyIf == null ? "not written: the request didn't say what it replaces" : "not written: the summary on the job has changed since this was asked for";
        await logAuto([{ at: r.at, kind: "jobSummary", ok: false, jobId: a.jobId, title: `Job ${job.jobNumber ?? a.jobId}: summary left as it is`, detail: r.error }]).catch(() => undefined);
        done.unshift(r);
        n++;
        continue;
      }
      await stSend("PATCH", path, { summary: html(a.summary) });
      // A job can read back as it was for a moment after an update (the unit
      // fixes, 18 Nov), so a miss is looked at again before it counts.
      for (let i = 0; i < 3 && !r.ok; i++) {
        await new Promise((res) => setTimeout(res, 2000));
        r.ok = plain((await stFetch<{ summary?: string | null }>(path)).summary) === want;
      }
      if (!r.ok) r.error = "ServiceTitan didn't keep the new summary";
      await logAuto([{ at: r.at, kind: "jobSummary", ok: r.ok, jobId: a.jobId, title: `Job ${job.jobNumber ?? a.jobId}: ${r.ok ? "summary replaced" : "summary not replaced"}`, detail: (r.error ?? want).slice(0, 300) }]).catch(() => undefined);
    } catch (e) {
      r.error = (e as Error).message.slice(0, 200);
    }
    done.unshift(r);
    n++;
  }
  // Done ones off the queue first, so a failure saving the record can't write a summary twice.
  await saveSettings(QUEUE, { jobs: left });
  await saveSettings(DONE, { jobs: done.slice(0, 50) });
  return { done: n };
}
