"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { officeWork } from "@/lib/portal/caps";
import { jobDocIds, loadJob } from "@/lib/jobwrite/load";
import { planOnePrice } from "@/lib/jobwrite/lines";
import { writeWords } from "@/lib/jobwrite/write";
import { summaryHtmlFor } from "@/lib/jobwrite/words";
import type { InvoiceWords, JobWords, QuoteWords } from "@/lib/jobwrite/labels";
import { putOnServiceTitan, undoWriteup } from "@/lib/jobwrite/apply";

export type WordsResult = { ok: true; words: JobWords; from: string[] } | { ok: false; error: string };
export type PutResult = { ok: true; note: string } | { ok: false; error: string };

const PATH = "/portal/jobs/write-up";

/** The words for the job's chosen quote and its invoice, read fresh from ServiceTitan. */
export async function writeJobWords(job: string, quoteId: number | null): Promise<WordsResult> {
  const user = await getPortalUser();
  if (!user || !officeWork(user)) return { ok: false, error: "This is for the office." };
  try {
    const f = await loadJob(job);
    if (!f) return { ok: false, error: `Job ${job} isn't in the portal's copy of ServiceTitan yet.` };
    const quote = f.quotes.find((x) => x.id === quoteId) ?? f.quotes[0] ?? null;
    const r = await writeWords({
      job: { number: f.number, type: f.type, businessUnit: f.businessUnit, status: f.status, summary: f.summary },
      quote, quotePlan: quote ? planOnePrice(quote) : null,
      invoice: f.invoice, invoicePlan: f.invoice ? planOnePrice(f.invoice) : null,
      reports: f.reports, notes: f.notes, electricians: f.electricians,
    });
    return { ok: true, words: r.words, from: r.from };
  } catch (e) {
    return { ok: false, error: `The words couldn't be written: ${(e as Error).message}.` };
  }
}

/** The summary and the labour line onto the quote or the invoice, with the one price if asked. */
export async function putWriteup(input: {
  job: string; kind: "estimate" | "invoice"; docId: number; words: QuoteWords | InvoiceWords; onePrice: boolean; expectCombined: number | null;
}): Promise<PutResult> {
  const user = await getPortalUser();
  if (!user || !officeWork(user)) return { ok: false, error: "This is for the office." };
  const f = await jobDocIds(input.job).catch(() => null);
  if (!f) return { ok: false, error: `Job ${input.job} couldn't be read.` };
  // Only the job's own quote or invoice: an id typed into the request can't reach another customer's.
  const mine = input.kind === "estimate" ? f.quoteIds.includes(input.docId) : f.invoiceId === input.docId;
  if (!mine) return { ok: false, error: "That isn't this job's quote or invoice." };
  const html = summaryHtmlFor(input.kind, input.words);
  if (!html) return { ok: false, error: "The summary is empty." };
  const r = await putOnServiceTitan({
    jobId: f.jobId, jobNumber: f.number, kind: input.kind, docId: input.docId,
    summaryHtml: html, labour: input.words.labour ?? "", onePrice: input.onePrice, expectCombined: input.expectCombined, by: user.name,
  });
  revalidatePath(PATH);
  return r;
}

export async function undoJobWriteup(id: string): Promise<PutResult> {
  const user = await getPortalUser();
  if (!user || !officeWork(user)) return { ok: false, error: "This is for the office." };
  const r = await undoWriteup(id);
  revalidatePath(PATH);
  return r;
}
