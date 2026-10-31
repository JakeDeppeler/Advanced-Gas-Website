import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { stFetch, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { tagKey, tagTypes } from "@/lib/ordering/stJobNotes";
import { loadMade, logAuto, saveMade, type AutoEntry } from "./log";
import { planTags, STAGE_TAGS, type TaggedStage } from "./quoteStage";

// The jobs the quote-tag automation marked Awaiting Quote Approval by guessing,
// before 31 Oct, while their quote is still open. Some were sent and some are
// drafts (job 20527), and ServiceTitan can't say which: only its quote screen
// shows the Draft tick. So the office goes down the list, and each is either
// marked still in draft (Awaiting swapped for Quote In Draft) or confirmed
// sent (left as it is, off the list). Jake, 31 Oct: "if they are still in
// draft then change the tag to the Quote In Draft".

export type Guessed = { jobId: number; jobNumber: string | null; customer: string | null; jobType: string | null; quotes: string[]; written: string | null; guessedAt: string };

const sentKey = (id: number) => `qstage:${id}:sent`;
const draftKey = (id: number) => `qstage:${id}:draft`;
const okKey = (id: number) => `qdraft-ok:${id}`;

async function stageIds(): Promise<Partial<Record<TaggedStage, number>>> {
  const t = await tagTypes();
  const ids: Partial<Record<TaggedStage, number>> = {};
  for (const s of Object.keys(STAGE_TAGS) as TaggedStage[]) {
    const id = t.byName.get(tagKey(STAGE_TAGS[s]));
    if (id != null) ids[s] = id;
  }
  return ids;
}

/** Still Awaiting by the automation's guess, quote still open, not yet sorted. Newest guess first. */
export async function guessedSent(): Promise<Guessed[]> {
  const made = await loadMade();
  const guessed = [...made].filter(([k]) => k.startsWith("qstage:") && k.endsWith(":sent")).map(([k, at]) => ({ id: Number(k.split(":")[1]), at }))
    .filter((g) => g.id > 0 && !made.has(draftKey(g.id)) && !made.has(okKey(g.id)));
  if (!guessed.length) return [];
  const ids = await stageIds();
  if (ids.sent == null) return [];
  const jobIds = guessed.map((g) => g.id);
  const out: Guessed[] = [];
  for (let i = 0; i < jobIds.length; i += 150) {
    const slice = jobIds.slice(i, i + 150);
    const [jobs, ests] = await Promise.all([
      sbSelect<{ id: number; job_number: string | null; customer_name: string | null; job_type: string | null; tags: number[] | null }>(
        "st_jobs", [q.select("id,job_number,customer_name,job_type,tags:raw->tagTypeIds"), `id=in.(${slice.join(",")})`].join("&")),
      sbSelect<{ job_id: number; status: string | null; name: string | null; created_on: string | null }>(
        "st_estimates", [q.select("job_id,status,name:raw->>name,created_on"), `job_id=in.(${slice.join(",")})`, "raw->>active=neq.false"].join("&")),
    ]);
    for (const j of jobs) {
      const mine = ests.filter((e) => Number(e.job_id) === Number(j.id));
      const open = mine.filter((e) => e.status === "Open");
      // Sold since, or the office has moved the tag on: nothing to sort out.
      if (!open.length || mine.some((e) => e.status === "Sold") || !(j.tags ?? []).map(Number).includes(ids.sent)) continue;
      out.push({
        jobId: Number(j.id), jobNumber: j.job_number, customer: j.customer_name, jobType: j.job_type,
        quotes: open.map((e) => e.name ?? "Quote"),
        written: open.map((e) => e.created_on ?? "").sort()[0] || null,
        guessedAt: guessed.find((g) => g.id === Number(j.id))?.at ?? "",
      });
    }
  }
  return out.sort((a, b) => b.guessedAt.localeCompare(a.guessedAt));
}

export type Sorted = { jobId: number; ok: boolean; detail: string };

/**
 * Still in draft: Awaiting Quote Approval swapped for Quote In Draft, the
 * job's other tags kept. Read fresh first and checked from ServiceTitan's
 * reply, as quoteTag.ts does. Recorded so the automation doesn't redo it.
 */
export async function markStillDraft(jobIds: number[]): Promise<Sorted[]> {
  const ids = await stageIds();
  if (ids.draft == null || ids.sent == null) return jobIds.map((jobId) => ({ jobId, ok: false, detail: "The Quote In Draft or Awaiting Quote Approval tag isn't in ServiceTitan." }));
  const made = await loadMade();
  const now = new Date().toISOString();
  const out: Sorted[] = [];
  const log: AutoEntry[] = [];
  for (const jobId of jobIds) {
    try {
      const fresh = await stFetch<{ tagTypeIds?: number[]; jobNumber?: string }>(stTenantPath("jpm", `jobs/${jobId}`));
      if (!Array.isArray(fresh.tagTypeIds)) throw new Error("ServiceTitan didn't return the job's tags, so they were left alone");
      // Awaiting is ours here, so it doesn't hold the job at "sent".
      const plan = planTags(fresh.tagTypeIds, "draft", ids, [ids.sent]);
      if (!plan) { made.set(draftKey(jobId), now); out.push({ jobId, ok: true, detail: "Already at Quote In Draft" }); continue; }
      if ("stuck" in plan) throw new Error("ServiceTitan won't change a job's only tag from here");
      const reply = await stSend<{ tagTypeIds?: number[] } | null>("PATCH", stTenantPath("jpm", `jobs/${jobId}`), { tagTypeIds: plan.tags });
      let tags = reply?.tagTypeIds;
      const landed = (t?: number[]) => Array.isArray(t) && t.includes(ids.draft as number) && !t.includes(ids.sent as number);
      if (!landed(tags)) {
        await new Promise((r) => setTimeout(r, 1500));
        tags = (await stFetch<{ tagTypeIds?: number[] }>(stTenantPath("jpm", `jobs/${jobId}`))).tagTypeIds;
        if (!landed(tags)) throw new Error("ServiceTitan answered OK but didn't make the change");
      }
      made.set(draftKey(jobId), now);
      out.push({ jobId, ok: true, detail: "Awaiting Quote Approval → Quote In Draft" });
      log.push({ at: now, kind: "quote-tag", ok: true, jobId, title: `Job ${fresh.jobNumber ?? jobId}: "Awaiting Quote Approval" → "Quote In Draft"`, detail: "Marked still in draft from Settings › Automatic. It was put at Awaiting by the old guess." });
    } catch (e) {
      out.push({ jobId, ok: false, detail: (e as Error).message.slice(0, 160) });
    }
  }
  await saveMade(made);
  await logAuto(log).catch(() => undefined);
  return out;
}

/** Confirmed sent: left at Awaiting Quote Approval, and off the list. */
export async function confirmSent(jobIds: number[]): Promise<void> {
  const made = await loadMade();
  const now = new Date().toISOString();
  for (const id of jobIds) made.set(okKey(id), now);
  await saveMade(made);
}
