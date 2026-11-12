import "server-only";
import { sbSelect } from "@/lib/dashboard/db";
import { stFetch, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { tagKey, tagTypes } from "@/lib/ordering/stJobNotes";
import { loadMade, loadSwitches, logAuto, saveMade, type AutoEntry } from "./log";
import { NOT_ON_ALITSY, REBATE_STARTED, isRebateTag, rebateMark, rebateStep, type RebateJob } from "./rebateTagRules";

/** Jobs changed in ServiceTitan per run, as the quote tags: a backlog clears over a few runs. */
const PER_RUN = 25;
const DAY = 86_400_000;

class NotMade extends Error {
  constructor() { super("ServiceTitan answered OK but didn't put the tag on"); }
}

/**
 * Not On Alitsy onto every job with the Rebates tag, once (rebateTagRules.ts
 * says which). Found from the replica; each job's tags are read fresh from
 * ServiceTitan first, since an update replaces the whole list and the job's
 * other tags have to be carried over, and checked after, since ServiceTitan
 * answers OK to changes it doesn't make. As syncQuoteTags does.
 */
export async function syncRebateTags(): Promise<{ changed: number; failed: number; left?: number; skipped?: string }> {
  if (!(await loadSwitches()).rebateTag) return { changed: 0, failed: 0, skipped: "switched off" };
  const t = await tagTypes();
  const rebateIds = [...t.byName].filter(([k]) => isRebateTag(k)).map(([, id]) => id);
  const found = t.byName.get(tagKey(NOT_ON_ALITSY));
  if (!rebateIds.length) return { changed: 0, failed: 0, skipped: "no Rebates tag in ServiceTitan" };
  if (found == null) return { changed: 0, failed: 0, skipped: `no "${NOT_ON_ALITSY}" tag in ServiceTitan` };
  const notOn: number = found;

  const rows = (await Promise.all(rebateIds.map((id) => sbSelect<{ id: number; job_number: string | null; status: string | null; tags: unknown }>(
    "st_jobs", `select=id,job_number,status,tags:raw->tagTypeIds&raw->tagTypeIds=cs.[${id}]&limit=5000`,
  )))).flat();
  const jobs = new Map<number, RebateJob & { number: string | null }>();
  for (const r of rows) jobs.set(Number(r.id), { id: Number(r.id), number: r.job_number, status: r.status, tags: Array.isArray(r.tags) ? r.tags.map(Number) : [] });

  const made = await loadMade();
  const now = Date.now();
  const stamp = () => new Date().toISOString();
  const recent = (k: string, days: number) => { const at = made.get(k); return !!at && now - Date.parse(at) < days * DAY; };
  const firstRun = !made.has(REBATE_STARTED);
  const log: AutoEntry[] = [];
  const todo: (RebateJob & { number: string | null })[] = [];
  let left = 0;

  for (const j of jobs.values()) {
    const step = rebateStep(j, notOn, made.has(rebateMark(j.id)), firstRun);
    if (step === "seen" || step === "leave") made.set(rebateMark(j.id), stamp());
    if (step === "leave") left++;
    if (step === "tag") todo.push(j);
  }
  made.set(REBATE_STARTED, stamp());

  let changed = 0, failed = 0, looked = 0;
  for (const j of todo) {
    if (looked >= PER_RUN || recent(`rebate-fail:${j.id}`, 1) || recent(`rebate-hold:${j.id}`, 7)) continue;
    looked++;
    const label = j.number ? `Job ${j.number}` : `Job ${j.id}`;
    try {
      const fresh = await stFetch<{ tagTypeIds?: number[] }>(stTenantPath("jpm", `jobs/${j.id}`));
      if (!Array.isArray(fresh.tagTypeIds)) throw new Error("ServiceTitan didn't return the job's tags, so they were left alone");
      // The replica was behind: the Rebates tag has come off since. Not marked, so it's looked at again if it goes back on.
      if (!fresh.tagTypeIds.some((x) => rebateIds.includes(x))) continue;
      if (!fresh.tagTypeIds.includes(notOn)) {
        const want: number[] = [...fresh.tagTypeIds, notOn];
        const reply: { tagTypeIds?: number[] } | null = await stSend<{ tagTypeIds?: number[] } | null>("PATCH", stTenantPath("jpm", `jobs/${j.id}`), { tagTypeIds: want });
        // The reply is the job as saved. Only without one that shows the tag is
        // the job read again, after a pause: a read straight after can come back
        // from before the change (quoteTag.ts).
        if (!reply?.tagTypeIds?.includes(notOn)) {
          let after: number[] | undefined;
          for (const wait of [1500, 4000]) {
            await new Promise((r) => setTimeout(r, wait));
            after = (await stFetch<{ tagTypeIds?: number[] }>(stTenantPath("jpm", `jobs/${j.id}`))).tagTypeIds;
            if (after?.includes(notOn)) break;
          }
          if (!after?.includes(notOn)) throw new NotMade();
        }
        changed++;
        log.push({ at: stamp(), kind: "rebateTag", ok: true, jobId: j.id, title: `${label}: "${NOT_ON_ALITSY}" on`, detail: `It has the Rebates tag. Take "${NOT_ON_ALITSY}" off once the rebate's on Alitsy; it won't go back on.` });
      }
      made.set(rebateMark(j.id), stamp());
    } catch (e) {
      failed++;
      // Refused outright, it would be refused again tomorrow: a week. A call that failed on the way is tried tomorrow.
      made.set(`${e instanceof NotMade ? "rebate-hold" : "rebate-fail"}:${j.id}`, stamp());
      log.push({ at: stamp(), kind: "rebateTag", ok: false, jobId: j.id, title: `${label}: couldn't put "${NOT_ON_ALITSY}" on`, detail: (e as Error).message.slice(0, 200) });
    }
  }
  await saveMade(made).catch(() => undefined);
  await logAuto(log).catch(() => undefined);
  return { changed, failed, left };
}
