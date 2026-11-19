// The one price on a quote or invoice (Jake, 19 Nov): labour, materials and
// the electrical work under one line, priced at what they came to together,
// with the equipment, the compliance certificate and the rebates left as they
// are. Pure, so scripts/check-jobwrite.ts can run it on fixture documents.
//
// Nothing is taken off the document. Job profit reads each invoice line's
// cost (dashboard/jobProfit.ts), and the sold hours on each labour line stand
// in for timesheets where there are none, so a materials line deleted would
// take its cost with it and make the job look better than it was. Instead the
// main labour line takes the combined price and the others go to $0, keeping
// their quantity, cost and hours. The total doesn't move, and the plan says
// so before anything is written.

export type LineType = "Equipment" | "Material" | "Service" | "PriceModifier" | string;

/** One line on a quote or invoice, as both read from ServiceTitan. */
export type DocLine = {
  id: number;
  skuId: number | null;
  /** The pricebook code, e.g. AC-DUCTED-2DAYS. */
  code: string;
  /** What the line is called on the document. */
  name: string;
  type: LineType;
  qty: number;
  unitPrice: number;
  total: number;
  unitCost: number;
  chargeable: boolean | null;
  description: string;
  /** Estimates only: the group a line sits in, sent back unchanged. */
  itemGroupName?: string | null;
  itemGroupRootId?: number | null;
  isAddOn?: boolean | null;
};

export type DocKind = "estimate" | "invoice";

export type Doc = {
  kind: DocKind;
  id: number;
  /** The quote's name, or the invoice number. */
  name: string | null;
  status: string | null;
  summary: string | null;
  lines: DocLine[];
  /** Invoices: sent to the accounts, where a line change wouldn't follow it. */
  exported?: boolean;
  soldOn?: string | null;
};

export type Role = "equipment" | "labour" | "materials" | "electrical" | "certificate" | "rebate" | "other";

export const ROLE_WORD: Record<Role, string> = {
  equipment: "Equipment",
  labour: "Labour",
  materials: "Materials",
  electrical: "Electrical",
  certificate: "Certificate",
  rebate: "Rebate or discount",
  other: "Kept as it is",
};

const REBATE = /^rebate|rebate|discount|deposit|\bstc\b|veec|solar victoria|card fee/i;
const CERT = /\bbpc\b|compliance|certificate|permit/i;
const ELECTRICAL = /(^|[-\s])elec?($|[-\s])|electric(al|ian)|\brcbo\b|circuit|isolator|power point/i;

/** What a line is, for the one price. Rebates and the compliance certificate keep their own lines. */
export function roleOf(l: Pick<DocLine, "code" | "name" | "type" | "total">): Role {
  const words = `${l.code} ${l.name}`;
  if (l.total < 0 || REBATE.test(words)) return "rebate";
  if (l.type === "PriceModifier") return "rebate";
  if (CERT.test(words)) return "certificate";
  if (l.type === "Equipment") return "equipment";
  if ((l.type === "Service" || l.type === "Material") && ELECTRICAL.test(words)) return "electrical";
  if (l.type === "Material") return "materials";
  if (l.type === "Service") return "labour";
  return "other";
}

const MERGED: Role[] = ["labour", "materials", "electrical"];
const cents = (n: number) => Math.round(n * 100) / 100;

export type PlanLine = DocLine & { role: Role; merged: boolean; newUnitPrice: number; newTotal: number; target: boolean };

export type Plan = {
  kind: DocKind;
  lines: PlanLine[];
  /** The labour line that carries the one price, if there is one. */
  target: PlanLine | null;
  /** Labour, materials and electrical together, as priced now. */
  combined: number;
  /** What each of the three came to before, for the page to show where the price came from. */
  parts: { labour: number; materials: number; electrical: number };
  before: number;
  after: number;
  /** Lines whose price moves. */
  changes: number;
  /** Why it can't be done as it stands; empty when it can. */
  blockers: string[];
};

const sum = (xs: number[]) => cents(xs.reduce((n, x) => n + x, 0));

/**
 * The plan for one document. The labour line that carries the price is the
 * dearest labour line (the install itself), and it must be quantity 1, or
 * the combined price wouldn't divide back into whole cents.
 */
export function planOnePrice(doc: Pick<Doc, "kind" | "lines" | "exported">): Plan {
  const lines = doc.lines.map((l) => ({ ...l, role: roleOf(l) }));
  const merged = lines.filter((l) => MERGED.includes(l.role));
  const labour = merged.filter((l) => l.role === "labour").sort((a, b) => b.total - a.total || a.id - b.id);
  const target = labour[0] ?? null;
  const combined = sum(merged.map((l) => l.total));
  const blockers: string[] = [];
  if (!target) blockers.push("There's no labour line to carry the one price.");
  else if (target.qty !== 1) blockers.push(`The main labour line (${target.name}) is quantity ${target.qty}, so the price can't sit on it as one figure.`);
  if (doc.kind === "invoice" && doc.exported) blockers.push("This invoice has gone to the accounts, so its lines can't change here: the change wouldn't reach Xero.");
  if (merged.some((l) => l.qty <= 0 && l.total !== 0)) blockers.push("A line has a price with no quantity; that needs fixing in ServiceTitan first.");

  const ok = !blockers.length && target != null;
  const out: PlanLine[] = lines.map((l) => {
    const isTarget = ok && l.id === target!.id;
    const isMerged = ok && MERGED.includes(l.role);
    const newUnitPrice = isTarget ? combined : isMerged ? 0 : l.unitPrice;
    const newTotal = isTarget ? combined : isMerged ? 0 : l.total;
    return { ...l, merged: isMerged, target: isTarget, newUnitPrice, newTotal };
  });
  const before = sum(lines.map((l) => l.total));
  const after = sum(out.map((l) => l.newTotal));
  if (ok && Math.abs(after - before) > 0.005) blockers.push(`The total would move from ${before} to ${after}; nothing is changed.`);
  return {
    kind: doc.kind,
    lines: out,
    target: ok ? out.find((l) => l.target) ?? null : null,
    combined,
    parts: {
      labour: sum(merged.filter((l) => l.role === "labour").map((l) => l.total)),
      materials: sum(merged.filter((l) => l.role === "materials").map((l) => l.total)),
      electrical: sum(merged.filter((l) => l.role === "electrical").map((l) => l.total)),
    },
    before,
    after,
    changes: ok ? out.filter((l) => l.newUnitPrice !== l.unitPrice).length : 0,
    blockers,
  };
}

/** Already one price: nothing but the target line carries a merged price. */
export const alreadyOnePrice = (p: Plan) => p.target != null && p.changes === 0;

/**
 * The words on the labour line that carries the one price (Jake, 19 Nov, on
 * job 20900: "because we have covered everything in the job summary, the
 * Split System - Roof Bracket needs to be more simple, like: All labour,
 * materials and standard electrical works required to complete the works
 * described in the Job Summary"). A fixed sentence, not written by Claude, so
 * it reads the same on every quote; it names only what the document has: the
 * electrical work only where there's an electrical line, materials only where
 * there are materials.
 */
export function labourLine(p: Pick<Plan, "lines" | "target"> | null): string {
  const has = (r: Role) => (p?.lines ?? []).some((l) => l.role === r && l.qty > 0);
  // The electrical is in the one price when it merges into it, or is $0
  // already; priced on a line of its own that stays, it isn't the labour
  // line's to claim (the templates' rule, pricebook/wording.ts labourCopy).
  const elec = (p?.lines ?? []).filter((l) => l.role === "electrical" && l.qty > 0);
  const elecIn = elec.length > 0 && (p?.target != null || elec.every((l) => l.total === 0));
  const parts = ["labour", has("materials") ? "materials" : null, elecIn ? "standard electrical works" : null].filter(Boolean) as string[];
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
  return `All ${list} required to complete the works described in the Job Summary.`;
}
