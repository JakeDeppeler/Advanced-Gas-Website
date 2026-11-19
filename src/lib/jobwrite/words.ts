// What the job write-up is written from, the rules it's written to, and the
// shape it comes back in. Pure, so scripts/check-jobwrite.ts can show exactly
// what Claude is given for a fixture job.
//
// Jake, 19 Nov: type in a job, and from the quote, the forms and the notes
// get a job summary and a labour summary that "covers the labour, materials
// and electrical under the one price, but it needs to make sense and relate to
// the quote and job". Both documents are written for: the quote before it's
// sold and the invoice after the work, in the four-part form the quote
// templates already use (pricebook/wording.ts, 17 Nov), so a quote written
// here reads like one from a template.

import { createHash } from "node:crypto";
import { plainText } from "@/lib/pricebook/wording";
import { reportLines, type VisitReport } from "@/lib/installpack/summaryText";
import type { Doc, Plan } from "./lines";

import { INVOICE_LABELS, QUOTE_LABELS, type InvoiceWords, type JobWords, type QuoteWords } from "./labels";

export { INVOICE_LABELS, QUOTE_LABELS, type InvoiceWords, type JobWords, type QuoteWords };

const str = { type: "string" } as const;
export const WORDS_SCHEMA = {
  type: "object",
  properties: {
    quote: {
      type: "object",
      properties: { doing: str, removing: str, included: str, excluded: str, labour: str },
      required: ["doing", "removing", "included", "excluded", "labour"],
      additionalProperties: false,
    },
    invoice: {
      type: "object",
      properties: { did: str, removed: str, included: str, labour: str },
      required: ["did", "removed", "included", "labour"],
      additionalProperties: false,
    },
  },
  required: ["quote", "invoice"],
  additionalProperties: false,
} as const;

/** Bumped when the rules change, so a saved write-up is written again. */
export const WORDS_VERSION = "1";

export const WORDS_RULES = `You write the customer-facing words on a quote and an invoice for Advanced Gas & Aircon, a Melbourne gas, hot water, heating and cooling business. The customer reads them, so they are plain, specific to this job and accurate.

You are given the job, its quote (the lines and the summary already on it), the invoice if there is one, the tech's Condition Report from the visit, the notes on the job and earlier visits to the site, and any electrician booked.

Write two things for each document.

1. The job summary, in parts:
   Quote, future tense: "doing" (what we're installing or replacing and where), "removing" (what comes out and is disposed of), "included" (what the price covers: the work and the parts that go with it), "excluded" (what isn't covered).
   Invoice, past tense: "did", "removed", "included".
   One to three sentences each. A part with nothing to say from the records is an empty string, never a guess.

2. The labour line: one paragraph for the single line that carries the price of the installation labour, the materials and the electrical work together. Say what that one price covers on this job: the installation work itself, the materials that go with it named the way the quote names them (copper pipework, ductwork and outlets, brackets, a slab, a tempering valve), and the electrical work where the job has any. Quote: "covers"; invoice: "covered". Start with what the work is, e.g. "Installation of your new Mitsubishi Electric 10kW ducted system to the upper floor: ...".

Rules:
- Everything comes from the records. Never invent a room, a wall, a distance, a fitting, a brand or a size. The equipment is what's on the quote's equipment lines.
- The parts of the price you're told are merged into the labour line are the only ones it covers. Say electrical work is included only if the job has an electrical line or an electrician booked; say materials only if there are materials.
- What a tech found is said the way they said it, not reworded into something else.
- The equipment line sells the unit, so the summary describes the job, not the brand's features.
- No prices, dollar figures, hours or quantities of labour. No customer names, phone numbers or addresses. No selling, no warranty claims, no promises the records don't make.
- Australian English, short plain sentences, written to the customer ("your").
- Don't mention the records themselves (a form, a note, what's missing). Write about the job.`;

const tidy = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const qty = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2))));
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export type JobNote = { at: string | null; text: string; jobNumber: string | null };
export type Electrician = { supplier: string; date: string | null; status: string; note: string | null };

export type WordsInput = {
  job: { number: string | null; type: string | null; businessUnit: string | null; status: string | null; summary: string | null };
  quote: Doc | null;
  quotePlan: Plan | null;
  invoice: Doc | null;
  invoicePlan: Plan | null;
  reports: VisitReport[];
  notes: JobNote[];
  electricians: Electrician[];
};

function docText(tag: string, d: Doc | null, p: Plan | null): string {
  if (!d) return `<${tag}>none on this job</${tag}>`;
  const role = new Map((p?.lines ?? []).map((l) => [l.id, l]));
  const lines = d.lines.filter((l) => l.qty !== 0).map((l) => {
    const r = role.get(l.id);
    const desc = cut(tidy(plainText(l.description)), 240);
    return `- [${r ? r.role : "line"}${r?.merged ? ", merged into the one price" : ""}] ${qty(l.qty)} × ${tidy(l.name) || tidy(l.code)}${desc && desc !== tidy(l.name) ? ` — ${desc}` : ""}`;
  });
  const roles = p?.target ? [...new Set(p.lines.filter((l) => l.merged).map((l) => l.role))] : [];
  const merged = roles.length ? roles.join(", ") : "nothing (it can't be merged as it stands)";
  return [
    `<${tag} name="${tidy(d.name)}" status="${tidy(d.status)}">`,
    `Summary on it now: ${cut(tidy(plainText(d.summary)), 1500) || "(none)"}`,
    "Lines:",
    ...lines,
    `Merged into the one labour price: ${merged}`,
    `</${tag}>`,
  ].join("\n");
}

/** The words Claude is given, and a key over them, so the same job isn't written again for nothing. */
export function wordsInput(w: WordsInput): { text: string; key: string; sources: string[] } {
  const notes = w.notes.filter((n) => tidy(n.text)).slice(0, 12).map((n) => `- ${n.at ? n.at.slice(0, 10) : "undated"}${n.jobNumber ? `, job ${n.jobNumber}` : ""}: ${cut(tidy(n.text), 500)}`);
  const sparky = w.electricians.map((e) => `- ${e.supplier}${e.date ? `, ${e.date}` : ""} (${e.status})${e.note ? `: ${cut(tidy(e.note), 300)}` : ""}`);
  const text = [
    `Job ${tidy(w.job.number) || "?"}: ${tidy(w.job.type) || "type not set"}${w.job.businessUnit ? `, ${tidy(w.job.businessUnit)}` : ""}${w.job.status ? `, ${tidy(w.job.status)}` : ""}`,
    `<job_summary>\n${cut(tidy(plainText(w.job.summary)), 1500) || "(none written)"}\n</job_summary>`,
    docText("quote", w.quote, w.quotePlan),
    docText("invoice", w.invoice, w.invoicePlan),
    w.reports.length ? w.reports.map((r) => `<condition_report>\n${reportLines(r)}\n</condition_report>`).join("\n") : "<condition_report>none</condition_report>",
    `<notes>\n${notes.join("\n") || "none"}\n</notes>`,
    `<electrician>\n${sparky.join("\n") || "none booked"}\n</electrician>`,
  ].join("\n\n");
  const key = createHash("sha1").update(`${WORDS_VERSION}\n${text}`).digest("hex").slice(0, 16);
  const sources = [
    w.quote ? "the quote" : null,
    w.invoice ? "the invoice" : null,
    w.job.summary ? "the job summary" : null,
    w.reports.length ? `${w.reports.length === 1 ? "the Condition Report" : `${w.reports.length} Condition Reports`}` : null,
    w.notes.length ? `${w.notes.length} ${w.notes.length === 1 ? "note" : "notes"}` : null,
    w.electricians.length ? "the electrician's booking" : null,
  ].filter(Boolean) as string[];
  return { text, key, sources };
}

/** The answer, held to the schema's shape. */
export function parseWords(text: string): JobWords {
  const v = JSON.parse(text) as JobWords;
  const s = (x: unknown) => (typeof x === "string" ? tidy(x) : "");
  if (!v || typeof v !== "object" || !v.quote || !v.invoice) throw new Error("not a write-up");
  return {
    quote: { doing: s(v.quote.doing), removing: s(v.quote.removing), included: s(v.quote.included), excluded: s(v.quote.excluded), labour: s(v.quote.labour) },
    invoice: { did: s(v.invoice.did), removed: s(v.invoice.removed), included: s(v.invoice.included), labour: s(v.invoice.labour) },
  };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The summary as ServiceTitan's HTML: one paragraph a part, its label in bold, empty parts left out. */
export function summaryHtmlFor(kind: "estimate" | "invoice", w: QuoteWords | InvoiceWords): string {
  const labels: Record<string, string> = kind === "estimate" ? QUOTE_LABELS : INVOICE_LABELS;
  return Object.entries(labels)
    .map(([k, label]) => [label, tidy((w as Record<string, string>)[k])] as const)
    .filter(([, t]) => t)
    .map(([label, t]) => `<p><strong>${esc(label)}</strong> ${esc(t)}</p>`)
    .join("");
}

/** The same summary as plain text, for the page and for copying. */
export function summaryTextFor(kind: "estimate" | "invoice", w: QuoteWords | InvoiceWords): string {
  const labels: Record<string, string> = kind === "estimate" ? QUOTE_LABELS : INVOICE_LABELS;
  return Object.entries(labels)
    .map(([k, label]) => [label, tidy((w as Record<string, string>)[k])] as const)
    .filter(([, t]) => t)
    .map(([label, t]) => `${label} ${t}`)
    .join("\n\n");
}
