import {
  overheadFields, OVERHEAD_GROUPS, fleetDepOf, officeCost, overheadLines, overheadSplit, scaleOf,
  type CapSettings, type computeCapacity,
} from "@/lib/portal/crew";

/**
 * What an hour on the tools has to bring in, worked the way it's said out loud:
 * every overhead, plus a tech on $45 and an apprentice on $28, divided by the
 * hours we actually bill — six of an eight-hour day, not eight.
 *
 * The Hourly rate page prices each person from their own card (their leave,
 * their school days, their travel). This is the business-sized version on
 * round numbers anyone can check on a calculator, and it is the one to move
 * when asking "what if": another apprentice, another van, a better day.
 * Pure, so the arithmetic can be tested without a database.
 */

/** A 38-hour week, 52 weeks: leave, public holidays, sick days and RDOs are paid. */
export const PAID_HRS_YEAR = 38 * 52;
/** 260 weekdays less 20 leave, 13 public holidays, 10 sick days and 12 RDOs. */
export const DAYS_ON_TOOLS = 205;

export type CoverInputs = {
  techWage: number;
  appWage: number;
  techs: number;
  apps: number;
  /** Hours of the day that get billed. */
  billPerDay: number;
  /** Hours in the day they're paid for. */
  dayHrs: number;
  daysOnTools: number;
  /** What we charge an hour now, to show what's left over. */
  charge: number;
  margin: number;
};

export type CoverLine = { key: string; label: string; group: string; annual: number; perVan: boolean };

/**
 * Every overhead line, the office staff's pay among them.
 *
 * The crew's own office hours, which Running costs counts as overhead, are left
 * out: here each tech and apprentice is paid in full as a wage, so counting
 * their office hours again would charge for the same time twice.
 */
export function overheadItems(s: CapSettings, cap: ReturnType<typeof computeCapacity>): CoverLine[] {
  const groupLabel = (k: string) => OVERHEAD_GROUPS.find((g) => g.key === k)?.label ?? "Other";
  const office = officeCost(cap).rows
    .filter((r) => r.cost > 0)
    .map((r) => ({ key: `office-${r.id}`, label: r.name, group: "Office & admin staff", annual: r.cost, perVan: false }));
  if (s.ohSource === "internal") {
    const split = overheadSplit(s);
    return [
      ...office,
      { key: "fixed", label: "Overheads that stay put", group: "Kept as one figure", annual: split.fixed, perVan: false },
      { key: "perVan", label: "Overheads that come with each van", group: "Kept as one figure", annual: split.perVan, perVan: true },
    ];
  }
  const oh = overheadLines(s);
  const dep = fleetDepOf(s);
  const lines = overheadFields(s).map((f) => ({
    key: f.key,
    label: f.key === "vehDep" && dep > 0 ? "Van depreciation (from Vehicles)" : f.label,
    group: groupLabel(f.group),
    annual: Number(oh[f.key]) || 0,
    perVan: scaleOf(s, f.key) === "perVan",
  })).filter((l) => l.annual > 0);
  return [...office, ...lines];
}

export type CoverResult = {
  inputs: CoverInputs;
  overhead: number;
  techPay: number;
  appPay: number;
  total: number;
  billHrs: number;
  perHr: { overhead: number; tech: number; app: number; total: number };
  /** The break-even hour lifted to our margin, as a share of the price. */
  atMargin: number;
  /** At today's charge: what's left a year, and as a share of what was billed. */
  leftAtCharge: number;
  marginAtCharge: number | null;
};

/** The fleet today, which the van lines were measured on. */
export type Fleet = { vans: number; techs: number };

/**
 * The year and the hour for a crew of `techs` and `apps`.
 *
 * The van lines are today's fleet, whoever drives each van — an apprentice
 * with a van of their own included. Each tech added or taken away moves it by
 * one van at today's cost of a van; the lines that stay put don't move. An apprentice adds their pay and no
 * hours of their own — they ride with a tech, and the customer pays for them
 * through the crew's rate, or through the job getting done sooner.
 */
export function coverHour(lines: CoverLine[], fleet: Fleet, onCostPct: number, i: CoverInputs): CoverResult {
  const fixed = lines.filter((l) => !l.perVan || fleet.vans <= 0).reduce((a, l) => a + l.annual, 0);
  const perVanEach = fleet.vans > 0 ? lines.filter((l) => l.perVan).reduce((a, l) => a + l.annual, 0) / fleet.vans : 0;
  const overhead = fixed + perVanEach * vansFor(fleet, i.techs);
  const loaded = 1 + onCostPct / 100;
  const techPay = i.techs * i.techWage * PAID_HRS_YEAR * loaded;
  const appPay = i.apps * i.appWage * PAID_HRS_YEAR * loaded;
  const total = overhead + techPay + appPay;
  const billHrs = i.techs * i.daysOnTools * i.billPerDay;
  const per = (n: number) => (billHrs > 0 ? n / billHrs : 0);
  const breakEven = per(total);
  const factor = 1 / (1 - Math.min(90, Math.max(0, i.margin)) / 100);
  const billed = i.charge * billHrs;
  return {
    inputs: i,
    overhead, techPay, appPay, total, billHrs,
    perHr: { overhead: per(overhead), tech: per(techPay), app: per(appPay), total: breakEven },
    atMargin: breakEven * factor,
    leftAtCharge: billed - total,
    marginAtCharge: billed > 0 ? (billed - total) / billed : null,
  };
}

/** Vans on the road for a number of techs: today's fleet, one more or less per tech. */
export const vansFor = (fleet: Fleet, techs: number) => Math.max(0, fleet.vans + techs - fleet.techs);

export type Scenario = { key: string; label: string; sub: string; r: CoverResult };

/** The questions worth asking of the hour, each answered against today. */
export function scenarios(lines: CoverLine[], fleet: Fleet, onCostPct: number, i: CoverInputs): Scenario[] {
  const run = (key: string, label: string, sub: string, ch: Partial<CoverInputs>): Scenario =>
    ({ key, label, sub, r: coverHour(lines, fleet, onCostPct, { ...i, ...ch }) });
  const better = Math.min(i.dayHrs, i.billPerDay + 1);
  const worse = Math.max(1, i.billPerDay - 1);
  return [
    run("now", "As it is", `${i.techs} ${i.techs === 1 ? "tech" : "techs"}, ${i.apps} ${i.apps === 1 ? "apprentice" : "apprentices"}, ${i.billPerDay} of ${i.dayHrs} hours billed`, {}),
    run("app", "Add an apprentice", "their pay, no extra hours billed", { apps: i.apps + 1 }),
    run("tech", "Add a tech with a van", "their pay, a van's costs, and their hours", { techs: i.techs + 1 }),
    run("crew", "Add a tech and an apprentice", "a whole new crew on the road", { techs: i.techs + 1, apps: i.apps + 1 }),
    ...(better !== i.billPerDay ? [run("better", `Bill ${better} of ${i.dayHrs} hours`, "the same people, an hour more billed each day", { billPerDay: better })] : []),
    ...(worse !== i.billPerDay ? [run("worse", `Bill ${worse} of ${i.dayHrs} hours`, "an hour a day lost to driving, waiting or call-backs", { billPerDay: worse })] : []),
  ];
}
