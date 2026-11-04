// What the install summary is written from, and the shape it comes back in.
// Pure, so scripts/check-installpack.ts can see exactly what Claude is given
// for a fixture job, and the key that decides when it's written again.
//
// The rest of the pack says nothing in our own words (build.ts). This section
// is the exception Jake asked for on 4 Nov: an installer should read, before
// they get there, where the indoor head goes, whether there's a pump, where
// the pipes run and what the outdoor unit sits on, and nobody writes that
// down. So it's written from what was recorded, held to saying only what
// those records say, and anything they don't settle is listed to confirm
// rather than filled in. The PDF says what it was written from.

import { createHash } from "node:crypto";
import { answer, toReport, type Submission } from "@/lib/conditionReport/report";
import { plainText, type PackFacts } from "./build";

/** A Condition Report found on a visit to the same site before the install. */
export type VisitReport = { jobId: number; jobNumber: string | null; jobType: string | null; submission: Submission };

export type InstallSummary = {
  /** Two or three sentences: what's going in, where, replacing what. */
  overview: string;
  sections: { heading: string; text: string }[];
  /** What the records don't settle, as short questions for site. */
  confirm: string[];
};

/** What was written: the summary, or why there isn't one. */
export type SummaryState = { ok: InstallSummary; from: string } | { error: string; at: string };

/** Bumped when the instructions change, so every summary still to be used is written again. */
export const SUMMARY_VERSION = "1";

export const SECTIONS = [
  "Removing the old system", "Indoor unit", "Outdoor unit", "Pipework", "Drainage", "Electrical", "Gas", "Water",
  "Flue", "Ductwork", "Controls", "Access and safety", "Commissioning and handover",
] as const;

export const SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    overview: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: { heading: { type: "string", enum: [...SECTIONS] }, text: { type: "string" } },
        required: ["heading", "text"],
        additionalProperties: false,
      },
    },
    confirm: { type: "array", items: { type: "string" } },
  },
  required: ["overview", "sections", "confirm"],
  additionalProperties: false,
} as const;

export const SUMMARY_RULES = `You write the "Installation summary" section of an install pack for Advanced Gas & Aircon, a Melbourne gas, hot water, heating and cooling business. Installers read it before they arrive on site. It says how this install will go: where each unit goes and what it's mounted on, the pipe run, whether there's a condensate pump, power, gas, water, flue and ductwork, what's being removed, and anything about access.

You are given the office's job summary, the sold quote's lines (equipment, materials, and the labour lines that name the kind of install), any contractor booked, and the Condition Report and photos from the earlier visit to the site.

Rules:
- Say only what those records say or plainly show. Never invent a room, a wall, a distance or a fitting.
- A quote line can settle a point when its name makes it plain, and you say that's where it comes from: an install line "Roof Bracket" means the outdoor unit goes on a roof bracket; "Back To Back" means indoor and outdoor units on the two sides of the same wall; "Wall Bracket" (labour or a wall bracket material) means a wall-mounted outdoor unit; a condensate pump on the materials means a pump, and no pump on them is "no condensate pump on the quote", not a promise of a gravity drain; a coil of copper pair is the pipe size, not the run length.
- From photos, describe only what is clearly visible, and say it's from the photos.
- Where two records disagree (the job summary says one bracket, the quote another), say so plainly and put it in confirm.
- Anything an installer needs that the records don't settle (where the indoor head goes, the pipe route and length, where power comes from, roof access) goes in confirm as a short question. Don't pad confirm with things the records do settle.
- The Condition Report describes the existing equipment at the earlier visit. Use it for what's there now and what's being removed; don't describe the old unit as the new one.
- Sections: only those that apply, in a sensible order, each one to four short sentences. Overview: two or three sentences.
- Plain Australian trade English. No selling, no prices, no customer names or phone numbers.`;

const tidy = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const qty = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2))));

/** A report's units as plain lines, without the customer's name, address or signature. */
function reportLines(v: VisitReport): string {
  const r = toReport(v.submission);
  // Who and where, not what: the customer's details stay out. Matched whole,
  // so a field like "Indoor unit location" still goes in.
  const skip = /^(customer( name| reference)?|(location |site )?address|location|site|reference|phone( number)?|mobile|email|technician( name)?|job number|service date)$/i;
  const out: string[] = [];
  out.push(`Condition Report from job ${v.jobNumber ?? v.jobId}${v.jobType ? ` (${tidy(v.jobType)})` : ""}${r.submittedOn ? `, submitted ${r.submittedOn.slice(0, 10)}` : ""}`);
  if (r.equipment) out.push(`Existing equipment: ${r.equipment}`);
  for (const l of r.lights) out.push(`${l.name}: ${l.light == null ? "not answered" : ["Red", "Amber", "Green"][l.light]}${l.comment ? ` (${l.comment})` : ""}`);
  for (const u of v.submission.units ?? []) {
    const name = tidy(u.name);
    if (!name || skip.test(name) || (u.type ?? "").toLowerCase() === "signature" || (u.type ?? "").toLowerCase() === "stoplight") continue;
    const a = answer(u);
    const c = tidy(u.comment);
    if (!a && !c) continue;
    out.push(`${name}: ${[a, c].filter(Boolean).join(" — ")}`);
  }
  return out.join("\n");
}

/**
 * The words Claude is given, and a key over them: the summary is written
 * again only when the key changes. Photos aren't in the key; they're of the
 * earlier visit and don't change once it's done.
 */
export function summaryInput(f: PackFacts, reports: VisitReport[]): { text: string; key: string; sources: string[] } {
  const lines = f.items.filter((i) => i.qty > 0 && !/^REBATE/i.test(i.code) && !/rebate|BPC Compliance|deposit/i.test(i.name ?? i.code));
  const list = (type: string) => lines.filter((i) => i.type === type).map((i) => `- ${qty(i.qty)} × ${tidy(i.name) || tidy(i.code)}`).join("\n") || "- none";
  const contractors = f.orders.filter((o) => o.kind === "work_order" && o.status !== "cancelled").map((o) => o.supplier);
  const text = [
    `Job type: ${tidy(f.jobType) || "not set"}`,
    `<job_summary>\n${plainText(f.jobSummary) ?? "(none written)"}\n</job_summary>`,
    f.quote ? `<sold_quote name="${tidy(f.quote.name)}">\nEquipment:\n${list("Equipment")}\nMaterials:\n${list("Material")}\nLabour and services:\n${list("Service")}\n</sold_quote>` : "<sold_quote>none on this job</sold_quote>",
    contractors.length ? `Contractors booked: ${[...new Set(contractors)].join(", ")}` : "",
    reports.length ? reports.map((r) => `<condition_report>\n${reportLines(r)}\n</condition_report>`).join("\n") : "<condition_report>none found on this job or the earlier visits</condition_report>",
  ].filter(Boolean).join("\n\n");
  const key = createHash("sha1").update(`${SUMMARY_VERSION}\n${text}`).digest("hex").slice(0, 16);
  const sources = ["the job summary", f.quote ? "the sold quote" : null,
    ...reports.map((r) => `the Condition Report from job ${r.jobNumber ?? r.jobId}`)].filter(Boolean) as string[];
  return { text, key, sources };
}

/** "a, b and c". */
export const listed = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}` : xs[0] ?? "");

/** The answer, held to the schema's shape; anything else is refused rather than half-printed. */
export function parseSummary(text: string): InstallSummary {
  const v = JSON.parse(text) as InstallSummary;
  if (typeof v?.overview !== "string" || !Array.isArray(v.sections) || !Array.isArray(v.confirm)) throw new Error("not a summary");
  return {
    overview: tidy(v.overview),
    sections: v.sections.filter((s) => s && typeof s.heading === "string" && typeof s.text === "string" && tidy(s.text)).map((s) => ({ heading: tidy(s.heading), text: tidy(s.text) })),
    confirm: v.confirm.filter((c) => typeof c === "string" && tidy(c)).map(tidy).slice(0, 12),
  };
}
