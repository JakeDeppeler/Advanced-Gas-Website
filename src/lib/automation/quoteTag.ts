import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { stFetch, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { dayLabel } from "@/lib/ordering/plan";
import { tagKey, tagTypes } from "@/lib/ordering/stJobNotes";
import { loadMade, loadSwitches, logAuto, saveMade, type AutoEntry } from "./log";
import { LIVE_DAYS, planTags, STAGE_TAGS, stageOf, VISIT_DAYS, type Est, type Facts, type Stage, type TaggedStage } from "./quoteStage";

/** Jobs looked at in ServiceTitan per run: a backlog clears over a few runs rather than all at once against its rate limit. */
const PER_RUN = 25;
const DAY = 86_400_000;
/** Most pressing first: a sale waiting to be booked, then a quote written, then one to write, then tidying up. "sent" is never reached here: the office sets it. */
const ORDER: Stage[] = ["toBook", "draft", "toQuote", "done"];

type Job = { id: number; job_number: string | null; job_type: string | null; status: string | null; customer_id: number | null; loc: number | null; pid: string | null; tags: number[] | null };
type EstRow = { id: number; job_id: number; customer_id: number | null; status: string | null; subtotal: number | null; created_on: string | null; sold_on: string | null; modified: string | null; active: string | null };

const inList = (col: string, xs: (number | string)[]) => `${col}=in.(${xs.join(",")})`;
const chunks = <T,>(xs: T[], n = 150) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const many = async <T,>(table: string, cols: string, col: string, xs: (number | string)[], extra: string[] = []) =>
  xs.length ? (await Promise.all(chunks(xs).map((c) => sbSelect<T>(table, [q.select(cols), inList(col, c), ...extra].join("&"))))).flat() : [];
const day = (iso: string | null) => (iso ? dayLabel(isoDateMelbourne(new Date(iso))) : "");
const toEst = (e: EstRow): Est => ({ status: e.status, subtotal: e.subtotal, createdOn: e.created_on, modifiedOn: e.modified, soldOn: e.sold_on });

class NotMade extends Error {
  constructor() { super("ServiceTitan answered OK but didn't make the change"); }
}

/**
 * The quote tags follow the quote, as the office moves them by hand:
 * Quotation Required once the visit's done, Quote In Draft once a quote's
 * written, To Be Booked once it sells, and off once the work's booked.
 * Awaiting Quote Approval is the office's, put on when they send the quote.
 * Where a job is up to, and why each step is read the way it is, is in
 * quoteStage.ts.
 *
 * Each step is taken once per job. A tag the office takes off or puts back by
 * hand afterwards stays as they left it until the quote moves on, so marking a
 * draft Quotation Required again isn't undone on the next sync. A job never
 * seen before that's already at its stage is remembered as at it, for the
 * same reason.
 *
 * Found from the replica, but each job's tags are read fresh from ServiceTitan
 * before the change and checked after it: ServiceTitan replaces the whole
 * list on update, so the office's other tags are carried over, and it answers
 * OK to changes it doesn't make.
 */
export async function syncQuoteTags(): Promise<{ changed: number; failed: number; skipped?: string }> {
  if (!(await loadSwitches()).quoteTag) return { changed: 0, failed: 0, skipped: "switched off" };
  const t = await tagTypes();
  const ids: Partial<Record<TaggedStage, number>> = {};
  for (const s of Object.keys(STAGE_TAGS) as TaggedStage[]) {
    const id = t.byName.get(tagKey(STAGE_TAGS[s]));
    if (id != null) ids[s] = id;
  }
  const stageIds = Object.values(ids) as number[];
  if (!stageIds.length) return { changed: 0, failed: 0, skipped: "none of the quote tags are in ServiceTitan" };

  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  // In play: a job with one of the tags already, a quote visit in the last
  // month, or a quote written or sold while it's still on the Pipeline.
  const [tagged, visits, written, sold] = await Promise.all([
    Promise.all(stageIds.map((id) => sbSelect<{ id: number }>("st_jobs", `select=id&raw->tagTypeIds=cs.[${id}]&limit=2000`))).then((r) => r.flat()),
    sbSelect<{ job_id: number; status: string | null }>("st_appointments", [q.select("job_id,status"), q.gte("start_at", iso(now - VISIT_DAYS * DAY)), q.lt("start_at", iso(now)), "limit=3000"].join("&")),
    sbSelect<{ job_id: number }>("st_estimates", [q.select("job_id"), q.gte("created_on", iso(now - LIVE_DAYS * DAY)), "limit=5000"].join("&")),
    sbSelect<{ job_id: number }>("st_estimates", [q.select("job_id"), q.gte("sold_on", iso(now - LIVE_DAYS * DAY)), "limit=5000"].join("&")),
  ]);
  // Diagnostics count too (Jake, 31 Oct): any that ends without a quote is
  // tagged Quotation Required, invoiced or not. Of 93 in the 90 days before,
  // 47 were invoiced with no quote, mostly fixed on the day; the office takes
  // the tag off those, and it stays off (see above).
  const quoteVisit = (j: Job) => /^(quotation|site assessment|diagnos)/i.test((j.job_type ?? "").trim());
  const visited = new Set(visits.filter((v) => v.status !== "Canceled").map((v) => Number(v.job_id)));
  const wanted = new Set([...tagged.map((r) => Number(r.id)), ...written.map((r) => Number(r.job_id)), ...sold.map((r) => Number(r.job_id))]);
  const jobs = (await many<Job>("st_jobs", "id,job_number,job_type,status,customer_id,loc:location_id,pid:raw->>projectId,tags:raw->tagTypeIds", "id", [...new Set([...wanted, ...visited])].filter((n) => n > 0)))
    .filter((j) => j.status !== "Canceled" && (wanted.has(Number(j.id)) || quoteVisit(j)));
  if (!jobs.length) return { changed: 0, failed: 0 };
  const jobIds = jobs.map((j) => Number(j.id));

  const [estRows, appts, invoiced] = await Promise.all([
    many<EstRow>("st_estimates", "id,job_id,customer_id,status,subtotal,created_on,sold_on,modified:raw->>modifiedOn,active:raw->>active", "job_id", jobIds),
    many<{ job_id: number; start_at: string | null; status: string | null }>("st_appointments", "job_id,start_at,status", "job_id", jobIds),
    many<{ job_id: number }>("st_invoices", "job_id", "job_id", jobIds, ["total=gt.0"]),
  ]);
  const ests = estRows.filter((e) => e.active !== "false");
  const estIds = ests.map((e) => Number(e.id));
  const madeFrom = await many<{ est: string | null; status: string | null }>("st_jobs", "est:raw->>createdFromEstimateId,status", "raw->>createdFromEstimateId", estIds);
  const bookedEst = new Set(madeFrom.filter((b) => b.status !== "Canceled").map((b) => Number(b.est)));
  const invoicedJobs = new Set(invoiced.map((i) => Number(i.job_id)));
  const estsBy = new Map<number, EstRow[]>();
  for (const e of ests) estsBy.set(Number(e.job_id), [...(estsBy.get(Number(e.job_id)) ?? []), e]);
  const visitsBy = new Map<number, { last: string | null; future: boolean }>();
  for (const a of appts) {
    if (a.status === "Canceled" || !a.start_at) continue;
    const v = visitsBy.get(Number(a.job_id)) ?? { last: null, future: false };
    if (Date.parse(a.start_at) > now) v.future = true;
    else if (!v.last || a.start_at > v.last) v.last = a.start_at;
    visitsBy.set(Number(a.job_id), v);
  }

  const facts = (j: Job, quotedElsewhere = false): Facts => {
    const mine = estsBy.get(Number(j.id)) ?? [];
    const v = visitsBy.get(Number(j.id));
    return {
      quoteVisit: quoteVisit(j),
      install: /installation/i.test(j.job_type ?? ""),
      ests: mine.map(toEst),
      quotedElsewhere,
      lastVisit: v?.last ?? null,
      future: v?.future ?? false,
      bookedFrom: mine.some((e) => bookedEst.has(Number(e.id))),
      invoiced: invoicedJobs.has(Number(j.id)),
    };
  };
  const staged = jobs.map((j) => { const f = facts(j); return { j, f, stage: stageOf(f, now) }; });

  // A quote can be written on another job in the project, or against the
  // customer, as quoteToWrite allows: only worth looking for where nothing's
  // quoted on the job itself.
  const toQuote = staged.filter((s) => s.stage === "toQuote");
  if (toQuote.length) {
    const pids = [...new Set(toQuote.map((s) => s.j.pid).filter((p): p is string => !!p && p !== "0"))];
    const cids = [...new Set(toQuote.map((s) => s.j.customer_id).filter((c): c is number => c != null))];
    const [projJobs, custEsts] = await Promise.all([
      many<{ id: number; pid: string }>("st_jobs", "id,pid:raw->>projectId", "raw->>projectId", pids),
      many<{ job_id: number | null; customer_id: number; created_on: string | null; loc: string | null }>("st_estimates", "job_id,customer_id,created_on,loc:raw->>locationId", "customer_id", cids, [q.gte("created_on", iso(now - (VISIT_DAYS + 3) * DAY))]),
    ]);
    const projEsts = await many<{ job_id: number }>("st_estimates", "job_id", "job_id", projJobs.map((p) => Number(p.id)));
    const quotedJobs = new Set(projEsts.map((e) => Number(e.job_id)));
    for (const s of toQuote) {
      // Not the job's own: a draft on it is why it's still at Quotation Required.
      const own = Number(s.j.id);
      // Three days' grace before the visit, as quoteToWrite: a quote is sometimes started from the booking.
      const from = Date.parse(s.f.lastVisit ?? "") - 3 * DAY;
      // The customer's quote counts only at the same address. An agency is one
      // customer with hundreds of properties: Barry Plant – Bayside's quotes for
      // other houses that week kept job 20721 (a Diagnostics at Seaford, 31 Oct)
      // from ever getting Quotation Required, and 25 others like it.
      const elsewhere = (!!s.j.pid && projJobs.some((p) => p.pid === s.j.pid && Number(p.id) !== own && quotedJobs.has(Number(p.id))))
        || custEsts.some((e) => Number(e.job_id) !== own && Number(e.customer_id) === Number(s.j.customer_id)
          && s.j.loc != null && Number(e.loc) === Number(s.j.loc) && Date.parse(e.created_on ?? "") >= from);
      if (elsewhere) s.stage = stageOf({ ...s.f, quotedElsewhere: true }, now);
    }
  }

  const made = await loadMade();
  const since = (k: string, days: number) => { const at = made.get(k); return !!at && now - Date.parse(at) < days * DAY; };
  const stamp = () => new Date().toISOString();
  const names = new Map((Object.keys(ids) as TaggedStage[]).map((s) => [ids[s] as number, STAGE_TAGS[s]]));
  const name = (id: number) => names.get(id) ?? `#${id}`;
  const log: AutoEntry[] = [];
  let changed = 0, failed = 0, looked = 0;

  const why = (s: (typeof staged)[number], stage: Stage): string => {
    const mine = estsBy.get(Number(s.j.id)) ?? [];
    if (stage === "toQuote") return `Quote visit ${day(s.f.lastVisit)} and no quote in ServiceTitan for it yet.`;
    if (stage === "draft") {
      const first = mine.filter((e) => e.status === "Open").map((e) => e.created_on ?? "").sort()[0] ?? null;
      return `Quote written ${day(first)} and not sold. When it's sent, swap this for Awaiting Quote Approval: ServiceTitan doesn't tell the portal when a quote goes out.`;
    }
    const soldOn = mine.filter((e) => e.status === "Sold").map((e) => e.sold_on ?? "").sort().pop() ?? null;
    if (stage === "toBook") return `Quote sold ${day(soldOn)} and nothing booked from it yet. It comes off once the work's booked.`;
    return `Sold ${day(soldOn)}, and ${s.f.bookedFrom ? "a job's been booked from its quote" : s.f.future ? "it's booked in for a visit" : "it's been invoiced"}.`;
  };
  const atStage = (cur: number[], stage: Stage) => stage === "done" ? !cur.some((x) => stageIds.includes(x)) : cur.includes(ids[stage] as number);

  for (const stage of ORDER) {
    for (const s of staged.filter((x) => x.stage === stage)) {
      const key = `qstage:${s.j.id}:${stage}`;
      if (made.has(key)) continue;
      const cur = Array.isArray(s.j.tags) ? s.j.tags.map(Number) : [];
      if (!planTags(cur, stage, ids)) {
        if (atStage(cur, stage)) made.set(key, stamp());
        continue;
      }
      if (looked >= PER_RUN || since(`qtag-fail:${s.j.id}`, 1) || since(`qtag-hold:${s.j.id}`, 7)) continue;
      looked++;
      const label = s.j.job_number ? `Job ${s.j.job_number}` : `Job ${s.j.id}`;
      try {
        const fresh = await stFetch<{ tagTypeIds?: number[] }>(stTenantPath("jpm", `jobs/${s.j.id}`));
        if (!Array.isArray(fresh.tagTypeIds)) throw new Error("ServiceTitan didn't return the job's tags, so they were left alone");
        const plan = planTags(fresh.tagTypeIds, stage, ids);
        if (!plan) {
          // The replica was behind: it's already where it should be, or the office has moved it on.
          if (atStage(fresh.tagTypeIds, stage)) made.set(key, stamp());
          continue;
        }
        if ("stuck" in plan) {
          made.set(key, stamp());
          log.push({ at: stamp(), kind: "quote-tag", ok: false, jobId: Number(s.j.id), title: `${label}: "${plan.stuck.map(name).join('" and "')}" left on`, detail: `${why(s, stage)} ${plan.stuck.length > 1 ? "They're the job's only tags" : "It's the job's only tag"}, and ServiceTitan won't take a job's last tag off from here, so take ${plan.stuck.length > 1 ? "them" : "it"} off in ServiceTitan.` });
          continue;
        }
        const reply = await stSend<{ tagTypeIds?: number[] } | null>("PATCH", stTenantPath("jpm", `jobs/${s.j.id}`), { tagTypeIds: plan.tags });
        const landed = (tags: number[] | undefined) => Array.isArray(tags) && (plan.add == null || tags.includes(plan.add)) && !plan.drop.some((x) => tags.includes(x));
        // Its reply is the job as saved, and that's the check. A read straight
        // after can come back from before the change: the first live run logged
        // 48 changes as failed that the next sync showed had all gone on. So
        // only without a reply that shows it is the job read again, after a pause.
        if (!landed(reply?.tagTypeIds)) {
          let after: number[] | undefined;
          for (const wait of [1500, 4000]) {
            await new Promise((r) => setTimeout(r, wait));
            after = (await stFetch<{ tagTypeIds?: number[] }>(stTenantPath("jpm", `jobs/${s.j.id}`))).tagTypeIds;
            if (landed(after)) break;
          }
          if (!landed(after)) throw new NotMade();
        }
        made.set(key, stamp());
        changed++;
        const what = plan.add != null && plan.drop.length
          ? `"${plan.drop.map(name).join('" and "')}" → "${name(plan.add)}"`
          : plan.add != null ? `"${name(plan.add)}" on` : `"${plan.drop.map(name).join('" and "')}" off`;
        log.push({ at: stamp(), kind: "quote-tag", ok: true, jobId: Number(s.j.id), title: `${label}: ${what}`, detail: why(s, stage) });
      } catch (e) {
        failed++;
        // Refused outright, it would be refused again tomorrow: a week. A call
        // that failed on the way (a timeout, the rate limit) is tried tomorrow.
        made.set(`${e instanceof NotMade ? "qtag-hold" : "qtag-fail"}:${s.j.id}`, stamp());
        log.push({ at: stamp(), kind: "quote-tag", ok: false, jobId: Number(s.j.id), title: `${label}: couldn't change its quote tag`, detail: (e as Error).message.slice(0, 200) });
      }
    }
  }
  await saveMade(made).catch(() => undefined);
  await logAuto(log).catch(() => undefined);
  return { changed, failed };
}
