// What an install pack says, worked out from the facts about one install job.
// Pure — no database, no network — so scripts/check-installpack.ts can run it
// against a fixture taken from a live job, and the PDF and the "what changed"
// note both read the same answer.
//
// Nothing here is written in our own words about the job. The scope is the
// job's own summary, the lists are the sold quote's lines, and the ordering
// status is what Supply › Next week recorded. A pack that paraphrased either
// could tell an installer something nobody asked for.
//
// The scope is the job summary and not the quote's (Jake, 31 Oct): the quote
// is written to sell the job to the customer, the job summary is what the
// office wrote for whoever does it.

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
  /**
   * The sold quote, or null for an install booked without one: the pack still
   * goes on, with the job summary, the site and the photos, and no lists.
   * fromJob: the quote job's number, when the quote was written on another job (the quote visit).
   */
  quote: { id: number; name: string | null; fromJob: string | null; soldOn: string | null } | null;
  jobSummary: string | null;
  items: QuoteItem[];
  orders: OrderLine[];
};

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
    units: fitted.filter((i) => i.type === "Equipment").map(line),
    materials: fitted.filter((i) => i.type === "Material").map(line),
    contractors,
    scope: plainText(f.jobSummary),
    quoted: f.quote != null,
  };
}

/* ------------------------------------------------------------ what changed */

export type PackParts = Record<"layout" | "booking" | "crew" | "contact" | "scope" | "quote" | "orders", string>;

/**
 * Bumped when the PDF's design changes, so every pack still to be used is
 * made again in the new look. 2: the branded layout of 28 Oct. 3: the same
 * day's boxed sections, with the scope under the site. 4: the notes on the
 * job moved up under the scope. 5: the plain style, full logo on white.
 * 6: contractors under the notes, the quote's labour lines left off.
 * 7: the scope is the job summary, not the quote's; the notes section goes.
 */
export const LAYOUT = "7";

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
    booking: hash(p.facts.find(([k]) => k === "Booked")?.[1] ?? ""),
    crew: hash(p.facts.find(([k]) => k === "Crew")?.[1] ?? ""),
    contact: hash([f.siteAddress, f.sitePhone, f.customer]),
    scope: hash(p.scope ?? ""),
    quote: hash([f.quote?.id ?? null, p.units.map((l) => [l.qty, l.name]), p.materials.map((l) => [l.qty, l.name])]),
    // From the orders themselves, not the wording, so rewording the PDF never
    // looks like an order changing.
    orders: hash(f.orders.map((o) => [o.skuId, o.po, o.status, o.pickup, o.kind]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))),
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
