import "server-only";
import { dashboardDbConfigured, q, sbInsertIfAbsent, sbSelect, sbUpdate } from "@/lib/dashboard/db";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { quoteKey } from "@/lib/dashboard/metrics";
import { emailContext } from "@/lib/email/context";
import { fromBox } from "@/lib/email/from";
import { withInlineImages } from "@/lib/email/inline";
import { jobSitePhoto } from "@/lib/email/jobPhoto";
import { letterHtml, letterText } from "@/lib/email/premium";
import { sendEmail } from "@/lib/email/send";
import { resolveSigner } from "@/lib/email/templates/signer";
import { liveTemplate } from "@/lib/email/templates/store";
import { optionWords, renderTemplate, type Values } from "@/lib/email/templates/types";
import { emailProblem, householdUnit, inSendingHours } from "@/lib/quotes/followUpRules";
import { firstName, jobWords, techWords } from "@/lib/reviews/requestTypes";
import { site } from "@/lib/site";
import { afterSwitch, AUTO_KINDS, autoSettingsFrom, daysLate, dueWords, invoiceStep, money, monthWords, SERVICE_AFTER_DAYS, SERVICE_WINDOW_DAYS, type AutoKind, type AutoSettings } from "./rules";

/**
 * Sends the after-the-quote customer emails (rules.ts), every ten minutes in
 * sending hours, each kind only while its switch is on. Each email is claimed
 * in portal_auto_emails before it goes (unique per kind, thing and step), so
 * two runs can't send it twice, and every one is in that table with what
 * happened. `dry` says what each kind would send now, without sending or
 * writing anything, switched on or not.
 */

const TABLE = "portal_auto_emails";
const SETTINGS = "auto_emails";
const REPLY_TO = "admin@advancedgas.com.au";
const PER_KIND = 6;
const DAY = 86_400_000;
const ST_LEDGER_FROM = "2026-09-17";

export async function loadAutoSettings(): Promise<AutoSettings> {
  return autoSettingsFrom(await getSettings<unknown>(SETTINGS).catch(() => null));
}

/** One kind on or off. On is from now: what happened before is left alone. */
export async function setAutoEmail(kind: AutoKind, on: boolean, by: string): Promise<{ ok: boolean; error?: string }> {
  if (!AUTO_KINDS.some((k) => k.k === kind)) return { ok: false, error: "That isn't one of the emails." };
  const cur = await loadAutoSettings();
  const next = { ...cur, [kind]: { on, since: on ? new Date().toISOString() : cur[kind].since, by } };
  const saved = await saveSettings(SETTINGS, next);
  return saved.ok ? { ok: true } : { ok: false, error: "Couldn't save the switch." };
}

type Candidate = {
  kind: AutoKind; ref: string; step: string; template: string;
  customerId: number | null; customer: string | null; values: Values; signerName: string | null;
  /** For the job photo in "All done". */
  job?: { id: number; type: string | null };
  /** A step passed over (the first invoice reminder when it's already 10 days late). */
  skip?: string;
};

const chunks = <T,>(xs: T[], n = 150) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
async function byIds<T>(table: string, cols: string, col: string, ids: (number | string)[], extra: string[] = []): Promise<T[]> {
  const uniq = [...new Set(ids.map(String))].filter(Boolean);
  if (!uniq.length) return [];
  return (await Promise.all(chunks(uniq).map((c) => sbSelect<T>(table, [q.select(cols), `${col}=in.(${c.map((v) => (/^\d+$/.test(v) ? v : `"${v}"`)).join(",")})`, ...extra, "limit=10000"].join("&"))))).flat();
}
const iso = (ms: number) => new Date(ms).toISOString();
const later = (a: string | null, b: number) => new Date(Math.max(a ? Date.parse(a) : 0, b)).toISOString();

type Est = { id: number; job_id: number | null; customer_id: number | null; status: string | null; sold_on: string | null; created_on: string | null; name: string | null; sold_by: string | null; created_by: string | null; business_unit: string | null; active: string | null; loc: string | null };
const EST_COLS = "id,job_id,customer_id,status,sold_on,created_on,name:raw->>name,sold_by,created_by,business_unit,active:raw->>active,loc:raw->>locationId";

/* ------------------------------------------------------------ finding them */

async function soldQuotes(fromMs: number, toMs: number): Promise<Est[]> {
  const rows = await sbSelect<Est>("st_estimates", [q.select(EST_COLS), q.eq("status", "Sold"), q.gte("sold_on", iso(fromMs)), q.lt("sold_on", iso(toMs)), "limit=2000"].join("&"));
  return rows.filter((e) => e.active !== "false" && householdUnit(e.business_unit));
}

/** One per quote: a quote's options share a job (or, written on the customer, a customer and a day). */
function perQuote(ests: Est[]): Map<string, Est> {
  const m = new Map<string, Est>();
  for (const e of ests) {
    const k = quoteKey({ id: e.id, job_id: e.job_id, customer_id: e.customer_id, created_on: e.created_on });
    if (!m.has(k)) m.set(k, e);
  }
  return m;
}

async function names(ests: Est[]): Promise<Map<number, string>> {
  const jobs = await byIds<{ id: number; customer_name: string | null }>("st_jobs", "id,customer_name", "id", ests.map((e) => e.job_id).filter((j): j is number => !!j));
  const locs = await byIds<{ id: number; name: string | null }>("st_locations", "id,name:raw->>name", "id", ests.filter((e) => !e.job_id && e.loc).map((e) => Number(e.loc)));
  const out = new Map<number, string>();
  for (const e of ests) {
    const n = e.job_id ? jobs.find((j) => Number(j.id) === Number(e.job_id))?.customer_name : locs.find((l) => Number(l.id) === Number(e.loc))?.name;
    if (n) out.set(e.id, n);
  }
  return out;
}

async function findSold(s: AutoSettings, nowMs: number): Promise<Candidate[]> {
  const ests = await soldQuotes(nowMs - 3 * DAY, nowMs + DAY);
  const quotes = [...perQuote(ests.filter((e) => afterSwitch(e.sold_on, s.sold)))];
  if (!quotes.length) return [];
  const yes = await byIds<{ job_id: number }>("portal_quote_answers", "job_id", "job_id", quotes.map(([, e]) => e.job_id).filter((j): j is number => !!j), [q.eq("answer", "yes")]);
  const who = await names(quotes.map(([, e]) => e));
  return quotes.filter(([, e]) => !yes.some((y) => Number(y.job_id) === Number(e.job_id))).map(([key, e]) => ({
    kind: "sold", ref: key, step: "1", template: "sold.thanks", customerId: e.customer_id, customer: who.get(e.id) ?? null,
    values: { first: firstName(who.get(e.id) ?? null), option: optionWords(e.name), phone: site.phone }, signerName: e.sold_by || e.created_by,
  }));
}

async function findPickADay(s: AutoSettings, nowMs: number): Promise<Candidate[]> {
  const ests = await soldQuotes(nowMs - 30 * DAY, nowMs - 5 * DAY);
  const quotes = [...perQuote(ests.filter((e) => afterSwitch(e.sold_on, s.pickaday)))];
  if (!quotes.length) return [];
  // Booked: a job made from one of its options with a visit, or a visit on its own job after the sale.
  const made = await byIds<{ id: number; est: string | null; status: string | null }>("st_jobs", "id,est:raw->>createdFromEstimateId,status", "raw->>createdFromEstimateId", ests.map((e) => e.id));
  const jobIds = [...made.filter((m) => m.status !== "Canceled").map((m) => Number(m.id)), ...quotes.map(([, e]) => e.job_id).filter((j): j is number => !!j)];
  const appts = await byIds<{ job_id: number; start_at: string | null }>("st_appointments", "job_id,start_at", "job_id", jobIds, ["status=neq.Canceled"]);
  const who = await names(quotes.map(([, e]) => e));
  const out: Candidate[] = [];
  for (const [key, e] of quotes) {
    const options = ests.filter((x) => quoteKey({ id: x.id, job_id: x.job_id, customer_id: x.customer_id, created_on: x.created_on }) === key).map((x) => x.id);
    const theirJobs = made.filter((m) => options.includes(Number(m.est)) && m.status !== "Canceled").map((m) => Number(m.id));
    const soldAt = Date.parse(e.sold_on ?? "") - DAY;
    const booked = appts.some((a) => a.start_at && (theirJobs.includes(Number(a.job_id)) || (Number(a.job_id) === Number(e.job_id) && Date.parse(a.start_at) >= soldAt)));
    if (booked) continue;
    out.push({ kind: "pickaday", ref: key, step: "1", template: "sold.pickaday", customerId: e.customer_id, customer: who.get(e.id) ?? null, values: { first: firstName(who.get(e.id) ?? null), option: optionWords(e.name), phone: site.phone }, signerName: e.sold_by || e.created_by });
  }
  return out;
}

type Job = { id: number; customer_id: number | null; customer_name: string | null; job_type: string | null; completed_on: string | null; business_unit: string | null; created_on: string | null };

async function findDone(s: AutoSettings, nowMs: number): Promise<Candidate[]> {
  const jobs = (await sbSelect<Job>("st_jobs", [q.select("id,customer_id,customer_name,job_type,completed_on,business_unit,created_on"), q.eq("status", "Completed"), q.gte("completed_on", later(s.done.since, nowMs - 2 * DAY)), "job_type=ilike.*install*", "limit=500"].join("&")))
    .filter((j) => householdUnit(j.business_unit));
  if (!jobs.length) return [];
  const techs = await byIds<{ job_id: number; technician_name: string | null }>("st_appointment_assignments", "job_id,technician_name", "job_id", jobs.map((j) => j.id), ["active=not.is.false"]);
  return jobs.map((j) => {
    const names = [...new Set(techs.filter((t) => Number(t.job_id) === Number(j.id)).map((t) => t.technician_name?.trim()).filter((n): n is string => !!n))];
    return {
      kind: "done" as const, ref: `j${j.id}`, step: "1", template: "done.thanks", customerId: j.customer_id, customer: j.customer_name,
      values: { first: firstName(j.customer_name), tech: names.length ? techWords(names) : "", job: jobWords(j.job_type), phone: site.phone },
      signerName: names[0] ?? null, job: { id: Number(j.id), type: j.job_type },
    };
  });
}

async function findInvoices(s: AutoSettings, nowMs: number): Promise<Candidate[]> {
  type Inv = { id: number; invoice_number: string | null; customer_id: number | null; job_id: number | null; balance: number | string | null; due_date: string | null; business_unit: string | null; sent: string | null };
  const since = s.invoice.since ? s.invoice.since.slice(0, 10) : null;
  if (!since) return [];
  const invs = (await sbSelect<Inv>("st_invoices", [
    q.select("id,invoice_number,customer_id,job_id,balance,due_date,business_unit,sent:raw->>sentStatus"),
    "balance=gt.0.5", q.gte("invoice_date", ST_LEDGER_FROM), q.gte("due_date", since), q.lt("due_date", iso(nowMs).slice(0, 10)), "limit=2000",
  ].join("&"))).filter((i) => householdUnit(i.business_unit) && i.sent !== "NotSent" && i.due_date);
  if (!invs.length) return [];
  const jobs = await byIds<{ id: number; customer_name: string | null }>("st_jobs", "id,customer_name", "id", invs.map((i) => i.job_id).filter((j): j is number => !!j));
  const out: Candidate[] = [];
  for (const i of invs) {
    const step = invoiceStep(daysLate(i.due_date!, nowMs));
    if (!step) continue;
    const customer = jobs.find((j) => Number(j.id) === Number(i.job_id))?.customer_name ?? null;
    out.push({
      kind: "invoice", ref: String(i.id), step, template: step === "first" ? "invoice.first" : "invoice.second", customerId: i.customer_id, customer,
      values: { first: firstName(customer), number: i.invoice_number ?? String(i.id), amount: money(Number(i.balance)), due: dueWords(i.due_date!), phone: site.phone },
      signerName: null, ...(step === "second" ? { skip: "first" } : {}),
    });
  }
  return out;
}

async function findService(s: AutoSettings, nowMs: number): Promise<Candidate[]> {
  if (!s.service.since) return [];
  const to = nowMs - SERVICE_AFTER_DAYS * DAY;
  const from = Math.max(to - SERVICE_WINDOW_DAYS * DAY, Date.parse(s.service.since) - SERVICE_AFTER_DAYS * DAY);
  if (from >= to) return [];
  const jobs = (await sbSelect<Job>("st_jobs", [q.select("id,customer_id,customer_name,job_type,completed_on,business_unit,created_on"), q.eq("status", "Completed"), q.gte("completed_on", iso(from)), q.lt("completed_on", iso(to)), "limit=1000"].join("&")))
    .filter((j) => householdUnit(j.business_unit) && /^(installation|install|service|maintenance)\b/i.test(j.job_type ?? "") && j.customer_id);
  if (!jobs.length) return [];
  // Had another job since: they're already looked after.
  const since = await byIds<{ customer_id: number; created_on: string | null }>("st_jobs", "customer_id,created_on", "customer_id", jobs.map((j) => j.customer_id!), [q.gte("created_on", iso(from))]);
  const year = new Date(nowMs).getUTCFullYear();
  const seen = new Set<number>();
  const out: Candidate[] = [];
  for (const j of jobs.sort((a, b) => (b.completed_on ?? "").localeCompare(a.completed_on ?? ""))) {
    const c = Number(j.customer_id);
    if (seen.has(c)) continue;
    seen.add(c);
    if (since.some((x) => Number(x.customer_id) === c && (x.created_on ?? "") > (j.completed_on ?? ""))) continue;
    out.push({ kind: "service", ref: `c${c}`, step: String(year), template: "service.reminder", customerId: c, customer: j.customer_name, values: { first: firstName(j.customer_name), job: jobWords(j.job_type), when: monthWords(j.completed_on!), phone: site.phone }, signerName: null });
  }
  return out;
}

const FINDERS: Record<AutoKind, (s: AutoSettings, nowMs: number) => Promise<Candidate[]>> = {
  sold: findSold, pickaday: findPickADay, done: findDone, invoice: findInvoices, service: findService,
};

/* ------------------------------------------------------------- sending */

export type AutoLine = { kind: AutoKind; ref: string; step: string; customer: string | null; email: string | null; why: string | null };
export type AutoRun = { sent: number; failed: number; skipped?: string; byKind: Partial<Record<AutoKind, { on: boolean; found: number; sent: number; error?: string }>>; lines?: AutoLine[] };

export async function runAutoEmails(now = new Date(), opts: { dry?: boolean } = {}): Promise<AutoRun> {
  const dry = !!opts.dry;
  const out: AutoRun = { sent: 0, failed: 0, byKind: {}, lines: dry ? [] : undefined };
  if (!dashboardDbConfigured()) return { ...out, skipped: "database not configured" };
  const s = await loadAutoSettings();
  const nowMs = now.getTime();
  // In a dry run, a kind that's off is looked at as if switched on just now, with a week behind it, so there's something to see.
  const view: AutoSettings = dry ? Object.fromEntries(AUTO_KINDS.map((k) => [k.k, s[k.k].on ? s[k.k] : { on: true, since: iso(nowMs - 7 * DAY), by: null }])) as AutoSettings : s;
  const sending = inSendingHours(now);
  const ctx = emailContext();

  for (const k of AUTO_KINDS) {
    const sw = view[k.k];
    if (!sw.on) { out.byKind[k.k] = { on: false, found: 0, sent: 0 }; continue; }
    let found: Candidate[] = [];
    try {
      found = await FINDERS[k.k](view, nowMs);
    } catch (e) {
      out.byKind[k.k] = { on: s[k.k].on, found: 0, sent: 0, error: (e as Error).message.slice(0, 200) };
      continue;
    }
    const done = await byIds<{ ref: string; step: string }>(TABLE, "ref,step", "ref", found.map((f) => f.ref), [q.eq("kind", k.k)]).catch(() => []);
    const fresh = found.filter((f) => !done.some((d) => d.ref === f.ref && (d.step === f.step || (f.kind === "invoice" && f.step === "first" && d.step === "second"))));
    const contacts = await byIds<{ customer_id: number; type: string; value: string; modified_on: string | null }>("st_customer_contacts", "customer_id,type,value,modified_on", "customer_id", fresh.map((f) => f.customerId).filter((c): c is number => c != null), ["active=not.is.false"]);
    const emailOf = (c: number | null) => contacts.filter((x) => Number(x.customer_id) === Number(c) && x.type === "Email").sort((a, b) => (b.modified_on ?? "").localeCompare(a.modified_on ?? "")).map((x) => x.value.trim().toLowerCase()).find((e) => !emailProblem(e)) ?? null;
    const mobileOf = (c: number | null) => contacts.find((x) => Number(x.customer_id) === Number(c) && x.type === "MobilePhone")?.value ?? contacts.find((x) => Number(x.customer_id) === Number(c) && x.type === "Phone")?.value ?? null;
    let sentHere = 0;
    for (const f of fresh) {
      const email = emailOf(f.customerId);
      const why = !email ? "No email of their own in ServiceTitan" : null;
      out.lines?.push({ kind: f.kind, ref: f.ref, step: f.step, customer: f.customer, email, why });
      if (dry || why || !sending || !s[k.k].on || sentHere >= PER_KIND) continue;
      if (f.skip) await sbInsertIfAbsent(TABLE, { kind: f.kind, ref: f.ref, step: f.skip, status: "skipped", email }, "kind,ref,step").catch(() => false);
      const claimed = await sbInsertIfAbsent(TABLE, { kind: f.kind, ref: f.ref, step: f.step, status: "sending", email }, "kind,ref,step").catch(() => false);
      if (!claimed) continue;
      const t = await liveTemplate(f.template);
      if (!t) continue;
      const photo = f.job ? await jobSitePhoto(f.job.id, f.job.type).catch(() => null) : null;
      const e = renderTemplate(t, { ...f.values, mobile: mobileOf(f.customerId) }, { base: ctx.base, jobPhoto: photo });
      const signer = resolveSigner(t.signer, f.signerName);
      const person = signer.photo !== null || signer.name !== resolveSigner("team", null).name;
      const mail = { base: ctx.base, footer: ctx.footer, preheader: e.preheader, blocks: e.blocks, signer };
      const res = await sendEmail("customer-update", await withInlineImages({
        from: fromBox(f.kind === "invoice" ? "accounts" : "quotes", person ? `${signer.name.split(" ")[0]} from ${site.shortName}` : site.name),
        to: [email!], reply_to: REPLY_TO, subject: e.subject, html: letterHtml(mail), text: letterText(mail),
      }), { auto: f.kind, ref: f.ref, step: f.step });
      const patch = res.ok ? { status: "sent", sent_at: new Date().toISOString(), subject: e.subject, provider_id: res.id } : { status: "failed", error: res.error.slice(0, 300) };
      await sbUpdate(TABLE, [q.eq("kind", f.kind), q.eq("ref", f.ref), q.eq("step", f.step)].join("&"), patch).catch(() => undefined);
      if (res.ok) { out.sent++; sentHere++; } else out.failed++;
    }
    out.byKind[k.k] = { on: s[k.k].on, found: fresh.length, sent: sentHere };
  }
  return out;
}

/** For the page: what each kind has sent in the last 30 days. */
export async function autoSentCounts(): Promise<Partial<Record<AutoKind, number>>> {
  if (!dashboardDbConfigured()) return {};
  const rows = await sbSelect<{ kind: AutoKind }>(TABLE, [q.select("kind"), q.eq("status", "sent"), q.gte("sent_at", iso(Date.now() - 30 * DAY)), "limit=5000"].join("&")).catch(() => []);
  const out: Partial<Record<AutoKind, number>> = {};
  for (const r of rows) out[r.kind] = (out[r.kind] ?? 0) + 1;
  return out;
}
