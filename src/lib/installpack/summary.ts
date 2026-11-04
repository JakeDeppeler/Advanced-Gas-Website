import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { q, sbSelect } from "@/lib/dashboard/db";
import { stDownload, stTenantPath } from "@/lib/dashboard/servicetitan";
import { conditionReports } from "@/lib/conditionReport/fetch";
import { listJobFiles } from "@/lib/ordering/jobFiles";
import { aiConfigured } from "@/lib/chat/draft";
import type { PackFacts } from "./build";
import type { InstallJob } from "./facts";
import { SUMMARY_RULES, SUMMARY_SCHEMA, listed, parseSummary, summaryInput, type InstallSummary, type VisitReport } from "./summaryText";

export { aiConfigured };

/**
 * The visits a Condition Report for this install would be on: the install job,
 * the job its quote was written on, and the diagnostics, quotes, site
 * assessments, services and repairs at the same address in the half-year
 * before it. The tech who went first usually went on a job of its own (20727
 * was installed from diagnostic 20493), linked to the install only by the
 * address.
 */
async function visitJobs(j: InstallJob): Promise<{ id: number; number: string | null; type: string | null }[]> {
  const me = await sbSelect<{ id: number; location_id: number | null; created_on: string | null }>("st_jobs", [q.select("id,location_id,created_on"), q.eq("id", String(j.job_id))].join("&"));
  const out = [{ id: j.job_id, number: j.job_number, type: j.job_type }];
  if (j.quote_job_id && j.quote_job_id !== j.job_id) out.push({ id: j.quote_job_id, number: null, type: "Quote visit" });
  const loc = me[0]?.location_id;
  if (loc) {
    const since = new Date(Date.parse(me[0].created_on ?? new Date().toISOString()) - 180 * 864e5).toISOString();
    const earlier = await sbSelect<{ id: number; job_number: string | null; job_type: string | null }>("st_jobs", [
      q.select("id,job_number,job_type"), q.eq("location_id", String(loc)), `created_on=gte.${encodeURIComponent(since)}`,
      `job_type=imatch.${encodeURIComponent("diagnos|quot|assess|service|repair|mainten")}`, "order=created_on.desc", "limit=4",
    ].join("&")).catch(() => []);
    for (const e of earlier) if (!out.some((o) => o.id === e.id)) out.push({ id: e.id, number: e.job_number, type: e.job_type });
    else { const o = out.find((x) => x.id === e.id)!; o.number ??= e.job_number; o.type = e.job_type ?? o.type; }
  }
  return out.slice(0, 6);
}

/** The completed Condition Reports from those visits, newest first, each with the job it's on. */
export async function visitReports(j: InstallJob): Promise<VisitReport[]> {
  const jobs = await visitJobs(j);
  const subs = await conditionReports(jobs.map((x) => x.id));
  return subs.map((s) => {
    const owner = (s.owners ?? []).find((o) => o.type === "Job" && jobs.some((x) => x.id === Number(o.id)));
    const job = jobs.find((x) => x.id === Number(owner?.id));
    return { jobId: job?.id ?? j.job_id, jobNumber: job?.number ?? null, jobType: job?.type ?? null, submission: s };
  });
}

/**
 * What Claude may look at: the newest photos from the visits with a report
 * (else the quote visit), JPEG and PNG only, under the API's 5 MB an image,
 * and few enough that the request stays quick.
 */
const PHOTOS = 6;
const PHOTO_BYTES = 4.5 * 1048576;
const ALL_PHOTO_BYTES = 14 * 1048576;

async function summaryPhotos(j: InstallJob, reports: VisitReport[], deadline: number): Promise<{ label: string; mime: "image/jpeg" | "image/png"; data: string }[]> {
  const jobs = [...new Set(reports.map((r) => r.jobId))];
  if (!jobs.length && j.quote_job_id && j.quote_job_id !== j.job_id) jobs.push(j.quote_job_id);
  const out: { label: string; mime: "image/jpeg" | "image/png"; data: string }[] = [];
  let total = 0;
  for (const id of jobs) {
    const files = await listJobFiles(id);
    if ("error" in files) continue;
    const label = reports.find((r) => r.jobId === id)?.jobNumber ?? String(id);
    for (const f of files.files) {
      if (out.length >= PHOTOS || Date.now() > deadline) return out;
      if (!/\.(jpe?g|png)$/i.test(f.name)) continue;
      try {
        const { bytes } = await stDownload(stTenantPath("forms", `jobs/attachment/${f.id}`), Math.min(PHOTO_BYTES, ALL_PHOTO_BYTES - total));
        total += bytes.length;
        out.push({ label: `Photo from job ${label}: ${f.name}`, mime: /\.png$/i.test(f.name) ? "image/png" : "image/jpeg", data: Buffer.from(bytes).toString("base64") });
      } catch {
        // Too big or gone: the summary goes on from the rest.
      }
    }
  }
  return out;
}

const MODEL = "claude-opus-5-5";
let client: Anthropic | null = null;
const api = () => (client ??= new Anthropic());

/**
 * One summary from Claude. A single request with no tools: it can only hand
 * back words, which go into a PDF that says what they were written from.
 * Throws with a message for the office, never the API's own.
 */
export async function writeSummary(j: InstallJob, f: PackFacts, reports: VisitReport[], deadline: number): Promise<{ summary: InstallSummary; from: string }> {
  if (!aiConfigured()) throw new Error("ANTHROPIC_API_KEY isn't set on the server.");
  const input = summaryInput(f, reports);
  // Photos get what's left of the first third of the time; the words matter more.
  const photos = await summaryPhotos(j, reports, Math.min(deadline, Date.now() + 12_000)).catch(() => []);
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const p of photos) {
    content.push({ type: "text", text: p.label });
    content.push({ type: "image", source: { type: "base64", media_type: p.mime, data: p.data } });
  }
  content.push({ type: "text", text: `${input.text}\n\nWrite the installation summary for this job.${photos.length ? "" : " There are no photos."}` });

  let res: Anthropic.Beta.BetaMessage;
  try {
    res = await api().beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // Reading a few records and photos and saying what they say: low effort
      // keeps it inside the minute a pack run has.
      output_config: { effort: "low", format: { type: "json_schema", schema: SUMMARY_SCHEMA as unknown as Record<string, unknown> } },
      system: [{ type: "text", text: SUMMARY_RULES, cache_control: { type: "ephemeral", ttl: "1h" } }],
      messages: [{ role: "user", content }],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error("the Anthropic API key was refused");
    if (e instanceof Anthropic.RateLimitError) throw new Error("too many requests to Claude at once");
    if (e instanceof Anthropic.APIConnectionError) throw new Error("Claude couldn't be reached");
    if (e instanceof Anthropic.APIError) throw new Error(`Claude had a problem (${e.status ?? "no status"})`);
    throw new Error("the summary couldn't be written");
  }
  if (res.stop_reason === "refusal") throw new Error("Claude wouldn't write this one");
  if (res.stop_reason === "max_tokens") throw new Error("the summary ran too long");
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  try {
    return { summary: parseSummary(text), from: listed([...input.sources, ...(photos.length ? [`${photos.length} photo${photos.length === 1 ? "" : "s"} from the earlier visit`] : [])]) };
  } catch {
    throw new Error("the summary came back in a shape that couldn't be read");
  }
}
