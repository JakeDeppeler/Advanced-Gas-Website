/**
 * One person's billable hour, as a bill: every dollar in it under a name the
 * crew would use — their wage, super, WorkCover, their own leave, the van, the
 * tools, the marketing that keeps them busy, the office behind them — then the
 * margin.
 *
 * It splits the same costPerHr computeCapacity gives that person, so the lines
 * always add back to the rate quoted everywhere else. Pure.
 */
import {
  assumptionsFor, computeCapacity, fleetDepOf, loadedWage, officeCost, onCostsOf, overheadFields, overheadLines,
  type CapSettings, type CrewMember,
} from "./crew";

export type BillFamily = "pay" | "off" | "van" | "kit" | "office";

export const BILL_FAMILIES: Array<{ key: BillFamily; label: string }> = [
  { key: "pay", label: "Their pay" },
  { key: "off", label: "Paid time off the tools" },
  { key: "van", label: "The van" },
  { key: "kit", label: "Kit, training & work coming in" },
  { key: "office", label: "The office behind them" },
];

export type BillLine = {
  key: string; label: string; family: BillFamily; perHr: number;
  /** For paid time off the tools: the hours a year it is, and as days where it's counted in days. */
  hrs?: number; days?: number;
};

/** Which overhead line goes on which line of the bill. Anything not named is office & admin. */
export const LINE_OF: Record<string, string> = {
  toolReplace: "tools", toolTest: "tools", toolConsumables: "tools", toolHire: "tools", insTools: "tools",
  admUniform: "uniform",
  admTraining: "training", insLicences: "training", insMemberships: "training",
  mktPaid: "marketing", mktWeb: "marketing", mktSignage: "marketing", mktPrint: "marketing", mktLeads: "marketing",
  vehRego: "vanRun", vehInsurance: "vanRun", vehFuel: "vanRun", vehService: "vanRun", vehOther: "vanRun",
  vehDep: "vehicle", vehFinance: "vehicle",
};

/** A line added by hand goes on the bill by the group it was added under. */
const GROUP_LINE: Record<string, string> = { vehicles: "vanRun", tools: "tools", marketing: "marketing", staff: "officeStaff" };
export const lineOf = (s: CapSettings, key: string): string =>
  LINE_OF[key] ?? GROUP_LINE[(s.extraLines ?? []).find((x) => x.id === key)?.group ?? ""] ?? "admin";

export const BILL_LINES: Array<{ key: string; label: string; family: BillFamily; note?: string }> = [
  { key: "wage", label: "Wage", family: "pay" },
  { key: "super", label: "Super", family: "pay" },
  { key: "workcover", label: "WorkCover", family: "pay" },
  { key: "lsl", label: "Long service leave", family: "pay", note: "put aside as they earn it" },
  { key: "scheme", label: "Less the government apprentice incentive", family: "pay", note: "Xero's Apprentice Scheme income, over their own billable hours" },
  { key: "annual", label: "Annual leave", family: "off" },
  { key: "ph", label: "Public holidays", family: "off" },
  { key: "sick", label: "Sick days", family: "off" },
  { key: "rdo", label: "RDOs", family: "off" },
  { key: "school", label: "Trade school", family: "off", note: "apprentices" },
  { key: "travel", label: "Driving between jobs", family: "off" },
  { key: "paperwork", label: "Paperwork between jobs", family: "off" },
  { key: "callbacks", label: "Going back to fix our own work", family: "off", note: "call-backs" },
  { key: "vanRun", label: "Van running costs", family: "van", note: "fuel, servicing, rego, insurance, tolls" },
  { key: "vehicle", label: "The vehicle", family: "van", note: "depreciation and finance" },
  { key: "tools", label: "Tools", family: "kit" },
  { key: "uniform", label: "Uniform & PPE", family: "kit" },
  { key: "training", label: "Training & licences", family: "kit", note: "the business's courses and tickets" },
  { key: "schoolFees", label: "Their trade-school fees", family: "kit", note: "from their card, over their own billable hours" },
  { key: "marketing", label: "Marketing", family: "kit", note: "what keeps them busy" },
  { key: "officeStaff", label: "Office support", family: "office", note: "the wages of the people not on the tools" },
  { key: "admin", label: "Rent, insurance & admin", family: "office", note: "the yard, software, phones, accountant, bank" },
];

export type PersonBill = {
  id: string; name: string;
  lines: BillLine[];
  cost: number; charge: number; billHrs: number;
  /** True when the charge is a figure set by hand rather than worked out. */
  override: boolean;
};

export function personBills(people: CrewMember[], s: CapSettings, cap = computeCapacity(people, s)): PersonBill[] {
  const H = cap.totalBillHrs;
  if (H <= 0) return [];
  const oc = onCostsOf(s);
  const m = assumptionsFor(s);

  // The business's share of an hour, line by line. With the overhead kept as one
  // figure there is nothing to split, so it all sits under rent & admin.
  const shared: Record<string, number> = { officeStaff: cap.officeOh / H };
  if (s.ohSource === "internal") {
    shared.vehicle = (s.fleetDep ?? 0) / H;
    shared.admin = ((Number(s.internalOverhead) || 0) - cap.feesMoved) / H;
  } else {
    for (const [k, v] of Object.entries(overheadLines(s))) {
      const to = lineOf(s, k);
      shared[to] = (shared[to] ?? 0) + (Number(v) || 0) / H;
    }
    // The school fees that moved onto the apprentices came off this line.
    shared.training = (shared.training ?? 0) - cap.feesMoved / H;
  }

  return cap.rates
    .filter((r) => r.costPerHr != null && r.billHrs > 0)
    .map((r) => {
      const p = people.find((x) => x.id === r.id)!;
      const c = p.costing;
      const rate = loadedWage(c.wage, s);
      const hpd = c.hrsWeek / 5;
      // Their own paid hours off the tools, worked out exactly as calcPerson
      // does, so the lines add back to the rate.
      const paid = c.hrsWeek * s.weeksYear;
      const off = { annual: c.leaveDays * hpd, ph: c.phDays * hpd, sick: c.sickDays * hpd, rdo: c.rdoDays * hpd, school: c.schoolDays * hpd };
      const offTotal = Object.values(off).reduce((a, v) => a + v, 0);
      const travel = c.travelHrsWeek * (m.travelPct / 100) * s.weeksYear;
      const paperwork = c.adminHrsWeek * (m.adminPct / 100) * s.weeksYear;
      const officeHrs = Math.min(c.officeHrsWeek * s.weeksYear, Math.max(0, paid - offTotal));
      const beforeCb = Math.max(0, paid - offTotal - travel - paperwork - officeHrs);
      const callbacks = beforeCb * ((c.callbackPct ?? m.callbackPct ?? s.callbackPct ?? 0) / 100);
      const hrs: Record<string, number> = { ...off, travel, paperwork, callbacks };
      const days: Record<string, number> = { annual: c.leaveDays, ph: c.phDays, sick: c.sickDays, rdo: c.rdoDays, school: c.schoolDays };
      const v: Record<string, number> = {
        wage: c.wage,
        super: (c.wage * oc.superPct) / 100,
        workcover: (c.wage * oc.workcoverPct) / 100,
        lsl: (c.wage * oc.lslPct) / 100,
        ...Object.fromEntries(Object.entries(hrs).map(([k, h]) => [k, (h * rate) / r.billHrs])),
        ...shared,
        schoolFees: (Math.max(0, Number(s.schoolFees?.[p.id]) || 0)) / r.billHrs,
        scheme: -(Math.max(0, Number(s.apprenticeScheme?.[p.id]) || 0)) / r.billHrs,
      };
      const lines = BILL_LINES.map((l) => ({ key: l.key, label: l.label, family: l.family, perHr: v[l.key] ?? 0, hrs: hrs[l.key], days: days[l.key] }));
      return {
        id: p.id, name: p.name, lines,
        cost: r.costPerHr as number,
        charge: r.rate as number,
        billHrs: r.billHrs,
        override: c.rateOverride != null,
      };
    });
}


/**
 * What the business spends in a year, in seven plain buckets that add up to
 * exactly what computeCapacity says the year costs — the figure every hourly
 * rate is that year divided by the hours the crew can bill.
 */
export function yearSpend(s: CapSettings, cap: ReturnType<typeof computeCapacity>): Array<{ key: string; label: string; note: string; annual: number }> {
  const b: Record<string, number> = { vans: 0, kit: 0, marketing: 0, admin: 0 };
  if (s.ohSource === "internal") {
    b.vans += s.fleetDep ?? 0;
    b.admin += Number(s.internalOverhead) || 0;
  } else {
    for (const [k, v] of Object.entries(overheadLines(s))) {
      const line = lineOf(s, k);
      const to = line === "vanRun" || line === "vehicle" ? "vans" : line === "marketing" ? "marketing" : line === "admin" || line === "officeStaff" ? "admin" : "kit";
      b[to] += Number(v) || 0;
    }
  }
  // School fees moved off the training line onto the apprentices: still spent,
  // still on kit and training — net of the government incentive.
  const ownFees = cap.sharedOverhead - cap.labourOh - cap.officeOh - cap.otherOverhead;
  if (s.ohSource === "internal") b.admin += ownFees - cap.feesMoved; else b.kit += ownFees - cap.feesMoved;
  return [
    { key: "tools", label: "Wages for time on the tools", note: "the hours a customer pays for", annual: cap.fieldWages },
    { key: "off", label: "Wages for time off the tools", note: "leave, holidays, sick days, RDOs, school, driving", annual: cap.labourOh },
    { key: "office", label: "Office staff", note: "everyone who doesn't go out on jobs", annual: cap.officeOh },
    { key: "vans", label: "The vans", note: "fuel, servicing, rego, insurance, depreciation", annual: b.vans },
    { key: "kit", label: "Tools, uniforms & training", note: "including school fees", annual: b.kit },
    { key: "marketing", label: "Marketing", note: "what keeps the phone ringing", annual: b.marketing },
    { key: "admin", label: "Rent, insurance & admin", note: "the yard, software, phones, accountant, bank", annual: b.admin },
  ].filter((x) => Math.abs(x.annual) > 0.5);
}


/**
 * What's inside each of yearSpend's buckets, line by line, so a bucket can be
 * opened to see what it covers. Built the same way yearSpend sorts the money,
 * so the lines in a bucket add back to the bucket.
 */
export function spendLines(s: CapSettings, cap: ReturnType<typeof computeCapacity>): Record<string, Array<{ label: string; annual: number }>> {
  const out: Record<string, Array<{ label: string; annual: number }>> = { tools: [], off: [], office: [], vans: [], kit: [], marketing: [], admin: [] };
  for (const { p, c } of cap.per) {
    if (c.fieldWages > 0.5) out.tools.push({ label: p.name, annual: c.fieldWages });
    if (c.labourOh > 0.5) out.off.push({ label: p.name, annual: c.labourOh });
  }
  const office = officeCost(cap);
  for (const r of office.rows) if (r.cost > 0.5) out.office.push({ label: r.name, annual: r.cost });
  if (cap.officeOh - office.total > 0.5) out.office.push({ label: "The crew's office hours", annual: cap.officeOh - office.total });
  if (s.ohSource === "internal") {
    out.admin.push({ label: "Overheads, kept as one figure", annual: Number(s.internalOverhead) || 0 });
    if (fleetDepOf(s) > 0) out.vans.push({ label: "Van depreciation, from the Vehicles tab", annual: fleetDepOf(s) });
  } else {
    const oh = overheadLines(s);
    const label = new Map(overheadFields(s).map((f) => [f.key, f.label]));
    for (const [k, v] of Object.entries(oh)) {
      const n = Number(v) || 0;
      if (Math.abs(n) <= 0.5) continue;
      const line = lineOf(s, k);
      const to = line === "vanRun" || line === "vehicle" ? "vans" : line === "marketing" ? "marketing" : line === "admin" || line === "officeStaff" ? "admin" : "kit";
      out[to].push({ label: k === "vehDep" && fleetDepOf(s) > 0 ? "Van depreciation, from the Vehicles tab" : label.get(k) ?? k, annual: n });
    }
  }
  const ownFees = cap.sharedOverhead - cap.labourOh - cap.officeOh - cap.otherOverhead;
  const fees = ownFees - cap.feesMoved;
  if (Math.abs(fees) > 0.5) out[s.ohSource === "internal" ? "admin" : "kit"].push({ label: "Trade-school fees on the apprentices, less the incentive and what came off training", annual: fees });
  for (const k of Object.keys(out)) out[k].sort((a, b) => b.annual - a.annual);
  return out;
}
