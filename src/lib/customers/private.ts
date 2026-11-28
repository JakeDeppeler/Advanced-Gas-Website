import "server-only";
import { sbSelect } from "@/lib/dashboard/db";
import { melbourneDayStart } from "@/lib/dashboard/dates";
import { getSettings } from "@/lib/portal/db";
import { getPLDetail } from "@/lib/portal/xero";

/**
 * Private customers (Jake, 28 Nov: "a tab for cost per customer for the
 * private only, and then how many customers we are interacting with, being in
 * contact with by call and email, how many customers come back for further
 * work, and how much it costs to get a new customer").
 *
 * Who counts as private. ServiceTitan's Domestic business units, less the
 * accounts that only look domestic: property managers book a tenant's repair
 * under Domestic as often as under Real Estate, and one of them has 878 jobs
 * on 108 addresses. So a customer is a trade account, and left out of every
 * figure here, if they've ever had a Real Estate, Retirement Village or
 * Commercial job, had work at more than three addresses, or go by a business's
 * name (an agency, a builder, a Pty Ltd: House N Keys Real Estate has only
 * ever had Domestic and imported jobs). A customer whose only email addresses
 * are ours is a test or one of the crew's own homes, and is left out too.
 *
 * When a job happened. The June and August imports of the old system's history
 * were created on the day they were imported, so their `created_on` says June
 * 2026 for a job done in 2019. Their `completed_on` is the real date; an
 * imported job without one is undated and can't say whether someone is new.
 * Some live jobs were keyed in after the work too (created in October,
 * completed in August), so a live job is dated by whichever came first.
 *
 * New, back, or carrying on. Someone whose last job before this period was
 * within a month (a diagnosis in late August, the repair in September) didn't
 * come back and wasn't won this period either, so they're counted apart.
 *
 * Marketing is Xero's, from the accounts the overheads page already files as
 * marketing (capacity.xeroMap → mkt*). None of it is split by kind of customer,
 * and client meetings and gifts may well be for agents, so the cost of winning
 * a private customer is the most it could be; advertising on its own is shown
 * beside it. Calls aren't counted: the few calls the portal has synced carry no
 * customer, so there is nothing to count them against.
 */

export type Window = { key: "month" | "quarter"; label: string; from: string; to: string };
export type MonthRow = { label: string; served: number; fresh: number; back: number; followOn: number };
export type BackRow = { customer: string; suburb: string | null; before: number; firstEver: string; lastBefore: string; cameOn: string };
export type SpendLine = { label: string; amount: number; ads: boolean };

export type PrivateCustomers = {
  served: number;
  fresh: number;
  back: number;
  followOn: number;
  /** Customers in the period left out as trade accounts, tests or our own. */
  leftOut: number;
  /** Invoiced on the period's private jobs, ex GST. */
  invoiced: number;
  emailedUs: number;
  weEmailed: number;
  /** Either way: the customers an email went between us and them. */
  inTouch: number;
  /** The first email the portal has filed: the email figures can't reach further back. */
  emailSince: string | null;
  /** All marketing in Xero for the period, or null when Xero couldn't be read. */
  spend: number | null;
  adSpend: number | null;
  spendLines: SpendLine[];
  months: MonthRow[];
  cameBack: BackRow[];
  /** Of the private customers first served more than a year ago, how many came back since. */
  lifetime: { customers: number; cameBack: number };
};

type Job = {
  id: number; customer_id: number; customer_name: string | null; business_unit: string | null;
  location_id: number | null; suburb: string | null; created_on: string | null; completed_on: string | null;
};

const DAY = 86_400_000;
const MONTH_GAP = 30 * DAY;
const IMPORTED = "Imported Default Businessunit";
const TRADE = /^(real estate|retirement|commercial)/i;
const BUSINESS = /\b(pty|ltd|real estate|realty|agents|construction|constructions|building|builders|developments|plumbing|electrical|homes|property|properties|school|college|council|group|services)\b/i;
/** Our own addresses: on a customer's record they mean a test, or the office filling a gap. */
const OURS = /@advancedgas\.com\.au$/i;
const isDomestic = (bu: string | null) => /^domestic/i.test(bu ?? "");
const chunks = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

const at = (iso: string | null) => { const t = iso ? Date.parse(iso) : NaN; return Number.isFinite(t) ? t : null; };
/** When the job was done, as a time, or null for an imported job with no date of its own. */
const doneAt = (j: Job): number | null => {
  if (j.business_unit === IMPORTED) return at(j.completed_on);
  const made = at(j.created_on), done = at(j.completed_on);
  return made != null && done != null ? Math.min(made, done) : made ?? done;
};

const addMonths = (iso: string, n: number) => {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10);
};
const monthName = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { month: "long", timeZone: "UTC" });

/** This month so far, and the three months to the end of this one. */
export function windows(today: string): Window[] {
  const first = `${today.slice(0, 7)}-01`;
  const next = addMonths(first, 1);
  const back2 = addMonths(first, -2);
  return [
    { key: "month", label: monthName(first), from: first, to: next },
    { key: "quarter", label: `${monthName(back2)} to ${monthName(first)}`, from: back2, to: next },
  ];
}

export async function privateCustomers(w: Window, today: string): Promise<PrivateCustomers | null> {
  const from = melbourneDayStart(w.from).getTime();
  const to = melbourneDayStart(w.to).getTime();

  // Every job, narrow. Six thousand rows is a few pages, and the trade test
  // and the history both need the jobs of customers who aren't in the period.
  const jobs = await sbSelect<Job>("st_jobs",
    "select=id,customer_id,customer_name,business_unit,location_id,suburb,created_on,completed_on&customer_id=not.is.null&order=id.asc").catch(() => null);
  if (!jobs?.length) return null;

  const byCustomer = new Map<number, Job[]>();
  for (const j of jobs) byCustomer.set(j.customer_id, [...(byCustomer.get(j.customer_id) ?? []), j]);
  const trade = new Set<number>();
  for (const [id, js] of byCustomer) {
    if (js.some((j) => TRADE.test(j.business_unit ?? "") || BUSINESS.test(j.customer_name ?? ""))
      || new Set(js.map((j) => j.location_id).filter((x) => x != null)).size > 3) trade.add(id);
  }

  const inWindow = jobs.filter((j) => {
    const t = doneAt(j);
    return isDomestic(j.business_unit) && t != null && t >= from && t < to;
  });
  const candidates = [...new Set(inWindow.filter((j) => !trade.has(j.customer_id)).map((j) => j.customer_id))];

  // Their email addresses, for the contact figures, and to find our own records.
  const contacts = new Map<number, string[]>();
  for (const c of chunks(candidates, 150)) {
    const rows = await sbSelect<{ customer_id: number; value: string | null }>("st_customer_contacts", `select=customer_id,value&type=eq.Email&customer_id=in.(${c.join(",")})`).catch(() => []);
    for (const r of rows) if (r.value?.trim()) contacts.set(r.customer_id, [...(contacts.get(r.customer_id) ?? []), r.value.trim().toLowerCase()]);
  }
  const ours = new Set(candidates.filter((id) => { const es = contacts.get(id) ?? []; return es.length > 0 && es.every((e) => OURS.test(e)); }));
  const leftOut = new Set(inWindow.filter((j) => trade.has(j.customer_id) || ours.has(j.customer_id)).map((j) => j.customer_id)).size;
  const mine = inWindow.filter((j) => !trade.has(j.customer_id) && !ours.has(j.customer_id));

  // Each customer's first job in the period, and what they'd had from us before it.
  const firstIn = new Map<number, number>();
  for (const j of mine) {
    const t = doneAt(j) as number;
    if (!firstIn.has(j.customer_id) || t < (firstIn.get(j.customer_id) as number)) firstIn.set(j.customer_id, t);
  }
  type Kind = "fresh" | "back" | "followOn";
  const kind = new Map<number, Kind>();
  const cameBack: BackRow[] = [];
  for (const [id, start] of firstIn) {
    const before = (byCustomer.get(id) ?? []).map(doneAt).filter((t): t is number => t != null && t < start - DAY);
    if (!before.length) { kind.set(id, "fresh"); continue; }
    const last = Math.max(...before);
    if (start - last < MONTH_GAP) { kind.set(id, "followOn"); continue; }
    kind.set(id, "back");
    const js = byCustomer.get(id) ?? [];
    const named = js.filter((j) => isDomestic(j.business_unit)).at(-1) ?? js.at(-1);
    cameBack.push({
      customer: (named?.customer_name ?? "").trim() || `Customer ${id}`,
      suburb: (named?.suburb ?? "").trim() || null,
      before: before.length,
      firstEver: new Date(Math.min(...before)).toISOString(),
      lastBefore: new Date(last).toISOString(),
      cameOn: new Date(start).toISOString(),
    });
  }
  cameBack.sort((a, b) => b.cameOn.localeCompare(a.cameOn));
  const count = (k: Kind, ids: Iterable<number> = firstIn.keys()) => [...ids].filter((id) => kind.get(id) === k).length;

  // Month by month, each customer in the month they first came in the period.
  const months: MonthRow[] = [];
  for (let m = w.from; m < w.to; m = addMonths(m, 1)) {
    const a = melbourneDayStart(m).getTime(), b = melbourneDayStart(addMonths(m, 1)).getTime();
    const ids = [...firstIn].filter(([, t]) => t >= a && t < b).map(([id]) => id);
    months.push({ label: monthName(m), served: ids.length, fresh: count("fresh", ids), back: count("back", ids), followOn: count("followOn", ids) });
  }

  // How often a private customer comes back at all: of those first served more
  // than a year ago, the share who've had another job since, a month or more on.
  const yearAgo = melbourneDayStart(today).getTime() - 365 * DAY;
  let lifeCustomers = 0, lifeBack = 0;
  for (const [id, js] of byCustomer) {
    if (trade.has(id)) continue;
    const ts = js.map(doneAt).filter((t): t is number => t != null);
    if (!ts.length) continue;
    const first = Math.min(...ts);
    if (first >= yearAgo) continue;
    lifeCustomers++;
    if (Math.max(...ts) - first >= MONTH_GAP) lifeBack++;
  }

  const ids = [...firstIn.keys()];
  const jobIds = mine.map((j) => j.id);

  // What the period's private jobs were invoiced, ex GST.
  let invoiced = 0;
  for (const c of chunks(jobIds, 150)) {
    const rows = await sbSelect<{ subtotal: number | null }>("st_invoices", `select=subtotal&job_id=in.(${c.join(",")})`).catch(() => []);
    invoiced += rows.reduce((a, r) => a + (Number(r.subtotal) || 0), 0);
  }

  // Email, both ways, matched on the customers' own addresses in ServiceTitan.
  // Ours are skipped: the office's address on a customer's record would match
  // every email the office sends.
  const emails = new Map<string, number>();
  for (const id of ids) for (const e of contacts.get(id) ?? []) if (!OURS.test(e)) emails.set(e, id);
  const fromIso = encodeURIComponent(new Date(from).toISOString()), toIso = encodeURIComponent(new Date(to).toISOString());
  const [inbound, outbound, firstMail] = await Promise.all([
    sbSelect<{ from_address: string | null }>("mail_filing", `select=from_address&received_at=gte.${fromIso}&received_at=lt.${toIso}&order=id.asc`).catch(() => []),
    sbSelect<{ to_email: string | null }>("portal_email_events", `select=to_email&created_at=gte.${fromIso}&created_at=lt.${toIso}&order=id.asc`).catch(() => []),
    sbSelect<{ received_at: string }>("mail_filing", "select=received_at&order=received_at.asc&limit=1").catch(() => []),
  ]);
  const matched = (xs: (string | null)[]) => new Set(xs.map((x) => emails.get((x ?? "").trim().toLowerCase())).filter((x): x is number => x != null));
  const theyWrote = matched(inbound.map((r) => r.from_address));
  const weWrote = matched(outbound.map((r) => r.to_email));

  // Marketing, from Xero, by the accounts the overheads page files as marketing.
  const cap = await getSettings<{ xeroMap?: Record<string, string> }>("capacity").catch(() => null);
  const mkt = new Map(Object.entries(cap?.xeroMap ?? {}).filter(([, v]) => v.startsWith("mkt")).map(([k, v]) => [k.trim().toLowerCase(), v]));
  const lastDay = new Date(Date.parse(`${w.to}T12:00:00Z`) - DAY).toISOString().slice(0, 10);
  const pl = mkt.size ? await getPLDetail(w.from, lastDay < today ? lastDay : today).catch(() => null) : null;
  const spendLines: SpendLine[] = pl
    ? pl.sections.filter((s) => s.kind === "out").flatMap((s) => s.lines)
        .filter((l) => mkt.has(l.label.trim().toLowerCase()) && l.amount !== 0)
        .map((l) => ({ label: l.label.trim(), amount: l.amount, ads: mkt.get(l.label.trim().toLowerCase()) === "mktPaid" }))
        .sort((a, b) => b.amount - a.amount)
    : [];

  return {
    served: ids.length, fresh: count("fresh"), back: count("back"), followOn: count("followOn"), leftOut,
    invoiced,
    emailedUs: theyWrote.size,
    weEmailed: weWrote.size,
    inTouch: new Set([...theyWrote, ...weWrote]).size,
    emailSince: firstMail[0]?.received_at ?? null,
    spend: pl ? spendLines.reduce((a, l) => a + l.amount, 0) : null,
    adSpend: pl ? spendLines.filter((l) => l.ads).reduce((a, l) => a + l.amount, 0) : null,
    spendLines, months, cameBack,
    lifetime: { customers: lifeCustomers, cameBack: lifeBack },
  };
}
