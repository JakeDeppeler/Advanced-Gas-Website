"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { officeWork } from "@/lib/portal/caps";
import { sbSelect, sbUpsert } from "@/lib/dashboard/db";
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

export type JobPick = { number: string; type: string | null; status: string | null; customer: string | null; street: string | null; suburb: string | null; on: string | null };
export type StartResult = { ok: true; job: string } | { ok: true; pick: JobPick[] } | { ok: false; error: string };

/**
 * The write-up's one form (Jake, 28 Nov: "an easy way to put the job number
 * / location in, then a note, then a button to write it"). A job number goes
 * straight through; anything else is looked for as the job's street address,
 * and if more than one job is there the office picks. The notes are saved to
 * the job before anything is written, so they're kept whatever happens next.
 */
export async function startWriteup(query: string, notes: string, chosen?: string): Promise<StartResult> {
  const user = await getPortalUser();
  if (!user || !officeWork(user)) return { ok: false, error: "This is for the office." };
  if (!notes.trim()) return { ok: false, error: "Add your notes first: how it's going in, what's coming out, and anything that comes off if it isn't needed." };
  const raw = (chosen ?? query).trim().replace(/^#/, "");
  if (!raw) return { ok: false, error: "Put in the job number or the address." };
  let job = /^\d{3,8}$/.test(raw) ? raw : null;
  if (!job) {
    const words = raw.replace(/[,*()]/g, " ").trim().split(/\s+/).filter(Boolean).slice(0, 4);
    const street = encodeURIComponent(`*${words.join("*")}*`);
    const locs = await sbSelect<{ id: number; street: string | null; suburb: string | null }>("st_locations",
      `select=id,street:raw->address->>street,suburb:raw->address->>city&raw->address->>street=ilike.${street}&limit=20`).catch(() => []);
    if (!locs.length) return { ok: false, error: `No job found at “${raw}”. Check the street and number, or use the job number.` };
    const at = new Map(locs.map((l) => [l.id, l]));
    const jobs = await sbSelect<{ job_number: string | null; job_type: string | null; status: string | null; customer_name: string | null; location_id: number | null; created_on: string | null }>("st_jobs",
      `select=job_number,job_type,status,customer_name,location_id,created_on&location_id=in.(${locs.map((l) => l.id).join(",")})&order=created_on.desc.nullslast&limit=8`).catch(() => []);
    const picks: JobPick[] = jobs.filter((j) => j.job_number).map((j) => ({
      number: j.job_number as string, type: j.job_type, status: j.status, customer: j.customer_name,
      street: at.get(j.location_id ?? -1)?.street ?? null, suburb: at.get(j.location_id ?? -1)?.suburb ?? null, on: j.created_on,
    }));
    if (!picks.length) return { ok: false, error: `There's an address like “${raw}”, but no job on it yet.` };
    if (picks.length > 1) return { ok: true, pick: picks };
    job = picks[0].number;
  }
  const f = await jobDocIds(job).catch(() => null);
  if (!f) return { ok: false, error: `Job ${job} isn't in the portal's copy of ServiceTitan yet. A job made in the last few minutes may not have come across.` };
  try {
    await saveNotes(f.jobId, notes, user.name);
  } catch {
    return { ok: false, error: "The notes couldn't be saved." };
  }
  return { ok: true, job };
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
