// What an install pack says, worked out from the facts about one install job.
// Pure — no database, no network — so scripts/check-installpack.ts can run it
// against a fixture taken from a live job, and the PDF and the "what changed"
// note both read the same answer.
//
// Nothing here is written in our own words about the job. The scope is the
// sold quote's own wording, the lists are the quote's lines, and the ordering
// status is what Supply › Next week recorded. A pack that paraphrased the
// quote could tell an installer something the customer didn't buy (Jake,
// 27 Oct: straight from the quote, nothing invented).

import { createHash } from "node:crypto";

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

export type Photo = { id: number; name: string; at: string | null; /** Taken on the quote visit, not on this job. */ quoteVisit: boolean };

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
  /** fromJob: the quote job's number, when the quote was written on another job (the quote visit). */
  quote: { id: number; name: string | null; fromJob: string | null; soldOn: string | null; summary: string | null };
  jobSummary: string | null;
  items: QuoteItem[];
  orders: OrderLine[];
};

export type PackLine = { qty: string; name: string; code: string | null; ordered: string };

export type Pack = {
  title: string;
  /** Job number and type, then customer and site, as the PDF's heading. */
  heading: string[];
  /** Label, value — when, who, ring, which quote. */
  facts: [string, string][];
  units: PackLine[];
  materials: PackLine[];
  /** The labour and compliance lines on the quote, as names. */
  work: string[];
  /** Contractors' work orders for the job (the electrician): who, and whether it's gone. */
  contractors: string[];
  scope: string | null;
  jobNotes: string | null;
};

/** Rebates are lines on a quote for the customer's benefit, not anything to fit. */
const NOT_FITTED = /^REBATE/i;

/** ServiceTitan keeps quote and job wording as HTML; the pack is plain text. */
export function plainText(html: string | null | undefined): string | null {
  if (!html) return null;
  const t = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|li|h\d)\s*>/gi, "\n")
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
 * Where a line stands with the supplier, in the installer's terms: whether it
 * has gone, on which order, and whether it's coming to site or being picked
 * up. A line on no order is said plainly rather than guessed at — it may be
 * van stock, or it may have been missed, and the installer is the one who'd
 * find out on the day.
 */
function orderedText(lines: OrderLine[]): string {
  const live = lines.filter((l) => l.status !== "cancelled");
  if (!live.length) return "Not on an order";
  const sent = live.find((l) => l.status === "sent");
  if (sent) return `${sent.supplier}, ${sent.po}, sent ${day(sent.sentAt)}${sent.pickup ? " (pick up)" : ""}`;
  const l = live[0];
  return `${l.supplier}, ${l.po}: ${l.status === "approved" ? "approved, not sent yet" : "draft, not sent yet"}`;
}

/**
 * The job's own notes, less anything that's the quote's scope again. When a
 * job is booked from a quote, ServiceTitan copies the scope into the job's
 * summary and the office adds the real instructions under it; printing both
 * whole puts the same three paragraphs on the page twice.
 */
function extraNotes(notes: string | null, scope: string | null): string | null {
  if (!notes) return null;
  if (!scope) return notes;
  if (scope.includes(notes)) return null;
  const rest = notes.includes(scope) ? notes.replace(scope, "").trim() : notes;
  return rest || null;
}

export function buildPack(f: PackFacts): Pack {
  const fitted = f.items.filter((i) => i.qty > 0 && !NOT_FITTED.test(i.code));
  const bySku = new Map<number, OrderLine[]>();
  for (const o of f.orders) if (o.skuId != null) bySku.set(o.skuId, [...(bySku.get(o.skuId) ?? []), o]);

  const line = (i: QuoteItem): PackLine => {
    const name = tidy(i.name) || tidy(i.code);
    const code = tidy(i.code);
    return { qty: qtyText(i.qty), name, code: code && code !== name ? code : null, ordered: orderedText(i.skuId != null ? bySku.get(i.skuId) ?? [] : []) };
  };

  // A contractor's work order is per job, not per line; one entry per order.
  const contractors: string[] = [];
  const seen = new Set<string>();
  for (const o of f.orders) {
    if (o.kind !== "work_order" || o.status === "cancelled" || seen.has(o.po)) continue;
    seen.add(o.po);
    contractors.push(`${o.supplier}: work order ${o.po}, ${o.status === "sent" ? `sent ${day(o.sentAt)}` : "not sent yet"}`);
  }

  const scope = plainText(f.quote.summary);
  const notes = plainText(f.jobSummary);

  return {
    title: `Install pack · Job ${f.jobNumber ?? f.jobId}`,
    heading: [
      [f.jobNumber ? `Job ${f.jobNumber}` : null, tidy(f.jobType) || null].filter(Boolean).join(" · "),
      [tidy(f.customer) || null, tidy(f.siteAddress) || null].filter(Boolean).join(" · "),
    ].filter(Boolean),
    facts: ([
      ["Booked", tidy(f.visits) || "No visit booked"],
      ["Crew", tidy(f.crew) || "Nobody assigned yet"],
      ["Site phone", tidy(f.sitePhone) || "None on file"],
      ["Quote", [tidy(f.quote.name) || null, f.quote.fromJob ? `from job ${f.quote.fromJob}` : null, f.quote.soldOn ? `sold ${day(f.quote.soldOn)}` : null].filter(Boolean).join(" · ")],
    ] as [string, string][]).filter(([, v]) => v),
    units: fitted.filter((i) => i.type === "Equipment").map(line),
    materials: fitted.filter((i) => i.type === "Material").map(line),
    work: fitted.filter((i) => i.type !== "Equipment" && i.type !== "Material").map((i) => (i.qty !== 1 ? `${tidy(i.name) || tidy(i.code)} ×${qtyText(i.qty)}` : tidy(i.name) || tidy(i.code))),
    contractors,
    scope,
    jobNotes: extraNotes(notes, scope),
  };
}

/* ------------------------------------------------------------ what changed */

export type PackParts = Record<"booking" | "crew" | "contact" | "quote" | "orders", string>;

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
    booking: hash(p.facts.find(([k]) => k === "Booked")?.[1] ?? ""),
    crew: hash(p.facts.find(([k]) => k === "Crew")?.[1] ?? ""),
    contact: hash([f.siteAddress, f.sitePhone, f.customer]),
    quote: hash([f.quote.id, p.units.map((l) => [l.qty, l.name]), p.materials.map((l) => [l.qty, l.name]), p.work, p.scope, p.jobNotes]),
    orders: hash([p.units.map((l) => l.ordered), p.materials.map((l) => l.ordered), p.contractors]),
  };
}

export const fingerprint = (parts: PackParts) => hash(parts);

const SAYS: Record<keyof PackParts, string> = {
  booking: "the booking",
  crew: "the crew",
  contact: "the site details",
  quote: "the quote",
  orders: "what's been ordered",
};

/** "the booking and what's been ordered changed" — for the note on an updated pack. */
export function whatChanged(before: Partial<PackParts> | null, now: PackParts, photosChanged: boolean): string {
  const parts = (Object.keys(now) as (keyof PackParts)[]).filter((k) => before?.[k] !== now[k]).map((k) => SAYS[k]);
  if (photosChanged) parts.push("the photos");
  if (!parts.length) return "nothing an installer reads changed";
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `${list} changed`;
}
