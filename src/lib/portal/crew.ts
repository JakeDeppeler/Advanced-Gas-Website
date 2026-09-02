/**
 * The crew costing model — shared by the Team grouping, the Billable capacity
 * tool and the Job calculator so they all price off the same numbers.
 *
 * Each person has a LEVEL (what they do) and COSTING (their hours, wage and the
 * time you can't bill). From that, plus the business-wide settings, we work out
 * billable hours, the overhead stack, and a per-person charge-out rate — a
 * tradesman prices higher than an apprentice, and the shared overhead (office
 * staff, vehicles, tools/marketing) is spread evenly across everyone's billable
 * hours. Pure and dependency-free.
 */

import type { Cap } from "./caps";

export type CrewLevel = "operations" | "lead" | "tradesman" | "hybrid" | "apprentice" | "office" | "admin";

export type Costing = {
  wage: number;
  hrsWeek: number;
  leaveDays: number;
  phDays: number;
  sickDays: number;
  schoolDays: number;
  travelHrsWeek: number;
  adminHrsWeek: number;
  officeHrsWeek: number;
  rateOverride?: number | null;
};

export type CapSettings = { weeksYear: number; oncosts: number; margin: number; vehicles: number; standard: number };

export const DEFAULT_SETTINGS: CapSettings = { weeksYear: 52, oncosts: 25, margin: 40, vehicles: 24000, standard: 60000 };

export const CREW_LEVELS: {
  key: CrewLevel; label: string; billable: boolean; blurb: string; defaults: Costing;
}[] = [
  { key: "operations", label: "Operations", billable: false, blurb: "Runs the business day to day. Full access to everything.",
    defaults: { wage: 60, hrsWeek: 38, leaveDays: 20, phDays: 11, sickDays: 5, schoolDays: 0, travelHrsWeek: 0, adminHrsWeek: 0, officeHrsWeek: 38 } },
  { key: "lead", label: "Lead hand", billable: true, blurb: "Runs jobs on the tools plus some supervision and office time.",
    defaults: { wage: 55, hrsWeek: 38, leaveDays: 20, phDays: 11, sickDays: 5, schoolDays: 0, travelHrsWeek: 4, adminHrsWeek: 5, officeHrsWeek: 3 } },
  { key: "tradesman", label: "Tradesman", billable: true, blurb: "Fully-qualified, on the tools and billable most of the week.",
    defaults: { wage: 45, hrsWeek: 38, leaveDays: 20, phDays: 11, sickDays: 5, schoolDays: 0, travelHrsWeek: 5, adminHrsWeek: 2, officeHrsWeek: 0 } },
  { key: "hybrid", label: "Hybrid (field + office)", billable: true, blurb: "Splits the week between the tools and the office.",
    defaults: { wage: 45, hrsWeek: 38, leaveDays: 20, phDays: 11, sickDays: 5, schoolDays: 0, travelHrsWeek: 3, adminHrsWeek: 3, officeHrsWeek: 15 } },
  { key: "apprentice", label: "Apprentice", billable: true, blurb: "On the tools and learning, with trade-school days off.",
    defaults: { wage: 22, hrsWeek: 38, leaveDays: 20, phDays: 11, sickDays: 6, schoolDays: 40, travelHrsWeek: 4, adminHrsWeek: 1, officeHrsWeek: 0 } },
  { key: "office", label: "Office", billable: false, blurb: "Scheduling, reception and keeping jobs moving. Not billable.",
    defaults: { wage: 35, hrsWeek: 38, leaveDays: 20, phDays: 11, sickDays: 6, schoolDays: 0, travelHrsWeek: 0, adminHrsWeek: 0, officeHrsWeek: 38 } },
  { key: "admin", label: "Admin", billable: false, blurb: "Accounts, compliance and the paperwork behind the business. Not billable.",
    defaults: { wage: 38, hrsWeek: 38, leaveDays: 20, phDays: 11, sickDays: 6, schoolDays: 0, travelHrsWeek: 0, adminHrsWeek: 0, officeHrsWeek: 38 } },
];

export const LEVEL_LABEL: Record<CrewLevel, string> = CREW_LEVELS.reduce((m, l) => { m[l.key] = l.label; return m; }, {} as Record<CrewLevel, string>);
export const LEVEL_BILLABLE: Record<CrewLevel, boolean> = CREW_LEVELS.reduce((m, l) => { m[l.key] = l.billable; return m; }, {} as Record<CrewLevel, boolean>);

export function isCrewLevel(v: unknown): v is CrewLevel {
  return typeof v === "string" && CREW_LEVELS.some((l) => l.key === v);
}

/**
 * What each crew level can see and do. This is the default; admins can change
 * it in Admin → Access levels (stored in settings) and a per-person override
 * still beats it.
 */
export type AccessMap = Record<CrewLevel, Cap[]>;

export const DEFAULT_ACCESS: AccessMap = {
  operations: ["overhead", "manage_users", "reports_read", "reports_write", "vehicles"],
  admin: ["overhead", "reports_read", "reports_write", "vehicles"],
  lead: ["reports_read", "reports_write", "vehicles"],
  hybrid: ["vehicles"],
  office: ["vehicles"],
  tradesman: [],
  apprentice: [],
};

export function defaultsFor(level: CrewLevel): Costing {
  return { ...(CREW_LEVELS.find((l) => l.key === level)?.defaults ?? CREW_LEVELS[1].defaults) };
}

export type PersonCosted = {
  paidHrs: number; billHrs: number; wageCost: number; fieldWages: number; labourOh: number; officeOh: number; billable: boolean;
};

export function calcPerson(level: CrewLevel, c: Costing, s: CapSettings): PersonCosted {
  const rate = c.wage * (1 + s.oncosts / 100);
  const paidHrs = c.hrsWeek * s.weeksYear;
  const wageCost = paidHrs * rate;
  if (!LEVEL_BILLABLE[level]) {
    return { paidHrs, billHrs: 0, wageCost, fieldWages: 0, labourOh: 0, officeOh: wageCost, billable: false };
  }
  const hrsPerDay = c.hrsWeek / 5;
  const daysOffHrs = (c.leaveDays + c.phDays + c.sickDays + c.schoolDays) * hrsPerDay;
  const travelAdminHrs = (c.travelHrsWeek + c.adminHrsWeek) * s.weeksYear;
  const officeHrs = Math.min(c.officeHrsWeek * s.weeksYear, Math.max(0, paidHrs - daysOffHrs));
  const billHrs = Math.max(0, paidHrs - daysOffHrs - travelAdminHrs - officeHrs);
  return { paidHrs, billHrs, wageCost, fieldWages: billHrs * rate, labourOh: (daysOffHrs + travelAdminHrs) * rate, officeOh: officeHrs * rate, billable: true };
}

export type CrewMember = { id: string; name: string; level: CrewLevel; costing: Costing };

export function computeCapacity(people: CrewMember[], s: CapSettings) {
  const per = people.map((p) => ({ p, c: calcPerson(p.level, p.costing, s) }));
  const totalBillHrs = per.reduce((a, x) => a + x.c.billHrs, 0);
  const fieldWages = per.reduce((a, x) => a + x.c.fieldWages, 0);
  const labourOh = per.reduce((a, x) => a + x.c.labourOh, 0);
  const officeOh = per.reduce((a, x) => a + x.c.officeOh, 0);
  const paidBillHrs = per.reduce((a, x) => a + (x.c.billable ? x.c.paidHrs : 0), 0);
  const denom = totalBillHrs || 1;
  // Overhead is everything except the crew's billable-time wages — that
  // includes their non-billable time (sick, school, travel, admin), office
  // staff, vehicles and standard — spread evenly across the billable hours.
  const sharedOverhead = labourOh + officeOh + s.vehicles + s.standard;
  const sharedPerHr = sharedOverhead / denom;
  const totalCost = fieldWages + sharedOverhead;
  const costPerHr = totalCost / denom;

  const rates = per.map(({ p, c }) => {
    if (!c.billable || c.billHrs <= 0) return { id: p.id, billHrs: c.billHrs, autoRate: null as number | null, rate: null as number | null };
    const labourPerHr = p.costing.wage * (1 + s.oncosts / 100); // just their pay rate; downtime is overhead
    const autoRate = (labourPerHr + sharedPerHr) * (1 + s.margin / 100);
    const rate = p.costing.rateOverride != null ? p.costing.rateOverride : autoRate;
    return { id: p.id, billHrs: c.billHrs, autoRate, rate };
  });

  const layers = [
    { key: "wages", label: "Labour — field wages (billable)", annual: fieldWages },
    { key: "labour", label: "Overhead — downtime (sick, school, travel, admin)", annual: labourOh },
    { key: "office", label: "Overhead — office & admin staff", annual: officeOh },
    { key: "vehicles", label: "Overhead — vehicles", annual: s.vehicles },
    { key: "standard", label: "Overhead — standard (tools, marketing…)", annual: s.standard },
  ].map((l) => ({ ...l, perHr: l.annual / denom }));

  return { totalBillHrs, paidBillHrs, fieldWages, labourOh, officeOh, sharedOverhead, sharedPerHr, totalCost, costPerHr, layers, rates, per };
}
