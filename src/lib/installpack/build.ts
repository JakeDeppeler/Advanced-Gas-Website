// What an install pack says, worked out from the facts about one install job.
// Pure — no database, no network — so scripts/check-installpack.ts can run it
// against a fixture taken from a live job, and the PDF and the "what changed"
// note both read the same answer.
//
// Nothing here is written in our own words about the job. The scope is the
// job's own summary, the lists are the sold quote's lines, and the ordering
// status is what Supply › Next week recorded. A pack that paraphrased either
// could tell an installer something nobody asked for. The one exception is
// the install summary (summaryText.ts), which Jake asked for on 4 Nov: it's
// written from the records, held to what they say, kept apart from the scope
// under its own heading, and says what it was written from.
//
// The scope is the job summary and not the quote's (Jake, 31 Oct): the quote
// is written to sell the job to the customer, the job summary is what the
// office wrote for whoever does it.

import { createHash } from "node:crypto";
import { toReport, type Report } from "@/lib/conditionReport/report";
import type { SummaryState, VisitReport } from "./summaryText";
import { melbourneInstant } from "@/lib/outlook/workOrderTypes";

export type QuoteItem = {
  skuId: number | null;
  type: string;
  /** The pricebook code, which is what suppliers and the van stock go by. */
  code: string;
  /** The pricebook's display name, when it has one. */
  name: string | null;
  qty: number;
};

export type OrderLine = {
  skuId: number | null;
  supplier: string;
  po: string;
  status: "draft" | "approved" | "sent" | "cancelled";
  kind: "order" | "work_order";
  sentAt: string | null;
  pickup: boolean;
};

export type Photo = {
  id: number; name: string; at: string | null;
  /** Taken on the quote visit, not on this job. */ quoteVisit: boolean;
  /** Where it was taken, when that's neither: "Diagnostic visit, job 20493". */ label?: string;
};

export type PackFacts = {
  jobId: number;
  jobNumber: string | null;
  jobType: string | null;
  customer: string | null;
  siteAddress: string | null;
  sitePhone: string | null;
  /** "Thu 29 Oct 7:00am, Fri 30 Oct 7:00am", as job_next_appointment writes it. */
  visits: string | null;
  crew: string | null;
  /**
   * The sold quote, or null for an install booked without one: the pack still
   * goes on, with the job summary, the site and the photos, and no lists.
   * fromJob: the quote job's number, when the quote was written on another job (the quote visit).
   */
  quote: { id: number; name: string | null; fromJob: string | null; soldOn: string | null } | null;
  jobSummary: string | null;
  items: QuoteItem[];
  orders: OrderLine[];
  /** The Condition Reports from the visits before the install (summary.ts), when they've been looked for. */
  visitReports?: VisitReport[];
  /** The install summary written from them, or why there isn't one; null when drafting is off. */
  summary?: SummaryState | null;
  /** The next visit's own instructions in ServiceTitan ("with Thomas"), when there are any. */
  instructions?: string | null;
  /** Whether the next visit is confirmed in ServiceTitan: a pack is made then (Jake, 22 Nov), or failing that the day before (packDue). */
  confirmed?: boolean;
  /** When the next visit starts. */
  visitStart?: string | null;
};

/**
 * Whether a pack is due: as soon as the visit's confirmed, and otherwise from
 * midday the day before it (Jake, 24 Nov: "go with the confirm but also the
 * fall back"). The office rarely ticks confirmed in ServiceTitan (two of the
 * week's installs had it), and a crew shouldn't go out without a pack.
 */
export function packDue(f: Pick<PackFacts, "confirmed" | "visitStart">, now = Date.now()): { due: boolean; why: "confirmed" | "day before" | null } {
  if (f.confirmed) return { due: true, why: "confirmed" };
  if (!f.visitStart) return { due: false, why: null };
  const day = new Date(f.visitStart).toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
  const before = new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  return now >= Date.parse(melbourneInstant(before, "12:00")) ? { due: true, why: "day before" } : { due: false, why: null };
}

/** What sort of install, for the lists that differ by it. */
export type Kind = "split" | "hotwater" | "ducted" | "gasDucted" | "evap" | "other";

/** A line to tick. `must`: one that keeps getting missed, printed bold with a tag (Jake, 22 Nov). */
export type Check = { text: string; must?: boolean };

/** state is what ordered says, for the PDF's emphasis; the words carry it either way. */
export type PackLine = { qty: string; name: string; ordered: string; state: "sent" | "waiting" | "none" };

export type Pack = {
  title: string;
  jobNumber: string;
  jobType: string | null;
  customer: string | null;
  address: string | null;
  /** Label, value — when, who, ring, which quote. */
  facts: [string, string][];
  units: PackLine[];
  materials: PackLine[];
  /** Contractors' work orders for the job (the electrician): who, and whether it's gone. */
  contractors: string[];
  /** The job summary. */
  scope: string | null;
  /** False when there's no sold quote, so the lists are empty for want of one, not because nothing's needed. */
  quoted: boolean;
  /** The install summary (summaryText.ts), or why it's missing; null to leave the section off. */
  summary: SummaryState | null;
  /** The Condition Reports, to print in full after the gear. */
  reports: Report[];
  kind: Kind;
  /** An all-in-one heat pump: the whole unit sits outside, so there's no indoor unit to place. */
  aio: boolean;
  /** The rebates on the sold quote, in words ("STCs", "VEU"); empty on a job without. */
  rebates: string[];
  /** Ducted: the zoning and outlet lines, kept apart from the materials. */
  zoning: PackLine[];
  /** Photos to take before leaving, by kind, the rebate's first. */
  toTake: Check[];
  /** What's done before leaving, the rebate's first. */
  leaving: Check[];
  /** The next visit's own instructions. */
  instructions: string | null;
  /** Where each unit goes, from the install summary; an all-in-one's indoor unit left out, as it has none. */
  locations: { label: string; text: string }[];
};

/** The kind of install, from the job type and the quote. */
export function kindOf(jobType: string | null, items: QuoteItem[]): { kind: Kind; aio: boolean } {
  const t = jobType ?? "";
  const names = items.map((i) => `${i.code} ${i.name ?? ""}`).join(" ");
  const aio = /\bAIO\b|all.?in.?one/i.test(`${t} ${names}`);
  if (/evap/i.test(t)) return { kind: "evap", aio: false };
  if (/gas ducted|ducted heat/i.test(t)) return { kind: "gasDucted", aio: false };
  if (/ducted/i.test(t)) return { kind: "ducted", aio: false };
  if (/heat pump|hot water|\bAIO\b/i.test(t)) return { kind: "hotwater", aio };
  if (/split|multi.?head/i.test(t)) return { kind: "split", aio: false };
  return { kind: "other", aio };
}

const REBATE_NAMES: [RegExp, string][] = [
  [/^REBATE-STC$/i, "STCs"], [/^REBATE-VEEC$/i, "VEU"], [/^REBATE-SOLARVIC$/i, "Solar Victoria"], [/^REBATE-SOLARVIC-AM$/i, "Solar Victoria Australian-made bonus"],
];

/** The rebates a quote carries, by their lines; the total line isn't one. */
export function rebatesOn(items: QuoteItem[]): string[] {
  const out: string[] = [];
  for (const i of items) {
    if (i.qty <= 0 || !/^REBATE-/i.test(i.code) || /^REBATE-TOTAL$/i.test(i.code)) continue;
    const name = REBATE_NAMES.find(([re]) => re.test(i.code))?.[1] ?? (tidy(i.name) || i.code);
    if (!out.includes(name)) out.push(name);
  }
  return out;
}

/** What a ducted job's zoning and outlets are, on the quote. */
const ZONING = /zone|damper|sensor|controller|thermostat|outlet|grille|diffuser|register|return air|spigot|vent\b/i;

/** The photos the crew take, by kind; a rebate job's come first, the one they forget marked. */
export function photosToTake(kind: Kind, rebate: boolean): Check[] {
  const by: Record<Kind, string[]> = {
    split: ["Indoor unit installed, level, with the remote", "Outdoor unit in place, with the pipework and drain in shot", "Wall penetration sealed, inside and out", "Outdoor unit's data plate, with the serial number readable"],
    hotwater: ["New unit installed, with the connections, PTR and tempering valve in shot", "New unit's data plate, with the serial number readable"],
    ducted: ["Indoor unit in the roof space, with the ductwork connected", "Outdoor unit in place, with the pipework in shot", "Each outlet and the return air grille fitted", "Controller on the wall", "Outdoor unit's data plate, with the serial number readable"],
    gasDucted: ["Heater installed, with the flue and the gas connection in shot", "Each outlet and the return air grille fitted", "Controller on the wall", "Heater's data plate, with the serial number readable"],
    evap: ["Cooler on the roof, level, with the water and drain connected", "Each outlet fitted", "Controller on the wall", "Cooler's data plate, with the serial number readable"],
    other: ["The finished install", "The new unit's data plate, with the serial number readable"],
  };
  const rebateShots: Check[] = rebate ? [{ text: "Old system's data plate, showing its date" }, { text: "Old system made inoperable" }, { text: "Old system in the trailer", must: true }] : [];
  return [...rebateShots, ...by[kind].map((text) => ({ text }))];
}

/** What's done before the crew leave; a rebate job's sign-off and Alitsy come first, as they keep getting missed. */
export function beforeLeaving(kind: Kind, rebate: boolean): Check[] {
  const out: Check[] = rebate ? [{ text: "Customer signs off the rebate before you leave", must: true }, { text: "Data plate details, old and new unit, entered into Alitsy", must: true }] : [];
  if (kind === "hotwater") out.push({ text: "No leaks, unit running, hot water at the taps" });
  else if (kind !== "other") out.push({ text: "Customer shown how to use the controller" });
  out.push({ text: rebate ? "All photos uploaded to the job, the trailer one included" : "Photos uploaded to the job" }, { text: "Area cleaned up, offcuts and packaging taken away" });
  return out;
}

/** Rebates are lines on a quote for the customer's benefit, not anything to fit. */
const NOT_FITTED = /^REBATE/i;

/** ServiceTitan keeps quote and job wording as HTML; the pack is plain text. */
export function plainText(html: string | null | undefined): string | null {
  if (!html) return null;
  const t = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    // One block ending where the next begins is one line break, not two.
    .replace(/<\/\s*(p|div|h\d)\s*>\s*<\s*(p|div|h\d)(\s[^>]*)?>/gi, "\n")
    .replace(/<\/\s*(p|div|li|h\d)\s*>/gi, "\n")
    // A block's start breaks the line too: ServiceTitan writes a summary as
    // "<b>ROOM 42 - …Install</b><div>Attend to…</div>", and only breaking at
    // the end ran the title into the first sentence ("InstallAttend").
    .replace(/<\s*(p|div|h\d)(\s[^>]*)?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return t || null;
}

const tidy = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const qtyText = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2))));

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "Australia/Melbourne" }).replace(",", "") : "";

/**
 * Where a line stands with the supplier, in as few words as an installer
 * needs (Jake, 28 Oct: "Sent – Reece", "Draft – not sent", "Not ordered").
 * The order number and date are on Supply › Next week for whoever needs
 * them. A line on no order is said plainly rather than guessed at — it may be
 * van stock, or it may have been missed, and the installer is the one who'd
 * find out on the day.
 */
function ordered(lines: OrderLine[]): Pick<PackLine, "ordered" | "state"> {
  const live = lines.filter((l) => l.status !== "cancelled");
  if (!live.length) return { ordered: "Not ordered", state: "none" };
  const sent = live.find((l) => l.status === "sent");
  if (sent) return { ordered: `Sent – ${sent.supplier}${sent.pickup ? " (pick up)" : ""}`, state: "sent" };
  return { ordered: live[0].status === "approved" ? "Approved – not sent" : "Draft – not sent", state: "waiting" };
}

export function buildPack(f: PackFacts): Pack {
  const fitted = f.items.filter((i) => i.qty > 0 && !NOT_FITTED.test(i.code));
  const { kind, aio } = kindOf(f.jobType, f.items);
  const rebates = rebatesOn(f.items);
  const ductedKind = kind === "ducted" || kind === "gasDucted" || kind === "evap";
  const isZoning = (i: QuoteItem) => ductedKind && ZONING.test(`${i.name ?? ""} ${i.code}`);
  const bySku = new Map<number, OrderLine[]>();
  for (const o of f.orders) if (o.skuId != null) bySku.set(o.skuId, [...(bySku.get(o.skuId) ?? []), o]);

  // The pricebook code isn't printed (Jake, 28 Oct): the name is what's on
  // the box, and the code only meant something to whoever ordered it.
  const line = (i: QuoteItem): PackLine => ({
    qty: qtyText(i.qty),
    name: tidy(i.name) || tidy(i.code),
    ...ordered(i.skuId != null ? bySku.get(i.skuId) ?? [] : []),
  });

  // A contractor's work order is per job, not per line; one entry per order.
  const contractors: string[] = [];
  const seen = new Set<string>();
  for (const o of f.orders) {
    if (o.kind !== "work_order" || o.status === "cancelled" || seen.has(o.po)) continue;
    seen.add(o.po);
    contractors.push(`${o.supplier} – ${o.status === "sent" ? `work order sent ${day(o.sentAt)}` : "work order not sent yet"}`);
  }


  return {
    title: `Install pack · Job ${f.jobNumber ?? f.jobId}`,
    jobNumber: f.jobNumber ?? String(f.jobId),
    jobType: tidy(f.jobType) || null,
    customer: tidy(f.customer) || null,
    address: tidy(f.siteAddress) || null,
    facts: ([
      ["Booked", tidy(f.visits) || "No visit booked"],
      ["Crew", tidy(f.crew) || "Nobody assigned yet"],
      ["Site phone", tidy(f.sitePhone) || "None on file"],
      ["Quote", f.quote
        ? [tidy(f.quote.name) || null, f.quote.fromJob ? `from job ${f.quote.fromJob}` : null, f.quote.soldOn ? `sold ${day(f.quote.soldOn)}` : null].filter(Boolean).join(" · ")
        : "No sold quote on this job"],
    ] as [string, string][]).filter(([, v]) => v),
    units: fitted.filter((i) => i.type === "Equipment" && !isZoning(i)).map(line),
    materials: fitted.filter((i) => i.type === "Material" && !isZoning(i)).map(line),
    contractors,
    scope: plainText(f.jobSummary),
    quoted: f.quote != null,
    summary: f.summary ?? null,
    // A report whose own Job Number field was left blank still says which job it's from.
    reports: (f.visitReports ?? []).map((v) => {
      const r = toReport(v.submission);
      return { ...r, jobNumber: r.jobNumber ?? v.jobNumber };
    }),
    kind,
    aio,
    rebates,
    zoning: fitted.filter((i) => (i.type === "Equipment" || i.type === "Material") && isZoning(i)).map(line),
    toTake: photosToTake(kind, rebates.length > 0),
    leaving: beforeLeaving(kind, rebates.length > 0),
    instructions: tidy(f.instructions) || null,
    locations: (f.summary && "ok" in f.summary ? f.summary.ok.locations ?? [] : []).filter((l) => !(aio && /indoor/i.test(l.label))),
  };
}

/* ------------------------------------------------------------ what changed */

export type PackParts = Record<"layout" | "booking" | "crew" | "contact" | "scope" | "quote" | "orders" | "summary" | "reports", string>;

/**
 * Bumped when the PDF's design changes, so every pack still to be used is
 * made again in the new look. 2: the branded layout of 28 Oct. 3: the same
 * day's boxed sections, with the scope under the site. 4: the notes on the
 * job moved up under the scope. 5: the plain style, full logo on white.
 * 6: contractors under the notes, the quote's labour lines left off.
 * 7: the scope is the job summary, not the quote's; the notes section goes.
 * 8: a summary's title no longer runs into its first sentence.
 * 9: the install summary under the scope, the Condition Reports after the gear.
 */
// 10 (22 Nov, Jake): the layout of the packs made by hand for 20801 and
// 20881: summary, alert, where it goes, unit and materials, extra
// information, photos to take, before leaving, the photos on the job; a
// rebate badge and the rebate's often-missed lines; zoning on ducted jobs.
export const LAYOUT = "10";

const hash = (v: unknown) => createHash("sha1").update(JSON.stringify(v)).digest("hex").slice(0, 16);

/**
 * The pack's content section by section, hashed, so a new version is made
 * only when something an installer would read has changed, and its note can
 * say what. Photos aren't here: they're in ServiceTitan, not the database,
 * and are checked separately on a slower clock.
 */
export function packParts(f: PackFacts): PackParts {
  const p = buildPack(f);
  return {
    layout: LAYOUT,
    booking: hash([p.facts.find(([k]) => k === "Booked")?.[1] ?? "", p.instructions]),
    crew: hash(p.facts.find(([k]) => k === "Crew")?.[1] ?? ""),
    contact: hash([f.siteAddress, f.sitePhone, f.customer]),
    scope: hash(p.scope ?? ""),
    quote: hash([f.quote?.id ?? null, p.units.map((l) => [l.qty, l.name]), p.materials.map((l) => [l.qty, l.name])]),
    // From the orders themselves, not the wording, so rewording the PDF never
    // looks like an order changing.
    orders: hash(f.orders.map((o) => [o.skuId, o.po, o.status, o.pickup, o.kind]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))),
    // What was written, not when: a failed attempt and its retry that fails
    // the same way aren't a change worth a new version.
    summary: hash(f.summary == null ? null : "ok" in f.summary ? f.summary.ok : "failed"),
    reports: hash((f.visitReports ?? []).map((v) => [v.submission.id, v.submission.submittedOn ?? null])),
  };
}

export const fingerprint = (parts: PackParts) => hash(parts);

const SAYS: Record<keyof PackParts, string> = {
  layout: "the layout",
  booking: "the booking",
  crew: "the crew",
  contact: "the site details",
  scope: "the job summary",
  quote: "the quote",
  orders: "what's been ordered",
  summary: "the install summary",
  reports: "the Condition Report",
};

/** "the booking and what's been ordered changed" — for the note on an updated pack. */
export function whatChanged(before: Partial<PackParts> | null, now: PackParts, photosChanged: boolean): string {
  // A new layout hashes its sections afresh, so comparing them with the old
  // version's would claim changes that didn't happen.
  if (before && before.layout !== now.layout) return "new layout only, nothing about the job changed";
  const parts = (Object.keys(now) as (keyof PackParts)[]).filter((k) => before?.[k] !== now[k]).map((k) => SAYS[k]);
  if (photosChanged) parts.push("the photos");
  if (!parts.length) return "nothing an installer reads changed";
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `${list} changed`;
}
