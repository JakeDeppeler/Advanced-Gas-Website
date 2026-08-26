/**
 * The two arguments we make on nearly every job, in one place.
 *
 *   1. If the thing is around ten years old, replacing beats repairing.
 *   2. The VEU rebate is applied at the quote, not chased afterwards.
 *
 * They belong together because they're the same argument. A ten-year-old
 * appliance is exactly what the Victorian Energy Upgrades program was
 * written to get out of houses, so the moment a system reaches the age
 * where repair stops making sense is the moment the rebate is worth the
 * most to you.
 *
 * Kept as data rather than copy-pasted paragraphs so the numbers only
 * ever live in one file. If VEEC or STC values move, they move here and
 * on the calculator, and nowhere else.
 *
 * Honesty rule, and it isn't optional: this is a push, not a script. The
 * site already promises we'd rather talk you out of a job than sell you
 * one you don't need, and that promise is worth more than any single
 * install. So every claim below has to survive a customer checking it.
 * The ten-year line is a genuine economic threshold, not a sales cue,
 * and the copy says so — including the part where a young system with a
 * cheap fault gets repaired.
 */

/** Where the ten-year line actually sits, per system type. */
export type LifeExpectancy = {
  system: string;
  /** Design life the manufacturers themselves quote. */
  typicalLife: string;
  /** The age past which we stop recommending significant repairs. */
  replaceFrom: number;
  /** Why that age and not another one. */
  why: string;
  /** What replacing it is actually worth per year, in plain terms. */
  upside: string;
  /**
   * What a replacement actually costs installed, at the low end, after
   * any rebate. Used by the repair-or-replace calculator to put the
   * quoted repair next to the alternative rather than leaving somebody
   * to guess at it. These track the price tables on the service pages —
   * if they disagree, the service page is right and this is stale.
   */
  replaceCost: number;
  /** Where the replacement lands on the site. */
  replaceHref: string;
};

export const LIFE_EXPECTANCY: LifeExpectancy[] = [
  {
    system: "Gas storage hot water",
    typicalLife: "8–12 years",
    replaceFrom: 10,
    why: "The tank is a steel cylinder with a sacrificial anode inside it. Once the anode is spent the tank starts corroding, and there is no repair for a corroded tank. Everything else on the unit is replaceable; the tank is the unit.",
    upside: "A heat pump replacement runs on roughly a quarter to a third of the energy, and it's the single biggest VEU rebate on the list.",
    replaceCost: 2144,
    replaceHref: "/services/heat-pump-installation/all-in-one",
  },
  {
    system: "Electric storage hot water",
    typicalLife: "8–12 years",
    replaceFrom: 10,
    why: "Same steel tank, same anode, same ending. Elements and thermostats are cheap and easy; neither of them saves a tank that has started to go.",
    upside: "The largest running-cost gap of anything we replace. An old electric tank is the appliance the VEU scheme was most obviously written for.",
    replaceCost: 2144,
    replaceHref: "/services/heat-pump-installation/all-in-one",
  },
  {
    system: "Gas continuous flow",
    typicalLife: "12–20 years",
    replaceFrom: 15,
    why: "Better lifespan than a tank because there's no tank to corrode, but the heat exchanger has narrow passages and parts availability tails off past about fifteen years on discontinued models.",
    upside: "Modern units are more efficient and quieter, though the honest answer here is that a healthy continuous-flow unit at twelve years is usually worth keeping.",
    replaceCost: 2499,
    replaceHref: "/services/gas-plumbing/continuous-flow",
  },
  {
    system: "Gas ducted heating",
    typicalLife: "10–15 years",
    replaceFrom: 10,
    why: "This is the one where age is a safety question and not just an economic one. Heat exchangers crack with thermal cycling, a cracked heat exchanger spills carbon monoxide, and carbon monoxide has no smell. Past ten years it goes on the carbon monoxide test list every single service.",
    upside: "A 3-star unit replaced with a 6-star cuts the gas it burns to hold the same house at the same temperature, every winter, for the next fifteen years.",
    replaceCost: 4800,
    replaceHref: "/services/gas-plumbing/gas-ducted",
  },
  {
    system: "Ducted or split reverse cycle",
    typicalLife: "10–15 years",
    replaceFrom: 12,
    why: "Compressors go, and a compressor on a twelve-year-old unit costs a serious fraction of a new system. The bigger issue is refrigerant: older units run R22 or R410A, and R22 in particular is phased out and expensive to source.",
    upside: "Inverter efficiency has moved a long way. A modern unit doing the same job draws materially less power, and the VEU covers reverse-cycle upgrades too.",
    replaceCost: 2199,
    replaceHref: "/services/air-conditioning-installation/split",
  },
  {
    system: "Evaporative cooling",
    typicalLife: "10–15 years",
    replaceFrom: 12,
    why: "Roof-mounted, so it lives its whole life in the weather. Pads, pumps and motors are all replaceable, but once the cabinet itself starts going you're repairing something with a rusting box around it.",
    upside: "Newer units use less water and run quieter. Worth pricing a reverse-cycle changeover at the same time so you're comparing both properly.",
    replaceCost: 3900,
    replaceHref: "/services/air-conditioning-installation/evap",
  },
];

/**
 * The rebate figures we quote. Same source as the calculator — keep the
 * two in step.
 */
export const REBATE_FACTS = {
  veec: 576,
  stc: 629,
  ausMade: 400,
  vicSolar: 1_000,
  /** Owner-occupier, everything stacked. */
  maxStacked: 2_605,
  /** Rentals: no Solar Homes, everything else applies. */
  maxRental: 1_605,
} as const;

export type NudgeVariant = "hot-water" | "heating" | "cooling" | "general";

/**
 * Short, per-context version of the argument, for the compact block that
 * appears on suburb and service pages.
 *
 * Deliberately short. These pages already had a duplicate-content problem
 * and a 300-word identical block on 400 of them would bring it straight
 * back. The long-form version lives on /upgrade-or-repair and this links
 * to it.
 */
export const NUDGE: Record<NudgeVariant, { heading: string; body: string; age: string }> = {
  "hot-water": {
    heading: "Hot water system near ten years old? Replace it, don't repair it.",
    body:
      "A storage tank is a steel cylinder with a sacrificial anode in it, and once the anode is spent there's no repair for what happens next. Ten years is where we stop recommending you spend money on one. It's also the point the VEU rebate is worth the most, because an old tank is precisely what the scheme was written to get out of houses.",
    age: "10 years",
  },
  heating: {
    heading: "Gas heater over ten years old? Get it tested, and price the upgrade.",
    body:
      "Past ten years a gas heater goes on the carbon monoxide test list at every service, because heat exchangers crack with age and a cracked one has no smell to warn you. If it's near the end anyway, the VEU rebate on a reverse-cycle or high-star replacement is at its most useful right now rather than after another winter.",
    age: "10 years",
  },
  cooling: {
    heading: "Aircon past twelve? The repair bill is usually the argument.",
    body:
      "Compressors and refrigerant are what make an old system expensive. R22 units in particular cost a fortune to regas, when you can get the gas at all. Past twelve years the repair quote often lands close enough to a new system that the decision makes itself, and the VEU rebate covers reverse-cycle upgrades too.",
    age: "12 years",
  },
  general: {
    heading: "If it's near ten years old, price the upgrade before you pay for the repair.",
    body:
      "Ten years is roughly where repair spend stops earning its keep on hot water and gas heating, and twelve on aircon. It's also where the VEU rebate is worth the most, because old, inefficient appliances are exactly what the scheme pays to remove. We'll quote the repair and the replacement side by side so you can see both numbers.",
    age: "10 years",
  },
};

/** The honest counterweight. Shown alongside every nudge. */
export const NUDGE_CAVEAT =
  "And if it's young with a cheap fault, we'll say that instead and fix it. Talking someone into a system they didn't need is how you get one job instead of a family's worth.";

/**
 * Which nudge a service-system page gets, or null for the ones where it
 * would be off-topic. Water filtration has no ten-year rule to push and
 * a temporary hire is the opposite of an upgrade decision, so both sit
 * this one out rather than carrying a block that doesn't apply.
 */
export function nudgeForSystem(systemId: string): NudgeVariant | null {
  if (systemId.includes("filtration")) return null;
  if (systemId === "temporary-hot-water") return null;
  if (systemId.includes("hot-water") || systemId.includes("heat-pump") || systemId.includes("continuous-flow")) {
    return "hot-water";
  }
  if (systemId.includes("gas-") || systemId.includes("heater") || systemId.includes("heating")) return "heating";
  if (systemId.includes("split") || systemId.includes("ducted") || systemId.includes("multi") || systemId.includes("evap")) {
    return "cooling";
  }
  return "general";
}

/**
 * Which nudge a suburb page gets, derived from what we actually install
 * there rather than picked at random.
 *
 * Two reasons it works this way. It's more accurate — the block matches
 * the job we do most in that suburb. And it keeps the 60-odd suburb
 * pages from carrying one identical paragraph, which is the exact
 * problem that had them sitting unindexed in the first place.
 */
export function nudgeForSuburbText(commonInstall: string): NudgeVariant {
  const t = commonInstall.toLowerCase();
  if (t.includes("heat pump") || t.includes("hot water") || t.includes("tank")) return "hot-water";
  if (t.includes("ducted heater") || t.includes("gas ducted") || t.includes("brivis") || t.includes("heater")) {
    return "heating";
  }
  if (t.includes("split") || t.includes("ducted") || t.includes("evap") || t.includes("cooling")) return "cooling";
  return "general";
}
