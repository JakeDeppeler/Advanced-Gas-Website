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
  /** One RDO a month is the standard here — 12 a year, off the tools like leave. */
  rdoDays: number;
  travelHrsWeek: number;
  adminHrsWeek: number;
  officeHrsWeek: number;
  /**
   * Whether they run their own van. Someone riding with a tech isn't a second
   * chargeable body — the customer pays for the tech, not the pair — so their
   * hours don't become billable hours. Their whole wage lands in overhead and
   * is recovered through everyone else's rate, which is exactly what happens in
   * real life.
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

export const OVERHEAD_FIELDS: { key: string; group: OverheadGroup; label: string; hint?: string }[] = [
  { key: "vehRego", group: "vehicles", label: "Rego & CTP" },
  { key: "vehInsurance", group: "vehicles", label: "Vehicle insurance" },
  { key: "vehFuel", group: "vehicles", label: "Fuel" },
  { key: "vehService", group: "vehicles", label: "Servicing, tyres & repairs" },
  { key: "vehFinance", group: "vehicles", label: "Finance & lease payments" },
  { key: "vehDep", group: "vehicles", label: "Depreciation", hint: "From the Vehicles tab" },
  { key: "vehOther", group: "vehicles", label: "Everything else on the vehicles" },

  { key: "premRent", group: "premises", label: "Rent or mortgage" },
  { key: "premUtilities", group: "premises", label: "Power, water & gas" },
  { key: "premWaste", group: "premises", label: "Waste & cleaning" },
  { key: "premRepairs", group: "premises", label: "Repairs & maintenance" },
  { key: "premSecurity", group: "premises", label: "Security & alarms" },

  { key: "insLiability", group: "insurance", label: "Public liability" },
  { key: "insWorkers", group: "insurance", label: "Workers compensation" },
  { key: "insTools", group: "insurance", label: "Tool & plant cover" },
  { key: "insLicences", group: "insurance", label: "Licences & registrations", hint: "ARC, plumbing, electrical" },
  { key: "insMemberships", group: "insurance", label: "Memberships & accreditations" },

  { key: "toolReplace", group: "tools", label: "Tool replacement & repairs" },
  { key: "toolTest", group: "tools", label: "Test gear & calibration" },
  { key: "toolConsumables", group: "tools", label: "Consumables not billed to jobs" },
  { key: "toolHire", group: "tools", label: "Plant & equipment hire" },

  { key: "mktPaid", group: "marketing", label: "Paid ads" },
  { key: "mktWeb", group: "marketing", label: "Website & SEO" },
  { key: "mktSignage", group: "marketing", label: "Signage & vehicle wraps" },
  { key: "mktPrint", group: "marketing", label: "Print, merch & sponsorship" },
  { key: "mktLeads", group: "marketing", label: "Lead & referral fees" },

  { key: "admAccounting", group: "admin", label: "Accounting & bookkeeping" },
  { key: "admSoftware", group: "admin", label: "Job & office software" },
  { key: "admPhone", group: "admin", label: "Phones & internet" },
  { key: "admBank", group: "admin", label: "Bank, merchant & finance fees" },
  { key: "admTraining", group: "admin", label: "Training & courses" },
  { key: "admTravel", group: "admin", label: "Travel, meals & accommodation" },
  { key: "admStaff", group: "admin", label: "Staff amenities & functions" },
  { key: "admUniform", group: "admin", label: "Uniforms & PPE" },
  { key: "admOther", group: "admin", label: "Everything else" },
];

export type CapSettings = {
  weeksYear: number; oncosts: number; margin: number;
  /** Kept so older saved settings still add up; superseded by `overheads`. */
  vehicles: number; standard: number;
  overheads?: Record<string, number>;
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
  billable: boolean;
  /** Billable level and in their own van — someone a customer actually pays for. */
  chargeable: boolean;
};

export function calcPerson(level: CrewLevel, c: Costing, s: CapSettings): PersonCosted {
  const rate = c.wage * (1 + s.oncosts / 100);
  const paidHrs = c.hrsWeek * s.weeksYear;
  const wageCost = paidHrs * rate;
  if (!LEVEL_BILLABLE[level]) {
    return { paidHrs, billHrs: 0, wageCost, fieldWages: 0, labourOh: 0, officeOh: wageCost, billable: false, chargeable: false };
  }
  // Riding with a tech: the customer pays for the tech, not the pair, so none of
  // their hours are billable and their whole wage is carried as overhead.
  if (!c.ownVan) {
    return { paidHrs, billHrs: 0, wageCost, fieldWages: 0, labourOh: wageCost, officeOh: 0, billable: false, chargeable: false };
  }
  const hrsPerDay = c.hrsWeek / 5;
  const daysOffHrs = (c.leaveDays + c.phDays + c.sickDays + c.schoolDays + c.rdoDays) * hrsPerDay;
  const travelAdminHrs = (c.travelHrsWeek + c.adminHrsWeek) * s.weeksYear;
  const officeHrs = Math.min(c.officeHrsWeek * s.weeksYear, Math.max(0, paidHrs - daysOffHrs));
  const billHrs = Math.max(0, paidHrs - daysOffHrs - travelAdminHrs - officeHrs);
  return { paidHrs, billHrs, wageCost, fieldWages: billHrs * rate, labourOh: (daysOffHrs + travelAdminHrs) * rate, officeOh: officeHrs * rate, billable: true, chargeable: true };
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

  const layers = [
    { key: "wages", label: "Labour — field wages (billable)", annual: fieldWages },
    { key: "labour", label: "Overhead — downtime & crew riding along", annual: labourOh },
    { key: "office", label: "Overhead — office & admin staff", annual: officeOh },
    ...overheadByGroup(s).map((g) => ({ key: g.key, label: `Overhead — ${g.label.toLowerCase()}`, annual: g.annual })),
  ].filter((l) => l.annual > 0).map((l) => ({ ...l, perHr: l.annual / denom }));

  return { totalBillHrs, paidBillHrs, fieldWages, labourOh, officeOh, sharedOverhead, sharedPerHr, totalCost, costPerHr, layers, rates, per };
}


/* -------- What common crews charge out at -------- */

export type CrewCombo = { key: string; label: string; rate: number; note?: string };

/**
 * The charge-out rate for the crew shapes you actually send to jobs.
 *
 * The one worth spelling out: a tech with an apprentice riding along charges
 * the same as the tech on his own. The apprentice's wage is already recovered
 * inside every chargeable hour, so billing for them again would be charging the
 * customer twice for the same cost.
 */
export function crewCombos(
  people: CrewMember[],
  rates: { id: string; rate: number | null }[],
): CrewCombo[] {
  const rateById = new Map(rates.map((r) => [r.id, r.rate]));
  const perLevel = new Map<CrewLevel, { sum: number; n: number }>();
  for (const p of people) {
    const r = rateById.get(p.id);
    if (r == null) continue;
    const cur = perLevel.get(p.level) ?? { sum: 0, n: 0 };
    perLevel.set(p.level, { sum: cur.sum + r, n: cur.n + 1 });
  }
  const rateOf = (l: CrewLevel) => {
    const x = perLevel.get(l);
    return x && x.n ? x.sum / x.n : null;
  };

  const solo = CREW_LEVELS
    .filter((l) => l.billable && rateOf(l.key) !== null)
    .map((l) => ({ key: `solo-${l.key}`, label: `${l.label} on their own`, rate: rateOf(l.key) as number }));

  const combos: CrewCombo[] = [...solo];

  // Whoever leads a job: the highest-charging level on the tools.
  const lead = solo.length ? solo.reduce((a, b) => (b.rate > a.rate ? b : a)) : null;
  const leadLevel = lead ? (lead.key.replace("solo-", "") as CrewLevel) : null;

  const ridingAlong = [...new Set(people.filter((p) => LEVEL_BILLABLE[p.level] && !p.costing.ownVan).map((p) => p.level))];
  if (leadLevel && ridingAlong.length) {
    for (const rl of ridingAlong) {
      combos.push({
        key: `pair-${leadLevel}-${rl}`,
        label: `${LEVEL_LABEL[leadLevel]} + ${LEVEL_LABEL[rl].toLowerCase()} riding along`,
        rate: lead!.rate,
        note: `Same rate — the ${LEVEL_LABEL[rl].toLowerCase()}'s wage is already inside every chargeable hour, so billing for them again charges the customer twice.`,
      });
    }
  }

  // Two chargeable people on the one job, each in their own van. With only one
  // billable level on the books that's two of the same — still a crew shape
  // that goes out, so it shouldn't be missing from the list.
  const ranked = solo.slice().sort((a, b) => b.rate - a.rate);
  const chargeableCount = rates.filter((r) => r.rate != null).length;
  const pair = ranked.length >= 2 ? [ranked[0], ranked[1]] : chargeableCount >= 2 ? [ranked[0], ranked[0]] : null;
  if (pair) {
    const lvl = (x: { key: string }) => x.key.replace("solo-", "") as CrewLevel;
    combos.push({
      key: "two-up",
      label: pair[0] === pair[1]
        ? `Two ${LEVEL_PLURAL[lvl(pair[0])].toLowerCase()}, both charging`
        : `${LEVEL_LABEL[lvl(pair[0])]} + ${LEVEL_LABEL[lvl(pair[1])].toLowerCase()}, both charging`,
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
  { test: /wages|salar|superannuation|workcover|work cover|long service|annual leave|payroll/i, where: "The crew tab already carries every wage, on-cost and day off." },
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
