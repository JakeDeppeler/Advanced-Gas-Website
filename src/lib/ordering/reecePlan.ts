// A Reece order turned into maX orders: one per job, as the office enters
// them by hand (Jake, 2 Nov), each line by Reece's product number. Pure, so it
// can be checked without Reece; reeceSend.ts does the talking.
//
// The product number comes from the vendor part number on the item's Reece
// vendor in the ServiceTitan pricebook (127 of 144 recent lines had one, all
// seven digits). Reece wants a unit of measure and a price with every line;
// the unit comes from Reece's own product search, and the price it sends back
// is replaced by ours from the home branch, so ours is only a placeholder.

export type PlanLine = {
  id: number;
  job_id: number | null;
  job_number: string | null;
  customer_name: string | null;
  install_date: string | null;
  sku_name: string | null;
  supplier_model?: string | null;
  description: string | null;
  supplier_part?: string | null;
  qty: number;
  unit_cost: number | null;
};

/** What Reece's search says about a product: the unit it's sold in, and our price. */
export type ReeceUnit = { uom: string; ex: number | null; inc: number | null };

export type JobProduct = { productId: number; quantity: number; unitOfMeasure: string; unitPriceExcludingGst: number; unitPriceIncludingGst: number; name: string; lineIds: number[] };
export type JobOrder = {
  /** "job:<id>", or "stock" for lines with no job. */
  key: string;
  jobNumber: string | null;
  customer: string | null;
  install: string | null;
  products: JobProduct[];
  /** Lines that can't go: no Reece number, or Reece doesn't list it. */
  problems: { lineIds: number[]; name: string; why: string }[];
};

/** Reece's product numbers are whole numbers, seven digits on every line seen. */
export function productId(part: string | null | undefined): number | null {
  const t = (part ?? "").trim();
  return /^\d{4,9}$/.test(t) ? Number(t) : null;
}

const name = (l: PlanLine) => (l.supplier_model || l.sku_name || l.description || "Item").trim();
const money = (n: number) => Math.round(n * 100) / 100;

/**
 * Lines grouped into one order per job, soonest install first. A product on
 * two lines of the same job is one line to Reece with the quantities added.
 * Quantities keep their decimals (Reece takes two places: half a coil is 0.5).
 */
export function planJobs(lines: PlanLine[], units: Map<number, ReeceUnit | null>): JobOrder[] {
  const jobs = new Map<string, JobOrder>();
  for (const l of lines) {
    const key = l.job_id == null ? "stock" : `job:${l.job_id}`;
    let j = jobs.get(key);
    if (!j) {
      j = { key, jobNumber: l.job_number, customer: l.customer_name, install: l.install_date, products: [], problems: [] };
      jobs.set(key, j);
    }
    if (l.install_date && (!j.install || l.install_date < j.install)) j.install = l.install_date;
    const id = productId(l.supplier_part);
    if (id == null) {
      j.problems.push({ lineIds: [l.id], name: name(l), why: "no Reece product number on it in the ServiceTitan pricebook" });
      continue;
    }
    const u = units.get(id);
    if (!u) {
      j.problems.push({ lineIds: [l.id], name: name(l), why: `Reece doesn't list product ${id}` });
      continue;
    }
    if (!(l.qty > 0)) {
      j.problems.push({ lineIds: [l.id], name: name(l), why: "no quantity" });
      continue;
    }
    const same = j.products.find((p) => p.productId === id);
    if (same) {
      same.quantity = money(same.quantity + l.qty);
      same.lineIds.push(l.id);
      continue;
    }
    const ex = u.ex ?? l.unit_cost ?? 0;
    j.products.push({
      productId: id,
      quantity: money(l.qty),
      unitOfMeasure: u.uom,
      unitPriceExcludingGst: money(ex),
      unitPriceIncludingGst: money(u.inc ?? ex * 1.1),
      name: name(l),
      lineIds: [l.id],
    });
  }
  return [...jobs.values()].sort((a, b) => (a.key === "stock" ? 1 : b.key === "stock" ? -1 : (a.install ?? "9").localeCompare(b.install ?? "9")));
}

/**
 * What would be ordered, as a string: the place button only goes ahead if
 * the order is still exactly what was shown, so a sync between looking and
 * pressing can't change what's bought.
 */
export function fingerprint(jobs: JobOrder[]): string {
  return jobs
    .filter((j) => j.products.length)
    .map((j) => `${j.key}=${j.products.map((p) => `${p.productId}x${p.quantity}${p.unitOfMeasure}`).sort().join(",")}`)
    .join(";");
}

export type ReeceAddress = { addressLine1: string; addressLine2?: string; suburb: string; state: string; postcode: number };

/**
 * "1 Sierra Circuit, Pakenham VIC 3810" → Reece's address parts. The street
 * part goes in line 1 (up to two lines of 40), the last part must end in a
 * state and postcode. Anything else isn't guessed at: null, and the order
 * says the address needs fixing.
 */
export function parseAddress(s: string | null | undefined): ReeceAddress | null {
  const t = (s ?? "").replace(/\s+/g, " ").replace(/,?\s*Australia$/i, "").trim();
  const m = t.match(/^(.+?),\s*([A-Za-z][A-Za-z .'-]*?)\s*,?\s+(VIC|NSW|QLD|SA|WA|TAS|ACT|NT)\s+(\d{4})$/i);
  if (!m) return null;
  const parts = m[1].split(",").map((x) => x.trim()).filter(Boolean);
  const line1 = parts.shift() ?? "";
  const line2 = parts.join(", ");
  if (!line1 || line1.length > 40 || line2.length > 40) return null;
  return { addressLine1: line1, ...(line2 ? { addressLine2: line2 } : {}), suburb: m[2].trim().slice(0, 40), state: m[3].toUpperCase(), postcode: Number(m[4]) };
}

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * When Reece should have it there, in Melbourne time as Reece wants it
 * (yyyy-MM-ddTHH:mm:ss): 7 am the day before the install, or the office's own
 * deliver-by day if set, a weekend moved back to the Friday, never earlier
 * than 7 am tomorrow, as Reece refuses a time that's passed.
 */
export function requiredBy(install: string | null, deliverBy: string | null, today: string): string {
  const tomorrow = addDays(today, 1);
  let day = deliverBy || (install ? addDays(install, -1) : tomorrow);
  // The day before a Monday install is a Sunday: Friday instead, as the
  // office would ask. The office's own deliver-by day is left as they set it.
  if (!deliverBy) {
    const dow = new Date(`${day}T12:00:00Z`).getUTCDay();
    if (dow === 0) day = addDays(day, -2);
    else if (dow === 6) day = addDays(day, -1);
  }
  if (day < tomorrow) day = tomorrow;
  return `${day}T07:00:00`;
}

/** Reece's refusals (400) carry a list of violations: just their words. */
export function reeceViolations(body: string): string[] {
  try {
    const v = (JSON.parse(body) as { violations?: { message?: string; fieldName?: string }[] }).violations ?? [];
    return v.map((x) => [x.fieldName, x.message].filter(Boolean).join(": ")).filter(Boolean).slice(0, 6);
  } catch {
    return [];
  }
}
