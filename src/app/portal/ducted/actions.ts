"use server";

import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { serviceTitanConfigured } from "@/lib/dashboard/servicetitan";
import { logAuto } from "@/lib/automation/log";
import { loadDuctedCatalogue } from "@/lib/ducted/catalogue";
import { buildDucted, type DuctedInput, type DuctedQuote } from "@/lib/ducted/plan";
import { buildFromDesign, type DesignOptions } from "@/lib/ducted/design";
import { readTakeoff } from "@/lib/ducted/takeoff";
import { findQuoteJob, noteDuctedQuote, writeDuctedQuote, type QuoteJob, type Written } from "@/lib/ducted/stQuote";

export type JobLookup = { ok: true; job: QuoteJob } | { ok: false; error: string };
export type QuoteSource =
  | { kind: "design"; csv: string; fileName: string; options: DesignOptions }
  | { kind: "layout"; input: DuctedInput };
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
  if (source.kind === "design") {
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
  if (quote.missing.some((m) => /hourly rate/.test(m))) return { ok: false, error: "Our hourly rate isn't set on Our prices, so the labour would be $0." };
  if (!quote.lines.some((l) => l.group === "install" && l.sku?.skuType === "Service")) return { ok: false, error: "The ducted installation service isn't in the pricebook, so there's nothing to put the labour on." };

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
