"use server";

import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { serviceTitanConfigured } from "@/lib/dashboard/servicetitan";
import { logAuto } from "@/lib/automation/log";
import { loadDuctedCatalogue } from "@/lib/ducted/catalogue";
import { buildDucted, type DuctedInput, type DuctedQuote } from "@/lib/ducted/plan";
import { buildFromDesign, type DesignOptions } from "@/lib/ducted/design";
import { readTakeoff, type DesignTakeoff } from "@/lib/ducted/takeoff";
import { planOptions, planToTakeoff, type PlanRead } from "@/lib/ducted/planShape";
import { readPlan } from "@/lib/ducted/planRead";
import { DUCT_SIZES } from "@/lib/ducted/plan";
import { findQuoteJob, noteDuctedQuote, writeDuctedQuote, type QuoteJob, type Written } from "@/lib/ducted/stQuote";

export type JobLookup = { ok: true; job: QuoteJob } | { ok: false; error: string };
export type QuoteSource =
  | { kind: "design"; csv: string; fileName: string; options: DesignOptions }
  /** A plan drawing read by Claude (readDuctPlan): its takeoff, as the page shows it. */
  | { kind: "plan"; takeoff: DesignTakeoff; fileName: string; options: DesignOptions }
  | { kind: "layout"; input: DuctedInput };
export type PlanResult =
  | { ok: true; takeoff: DesignTakeoff | null; options: ReturnType<typeof planOptions>; zones: PlanRead["zones"] }
  | { ok: false; error: string };
export type PutResult = Written & { jobId?: number; noted?: boolean };

async function allowed() {
  const user = await getPortalUser();
  return user && (can(user, "quotes") || can(user, "overhead")) ? user : null;
}

export async function lookUpJob(number: string): Promise<JobLookup> {
  if (!(await allowed())) return { ok: false, error: "Quotes are for whoever writes them." };
  if (!serviceTitanConfigured()) return { ok: false, error: "ServiceTitan isn't connected." };
  if (!/^\s*#?\d{3,9}\s*$/.test(number ?? "")) return { ok: false, error: "Put in the job number, e.g. 20950." };
  const job = await findQuoteJob(number).catch(() => null);
  return job ? { ok: true, job } : { ok: false, error: `No job ${number.trim()} in ServiceTitan.` };
}

/**
 * The quote is built again here, from the file or the layout and a freshly
 * read pricebook, rather than taking the lines the page priced: the price that
 * goes to ServiceTitan is the pricebook's as it is now, not as the page last
 * loaded it, and nothing sent from a browser sets a price.
 */
export async function putQuoteOnJob(jobNumber: string, source: QuoteSource): Promise<PutResult> {
  const user = await allowed();
  if (!user) return { ok: false, error: "Quotes are for whoever writes them." };
  if (!serviceTitanConfigured()) return { ok: false, error: "ServiceTitan isn't connected." };
  const found = await lookUpJob(jobNumber);
  if (!found.ok) return found;
  const job = found.job;

  const cat = await loadDuctedCatalogue().catch(() => null);
  if (!cat) return { ok: false, error: "The pricebook couldn't be read from ServiceTitan just now. Try again in a minute." };

  let quote: DuctedQuote;
  let what: string;
  let shape: string;
  if (source.kind === "plan") {
    const t = cleanTakeoff(source.takeoff);
    if (!t) return { ok: false, error: "The plan's read didn't come through: read the plan again." };
    const d = buildFromDesign(t, source.options, cat);
    quote = d;
    what = `the duct plan${source.fileName ? ` (${source.fileName.slice(0, 80)})` : ""}, read in the portal`;
    shape = `${d.outlets} outlets, ${d.zones} zones`;
  } else if (source.kind === "design") {
    if (typeof source.csv !== "string" || source.csv.length > 300_000) return { ok: false, error: "That file is too big to be the designer's materials list." };
    const t = readTakeoff(source.csv);
    if (t.problem) return { ok: false, error: t.problem };
    const d = buildFromDesign(t, source.options, cat);
    quote = d;
    what = `the Trust Trade design${source.fileName ? ` (${source.fileName.slice(0, 80)})` : ""}`;
    shape = `${d.outlets} outlets, ${d.zones} zones`;
  } else {
    quote = buildDucted(source.input, cat);
    what = "the ducted builder";
    shape = `${source.input.outlets.length} outlets, ${source.input.zones.length} zones`;
  }

  // The two gaps that would put a wrong price on a customer's quote, rather than a line to add by hand.
  const unit = quote.lines.find((l) => l.group === "unit" && l.sku);
  if (!unit) return { ok: false, error: "Choose the unit before it goes on the quote." };
  if (quote.missing.some((m) => /hourly rate/.test(m))) return { ok: false, error: "Our hourly rate isn't set on Our prices, so the time past two days would be $0." };
  if (!quote.lines.some((l) => l.group === "install" && l.sku?.skuType === "Service" && l.unitPrice === 0)) return { ok: false, error: "The ducted installation service isn't in the pricebook, so there's nothing to put the materials under." };
  if (!quote.lines.some((l) => l.group === "install" && l.sku?.skuType === "Service" && l.unitPrice > 0)) return { ok: false, error: "The ducted two-day labour isn't in the pricebook, so the labour would be missing." };

  const name = unit.sku!.name.trim();
  const written = await writeDuctedQuote(job, quote, name);
  const at = new Date().toISOString();
  if (!written.ok) {
    await logAuto([{ at, kind: "ductedQuote", title: `Ducted quote on job ${job.number} didn't go on`, detail: written.error, ok: false, jobId: job.id }]).catch(() => undefined);
    return written;
  }
  const money = `$${written.expected.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const noted = await noteDuctedQuote(job.id, `DUCTED QUOTE: "${name}" (${money} + GST) added from ${what} in the portal by ${user.name}: ${shape}. Check it in ServiceTitan before it goes to the customer.`);
  await logAuto([{
    at, kind: "ductedQuote", title: `Ducted quote on job ${job.number}: ${name}, ${money}`, ok: written.problems.length === 0, jobId: job.id,
    detail: [`From ${what}; ${shape}; ${written.underLanded} of ${written.under} lines under their heads.`, ...written.problems].join(" "),
  }]).catch(() => undefined);
  return { ...written, jobId: job.id, noted };
}

/**
 * Read a duct plan drawing and the office's notes (Jake, 25 Nov: "upload this
 * duct plan and i give it a text box of information and it creates the
 * quote"). The page shows what was read and prices it; nothing is written
 * anywhere. With no drawing (the designer's CSV was dropped instead), only the
 * notes are read, for the unit, the storeys and the summary.
 */
export async function readDuctPlan(input: { file: { data: string; mime: string } | null; notes: string }): Promise<PlanResult> {
  if (!(await allowed())) return { ok: false, error: "Quotes are for whoever writes them." };
  const notes = String(input?.notes ?? "").slice(0, 4000);
  const file = input?.file && typeof input.file.data === "string" ? input.file : null;
  if (file && file.data.length > 7_500_000) return { ok: false, error: "That file is too big: under 5 MB, please." };
  if (!file && !notes.trim()) return { ok: false, error: "Add the plan or some notes first." };
  try {
    const read = await readPlan(file, notes);
    return { ok: true, takeoff: file ? planToTakeoff(read) : null, options: planOptions(read), zones: file ? read.zones ?? [] : [] };
  } catch (e) {
    return { ok: false, error: `The plan couldn't be read: ${(e as Error).message}.` };
  }
}

const SIZES = DUCT_SIZES as readonly number[];
const count = (n: unknown, max = 200) => Math.max(0, Math.min(max, Math.round(Number(n) || 0)));
const sized = (o: unknown, max = 200): Record<number, number> => {
  const out: Record<number, number> = {};
  for (const [k, v] of Object.entries(o && typeof o === "object" ? o : {})) if (SIZES.includes(Number(k)) && count(v, max) > 0) out[Number(k)] = count(v, max);
  return out;
};

/**
 * A takeoff that came back from the browser, kept to the shapes and sizes the
 * quote prices from. The quantities are the office's to set; the prices are
 * never taken from the browser (buildFromDesign reads the pricebook here).
 */
function cleanTakeoff(t: DesignTakeoff | null | undefined): DesignTakeoff | null {
  if (!t || typeof t !== "object") return null;
  const str = (x: unknown) => (typeof x === "string" ? x.slice(0, 200) : null);
  return {
    indoor: str(t.indoor), outdoor: str(t.outdoor), kw: Number(t.kw) > 0 && Number(t.kw) < 50 ? Number(t.kw) : null,
    duct: sized(t.duct), runMetres: sized(t.runMetres, 1000), diffusers: sized(t.diffusers), collars: sized(t.collars, 20), joiners: sized(t.joiners, 50), dampers: sized(t.dampers, 20),
    takeoffs: (Array.isArray(t.takeoffs) ? t.takeoffs : []).slice(0, 60).flatMap((f) => {
      const outs = (Array.isArray(f?.outs) ? f.outs : []).map(Number).filter((x) => SIZES.includes(x)).slice(0, 4);
      return SIZES.includes(Number(f?.in)) && outs.length >= 2 ? [{ ways: outs.length, in: Number(f.in), outs, qty: Math.max(1, count(f.qty, 20)), text: str(f.text) ?? "" }] : [];
    }),
    transitions: count(t.transitions, 3), otherOutlets: count(t.otherOutlets, 40), returnBoxes: count(t.returnBoxes, 4), returnBoxSizes: [],
    returnGrilles: (Array.isArray(t.returnGrilles) ? t.returnGrilles : []).slice(0, 4).map((g) => ({ w: count(g?.w, 3000), h: count(g?.h, 3000), qty: Math.max(1, count(g?.qty, 4)) })),
    cables: count(t.cables, 20), zones: t.zones == null ? null : count(t.zones, 20), itc: count(t.itc, 20), kitLines: 0, unread: [],
    checks: (Array.isArray(t.checks) ? t.checks : []).slice(0, 30).map((c) => String(c).slice(0, 300)), problem: null,
  };
}
