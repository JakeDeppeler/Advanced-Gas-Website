"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { officeWork } from "@/lib/portal/caps";
import { sbUpsert } from "@/lib/dashboard/db";
import { jobDocIds, loadJob } from "@/lib/jobwrite/load";
import { planOnePrice } from "@/lib/jobwrite/lines";
import { writeWords } from "@/lib/jobwrite/write";
import { summaryHtmlFromText } from "@/lib/jobwrite/words";
import type { JobWords } from "@/lib/jobwrite/labels";
import { putOnServiceTitan, undoWriteup } from "@/lib/jobwrite/apply";

export type WordsResult = { ok: true; words: JobWords; from: string[] } | { ok: false; error: string };
export type PutResult = { ok: true; note: string } | { ok: false; error: string };

const PATH = "/portal/jobs/write-up";

/** The office's notes for the job, kept with it so the next person sees them (0121). */
async function saveNotes(jobId: number, notes: string, by: string): Promise<void> {
  await sbUpsert("job_writeup_notes", [{ job_id: jobId, notes: notes.slice(0, 3000), updated_by: by, updated_at: new Date().toISOString() }], "job_id");
}

/**
 * The words for the job's chosen quote and its invoice, read fresh from
 * ServiceTitan, written from the office's notes first. The notes are saved
 * before writing, so they're kept even if Claude can't be reached.
 */
export async function writeJobWords(job: string, quoteId: number | null, notes: string): Promise<WordsResult> {
  const user = await getPortalUser();
  if (!user || !officeWork(user)) return { ok: false, error: "This is for the office." };
  // The notes are what it's written from (Jake, 19 Nov): none, nothing to write.
  if (!notes.trim()) return { ok: false, error: "Add your notes first: how it's going in, what's coming out, and anything that comes off if it isn't needed." };
  try {
    const f = await loadJob(job);
    if (!f) return { ok: false, error: `Job ${job} isn't in the portal's copy of ServiceTitan yet.` };
    await saveNotes(f.jobId, notes, user.name).catch(() => undefined);
    const quote = f.quotes.find((x) => x.id === quoteId) ?? f.quotes[0] ?? null;
    const r = await writeWords({
      job: { number: f.number, type: f.type, businessUnit: f.businessUnit, status: f.status, summary: f.summary },
      quote, quotePlan: quote ? planOnePrice(quote) : null,
      invoice: f.invoice, invoicePlan: f.invoice ? planOnePrice(f.invoice) : null,
      reports: f.reports, notes: f.notes, electricians: f.electricians, officeNotes: notes,
    });
    revalidatePath(PATH);
    return { ok: true, words: r.words, from: r.from };
  } catch (e) {
    return { ok: false, error: `The words couldn't be written: ${(e as Error).message}.` };
  }
}

/** Just the notes, from the Save button, without writing anything. */
export async function saveJobNotes(job: string, notes: string): Promise<PutResult> {
  const user = await getPortalUser();
  if (!user || !officeWork(user)) return { ok: false, error: "This is for the office." };
  const f = await jobDocIds(job).catch(() => null);
  if (!f) return { ok: false, error: `Job ${job} couldn't be read.` };
  try {
    await saveNotes(f.jobId, notes, user.name);
  } catch {
    return { ok: false, error: "The notes couldn't be saved." };
  }
  revalidatePath(PATH);
  return { ok: true, note: "Notes saved." };
}

/** The summary and the labour line onto the quote or the invoice, with the one price if asked. */
export async function putWriteup(input: {
  job: string; kind: "estimate" | "invoice"; docId: number; summary: string; labour: string; onePrice: boolean; expectCombined: number | null;
}): Promise<PutResult> {
  const user = await getPortalUser();
  if (!user || !officeWork(user)) return { ok: false, error: "This is for the office." };
  const f = await jobDocIds(input.job).catch(() => null);
  if (!f) return { ok: false, error: `Job ${input.job} couldn't be read.` };
  // Only the job's own quote or invoice: an id typed into the request can't reach another customer's.
  const mine = input.kind === "estimate" ? f.quoteIds.includes(input.docId) : f.invoiceId === input.docId;
  if (!mine) return { ok: false, error: "That isn't this job's quote or invoice." };
  const html = summaryHtmlFromText(input.summary ?? "");
  if (!html) return { ok: false, error: "The job summary is empty." };
  const r = await putOnServiceTitan({
    jobId: f.jobId, jobNumber: f.number, kind: input.kind, docId: input.docId,
    summaryHtml: html, labour: input.labour ?? "", onePrice: input.onePrice, expectCombined: input.expectCombined, by: user.name,
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
