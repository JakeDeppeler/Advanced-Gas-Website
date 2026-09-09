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

export type CrewLevel = "operations" | "lead" | "tradesman" | "hybrid" | "apprentice" | "office" | "admin" | "adviser";

export type Costing = {
  wage: number;
  hrsWeek: number;
  leaveDays: number;
  phDays: number;
  sickDays: number;
  schoolDays: number;
  /** One RDO a month is the standard here — 12 a year, off the tools like leave. */
  rdoDays: number;
  travelHrsWeek: number;
  adminHrsWeek: number;
  officeHrsWeek: number;
  /**
   * Whether they can be sent out on their own. An apprentice with a tech is
   * still billable — the pair goes out at a higher rate than the tech alone —
   * so their hours count either way. This only says they never go solo, which
   * is why they never appear as a crew of one.
   */
  ownVan: boolean;
  /**
   * Overtime and night work as multipliers on the base rate, not dollar
   * figures — a wage rise carries through without being retyped, and the same
   * multiplier gives both what they're paid and what the job is charged.
   */
  otMult: number;
  nightMult: number;
  rateOverride?: number | null;
};

/* -------- Overheads, in detail -------- */

export const OVERHEAD_GROUPS = [
  { key: "vehicles", label: "Vehicles & running", blurb: "Everything it costs to keep the fleet on the road." },
  { key: "premises", label: "Premises", blurb: "The yard, the office and what it costs to keep them open." },
  { key: "insurance", label: "Insurance & compliance", blurb: "Cover, licences and the accreditations you can't trade without." },
  { key: "tools", label: "Tools & equipment", blurb: "Replacing, repairing and calibrating what the crew works with." },
  { key: "marketing", label: "Marketing & sales", blurb: "What it costs to keep the phone ringing." },
  { key: "admin", label: "Admin & software", blurb: "The back office, the systems and the fees." },
] as const;

export type OverheadGroup = (typeof OVERHEAD_GROUPS)[number]["key"];

/**
 * Whether a line grows when another van goes on the road.
 *
 * "fixed" is the factory, the office, the accountant, the marketing — put a
 * fourth van on and none of it moves. "perVan" is everything that arrives with
 * the van itself: its fuel, its servicing, its insurance, its tools, its phone.
 * The split is the whole reason another van makes the overhead on every hour
 * go down instead of up.
 */
export type OverheadScale = "fixed" | "perVan";

export const OVERHEAD_FIELDS: { key: string; group: OverheadGroup; label: string; hint?: string; scale: OverheadScale }[] = [
  { key: "vehRego", group: "vehicles", label: "Rego & CTP" , scale: "perVan" },
  { key: "vehInsurance", group: "vehicles", label: "Vehicle insurance" , scale: "perVan" },
  { key: "vehFuel", group: "vehicles", label: "Fuel" , scale: "perVan" },
  { key: "vehService", group: "vehicles", label: "Servicing, tyres & repairs" , scale: "perVan" },
  { key: "vehFinance", group: "vehicles", label: "Finance & lease payments" , scale: "perVan" },
  { key: "vehDep", group: "vehicles", label: "Depreciation", hint: "From the Vehicles tab" , scale: "perVan" },
  { key: "vehOther", group: "vehicles", label: "Everything else on the vehicles" , scale: "perVan" },

  { key: "premRent", group: "premises", label: "Rent or mortgage" , scale: "fixed" },
  { key: "premUtilities", group: "premises", label: "Power, water & gas" , scale: "fixed" },
  { key: "premWaste", group: "premises", label: "Waste & cleaning" , scale: "fixed" },
  { key: "premRepairs", group: "premises", label: "Repairs & maintenance" , scale: "fixed" },
  { key: "premSecurity", group: "premises", label: "Security & alarms" , scale: "fixed" },

  { key: "insLiability", group: "insurance", label: "Public liability" , scale: "fixed" },
  { key: "insWorkers", group: "insurance", label: "Workers compensation" , scale: "perVan" },
  { key: "insTools", group: "insurance", label: "Tool & plant cover" , scale: "perVan" },
  { key: "insLicences", group: "insurance", label: "Licences & registrations", hint: "ARC, plumbing, electrical" , scale: "perVan" },
  { key: "insMemberships", group: "insurance", label: "Memberships & accreditations" , scale: "fixed" },

  { key: "toolReplace", group: "tools", label: "Tool replacement & repairs" , scale: "perVan" },
  { key: "toolTest", group: "tools", label: "Test gear & calibration" , scale: "perVan" },
  { key: "toolConsumables", group: "tools", label: "Consumables not billed to jobs" , scale: "perVan" },
  { key: "toolHire", group: "tools", label: "Plant & equipment hire" , scale: "fixed" },

  { key: "mktPaid", group: "marketing", label: "Paid ads" , scale: "fixed" },
  { key: "mktWeb", group: "marketing", label: "Website & SEO" , scale: "fixed" },
  { key: "mktSignage", group: "marketing", label: "Signage & vehicle wraps" , scale: "fixed" },
  { key: "mktPrint", group: "marketing", label: "Print, merch & sponsorship" , scale: "fixed" },
  { key: "mktLeads", group: "marketing", label: "Lead & referral fees" , scale: "fixed" },

  { key: "admAccounting", group: "admin", label: "Accounting & bookkeeping" , scale: "fixed" },
  { key: "admSoftware", group: "admin", label: "Job & office software" , scale: "perVan" },
  { key: "admPhone", group: "admin", label: "Phones & internet" , scale: "perVan" },
  { key: "admBank", group: "admin", label: "Bank, merchant & finance fees" , scale: "fixed" },
  { key: "admTraining", group: "admin", label: "Training & courses" , scale: "perVan" },
  { key: "admTravel", group: "admin", label: "Travel, meals & accommodation" , scale: "perVan" },
  { key: "admStaff", group: "admin", label: "Staff amenities & functions" , scale: "fixed" },
  { key: "admUniform", group: "admin", label: "Uniforms & PPE" , scale: "perVan" },
  { key: "admOther", group: "admin", label: "Everything else" , scale: "fixed" },
];

export type CapSettings = {
  weeksYear: number; oncosts: number; margin: number;
  /** Kept so older saved settings still add up; superseded by `overheads`. */
  vehicles: number; standard: number;
  overheads?: Record<string, number>;
  /** Per-line overrides of whether a line grows with another van. */
  scales?: Record<string, OverheadScale>;
  /**
   * Which Xero expense account feeds which overhead line, keyed by the account
   * name Xero reports. The mapping is kept, but the resolved dollar figures are
   * written into `overheads` on save — so everything downstream reads one set
   * of numbers and never has to know Xero exists.
   */
  xeroMap?: Record<string, string>;
};

export const DEFAULT_SETTINGS: CapSettings = { weeksYear: 52, oncosts: 25, margin: 40, vehicles: 24000, standard: 60000 };

/**
 * The detailed overheads, seeding the two old catch-all figures into the
 * matching "everything else" lines the first time so nothing is lost and the
 * total doesn't move.
 */
export function overheadsOf(s: CapSettings): Record<string, number> {
  if (s.overheads) return s.overheads;
  return { vehOther: s.vehicles || 0, admOther: s.standard || 0 };
}

export function overheadTotal(s: CapSettings): number {
  return Object.values(overheadsOf(s)).reduce((a, v) => a + (Number(v) || 0), 0);
}

export function overheadByGroup(s: CapSettings): { key: OverheadGroup; label: string; annual: number }[] {
  const oh = overheadsOf(s);
  return OVERHEAD_GROUPS.map((g) => ({
    key: g.key,
    label: g.label,
    annual: OVERHEAD_FIELDS.filter((f) => f.group === g.key).reduce((a, f) => a + (Number(oh[f.key]) || 0), 0),
  }));
}

export const CREW_LEVELS: {
  key: CrewLevel; label: string; plural: string; billable: boolean; blurb: string; defaults: Costing;
}[] = [
  { key: "operations", label: "Operations", plural: "Operations staff", billable: false, blurb: "Runs the business day to day. Full access to everything.",
    defaults: { wage: 60, hrsWeek: 38, leaveDays: 20, phDays: 13, sickDays: 10, schoolDays: 0, rdoDays: 12, travelHrsWeek: 0, adminHrsWeek: 0, officeHrsWeek: 38, ownVan: false, otMult: 1.5, nightMult: 2 } },
  { key: "lead", label: "Lead hand", plural: "Lead hands", billable: true, blurb: "Runs jobs on the tools plus some supervision and office time.",
    defaults: { wage: 55, hrsWeek: 38, leaveDays: 20, phDays: 13, sickDays: 10, schoolDays: 0, rdoDays: 12, travelHrsWeek: 4, adminHrsWeek: 5, officeHrsWeek: 3, ownVan: true, otMult: 1.5, nightMult: 2 } },
  { key: "tradesman", label: "Tradesman", plural: "Tradesmen", billable: true, blurb: "Fully-qualified, on the tools and billable most of the week.",
    defaults: { wage: 45, hrsWeek: 38, leaveDays: 20, phDays: 13, sickDays: 10, schoolDays: 0, rdoDays: 12, travelHrsWeek: 5, adminHrsWeek: 2, officeHrsWeek: 0, ownVan: true, otMult: 1.5, nightMult: 2 } },
  { key: "hybrid", label: "Hybrid (field + office)", plural: "Hybrids", billable: true, blurb: "Splits the week between the tools and the office.",
    defaults: { wage: 45, hrsWeek: 38, leaveDays: 20, phDays: 13, sickDays: 10, schoolDays: 0, rdoDays: 12, travelHrsWeek: 3, adminHrsWeek: 3, officeHrsWeek: 15, ownVan: true, otMult: 1.5, nightMult: 2 } },
  { key: "apprentice", label: "Apprentice", plural: "Apprentices", billable: true, blurb: "On the tools and learning, with trade-school days off.",
    defaults: { wage: 22, hrsWeek: 38, leaveDays: 20, phDays: 13, sickDays: 10, schoolDays: 40, rdoDays: 12, travelHrsWeek: 4, adminHrsWeek: 1, officeHrsWeek: 0, ownVan: false, otMult: 1.5, nightMult: 2 } },
  { key: "office", label: "Office", plural: "Office staff", billable: false, blurb: "Scheduling, reception and keeping jobs moving. Not billable.",
    defaults: { wage: 35, hrsWeek: 38, leaveDays: 20, phDays: 13, sickDays: 10, schoolDays: 0, rdoDays: 12, travelHrsWeek: 0, adminHrsWeek: 0, officeHrsWeek: 38, ownVan: false, otMult: 1.5, nightMult: 2 } },
  { key: "adviser", label: "Finance adviser", plural: "Finance advisers", billable: false, blurb: "Outside adviser — accountant or bookkeeper. Sees the finance side and nothing else.",
    defaults: { wage: 0, hrsWeek: 0, leaveDays: 0, phDays: 0, sickDays: 0, schoolDays: 0, rdoDays: 0, travelHrsWeek: 0, adminHrsWeek: 0, officeHrsWeek: 0, ownVan: false, otMult: 1, nightMult: 1 } },
  { key: "admin", label: "Admin", plural: "Admin staff", billable: false, blurb: "Accounts, compliance and the paperwork behind the business. Not billable.",
    defaults: { wage: 38, hrsWeek: 38, leaveDays: 20, phDays: 13, sickDays: 10, schoolDays: 0, rdoDays: 12, travelHrsWeek: 0, adminHrsWeek: 0, officeHrsWeek: 38, ownVan: false, otMult: 1.5, nightMult: 2 } },
];

export const LEVEL_LABEL: Record<CrewLevel, string> = CREW_LEVELS.reduce((m, l) => { m[l.key] = l.label; return m; }, {} as Record<CrewLevel, string>);
export const LEVEL_PLURAL: Record<CrewLevel, string> = CREW_LEVELS.reduce((m, l) => { m[l.key] = l.plural; return m; }, {} as Record<CrewLevel, string>);
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
  // An outside adviser reads the money and nothing else — no team files, no
  // reports on people, no fleet.
  adviser: ["overhead"],
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
  paidHrs: number; billHrs: number; wageCost: number; fieldWages: number; labourOh: number; officeOh: number;
  /** Hours off that the law gives them — leave, sick, public holidays, RDOs, trade school. */
  legalHrs: number;
  /** Hours lost to travel, admin and office time. The part you can actually work on. */
  flexHrs: number;
  billable: boolean;
  /** Billable level — someone a customer pays for, alone or as part of a crew. */
  chargeable: boolean;
};

export function calcPerson(level: CrewLevel, c: Costing, s: CapSettings): PersonCosted {
  const rate = c.wage * (1 + s.oncosts / 100);
  const paidHrs = c.hrsWeek * s.weeksYear;
  const wageCost = paidHrs * rate;
  if (!LEVEL_BILLABLE[level]) {
    return { paidHrs, billHrs: 0, wageCost, fieldWages: 0, labourOh: 0, officeOh: wageCost, legalHrs: 0, flexHrs: 0, billable: false, chargeable: false };
  }
  const hrsPerDay = c.hrsWeek / 5;
  const daysOffHrs = (c.leaveDays + c.phDays + c.sickDays + c.schoolDays + c.rdoDays) * hrsPerDay;
  const travelAdminHrs = (c.travelHrsWeek + c.adminHrsWeek) * s.weeksYear;
  const officeHrs = Math.min(c.officeHrsWeek * s.weeksYear, Math.max(0, paidHrs - daysOffHrs));
  const billHrs = Math.max(0, paidHrs - daysOffHrs - travelAdminHrs - officeHrs);
  return {
    paidHrs, billHrs, wageCost, fieldWages: billHrs * rate,
    labourOh: (daysOffHrs + travelAdminHrs) * rate, officeOh: officeHrs * rate,
    legalHrs: daysOffHrs, flexHrs: travelAdminHrs + officeHrs,
    billable: true, chargeable: true,
  };
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
  const otherOverhead = overheadTotal(s);
  const sharedOverhead = labourOh + officeOh + otherOverhead;
  const sharedPerHr = sharedOverhead / denom;
  const totalCost = fieldWages + sharedOverhead;
  const costPerHr = totalCost / denom;

  const rates = per.map(({ p, c }) => {
    if (!c.billable || c.billHrs <= 0) {
      return { id: p.id, billHrs: c.billHrs, autoRate: null as number | null, rate: null as number | null, costPerHr: null as number | null };
    }
    const labourPerHr = p.costing.wage * (1 + s.oncosts / 100); // just their pay rate; downtime is overhead
    // What an hour of theirs actually costs the business: their pay plus the
    // share of everything else that hour has to carry.
    const costPerHr = labourPerHr + sharedPerHr;
    const autoRate = costPerHr * (1 + s.margin / 100);
    const rate = p.costing.rateOverride != null ? p.costing.rateOverride : autoRate;
    return { id: p.id, billHrs: c.billHrs, autoRate, rate, costPerHr };
  });

  // Two utilisations, because they mean different things. Leave, sick days,
  // public holidays, RDOs and trade school are entitlements — no amount of
  // scheduling changes them, so the ceiling is the honest best case. Travel,
  // admin and office time are the part that is actually in play.
  const legalHrs = per.reduce((a, x) => a + x.c.legalHrs, 0);
  const flexHrs = per.reduce((a, x) => a + x.c.flexHrs, 0);
  const util = {
    paidHrs: paidBillHrs,
    legalHrs,
    flexHrs,
    ceiling: paidBillHrs > 0 ? (paidBillHrs - legalHrs) / paidBillHrs : 0,
    actual: paidBillHrs > 0 ? totalBillHrs / paidBillHrs : 0,
    inPlay: paidBillHrs > 0 ? flexHrs / paidBillHrs : 0,
  };

  const layers = [
    { key: "wages", label: "Labour — field wages (billable)", annual: fieldWages },
    { key: "labour", label: "Overhead — downtime & crew riding along", annual: labourOh },
    { key: "office", label: "Overhead — office & admin staff", annual: officeOh },
    ...overheadByGroup(s).map((g) => ({ key: g.key, label: `Overhead — ${g.label.toLowerCase()}`, annual: g.annual })),
  ].filter((l) => l.annual > 0).map((l) => ({ ...l, perHr: l.annual / denom }));

  return { totalBillHrs, paidBillHrs, fieldWages, labourOh, officeOh, sharedOverhead, sharedPerHr, totalCost, costPerHr, layers, rates, per, util };
}


/* -------- What common crews charge out at -------- */

export type CrewCombo = { key: string; label: string; rate: number; note?: string };

/**
 * The charge-out rate for the crew shapes you actually send out.
 *
 * An apprentice is billable but never goes alone, so they show up as part of a
 * crew rather than as a crew of one — and that crew charges more than the tech
 * on his own, because there are two people on site doing the work.
 */
export function crewCombos(
  people: CrewMember[],
  rates: { id: string; rate: number | null }[],
): CrewCombo[] {
  const rateById = new Map(rates.map((r) => [r.id, r.rate]));
  const avg = (list: CrewMember[]) => {
    const vals = list.map((p) => rateById.get(p.id)).filter((r): r is number => r != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const billable = people.filter((p) => LEVEL_BILLABLE[p.level] && rateById.get(p.id) != null);
  const soloLevels = CREW_LEVELS.filter((l) => l.billable && billable.some((p) => p.level === l.key && p.costing.ownVan));
  const pairedLevels = CREW_LEVELS.filter((l) => l.billable && billable.some((p) => p.level === l.key && !p.costing.ownVan));

  const combos: CrewCombo[] = [];

  for (const l of soloLevels) {
    const r = avg(billable.filter((p) => p.level === l.key && p.costing.ownVan));
    if (r != null) combos.push({ key: `solo-${l.key}`, label: `${l.label} on their own`, rate: r });
  }

  // Whoever leads a job: the highest-charging level that can go out alone.
  const lead = combos.length ? combos.reduce((a, b) => (b.rate > a.rate ? b : a)) : null;
  const leadLevel = lead ? (lead.key.replace("solo-", "") as CrewLevel) : null;

  if (leadLevel) {
    for (const l of pairedLevels) {
      const r = avg(billable.filter((p) => p.level === l.key && !p.costing.ownVan));
      if (r == null) continue;
      combos.push({
        key: `pair-${leadLevel}-${l.key}`,
        label: `${LEVEL_LABEL[leadLevel]} + ${LEVEL_LABEL[l.key].toLowerCase()}`,
        rate: lead!.rate + r,
        note: `Two on site, so the crew charges more than the ${LEVEL_LABEL[leadLevel].toLowerCase()} alone. The ${LEVEL_LABEL[l.key].toLowerCase()} never goes out on their own, which is why they don't have a rate of their own above.`,
      });
    }
  }

  // Two people who can each go alone, on the one job.
  const ranked = combos.filter((c) => c.key.startsWith("solo-")).sort((a, b) => b.rate - a.rate);
  const soloCount = billable.filter((p) => p.costing.ownVan).length;
  const pair = ranked.length >= 2 ? [ranked[0], ranked[1]] : soloCount >= 2 ? [ranked[0], ranked[0]] : null;
  if (pair) {
    const lvl = (x: { key: string }) => x.key.replace("solo-", "") as CrewLevel;
    combos.push({
      key: "two-up",
      label: pair[0] === pair[1]
        ? `Two ${LEVEL_PLURAL[lvl(pair[0])].toLowerCase()}`
        : `${LEVEL_LABEL[lvl(pair[0])]} + ${LEVEL_LABEL[lvl(pair[1])].toLowerCase()}`,
      rate: pair[0].rate + pair[1].rate,
      note: "Two vans, two chargeable bodies — both rates apply.",
    });
  }

  return combos;
}


/* -------- Reading a Xero chart of accounts -------- */

/**
 * Accounts that must not be filed as overhead, because something else already
 * counts them. Wages are the dangerous one: the crew tab carries every wage,
 * including on-costs and downtime, so filing Xero's wage accounts on top would
 * charge the same money twice and inflate every hourly rate.
 */
const COUNTED_ELSEWHERE: { test: RegExp; where: string }[] = [
  { test: /wages|salar|superannuation|workcover|work cover|long service|annual leave|payroll/i, where: "Carried on the crew tab — tech wages as labour on a job, office and director wages as overhead." },
  { test: /^depreciation|amortisation/i, where: "Depreciation on the vans comes from the Vehicles tab." },
  { test: /^materials|^cost of (sales|goods)|subcontract|contractor/i, where: "A job cost, not an overhead — it's allowed for in the job it was paid on, so it can't also sit on every hour." },
];

export function countedElsewhere(label: string): string | null {
  return COUNTED_ELSEWHERE.find((r) => r.test.test(label))?.where ?? null;
}

/**
 * A first guess at where a Xero account belongs, matched on what the account is
 * called. Wrong guesses cost a dropdown change; no guess costs forty of them.
 */
const SUGGESTIONS: [RegExp, string][] = [
  [/motor vehicle.*(fuel|petrol|diesel)|^fuel/i, "vehFuel"],
  [/motor vehicle.*(insur|registration|rego)/i, "vehInsurance"],
  [/motor vehicle.*(maintenance|repair|service|tyre)/i, "vehService"],
  [/motor vehicle.*(lease|finance|hire purchase)/i, "vehFinance"],
  [/motor vehicle|vehicle|toll|parking/i, "vehOther"],

  [/^rent\b|lease.*premises|body corporate/i, "premRent"],
  [/rates|utilit|electric|power|water|gas bill/i, "premUtilities"],
  [/clean|rubbish|waste|skip/i, "premWaste"],
  [/repairs and maintenance|building maintenance/i, "premRepairs"],
  [/security|alarm|monitor/i, "premSecurity"],

  [/public liability|^insurance$|general insurance/i, "insLiability"],
  [/tool.*(insur|cover)/i, "insTools"],
  [/membership|accreditation|association/i, "insMemberships"],

  [/^tools|tool purchase|equipment purchase/i, "toolReplace"],
  [/calibrat|test (gear|equipment)/i, "toolTest"],
  [/consumable/i, "toolConsumables"],
  [/plant hire|equipment hire|hire fee/i, "toolHire"],

  [/advertis|google ads|paid media|marketing/i, "mktPaid"],
  [/website|seo|domain|hosting/i, "mktWeb"],
  [/signage|wrap|vehicle graphics/i, "mktSignage"],
  [/gift|donation|sponsor|entertainment|meeting.*client|conference.*client|print.*stationery|printing/i, "mktPrint"],
  [/lead|referral/i, "mktLeads"],

  [/account(ing|ant)|bookkeep|audit/i, "admAccounting"],
  [/subscription|software|saas|licence fee.*software/i, "admSoftware"],
  [/telephone|phone|internet|mobile/i, "admPhone"],
  [/bank fee|merchant|interest expense|finance charge|card fee/i, "admBank"],
  [/training|course|apprentice fee/i, "admTraining"],
  [/licence|license|registration.*(arc|plumb|trade)|filing fee|asic/i, "insLicences"],
  [/protective clothing|uniform|ppe|first aid|medical/i, "admUniform"],
  [/travel|accommodation|meals/i, "admTravel"],
  [/staff.*(amenit|function)|amenities/i, "admStaff"],
  [/office expense|general expense|sundry|stationery/i, "admOther"],
];

export function suggestOverhead(label: string): string | null {
  if (countedElsewhere(label)) return null;
  return SUGGESTIONS.find(([re]) => re.test(label))?.[1] ?? null;
}

/* -------- What another van does to the numbers -------- */

/** Whether a line grows with another van — the default, or your override. */
export const scaleOf = (s: CapSettings, key: string): OverheadScale =>
  s.scales?.[key] ?? OVERHEAD_FIELDS.find((f) => f.key === key)?.scale ?? "fixed";

export function overheadSplit(s: CapSettings): { fixed: number; perVan: number } {
  const oh = overheadsOf(s);
  let fixedTotal = 0, perVanTotal = 0;
  for (const f of OVERHEAD_FIELDS) {
    const v = Number(oh[f.key]) || 0;
    if (scaleOf(s, f.key) === "perVan") perVanTotal += v; else fixedTotal += v;
  }
  return { fixed: fixedTotal, perVan: perVanTotal };
}

export type ScaleRow = {
  vans: number;
  billHrs: number;
  overhead: number;
  overheadPerHr: number;
  costPerHr: number;
  chargeOut: number;
  revenue: number;
  isNow: boolean;
};

/**
 * What another van does to the numbers.
 *
 * The factory, the office and the accountant do not care how many vans are on
 * the road, so every extra van spreads that fixed cost over more billable
 * hours. The van's own costs come with it and do not, which is why the line
 * flattens out rather than falling forever.
 */
export function scaleModel(cap: ReturnType<typeof computeCapacity>, s: CapSettings, upTo = 8): ScaleRow[] {
  const vansNow = cap.per.filter((x) => x.c.chargeable).length;
  if (vansNow === 0 || cap.totalBillHrs <= 0) return [];

  const split = overheadSplit(s);
  const hrsEach = cap.totalBillHrs / vansNow;
  const perVanEach = split.perVan / vansNow;
  // The crew's own wages and downtime scale with the crew, not with the factory.
  const crewCostEach = (cap.fieldWages + cap.labourOh) / vansNow;

  const rows: ScaleRow[] = [];
  for (let n = Math.max(1, vansNow - 2); n <= Math.max(upTo, vansNow + 3); n++) {
    const billHrs = hrsEach * n;
    const overhead = split.fixed + cap.officeOh + perVanEach * n;
    const costPerHr = (overhead + crewCostEach * n) / billHrs;
    const chargeOut = costPerHr * (1 + s.margin / 100);
    rows.push({
      vans: n, billHrs, overhead,
      overheadPerHr: overhead / billHrs,
      costPerHr, chargeOut,
      revenue: chargeOut * billHrs,
      isNow: n === vansNow,
    });
  }
  return rows;
}
