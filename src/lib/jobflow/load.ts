import "server-only";
import { cache } from "react";
import { q, sbSelect } from "@/lib/dashboard/db";
import { jobClass } from "@/lib/dashboard/pace";
import { serviceLabel } from "@/lib/dashboard/metrics";
import { ST_LEDGER_FROM } from "@/lib/dashboard/stOwed";
import { stJobUrl, toBillJobs } from "@/lib/dashboard/toBill";
import { phonePretty } from "@/lib/leads/newLeadTypes";
import { loadPipeline } from "@/lib/pipeline/store";
import { daysBetween } from "@/lib/pipeline/types";
import { owedInvoices } from "@/lib/portal/run/money";
import {
  daysSince, emailKey, openStage, phoneKeys, unsentOwing, ENQUIRY_DAYS, STAGES,
  type FlowStage,
} from "./types";

export type Tone = "good" | "mid" | "bad" | "none";

/** One line on the tracker: a job, a quote, an enquiry or an invoice, in the stage it's stuck at. */
export type FlowRow = {
  key: string;
  title: string;
  sub: string[];
  st: { k: Tone; w: string };
  /** Inc GST: the invoice where there is one, else what was sold or quoted. */
  value: number | null;
  /** How long it has sat in this stage, for the order (oldest first) and the age on the tile. */
  days: number;
  stUrl: string | null;
  /** The customer's page: every job, quote and invoice they have, in order. */
  customerUrl: string | null;
};

export type StageRows = {
  /** Null when the source couldn't be read: the tile says so rather than showing a zero it didn't measure. */
  rows: FlowRow[] | null;
  /** How many are in the stage, which for the quiet ones is all there is. */
  count: number | null;
  note?: string;
};

export type JobFlow = { stages: Record<FlowStage, StageRows>; nowMs: number };

/** A job ServiceTitan still has open, with what the tracker needs to place it. */
export type OpenFacts = {
  id: number;
  jobNumber: string | null;
  customerId: number | null;
  customer: string | null;
  suburb: string | null;
  jobType: string | null;
  status: string;
  imported: boolean;
  quoteVisit: boolean;
  createdOn: string | null;
  modifiedOn: string | null;
  lastVisit: string | null;
  nextVisit: string | null;
  /** Every appointment's time had passed while the job still read Scheduled: nobody started it in the app. */
  neverStarted: boolean;
  quoted: boolean;
  sold: number;
  invoiced: number;
  reference: string | null;
  techs: string[];
  stage: FlowStage;
};

const DAY = 86_400_000;
const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const chunks = <T,>(xs: T[], size = 150): T[][] => Array.from({ length: Math.ceil(xs.length / size) }, (_, i) => xs.slice(i * size, i * size + size));
const first = (name: string) => name.trim().split(/\s+/)[0];
const IMPORTED = /imported|default/i;

/** Rows whose `col` is one of `ids`, a URL-safe handful at a time. Throws on a failed read: a missing chunk would put jobs in the wrong list. */
async function byIds<T>(table: string, cols: string, col: string, ids: Array<number | string>, extra: string[] = []): Promise<T[]> {
  const uniq = [...new Set(ids.map(String))];
  const parts = await Promise.all(chunks(uniq).map((part) => sbSelect<T>(table, [q.select(cols), `${col}=in.(${part.join(",")})`, ...extra, "limit=5000"].join("&"))));
  return parts.flat();
}

/** "today", "yesterday", "9 days ago". */
export function ago(iso: string | null, nowMs: number): string {
  if (!iso) return "";
  const d = daysSince(iso, nowMs);
  return d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
}

const day = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short", year: "numeric" });
/** "Today", or "Tue 28" for a visit later on. */
function visitDay(iso: string, nowMs: number): string {
  const mel = (ms: number) => new Date(ms).toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne" });
  if (mel(Date.parse(iso)) === mel(nowMs)) return "Today";
  return new Date(iso).toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", day: "numeric" });
}
const customerUrl = (id: number | null | undefined) => (id != null ? `/portal/customers/${id}` : null);

/**
 * The pill on a row says how long it has sat, and nothing else: the list it's
 * in already says what's wrong, and saying it again on every row was most of
 * what made the lists hard to read. Late from `bad` days; `mid` before that
 * (or from `midAt`, with anything younger shown as fine).
 */
function age(days: number, bad: number, midAt = 0): FlowRow["st"] {
  const w = days === 0 ? "Today" : days === 1 ? "1 day" : `${days} days`;
  return days >= bad ? { k: "bad", w } : days >= midAt ? { k: "mid", w } : { k: "good", w };
}
const oldestFirst = (rows: FlowRow[]) => rows.sort((a, b) => b.days - a.days);

/* ------------------------------------------------------------ open jobs */

type JobRow = {
  id: number; job_number: string | null; customer_id: number | null; customer_name: string | null; suburb: string | null; job_type: string | null;
  status: string; business_unit: string | null; created_on: string | null; modified_on: string | null; po: string | null;
};
type ApptRow = { job_id: number; start_at: string | null; end_at: string | null; status: string | null };

/**
 * Every job ServiceTitan has open, placed in its stage. Read whole each time,
 * any age: the point is the jobs nobody has looked at in months.
 */
export const openJobs = cache(async (nowMs: number): Promise<OpenFacts[]> => {
  const jobs = await sbSelect<JobRow>("st_jobs", [
    q.select("id,job_number,customer_id,customer_name,suburb,job_type,status,business_unit,created_on,modified_on,po:raw->>customerPo"),
    "status=in.(Scheduled,InProgress,Hold)",
    "limit=5000",
  ].join("&"));
  if (!jobs.length) return [];
  const ids = jobs.map((j) => Number(j.id));

  const [appts, techs, ests, invs] = await Promise.all([
    byIds<ApptRow>("st_appointments", "job_id,start_at,end_at,status", "job_id", ids, ["active=not.is.false"]),
    byIds<{ job_id: number; technician_name: string | null }>("st_appointment_assignments", "job_id,technician_name", "job_id", ids, ["active=not.is.false"]),
    byIds<{ job_id: number; created_on: string | null; sold_on: string | null; total: number | null; active: string | null }>(
      "st_estimates", "job_id,created_on,sold_on,total:total_inc,active:raw->>active", "job_id", ids,
    ),
    byIds<{ job_id: number; total: number | null }>("st_invoices", "job_id,total", "job_id", ids),
  ]);

  const visits = new Map<number, { last: string | null; next: string | null; started: boolean; any: boolean }>();
  for (const a of appts) {
    if (!a.start_at || /cancel/i.test(a.status ?? "")) continue;
    const v = visits.get(Number(a.job_id)) ?? { last: null, next: null, started: false, any: false };
    v.any = true;
    if (Date.parse(a.start_at) > nowMs) {
      if (!v.next || a.start_at < v.next) v.next = a.start_at;
    } else {
      const end = a.end_at ?? a.start_at;
      if (!v.last || end > v.last) v.last = end;
      // Anything past Scheduled means somebody dispatched it, arrived or finished.
      if (a.status && a.status !== "Scheduled") v.started = true;
    }
    visits.set(Number(a.job_id), v);
  }
  const names = new Map<number, Set<string>>();
  for (const t of techs) if (t.technician_name) names.set(Number(t.job_id), (names.get(Number(t.job_id)) ?? new Set()).add(first(t.technician_name)));
  const onJob = new Map<number, { quoted: boolean; sold: number }>();
  for (const e of ests) {
    if (e.active === "false") continue;
    const o = onJob.get(Number(e.job_id)) ?? { quoted: false, sold: 0 };
    o.quoted = true;
    if (e.sold_on) o.sold += n(e.total);
    onJob.set(Number(e.job_id), o);
  }
  const billed = new Map<number, number>();
  for (const i of invs) billed.set(Number(i.job_id), (billed.get(Number(i.job_id)) ?? 0) + n(i.total));

  // A quote visit with no quote on its own job may still have been quoted: the
  // office sometimes writes it on the customer, or on another of their jobs.
  // Any quote for the customer from the day before the visit counts.
  const unquoted = jobs.filter((j) => jobClass(j.job_type) === "quote" && !onJob.get(Number(j.id))?.quoted && j.customer_id != null && visits.get(Number(j.id))?.last);
  const quotedSince = new Map<number, string[]>();
  if (unquoted.length) {
    const from = unquoted.reduce((m, j) => { const l = visits.get(Number(j.id))!.last!; return l < m ? l : m; }, new Date(nowMs).toISOString());
    const rows = await byIds<{ customer_id: number; created_on: string }>(
      "st_estimates", "customer_id,created_on", "customer_id", unquoted.map((j) => Number(j.customer_id)),
      [q.gte("created_on", new Date(Date.parse(from) - DAY).toISOString())],
    );
    for (const r of rows) quotedSince.set(Number(r.customer_id), [...(quotedSince.get(Number(r.customer_id)) ?? []), r.created_on]);
  }

  return jobs.map((j) => {
    const id = Number(j.id);
    const v = visits.get(id);
    const est = onJob.get(id);
    const quoteVisit = jobClass(j.job_type) === "quote";
    const lastVisit = v?.last ?? null;
    const quoted = !!est?.quoted || (!!lastVisit && j.customer_id != null && (quotedSince.get(Number(j.customer_id)) ?? []).some((c) => Date.parse(c) >= Date.parse(lastVisit) - DAY));
    const facts = {
      id, jobNumber: j.job_number ? String(j.job_number) : null, customerId: j.customer_id != null ? Number(j.customer_id) : null,
      customer: j.customer_name, suburb: j.suburb, jobType: j.job_type, status: j.status,
      imported: IMPORTED.test(j.business_unit ?? ""), quoteVisit,
      createdOn: j.created_on, modifiedOn: j.modified_on, lastVisit, nextVisit: v?.next ?? null,
      neverStarted: !!v?.any && !v.started && j.status === "Scheduled",
      quoted, sold: est?.sold ?? 0, invoiced: billed.get(id) ?? 0, reference: j.po?.trim() || null,
      techs: [...(names.get(id) ?? [])],
    };
    return { ...facts, stage: openStage(facts, nowMs) };
  });
});

export function openRow(j: OpenFacts, nowMs: number): FlowRow {
  const visitDays = j.lastVisit ? daysSince(j.lastVisit, nowMs) : 0;
  const madeDays = j.createdOn ? daysSince(j.createdOn, nowMs) : 0;
  const touched = j.modifiedOn ? daysSince(j.modifiedOn, nowMs) : 0;
  // Only what the stage and the pill don't already say.
  let note: string | null = null, days = 0, st: FlowRow["st"] = { k: "mid", w: "" };
  switch (j.stage) {
    case "nodate": days = madeDays; st = age(days, 3); break;
    case "toquote": days = visitDays; st = age(days, 2); break;
    case "closevisit": days = visitDays; st = age(days, 7); break;
    case "notclosed":
      days = visitDays; st = age(days, 7);
      if (j.neverStarted) note = "never started in the app";
      break;
    case "hold": days = touched; st = age(days, 14); break;
    // On track: the card says when the visit is, not how long anything has waited.
    case "booked": days = 0; st = { k: "none", w: j.nextVisit ? visitDay(j.nextVisit, nowMs) : "Being done" }; break;
    default:
      days = visitDays || madeDays;
      note = j.lastVisit ? `last visit ${day(j.lastVisit)}` : j.createdOn ? `made ${day(j.createdOn)}` : null;
      st = { k: "none", w: "Check it" };
  }
  // The bigger of the two: an install's invoice often carries only the deposit so far, and the job is worth the sale.
  const value = Math.max(j.invoiced, j.sold) > 0.5 ? Math.max(j.invoiced, j.sold) : null;
  return {
    key: `job-${j.id}`,
    title: [j.jobType ?? "Job", j.suburb].filter(Boolean).join(" · "),
    sub: [j.jobNumber ? `#${j.jobNumber}` : null, j.customer, j.techs.length ? j.techs.join(", ") : null, note].filter((s): s is string => !!s),
    st, value, days,
    stUrl: stJobUrl(j.id),
    customerUrl: customerUrl(j.customerId),
  };
}

/* ------------------------------------------------------------ enquiries */

type LeadRow = { id: string; created_at: string; name: string | null; phone: string | null; email: string | null; suburb: string | null; service: string | null };

/**
 * Website enquiries with nothing in ServiceTitan since: no job and no quote
 * for a customer with that phone number or email. Matched on the numbers
 * ServiceTitan holds, never on names, which are typed a dozen ways.
 *
 * It says no job was found, not that nobody rang them: an enquiry rung and
 * turned down looks the same, which is why it falls off after three weeks
 * instead of sitting here as a failure forever.
 */
async function enquiries(nowMs: number): Promise<FlowRow[]> {
  const since = new Date(nowMs - ENQUIRY_DAYS * DAY).toISOString();
  const leads = await sbSelect<LeadRow>("portal_leads", [
    q.select("id,created_at,name,phone,email,suburb,service"), q.gte("created_at", since), "or=(phone.not.is.null,email.not.is.null)", "order=created_at.asc", "limit=500",
  ].join("&"));
  if (!leads.length) return [];

  const keysOf = (l: LeadRow) => [...phoneKeys(l.phone), ...[emailKey(l.email)].filter((e): e is string => !!e)];
  // Emails as typed too: ServiceTitan keeps them in whatever case the office entered.
  const typed = leads.map((l) => l.email?.trim() ?? "").filter((e) => emailKey(e) != null);
  const all = [...new Set([...leads.flatMap(keysOf), ...typed])];
  const quoted = (vs: string[]) => vs.map((v) => `"${encodeURIComponent(v)}"`);
  const [cust, loc] = all.length ? await Promise.all([
    Promise.all(chunks(all, 80).map((part) => sbSelect<{ customer_id: number; value: string }>("st_customer_contacts", [q.select("customer_id,value"), `value=in.(${quoted(part).join(",")})`].join("&")))).then((x) => x.flat()),
    Promise.all(chunks(all, 80).map((part) => sbSelect<{ location_id: number; value: string }>("st_location_contacts", [q.select("location_id,value"), `value=in.(${quoted(part).join(",")})`].join("&")))).then((x) => x.flat()),
  ]) : [[], []];
  const locCust = loc.length ? await byIds<{ id: number; customer_id: number }>("st_locations", "id,customer_id", "id", loc.map((l) => Number(l.location_id))) : [];
  const locToCust = new Map(locCust.map((l) => [Number(l.id), Number(l.customer_id)]));
  const byKey = new Map<string, Set<number>>();
  const add = (k: string, c: number | undefined) => { if (c != null && Number.isFinite(c)) byKey.set(k.toLowerCase(), (byKey.get(k.toLowerCase()) ?? new Set()).add(c)); };
  for (const c of cust) add(c.value, Number(c.customer_id));
  for (const l of loc) add(l.value, locToCust.get(Number(l.location_id)));

  const custIds = [...new Set([...byKey.values()].flatMap((s) => [...s]))];
  const after = new Date(Date.parse(since) - 2 * DAY).toISOString();
  const [jobs, ests] = custIds.length ? await Promise.all([
    byIds<{ customer_id: number; created_on: string }>("st_jobs", "customer_id,created_on", "customer_id", custIds, [q.gte("created_on", after)]),
    byIds<{ customer_id: number; created_on: string }>("st_estimates", "customer_id,created_on", "customer_id", custIds, [q.gte("created_on", after)]),
  ]) : [[], []];
  const activity = new Map<number, string[]>();
  for (const r of [...jobs, ...ests]) activity.set(Number(r.customer_id), [...(activity.get(Number(r.customer_id)) ?? []), r.created_on]);

  const out: FlowRow[] = [];
  for (const l of leads) {
    const custs = [...new Set(keysOf(l).flatMap((k) => [...(byKey.get(k) ?? [])]))];
    // Booked in the two days before they wrote is the same enquiry: they rang and filled the form in too.
    const from = Date.parse(l.created_at) - 2 * DAY;
    if (custs.some((c) => (activity.get(c) ?? []).some((t) => Date.parse(t) >= from))) continue;
    const days = daysSince(l.created_at, nowMs);
    out.push({
      key: `lead-${l.id}`,
      title: [l.service ? serviceLabel(l.service) : "Enquiry", l.suburb].filter(Boolean).join(" · "),
      sub: [l.name, phonePretty(l.phone), custs.length ? "a customer already, nothing booked since" : "not in ServiceTitan"].filter((s): s is string => !!s),
      st: age(days, 2),
      value: null, days, stUrl: null,
      customerUrl: custs.length === 1 ? customerUrl(custs[0]) : null,
    });
  }
  return out;
}

/* ------------------------------------------------------------ quotes */

async function quoteStages(nowMs: number): Promise<{ quoted: FlowRow[]; sold: FlowRow[] }> {
  const p = await loadPipeline();
  const row = (x: (typeof p.quotes)[number], stage: "quoted" | "sold"): FlowRow => {
    const from = stage === "sold" ? x.soldOn ?? x.quotedOn : x.pricedOn ?? x.quotedOn;
    // By calendar day in Melbourne, as the pipeline counts it, so both pages say the same age.
    const days = Math.max(0, daysBetween(from, p.today));
    // A quote's pill is the call, not the age: that's what the follow-up rule runs on.
    const st: FlowRow["st"] = stage === "sold" ? age(days, 8)
      : x.stage === "new" ? { k: "none", w: "Just quoted" }
      : x.stage === "waiting" ? { k: "none", w: "Waiting" }
      : x.nextOn && x.nextOn < p.today ? { k: "bad", w: "Call late" } : { k: "mid", w: "Ring today" };
    return {
      key: `quote-${x.key}`,
      title: [x.what ?? "Quote", x.suburb].filter(Boolean).join(" · "),
      sub: [x.jobNumber ? `#${x.jobNumber}` : null, x.customer, stage === "quoted" ? `quoted ${ago(from, nowMs)}` : null, x.owner].filter((s): s is string => !!s),
      st, value: x.value || null, days,
      stUrl: x.jobId ? stJobUrl(x.jobId) : null,
      customerUrl: customerUrl(x.customerId),
    };
  };
  return {
    // Every quote that's out, the ones waiting on the customer too: on the board they're the column's quiet end.
    quoted: oldestFirst(p.quotes.filter((x) => x.stage === "new" || x.stage === "due" || x.stage === "waiting").map((x) => row(x, "quoted"))),
    sold: oldestFirst(p.quotes.filter((x) => x.stage === "won").map((x) => row(x, "sold"))),
  };
}

/* ------------------------------------------------------------ billing */

async function toBill(nowMs: number): Promise<FlowRow[]> {
  const rows = await toBillJobs();
  return oldestFirst(rows.map((r) => {
    const days = daysSince(r.at, nowMs);
    return {
      key: `job-${r.id}`,
      title: [r.jobType ?? "Job", r.suburb].filter(Boolean).join(" · "),
      sub: [r.jobNumber ? `#${r.jobNumber}` : null, r.customer ?? null].filter((s): s is string => !!s),
      // The same words and thresholds as Jobs › Not billed.
      // Not billed's thresholds: late past a week, worth a nudge past two days.
      st: age(days, 8, 3),
      value: r.value, days,
      stUrl: stJobUrl(r.id),
      customerUrl: customerUrl(r.customerId),
    };
  }));
}

type InvRow = { id: number; invoice_number: string | null; job_id: number | null; balance: string | null; sent: string | null; business_unit: string | null };
type DoneJob = { id: number; job_number: string | null; customer_id: number | null; customer_name: string | null; suburb: string | null; job_type: string | null; completed_on: string | null; status: string };

/** Finished, invoiced, owing, never sent: the rule Office today counts by. */
async function toSend(nowMs: number): Promise<FlowRow[]> {
  const invs = (await sbSelect<InvRow>("st_invoices", [
    q.select("id,invoice_number,job_id,balance:raw->>balance,sent:raw->>sentStatus,business_unit"),
    q.gte("invoice_date", ST_LEDGER_FROM), "limit=5000",
  ].join("&"))).filter((i) => i.job_id != null && unsentOwing(i) && !IMPORTED.test(i.business_unit ?? ""));
  if (!invs.length) return [];
  const jobs = new Map((await byIds<DoneJob>("st_jobs", "id,job_number,customer_id,customer_name,suburb,job_type,completed_on,status", "id", invs.map((i) => Number(i.job_id))))
    .map((j) => [Number(j.id), j]));
  const out: FlowRow[] = [];
  for (const i of invs) {
    const j = jobs.get(Number(i.job_id));
    if (!j || j.status !== "Completed" || !j.completed_on) continue;
    const days = daysSince(j.completed_on, nowMs);
    out.push({
      key: `inv-${i.id}`,
      title: [j.job_type ?? "Job", j.suburb].filter(Boolean).join(" · "),
      sub: [j.job_number ? `#${j.job_number}` : null, j.customer_name, i.invoice_number ? `invoice ${i.invoice_number}` : null].filter((s): s is string => !!s),
      st: age(days, 2),
      value: n(i.balance), days,
      stUrl: stJobUrl(Number(j.id)),
      customerUrl: customerUrl(j.customer_id),
    });
  }
  return oldestFirst(out);
}

/** Owed to us's list, cut to what's past due on finished work. A deposit's balance on a job not done yet isn't late. */
async function overdue(): Promise<{ rows: FlowRow[]; partial: "xero" | "servicetitan" | null }> {
  const owed = await owedInvoices();
  if (!owed) throw new Error("owed: neither Xero nor ServiceTitan answered");
  const rows = owed.list
    .filter((i) => i.stage === "billed" && i.daysOver > 0)
    .sort((a, b) => b.daysOver - a.daysOver)
    .map((i) => ({
      key: `owed-${i.from}-${i.number}`,
      title: i.contact || "Customer",
      sub: [`invoice ${i.number}`, i.from === "xero" ? "in Xero" : "in ServiceTitan"],
      // Past its due date is late, by definition: the column's count and the card agree.
      st: { k: "bad" as const, w: `${i.daysOver} ${i.daysOver === 1 ? "day" : "days"} late` },
      value: i.amountDue, days: i.daysOver,
      stUrl: null, customerUrl: null,
    }));
  return { rows, partial: owed.partial };
}

/* ------------------------------------------------------------ the lot */

/**
 * Every stage, each read on its own so one source failing blanks its own
 * tiles and leaves the rest standing. `nowMs` is passed in, not read here, so
 * a page's lists and its counts agree about what "two days ago" means.
 */
export const loadJobFlow = cache(async (nowMs: number): Promise<JobFlow> => {
  const settle = <T,>(p: Promise<T>) => p.then((v) => ({ ok: true as const, v }), (e: unknown) => { console.error("jobflow:", e instanceof Error ? e.message : e); return { ok: false as const }; });
  const [open, leads, quotes, bill, send, late] = await Promise.all([
    settle(openJobs(nowMs)), settle(enquiries(nowMs)), settle(quoteStages(nowMs)), settle(toBill(nowMs)), settle(toSend(nowMs)), settle(overdue()),
  ]);

  const stages = Object.fromEntries(STAGES.map((s) => [s.k, { rows: null, count: null }])) as Record<FlowStage, StageRows>;
  const put = (k: FlowStage, rows: FlowRow[], note?: string) => { stages[k] = { rows, count: rows.length, note }; };

  if (open.ok) {
    const of = (k: FlowStage) => open.v.filter((j) => j.stage === k);
    for (const k of ["nodate", "toquote", "closevisit", "notclosed", "hold", "imported"] as const) put(k, oldestFirst(of(k).map((j) => openRow(j, nowMs))));
    // Soonest visit first: it's the diary, not a backlog.
    put("booked", of("booked").sort((a, b) => (a.nextVisit ?? "").localeCompare(b.nextVisit ?? "")).map((j) => openRow(j, nowMs)));
  }
  if (leads.ok) put("enquiry", oldestFirst(leads.v));
  if (quotes.ok) {
    put("quoted", quotes.v.quoted);
    put("sold", quotes.v.sold);
  }
  if (bill.ok) put("tobill", bill.v);
  if (send.ok) put("tosend", send.v);
  // One ledger missing is said, not hidden: the count is then only the other's.
  if (late.ok) put("overdue", late.v.rows, late.v.partial ? `${late.v.partial === "xero" ? "Xero" : "ServiceTitan"} didn't answer, so its invoices aren't in this count` : undefined);
  return { stages, nowMs };
});

/** The counts for Office today and the daily report: what's been left open, without the lists. */
export async function openJobCounts(nowMs = Date.now()): Promise<{ notClosed: number; closeVisit: number; toQuote: number; noDate: number }> {
  const open = await openJobs(nowMs);
  const c = (k: FlowStage) => open.filter((j) => j.stage === k).length;
  return { notClosed: c("notclosed"), closeVisit: c("closevisit"), toQuote: c("toquote"), noDate: c("nodate") };
}
