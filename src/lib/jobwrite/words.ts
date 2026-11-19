// What the job write-up is written from, the rules it's written to, and the
// shape it comes back in. Pure, so scripts/check-jobwrite.ts can show exactly
// what Claude is given for a fixture job.
//
// Jake, 19 Nov: type in a job, and from the quote, the forms and the notes
// get a job summary and a labour summary that "covers the labour, materials
// and electrical under the one price, but it needs to make sense and relate to
// the quote and job". Later the same day he gave two summaries of his own as
// the way they should read (an evap repair on an old cooler, a five-head
// Rinnai replacing an evap and a wall furnace): "this is help with the wording
// and the style we want it written, also pull information from the report or
// notes". So the examples set the voice and the order, and every fact comes
// from the office's notes, the Condition Report and the job notes first.

import { createHash } from "node:crypto";
import { plainText } from "@/lib/pricebook/wording";
import { reportLines, type VisitReport } from "@/lib/installpack/summaryText";
import { TEMPLATE_LABELS, type DocWords, type JobWords } from "./labels";
import type { Doc, Plan } from "./lines";

export type { DocWords, JobWords };

// Only the summary: the labour line is a fixed sentence (lines.ts labourLine).
const doc = {
  type: "object",
  properties: { summary: { type: "string" } },
  required: ["summary"],
  additionalProperties: false,
} as const;
export const WORDS_SCHEMA = {
  type: "object",
  properties: { quote: doc, invoice: doc },
  required: ["quote", "invoice"],
  additionalProperties: false,
} as const;

/** Bumped when the rules change, so a saved write-up is written again. */
// 2 (19 Nov, Jake): the office's own notes for the job come first.
// 3 (19 Nov, Jake): written in the style of his two examples, as paragraphs
// with an Installation Details section and, on a repair to an old system, an
// Existing System Condition note; the facts from the report and the notes.
// 4 (19 Nov, Jake, job 20900): the labour line is one fixed sentence pointing
// to the summary, so the summary has to cover everything the price does.
export const WORDS_VERSION = "4";

/** Jake's two summaries, 19 Nov, as he wrote them: the style to match, never facts for another job. */
const EXAMPLE_REPAIR = `Supply and installation of a new fan belt (A54 / A1400, 13 x 1372mm) including correct tensioning to ensure appropriate fan operation and minimise unnecessary load on the fan motor.

Complete maintenance and cleaning of the evaporative cooler, including the water tank, pump, water distribution system and cabinet. Following completion, the system will be tested to assess its operation.

Important Note – Existing System Condition

Please be aware that the evaporative cooler is approximately 24 years old and has exceeded what would generally be considered a reasonable service life for this type of equipment.

While the proposed works are intended to address the identified issues and assist in maintaining the existing system's operation, due to the age and condition of the unit, we cannot guarantee the longevity or reliability of these repairs.

There is also a possibility that additional components may fail during or following the maintenance works, particularly once the system is returned to normal operation. Furthermore, we cannot rule out potential damage to the fan motor as a result of the unit previously operating with a loose fan belt.

Accordingly, these works should be considered a maintenance and repair attempt only, rather than a long-term solution. We recommend consideration be given to replacing the existing evaporative cooler with an alternative cooling system to provide a more reliable and sustainable long-term outcome.`;

const EXAMPLE_INSTALL = `Supply and installation of a Rinnai multi-head reverse cycle split system comprising five indoor units, servicing all four bedrooms and the front living room.

The existing evaporative cooler and gas wall furnace will be removed, with the property transitioning to reverse cycle heating and cooling throughout the designated rooms. Removal of the existing gas heating system also provides an opportunity to access the applicable Victorian Energy Upgrades (VEU) government rebate, subject to program eligibility requirements.

We recommend this option as a long-term heating and cooling solution, particularly with Victoria's upcoming minimum energy efficiency standards for rental properties commencing from March 2027. Upgrading to reverse cycle technology now provides an opportunity to get ahead of these changes, improve comfort throughout the property and potentially reduce ongoing energy consumption and running costs.

Each bedroom and the front living room will have its own dedicated heating and cooling outlet. The kitchen will not have a dedicated indoor unit; however, the 5kW living room unit will be positioned to assist with airflow into the adjoining kitchen area.

Installation Details:

Rear bedrooms (2) and master bedroom: Back-to-back installations, with indoor units mounted on external walls and pipework running directly through to the outdoor installation.

Master bedroom: Indoor unit to be positioned beneath the existing bulkhead.

Middle bedroom: Indoor unit to be installed on an internal wall, requiring a condensate pump for drainage.

Front living room: 5kW indoor unit positioned to provide heating and cooling to the living area, with airflow extending towards the kitchen.

All installations will be completed in accordance with manufacturer specifications and applicable industry requirements.`;

export const WORDS_RULES = `You write the job summary on a quote and on an invoice for Advanced Gas & Aircon, a Melbourne gas, hot water, heating and cooling business. The customer reads it, and on a rental so does the agent and the owner.

The labour line under it carries the labour, materials and electrical work as one price, and says only "All labour, materials and standard electrical works required to complete the works described in the Job Summary." So the summary is where the customer learns what that price covers: the work, the materials that go with it (named the way the quote or notes name them: copper pipework, brackets, ductwork, a condensate pump), and the electrical work where the job has any.

## Where the facts come from

You're given, most important first: the office's notes for this job, the tech's Condition Report from the visit, the notes on the job and on earlier visits to the site, the quote (its lines and the summary on it now), the invoice if there is one, and any electrician booked.

Every detail you write (a room, a wall, a part, a size, a model, the age of a unit, a fault, what's coming out) comes from one of those. Where they disagree, the office's notes win, then the Condition Report and the job notes, then the quote. If something isn't recorded, leave it out: never guess, and never borrow a detail from the examples below.

What a tech found is said the way they said it, not reworded into something that means something else.

## The job summary

Write it the way these two examples are written: professional, plain paragraphs in Australian English, specific to the job. They show the voice, the structure and the kind of detail. None of their facts belong to this job.

<example kind="a repair and service on an old system">
${EXAMPLE_REPAIR}
</example>

<example kind="a replacement, on a rental">
${EXAMPLE_INSTALL}
</example>

Build it from these parts, in this order, using only the ones the records support:

1. The work. An installation opens "Supply and installation of [the system on the quote's equipment lines], [what it serves]." A repair or service has a paragraph for each part supplied or job done: what it is (with its size or model where the records give one), what's done with it, and why it matters. A maintenance paragraph says what's cleaned and checked and ends "Following completion, the system will be tested to assess its operation."
2. What comes out: the existing equipment being removed and what the property moves to. Only when the quote has a VEU or VEEC rebate line and gas heating is being removed, say that removing it provides an opportunity to access the applicable Victorian Energy Upgrades (VEU) government rebate, subject to program eligibility requirements.
3. Why this option. Only on a replacement at a rental (the business unit or job type says Real Estate): recommend it as a long-term heating and cooling solution, particularly with Victoria's upcoming minimum energy efficiency standards for rental properties commencing from March 2027, and what upgrading now offers (comfort, energy use, running costs). On a home owner's job, a sentence on why only if the records give a reason.
4. Coverage: which rooms get their own heating and cooling, and any room that doesn't and how it's helped.
5. "Installation Details:" on a line of its own, then a paragraph for each location the records name, "Location: what goes where and how" (back to back, internal wall, under a bulkhead, wall or roof bracket, how the pipes run, a condensate pump). Only when the records give locations.
6. "Important Note – Existing System Condition" on a line of its own, only on a repair or service to an existing system the records say is old, worn or near the end of its life. Then, as in the example: its age if recorded and that it has exceeded what would generally be considered a reasonable service life; that the works are intended to address the issues found but, due to its age and condition, we cannot guarantee the longevity or reliability of the repairs; that other components may fail during or after the works, naming any specific risk the records give; and that the works should be considered a maintenance and repair attempt only, rather than a long-term solution, with a recommendation to consider replacing it for a more reliable and sustainable long-term outcome.
7. An installation closes: "All installations will be completed in accordance with manufacturer specifications and applicable industry requirements."

Anything the office says may not be needed goes where it belongs, plainly: "A condensate pump will be fitted if required; if it isn't needed, it will be removed from the quoted price." Give the amount only if the notes give one.

The quote is in the future tense ("will be removed"). The invoice says the same in the past tense ("Supplied and installed", "was removed"), leaves out part 3, and keeps part 6 on a repair. Paragraphs are separated by a blank line; the two headings are lines of their own. No bullet points, numbering, markdown or asterisks.

## Always

- No prices or dollar figures (except an amount the notes give for something that may come off), no hours, no customer names, phone numbers or addresses.
- No warranty claims and no promises the records don't make. The equipment line sells the unit, so don't describe the brand's features.
- Electrical work is mentioned only when the quote has an electrical line or an electrician is booked.
- Don't mention the records themselves (a form, a note, something missing). Write about the job.`;

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
  /** What the office typed on the write-up page for this job. */
  officeNotes?: string;
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

/** The words Claude is given, most important first, and a key over them. */
export function wordsInput(w: WordsInput): { text: string; key: string; sources: string[] } {
  const notes = w.notes.filter((n) => tidy(n.text)).slice(0, 12).map((n) => `- ${n.at ? n.at.slice(0, 10) : "undated"}${n.jobNumber ? `, job ${n.jobNumber}` : ""}: ${cut(tidy(n.text), 500)}`);
  const sparky = w.electricians.map((e) => `- ${e.supplier}${e.date ? `, ${e.date}` : ""} (${e.status})${e.note ? `: ${cut(tidy(e.note), 300)}` : ""}`);
  const office = (w.officeNotes ?? "").trim().slice(0, 3000);
  const text = [
    `<office_notes>\n${office || "none"}\n</office_notes>`,
    `Job ${tidy(w.job.number) || "?"}: ${tidy(w.job.type) || "type not set"}${w.job.businessUnit ? `, business unit ${tidy(w.job.businessUnit)}` : ""}${w.job.status ? `, ${tidy(w.job.status)}` : ""}`,
    w.reports.length ? w.reports.map((r) => `<condition_report>\n${reportLines(r)}\n</condition_report>`).join("\n") : "<condition_report>none</condition_report>",
    `<job_notes>\n${notes.join("\n") || "none"}\n</job_notes>`,
    `<job_summary>\n${cut(tidy(plainText(w.job.summary)), 1500) || "(none written)"}\n</job_summary>`,
    docText("quote", w.quote, w.quotePlan),
    docText("invoice", w.invoice, w.invoicePlan),
    `<electrician>\n${sparky.join("\n") || "none booked"}\n</electrician>`,
  ].join("\n\n");
  const key = createHash("sha1").update(`${WORDS_VERSION}\n${text}`).digest("hex").slice(0, 16);
  const sources = [
    office ? "your notes" : null,
    w.reports.length ? `${w.reports.length === 1 ? "the Condition Report" : `${w.reports.length} Condition Reports`}` : null,
    w.notes.length ? `${w.notes.length} ${w.notes.length === 1 ? "job note" : "job notes"}` : null,
    w.quote ? "the quote" : null,
    w.invoice ? "the invoice" : null,
    w.job.summary ? "the job summary" : null,
    w.electricians.length ? "the electrician's booking" : null,
  ].filter(Boolean) as string[];
  return { text, key, sources };
}

/**
 * A summary as written: paragraphs kept, a blank line between, and any
 * markdown the model slipped in taken out (no **bold**, no "- " bullets).
 */
export function tidySummary(s: string): string {
  return s.replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((p) => p.split("\n").map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").replace(/\*\*|__/g, "").replace(/^#+\s*/, "").replace(/[ \t]+/g, " ").trim()).filter(Boolean).join("\n"))
    .filter(Boolean)
    .join("\n\n");
}

/** The answer, held to the schema's shape. */
export function parseWords(text: string): JobWords {
  const v = JSON.parse(text) as JobWords;
  if (!v || typeof v !== "object" || !v.quote || !v.invoice) throw new Error("not a write-up");
  // The labour line is filled in from the lines afterwards (write.ts).
  const one = (d: Partial<DocWords> | undefined): DocWords => ({
    summary: typeof d?.summary === "string" ? tidySummary(d.summary) : "",
    labour: "",
  });
  return { quote: one(v.quote), invoice: one(v.invoice) };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const LABEL_AT_START = new RegExp(`^(${TEMPLATE_LABELS.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*`);

/**
 * A paragraph that's a heading: one short line, not a sentence, ending in a
 * colon ("Installation Details:") or one of the note headings ("Important
 * Note – Existing System Condition").
 */
export function isHeading(p: string): boolean {
  const t = p.trim();
  if (!t || t.includes("\n") || t.length > 70) return false;
  if (/^important note\b/i.test(t)) return true;
  return /:$/.test(t) && !/[.!?]\s/.test(t);
}

/**
 * The job summary as the office left it on the page, as ServiceTitan's HTML:
 * a paragraph for each block of text, a heading in bold, and a template label
 * a paragraph starts with in bold, the way the quote templates show theirs.
 * Anything else stays as typed.
 */
export function summaryHtmlFromText(text: string): string {
  return text.replace(/\r/g, "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => {
    if (isHeading(p)) return `<p><strong>${esc(p)}</strong></p>`;
    const m = LABEL_AT_START.exec(p);
    const body = esc(m ? p.slice(m[0].length) : p).replace(/\n/g, "<br>");
    return `<p>${m ? `<strong>${esc(m[1])}</strong> ` : ""}${body}</p>`;
  }).join("");
}
