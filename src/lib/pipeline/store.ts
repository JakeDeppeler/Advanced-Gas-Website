import "server-only";
import { cache } from "react";
import { q, sbInsert, sbSelect, sbUpsert } from "@/lib/dashboard/db";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { quoteKey, quotes } from "@/lib/dashboard/metrics";
import { isHow, openStage, type PipeQuote, type Touch, type TouchHow } from "./types";

/** Open quotes are worked for 60 days; past that they're listed to close off, not chased. */
export const LIVE_DAYS = 60;
/** Won and lost stay on the board this long, so the week's wins are visible. */
const RECENT_DAYS = 30;
/** Further back than this, an "open" quote is old-system residue nobody will ring. */
const LOOK_BACK_DAYS = 150;

type EstRow = {
  id: number; job_id: number | null; customer_id: number | null; status: string | null; total: number | string | null;
  created_on: string | null; sold_on: string | null; modified_on: string | null; created_by: string | null; sold_by: string | null;
  business_unit: string | null; name: string | null;
};
type JobRow = { id: number; job_number: string | null; customer_name: string | null; suburb: string | null; job_type: string | null; location_id: number | null };
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
export async function loadPipeline(opts: { detail?: boolean } = {}): Promise<Pipeline> {
  // Without detail it's the columns alone — no names, suburbs or phone numbers
  // — which is all a count needs, and two fewer round trips on every page.
  const detail = opts.detail ?? true;
  const today = isoDateMelbourne(new Date());
  const since = iso(daysAgo(LOOK_BACK_DAYS));
  const recent = iso(daysAgo(RECENT_DAYS));

  const [estRaw, follows, touchRows] = await Promise.all([
    sbSelect<EstRow>("st_estimates", [
      // total_inc, not total: every other quote figure in the portal and on the
      // wall is with GST, and the Scoreboard tile that opens this page is one.
      q.select("id,job_id,customer_id,status,total:total_inc,created_on,sold_on,modified_on,created_by,sold_by,business_unit,name:raw->>name"),
      `or=(created_on.gte.${since},sold_on.gte.${recent})`,
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
  const jobs = detail ? await byIds<JobRow>("st_jobs", "id,job_number,customer_name,suburb,job_type,location_id", "id", jobIds) : [];
  const jobById = new Map(jobs.map((j) => [j.id, j]));

  const custIds = est.map((r) => r.customer_id).filter((v): v is number => v != null);
  const locIds = jobs.map((j) => j.location_id).filter((v): v is number => v != null);
  const phoneTypes = `type=in.(Phone,MobilePhone)`;
  const [custPhones, locPhones] = detail ? await Promise.all([
    byIds<{ customer_id: number; type: string; value: string }>("st_customer_contacts", "customer_id,type,value", "customer_id", custIds, [phoneTypes, "active=is.true"]),
    byIds<{ location_id: number; type: string; value: string }>("st_location_contacts", "location_id,type,value", "location_id", locIds, [phoneTypes, "active=is.true"]),
  ]) : [[], []];
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
  const recentDay = isoDateMelbourne(daysAgo(RECENT_DAYS));
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
      customer: job?.customer_name ?? null,
      suburb: job?.suburb ?? null,
      phone: bestPhone(first.customer_id != null ? phoneByCust.get(first.customer_id) : undefined) ?? bestPhone(job?.location_id != null ? phoneByLoc.get(job.location_id) : undefined),
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
    };

    if (base.soldOn) {
      if (base.soldOn >= recentDay) out.push({ ...base, stage: "won" });
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
    out.push({ ...base, stage: openStage({ pricedOn, nextOn: base.nextOn, touches: touches.length }, today) });
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
}
