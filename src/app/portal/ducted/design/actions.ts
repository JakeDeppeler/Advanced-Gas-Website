"use server";

import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { serviceTitanConfigured } from "@/lib/dashboard/servicetitan";
import { logAuto } from "@/lib/automation/log";
import { loadDuctedCatalogue } from "@/lib/ducted/catalogue";
import { buildFromDesign, type DesignOptions } from "@/lib/ducted/design";
import { readTakeoff } from "@/lib/ducted/takeoff";
import { applyPicks, cleanPick, unpriced, type Picks } from "@/lib/ducted/picks";
import { cleanSummary, designNotes, type DesignerSummary } from "@/lib/ducted/designSummary";
import {
  designImageLinks, loadDesign, loadPicks, noteQuoted, saveDesign, saveDesignImage, savePick,
} from "@/lib/ducted/designStore";
import {
  dismissEstimate, estimateState, findQuoteJob, noteDuctedQuote, replaceDuctedQuote, writeDuctedQuote, type QuoteJob, type Written,
} from "@/lib/ducted/stQuote";

/**
 * Daily tools › Duct design: the Trust Trade designer opened for a job, the
 * design kept against it, and the quote built from it and put on the job (or
 * updated there). Jake, 28 Nov 2026.
 */

async function allowed() {
  const user = await getPortalUser();
  return user && (can(user, "quotes") || can(user, "overhead")) ? user : null;
}

export type Quoted = { estimateId: number; total: number; at: string; by: string | null; state: "open" | "sold" | "dismissed" | "gone" };
export type Opened =
  | { ok: true; job: QuoteJob; project: Record<string, unknown> | null; images: Record<string, string>; quoted: Quoted | null; options: Partial<DesignOptions> | null; picks: Picks }
  | { ok: false; error: string };

/** The job by its number, with the design kept on it and the quote it last made. */
export async function openDesignJob(number: string): Promise<Opened> {
  if (!(await allowed())) return { ok: false, error: "Duct design is for whoever writes quotes." };
  if (!serviceTitanConfigured()) return { ok: false, error: "ServiceTitan isn't connected." };
  if (!/^\s*#?\d{3,9}\s*$/.test(number ?? "")) return { ok: false, error: "Put in the job number, e.g. 20950." };
  const job = await findQuoteJob(number).catch(() => null);
  if (!job) return { ok: false, error: `No job ${number.trim()} in ServiceTitan.` };
  const [row, picks] = await Promise.all([loadDesign(job.id), loadPicks()]);
  let quoted: Quoted | null = null;
  if (row?.estimate_id) {
    const s = await estimateState(row.estimate_id);
    quoted = {
      estimateId: row.estimate_id, total: Number(row.quoted_total ?? 0), at: row.quoted_at ?? "", by: row.quoted_by,
      state: !s.ok ? "gone" : s.sold ? "sold" : s.dismissed ? "dismissed" : "open",
    };
  }
  return {
    ok: true, job, project: row?.project ?? null, images: row ? await designImageLinks(row) : {}, quoted,
    options: (row?.quote_options as Partial<DesignOptions> | null) ?? null, picks,
  };
}

/** The design as the designer last saved it. */
export async function saveJobDesign(job: { id: number; number: string }, project: unknown): Promise<{ ok: boolean; error?: string }> {
  const user = await allowed();
  if (!user) return { ok: false, error: "Duct design is for whoever writes quotes." };
  if (!Number.isInteger(job?.id) || !/^\d{3,9}$/.test(String(job?.number ?? ""))) return { ok: false, error: "Which job?" };
  if (!project || typeof project !== "object" || !Array.isArray((project as { rooms?: unknown }).rooms)) return { ok: false, error: "That isn't a design." };
  const size = JSON.stringify(project).length;
  if (size > 3_000_000) return { ok: false, error: "That design is too big to keep." };
  try { await saveDesign(job.id, job.number, project, user.email); return { ok: true }; }
  catch (e) { return { ok: false, error: (e as Error).message }; }
}

/** A plan image, kept with the design so the plan opens under the rooms on any computer. */
export async function saveJobImage(jobId: number, name: string, data: string, mime: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await allowed())) return { ok: false, error: "Duct design is for whoever writes quotes." };
  if (!Number.isInteger(jobId) || typeof name !== "string" || !name || typeof data !== "string") return { ok: false, error: "Which image?" };
  if (!/^image\/(png|jpeg|webp)$/.test(mime)) return { ok: false, error: "Plan images are PNG, JPEG or WebP." };
  if (data.length > 5_500_000) return { ok: false, error: "That plan image is over 4 MB." };
  return saveDesignImage(jobId, name, Buffer.from(data, "base64"), mime);
}

/** The office's pick for a part the pricebook has no match for, kept for next time. */
export async function pickPart(need: string, items: unknown): Promise<{ ok: boolean; error?: string }> {
  const user = await allowed();
  if (!user) return { ok: false, error: "Duct design is for whoever writes quotes." };
  const clean = cleanPick(items);
  if (typeof need !== "string" || !need.trim() || need.length > 300 || !clean) return { ok: false, error: "Pick at least one item, each a number for one." };
  try { await savePick(need.trim(), clean, user.email); return { ok: true }; }
  catch (e) { return { ok: false, error: (e as Error).message }; }
}

export type QuoteMode = "new" | "update" | "new-dismiss";
export type DesignPut = (Written & { jobId?: number; mode?: QuoteMode; dismissed?: boolean | null }) ;

/**
 * Build quote / Update quote. Priced again here from the designer's list and
 * a freshly read pricebook with the remembered picks, never from the page's
 * prices, and refused while any line has no pricebook item (Jake: stop and
 * list them).
 */
export async function putDesignQuote(input: { jobNumber: string; csv: string; summary: DesignerSummary | null; options: DesignOptions; mode: QuoteMode }): Promise<DesignPut> {
  const user = await allowed();
  if (!user) return { ok: false, error: "Duct design is for whoever writes quotes." };
  if (!serviceTitanConfigured()) return { ok: false, error: "ServiceTitan isn't connected." };
  const { jobNumber, csv, mode } = input ?? ({} as typeof input);
  if (!["new", "update", "new-dismiss"].includes(mode)) return { ok: false, error: "New quote or update?" };
  if (typeof csv !== "string" || csv.length > 300_000) return { ok: false, error: "The designer's materials list didn't come through." };
  const job = await findQuoteJob(String(jobNumber ?? "")).catch(() => null);
  if (!job) return { ok: false, error: `No job ${jobNumber} in ServiceTitan.` };
  const row = await loadDesign(job.id);
  if (!row) return { ok: false, error: "There's no design kept on this job yet: let it save, then try again." };
  if (mode !== "new" && !row.estimate_id) return { ok: false, error: "There's no quote from this design on the job yet." };

  const t = readTakeoff(csv);
  if (t.problem) return { ok: false, error: t.problem };
  const [cat, picks] = await Promise.all([loadDuctedCatalogue().catch(() => null), loadPicks()]);
  if (!cat) return { ok: false, error: "The pricebook couldn't be read from ServiceTitan just now. Try again in a minute." };
  const o = input.options ?? ({} as DesignOptions);
  const options: DesignOptions = {
    unitSkuId: Number(o.unitSkuId) || null, doubleStorey: !!o.doubleStorey, extraHours: Math.max(0, Math.min(80, Number(o.extraHours) || 0)),
    extraReason: String(o.extraReason ?? "").slice(0, 300), itcs: o.itcs == null || o.itcs === ("" as unknown) ? null : Math.max(0, Math.min(20, Math.round(Number(o.itcs) || 0))),
    notes: String(o.notes ?? "").slice(0, 2000),
  };
  const summary = cleanSummary(input.summary);
  const quote = applyPicks(buildFromDesign(t, { ...options, notes: designNotes(summary, options.notes) }, cat), picks, cat.pickable ?? []);

  const gaps = unpriced(quote);
  if (gaps.length) return { ok: false, error: `${gaps.length} ${gaps.length === 1 ? "part has" : "parts have"} no pricebook item yet: ${gaps.map((l) => l.name.trim()).join("; ")}. Pick one for each first.` };
  const unit = quote.lines.find((l) => l.group === "unit" && l.sku);
  if (!unit) return { ok: false, error: "Choose the unit before it goes on the quote." };
  if (quote.missing.some((m) => /hourly rate/.test(m))) return { ok: false, error: "Our hourly rate isn't set on Our prices, so the time past two days would be $0." };
  if (!quote.lines.some((l) => l.group === "install" && l.sku?.skuType === "Service" && l.unitPrice > 0)) return { ok: false, error: "The ducted two-day labour isn't in the pricebook, so the labour would be missing." };

  const name = unit.sku!.name.trim();
  const written = mode === "update" ? await replaceDuctedQuote(job, row.estimate_id!, quote, name) : await writeDuctedQuote(job, quote, name);
  const at = new Date().toISOString();
  if (!written.ok) {
    await logAuto([{ at, kind: "ductedQuote", title: `Duct design quote on job ${job.number} didn't go on`, detail: written.error, ok: false, jobId: job.id }]).catch(() => undefined);
    return written;
  }
  const dismissed = mode === "new-dismiss" && row.estimate_id && row.estimate_id !== written.estimateId ? await dismissEstimate(row.estimate_id) : null;
  await noteQuoted(job.id, { estimate_id: written.estimateId, quoted_total: written.expected, quoted_by: user.email, summary, quote_options: options }).catch(() => undefined);

  const money = `$${written.expected.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const shape = `${quote.outlets} outlets, ${quote.zones} zones`;
  const did = mode === "update" ? `updated from the duct design` : `added from the duct design${dismissed ? `, replacing quote ${row.estimate_id} (dismissed)` : ""}`;
  await noteDuctedQuote(job.id, `DUCTED QUOTE: "${name}" (${money} + GST) ${did} in the portal by ${user.name}: ${shape}. Check it in ServiceTitan before it goes to the customer.`);
  await logAuto([{
    at, kind: "ductedQuote", title: `Duct design quote on job ${job.number}: ${name}, ${money}`, ok: written.problems.length === 0, jobId: job.id,
    detail: [`${mode}; ${shape}; ${written.underLanded} of ${written.under} lines under their heads.`, ...written.problems].join(" "),
  }]).catch(() => undefined);
  return { ...written, jobId: job.id, mode, dismissed };
}
