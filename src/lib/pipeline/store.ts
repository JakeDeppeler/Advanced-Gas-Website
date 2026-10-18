import "server-only";
import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import { q, sbInsert, sbSelect, sbUpsert } from "@/lib/dashboard/db";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { quoteKey, quotes } from "@/lib/dashboard/metrics";
import { isHow, openStage, type PipeQuote, type Stage, type Touch, type TouchHow, type WorkJob } from "./types";

/** Open quotes are worked for 60 days; past that they're listed to close off, not chased. */
export const LIVE_DAYS = 60;
/** Won and lost stay on the board this long, so the week's wins are visible. */
const RECENT_DAYS = 30;
/** Further back than this, an "open" quote is old-system residue nobody will ring. */
const LOOK_BACK_DAYS = 150;
/** A sale is followed through to paid for this long; one still unbooked after it is a conversation, not a list. */
const SOLD_DAYS = 120;
/** A job that is only the quote visit, not the work the quote sold. */
const QUOTE_JOB = /quot|assess|estimat|consult/i;

type EstRow = {
  id: number; job_id: number | null; customer_id: number | null; status: string | null; total: number | string | null;
  created_on: string | null; sold_on: string | null; modified_on: string | null; created_by: string | null; sold_by: string | null;
  business_unit: string | null; name: string | null;
  /** The site it was quoted at: a quote written on the customer, not a job, has only this to name it by. */
  location_id?: string | null;
};
type JobRow = { id: number; job_number: string | null; customer_name: string | null; suburb: string | null; job_type: string | null; location_id: number | null; status: string | null; completed_on: string | null; business_unit: string | null };
type MadeRow = { id: number; job_number: string | null; status: string | null; completed_on: string | null; est: string | null };
type ApptRow = { job_id: number; start_at: string | null; status: string | null };
type InvRow = { job_id: number; total: number | string | null; balance: string | null };
type ContactRow = { owner: number; type: string; value: string };
type FollowRow = { quote_key: string; owner: string | null; next_on: string | null; lost_at: string | null; lost_reason: string | null };
type TouchRow = { quote_key: string; how: string; note: string | null; created_by: string | null; created_at: string };

const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const chunks = <T,>(xs: T[], n = 150): T[][] => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

/** Rows whose `col` is one of `ids`, a URL-length-safe handful at a time. */
async function byIds<T>(table: string, cols: string, col: string, ids: number[], extra: string[] = []): Promise<T[]> {
  const parts = await Promise.all(chunks([...new Set(ids)]).map((part) =>
    sbSelect<T>(table, [q.select(cols), `${col}=in.(${part.join(",")})`, ...extra].join("&")).catch(() => [] as T[])));
  return parts.flat();
}

/**
 * A mobile first — it's what a text goes to — then any phone. ServiceTitan
 * holds the number on the customer, and sometimes only on the site.
 */
function bestPhone(rows: ContactRow[] | undefined): string | null {
  if (!rows?.length) return null;
  const mob = rows.find((r) => /mobile/i.test(r.type));
  return (mob ?? rows[0]).value.trim() || null;
}

export type Pipeline = {
  quotes: PipeQuote[];
  /** Still open in ServiceTitan but past LIVE_DAYS: to be won or closed off there. */
  stale: PipeQuote[];
  today: string;
};

/**
 * Every quote the office should know about: open ones from the last 60 days,
 * and anything won or lost in the last 30.
 *
 * Built from the same rows the wall board counts — written in ServiceTitan,
 * residential side — and grouped per job the same way, so the pipeline and the
 * board never disagree about how many quotes are out.
 */
export function loadPipeline(opts: { detail?: boolean; recentDays?: number } = {}): Promise<Pipeline> {
  return loadOnce(opts.detail ?? true, opts.recentDays ?? null);
}

/**
 * Kept between requests for a few minutes, and thrown away the moment it's
 * out of date: when a call is logged or a quote changes here (pipelineChanged,
 * from the writes below) and after each ServiceTitan pull (the board's
 * refresh). Every office page asked for it — the side bar's count alone — and
 * each read paged four thousand estimates out of Tokyo. Keyed on the day too,
 * so "due today" can't carry over midnight.
 */
export const PIPELINE_TAG = "pipeline";
const sharedPipeline = unstable_cache(
  (detail: boolean, recentDays: number | null, _day: string) => readPipeline({ detail, recentDays: recentDays ?? undefined }),
  ["pipeline-v2"],
  { revalidate: 180, tags: [PIPELINE_TAG] },
);

/** Once per request on top: a page and its shell ask several times in one render. */
const loadOnce = cache((detail: boolean, recentDays: number | null) => sharedPipeline(detail, recentDays, isoDateMelbourne(new Date())));

/** Something the pipeline shows has changed: the next page reads it fresh. */
export function pipelineChanged(): void {
  try {
    revalidateTag(PIPELINE_TAG);
  } catch {
    // Outside a request (a script): nothing cached to throw away.
  }
}

async function readPipeline(opts: { detail?: boolean; recentDays?: number }): Promise<Pipeline> {
  // Without detail it's the columns alone — no names, suburbs or phone numbers
  // — which is all a count needs, and two fewer round trips on every page.
  const detail = opts.detail ?? true;
  const today = isoDateMelbourne(new Date());
  const since = iso(daysAgo(LOOK_BACK_DAYS));
  const recent = iso(daysAgo(detail ? SOLD_DAYS : RECENT_DAYS));

  const [estRaw, follows, touchRows] = await Promise.all([
    sbSelect<EstRow>("st_estimates", [
      // total_inc, not total: every other quote figure in the portal and on the
      // wall is with GST, and the Scoreboard tile that opens this page is one.
      q.select("id,job_id,customer_id,status,total:total_inc,created_on,sold_on,modified_on,created_by,sold_by,business_unit,name:raw->>name,location_id:raw->>locationId"),
      `or=(created_on.gte.${since},sold_on.gte.${recent})`,
      // Ordered from the start, so the paging reuses the first page instead
      // of reading it again to put an order on it.
      "order=id.asc",
      "limit=5000",
    ].join("&")),
    sbSelect<FollowRow>("portal_quote_follow", q.select("quote_key,owner,next_on,lost_at,lost_reason")).catch(() => [] as FollowRow[]),
    sbSelect<TouchRow>("portal_quote_touches", [q.select("quote_key,how,note,created_by,created_at"), q.gte("created_at", since), "order=created_at.desc", "limit=5000"].join("&")).catch(() => [] as TouchRow[]),
  ]);
  const est = quotes(estRaw);

  // One quote per job, options together.
  type G = { rows: EstRow[] };
  const groups = new Map<string, G>();
  for (const r of est) {
    const k = quoteKey({ id: r.id, job_id: r.job_id, customer_id: r.customer_id, created_on: r.created_on });
    const g = groups.get(k) ?? { rows: [] };
    g.rows.push(r);
    groups.set(k, g);
  }

  const jobIds = est.map((r) => r.job_id).filter((v): v is number => v != null);
  const soldIds = est.filter((r) => r.status === "Sold").map((r) => r.id);
  const [jobs, made] = detail ? await Promise.all([
    byIds<JobRow>("st_jobs", "id,job_number,customer_name,suburb,job_type,location_id,status,completed_on,business_unit", "id", jobIds),
    byIds<MadeRow>("st_jobs", "id,job_number,status,completed_on,est:raw->>createdFromEstimateId", "raw->>createdFromEstimateId", soldIds),
  ]) : [[], []];
  const jobById = new Map(jobs.map((j) => [j.id, j]));

  const custIds = est.map((r) => r.customer_id).filter((v): v is number => v != null);
  const locIds = jobs.map((j) => j.location_id).filter((v): v is number => v != null);
  // About four in ten quotes are written on the customer in ServiceTitan
  // rather than on a job: no job number, no name on a job. Their site has
  // both the name and the suburb, so they read as "Joel Shannon, Chelsea"
  // instead of "a customer".
  const siteIds = detail ? est.filter((r) => r.job_id == null && Number(r.location_id) > 0).map((r) => Number(r.location_id)) : [];
  const phoneTypes = `type=in.(Phone,MobilePhone)`;
  const [custPhones, locPhones, sites] = detail ? await Promise.all([
    byIds<{ customer_id: number; type: string; value: string }>("st_customer_contacts", "customer_id,type,value", "customer_id", custIds, [phoneTypes, "active=is.true"]),
    byIds<{ location_id: number; type: string; value: string }>("st_location_contacts", "location_id,type,value", "location_id", [...locIds, ...siteIds], [phoneTypes, "active=is.true"]),
    byIds<{ id: number; name: string | null; city: string | null }>("st_locations", "id,name:raw->>name,city:raw->address->>city", "id", siteIds),
  ]) : [[], [], []];
  const siteById = new Map(sites.map((x) => [x.id, x]));
  const group = <T,>(rows: T[], key: (r: T) => number) => {
    const m = new Map<number, ContactRow[]>();
    for (const r of rows) {
      const o = r as unknown as { type: string; value: string };
      const list = m.get(key(r)) ?? [];
      list.push({ owner: key(r), type: o.type, value: o.value });
      m.set(key(r), list);
    }
    return m;
  };
  const phoneByCust = group(custPhones, (r) => r.customer_id);
  const phoneByLoc = group(locPhones, (r) => r.location_id);

  // What each sale became. A job made from the estimate is the work; with none,
  // the job it was quoted on is the work unless that job was only the quote visit.
  const madeByEst = new Map<number, MadeRow[]>();
  for (const m of made) {
    const k = Number(m.est);
    if (Number.isFinite(k)) madeByEst.set(k, [...(madeByEst.get(k) ?? []), m]);
  }
  const workOf = (rows: EstRow[]): Array<{ id: number; job_number: string | null; status: string; completed_on: string | null }> => {
    const sold = rows.filter((r) => r.status === "Sold");
    const fromEst = sold.flatMap((r) => madeByEst.get(r.id) ?? []).filter((j) => j.status && j.status !== "Canceled");
    if (fromEst.length) return fromEst.map((j) => ({ id: j.id, job_number: j.job_number, status: j.status as string, completed_on: j.completed_on }));
    const own = sold.map((r) => (r.job_id != null ? jobById.get(r.job_id) : undefined)).find(Boolean);
    if (!own || !own.status || own.status === "Canceled" || QUOTE_JOB.test(own.job_type ?? "") || /assess/i.test(own.business_unit ?? "")) return [];
    return [{ id: own.id, job_number: own.job_number, status: own.status, completed_on: own.completed_on }];
  };
  const workByKey = new Map<string, ReturnType<typeof workOf>>();
  if (detail) for (const [key, g] of groups) if (g.rows.some((r) => r.status === "Sold")) workByKey.set(key, workOf(g.rows));
  const workIds = [...workByKey.values()].flat().map((j) => j.id);
  const [appts, invs] = workIds.length ? await Promise.all([
    byIds<ApptRow>("st_appointments", "job_id,start_at,status", "job_id", workIds, ["order=start_at.asc"]),
    byIds<InvRow>("st_invoices", "job_id,total,balance:raw->>balance", "job_id", workIds),
  ]) : [[], []];
  const nowIso = new Date().toISOString();
  const nextVisit = new Map<number, string>();
  for (const a of appts) {
    if (!a.start_at || a.status === "Canceled") continue;
    const cur = nextVisit.get(a.job_id);
    // The next visit to come; failing that, the latest one there was.
    if (!cur || (a.start_at >= nowIso && (cur < nowIso || a.start_at < cur)) || (cur < nowIso && a.start_at > cur)) nextVisit.set(a.job_id, a.start_at);
  }
  const billed = new Map<number, { total: number; owing: number }>();
  for (const i of invs) {
    const b = billed.get(i.job_id) ?? { total: 0, owing: 0 };
    b.total += Number(i.total ?? 0);
    b.owing += Math.max(0, Number(i.balance ?? 0));
    billed.set(i.job_id, b);
  }
  /** Where a sale is up to, and the job to show for it; null once it's paid in full. */
  const afterSale = (key: string): { stage: Stage; work: WorkJob | null } | null => {
    const w = workByKey.get(key) ?? [];
    if (!w.length) return { stage: "won", work: null };
    const open = w.filter((j) => j.status !== "Completed");
    const pick = open[0] ?? w[w.length - 1];
    const sum = w.reduce((a, j) => { const b = billed.get(j.id); return { total: a.total + (b?.total ?? 0), owing: a.owing + (b?.owing ?? 0) }; }, { total: 0, owing: 0 });
    const work: WorkJob = {
      jobId: pick.id, jobNumber: pick.job_number, status: pick.status,
      bookedFor: nextVisit.get(pick.id) ?? null,
      completedOn: pick.completed_on ? isoDateMelbourne(new Date(pick.completed_on)) : null,
      owing: sum.total > 0 ? Math.round(sum.owing * 100) / 100 : null,
      invoiced: Math.round(sum.total * 100) / 100,
    };
    if (open.length) return { stage: "booked", work };
    // Done: still on the board while money's owing, or while it hasn't been invoiced at all.
    if (work.owing == null || work.owing > 0.5) return { stage: "billed", work };
    return null;
  };

  const followBy = new Map(follows.map((f) => [f.quote_key, f]));
  const touchesBy = new Map<string, Touch[]>();
  for (const t of touchRows) {
    if (!isHow(t.how)) continue;
    const list = touchesBy.get(t.quote_key) ?? [];
    list.push({ at: t.created_at, how: t.how as TouchHow, note: t.note, by: t.created_by });
    touchesBy.set(t.quote_key, list);
  }

  const out: PipeQuote[] = [];
  const stale: PipeQuote[] = [];
  // Won and lost kept this long; the Lost page asks for longer to see a pattern.
  const recentDay = isoDateMelbourne(daysAgo(opts.recentDays ?? RECENT_DAYS));
  const liveDay = isoDateMelbourne(daysAgo(LIVE_DAYS));

  for (const [key, g] of groups) {
    const rows = g.rows;
    const dated = rows.filter((r) => r.created_on).sort((a, b) => String(a.created_on).localeCompare(String(b.created_on)));
    if (!dated.length) continue;
    const first = dated[0];
    const last = dated[dated.length - 1];
    const sold = rows.filter((r) => r.status === "Sold" && r.sold_on);
    const allDismissed = rows.every((r) => r.status === "Dismissed");
    const job = first.job_id != null ? jobById.get(first.job_id) : undefined;
    const site = !job && Number(first.location_id) > 0 ? siteById.get(Number(first.location_id)) : undefined;
    const f = followBy.get(key);
    const touches = touchesBy.get(key) ?? [];
    const quotedOn = isoDateMelbourne(new Date(first.created_on as string));
    const pricedOn = isoDateMelbourne(new Date(last.created_on as string));
    const totals = rows.map((r) => Number(r.total ?? 0));

    const base: Omit<PipeQuote, "stage"> = {
      key,
      jobId: first.job_id,
      jobNumber: job?.job_number ?? null,
      customerId: first.customer_id,
      customer: job?.customer_name ?? site?.name ?? null,
      suburb: job?.suburb ?? site?.city ?? null,
      phone: bestPhone(first.customer_id != null ? phoneByCust.get(first.customer_id) : undefined) ?? bestPhone(job?.location_id != null ? phoneByLoc.get(job.location_id) : site ? phoneByLoc.get(site.id) : undefined),
      what: (rows.find((r) => r.name?.trim())?.name?.trim() || job?.job_type) ?? null,
      value: sold.length ? sold.reduce((n, r) => n + Number(r.total ?? 0), 0) : totals.reduce((a, b) => a + b, 0) / Math.max(1, totals.length),
      options: rows.length,
      quotedOn,
      quietDays: Math.max(0, Math.floor((Date.now() - Date.parse(last.created_on as string)) / 86_400_000)),
      quotedBy: first.created_by ?? first.sold_by ?? null,
      soldOn: sold.length ? isoDateMelbourne(new Date(sold.map((r) => r.sold_on as string).sort().pop() as string)) : null,
      owner: f?.owner ?? null,
      nextOn: f?.next_on ?? null,
      lostReason: f?.lost_reason ?? null,
      dismissed: allDismissed,
      touches,
      work: null,
    };

    if (base.soldOn) {
      if (!detail) {
        if (base.soldOn >= recentDay) out.push({ ...base, stage: "won" });
        continue;
      }
      const at = afterSale(key);
      if (at) out.push({ ...base, stage: at.stage, work: at.work });
      continue;
    }
    if (f?.lost_at || allDismissed) {
      const lostDay = f?.lost_at ? isoDateMelbourne(new Date(f.lost_at)) : isoDateMelbourne(new Date((rows.map((r) => r.modified_on).filter(Boolean).sort().pop() ?? last.created_on) as string));
      if (lostDay >= recentDay) out.push({ ...base, stage: "lost" });
      continue;
    }
    if (pricedOn < liveDay) {
      stale.push({ ...base, stage: "due" });
      continue;
    }
    out.push({ ...base, pricedOn, stage: openStage({ pricedOn, nextOn: base.nextOn, touches }, today) });
  }

  return { quotes: out, stale: stale.sort((a, b) => b.value - a.value), today };
}

/**
 * How many quotes are due a call today — the number Home's list and the side
 * bar show, worked out the same way as the pipeline's own column so the two
 * can never disagree. Once per request, however many places ask.
 */
export const pipelineDue = cache(async (): Promise<{ due: number; late: number; openCount: number; openValue: number }> => {
  const p = await loadPipeline({ detail: false });
  const due = p.quotes.filter((x) => x.stage === "due");
  const open = p.quotes.filter((x) => x.stage === "new" || x.stage === "due" || x.stage === "waiting");
  return {
    due: due.length,
    late: due.filter((x) => x.nextOn && x.nextOn < p.today).length,
    openCount: open.length,
    openValue: open.reduce((n, x) => n + x.value, 0),
  };
});

/* ------------------------------------------------------------------ writes */

export async function logTouch(key: string, how: TouchHow, note: string | null, by: string): Promise<void> {
  await sbInsert("portal_quote_touches", { quote_key: key, how, note: note?.trim().slice(0, 500) || null, created_by: by });
  pipelineChanged();
}

/** Set any of owner / next call / lost on a quote, leaving the rest as they were. */
export async function setFollow(key: string, patch: { owner?: string | null; nextOn?: string | null; lost?: { reason: string } | null }, by: string): Promise<void> {
  const cur = (await sbSelect<FollowRow>("portal_quote_follow", [q.select("quote_key,owner,next_on,lost_at,lost_reason"), q.eq("quote_key", key)].join("&")).catch(() => []))[0];
  const row = {
    quote_key: key,
    owner: patch.owner !== undefined ? patch.owner : cur?.owner ?? null,
    next_on: patch.nextOn !== undefined ? patch.nextOn : cur?.next_on ?? null,
    lost_at: patch.lost !== undefined ? (patch.lost ? new Date().toISOString() : null) : cur?.lost_at ?? null,
    lost_reason: patch.lost !== undefined ? patch.lost?.reason ?? null : cur?.lost_reason ?? null,
    updated_by: by,
    updated_at: new Date().toISOString(),
  };
  await sbUpsert("portal_quote_follow", [row], "quote_key");
  pipelineChanged();
}
