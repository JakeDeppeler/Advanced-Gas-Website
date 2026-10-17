import "server-only";
import { dbConfigured, getCapSettings, getSettings, listUsers, listVehicles } from "@/lib/portal/db";
import { withFleet } from "@/lib/portal/costSettings";
import { LEVEL_BILLABLE, computeCapacity, onCostPct, onCostsOf, type CrewLevel, type CrewMember } from "@/lib/portal/crew";
import { normalisePricing } from "@/lib/portal/pricingTypes";
import { DAYS_ON_TOOLS, coverHour, crewRates, overheadItems, vansFor, type CoverInputs, type Fleet } from "./hour";

/**
 * Everything the hour is worked from, read once, so What an hour must cover,
 * Labour rates and What if › Vans price from the same figures and the same
 * starting assumptions. `over` takes a page's own inputs (the GET form);
 * anything not given falls back to the defaults here.
 */
export async function coverBase(over: Partial<CoverInputs> = {}) {
  const ready = dbConfigured();
  const [users, stored, vehicles, pricingRaw] = ready
    ? await Promise.all([listUsers(), getCapSettings(), listVehicles(), getSettings<unknown>("pricing").catch(() => null)])
    : [[], null, [], null];
  const pricing = normalisePricing(pricingRaw);
  const s = withFleet(stored, vehicles);
  const people: CrewMember[] = users
    .filter((u) => u.active && u.id && u.level)
    .map((u) => ({ id: u.id as string, name: u.name, level: u.level as CrewLevel, costing: u.costing }));
  const cap = computeCapacity(people, s);
  const lines = overheadItems(s, cap);
  const oc = onCostPct(s);
  // Techs are the qualified people with a van; an apprentice driving one of their own is still an apprentice.
  const fleet: Fleet = { vans: cap.realVans, techs: cap.per.filter((x) => x.c.chargeable && x.p.level !== "apprentice").length };
  const hm = s.hourModel ?? {};
  const pos = (v: unknown, d: number) => (Number(v) > 0 ? Number(v) : d);
  const defaults: CoverInputs = {
    // A full tech wage and an average apprentice, as Jake set the hour up to be
    // worked, until other figures are saved on What an hour must cover.
    techWage: pos(hm.techWage, 45),
    appWage: pos(hm.appWage, 28),
    techs: Math.round(pos(hm.techs, Math.max(1, fleet.techs))),
    apps: Math.round(hm.apps != null && Number(hm.apps) >= 0 ? Number(hm.apps) : people.filter((p) => p.level === "apprentice").length),
    billPerDay: pos(hm.billPerDay, 6),
    dayHrs: 8,
    daysOnTools: pos(hm.daysOnTools, DAYS_ON_TOOLS),
    charge: pricing.hourly ?? 310,
    margin: Number(s.margin) || 0,
  };
  const i: CoverInputs = { ...defaults, ...Object.fromEntries(Object.entries(over).filter(([, v]) => v != null && Number.isFinite(v))) };
  return { s, people, cap, lines, oc, ocs: onCostsOf(s), fleet, pricing, defaults, i };
}

/** The business as it is, on the saved numbers: the hour every page quotes. */
export async function theHour() {
  const base = await coverBase();
  const r = coverHour(base.lines, base.fleet, base.oc, base.i);
  const vans = vansFor(base.fleet, base.i.techs);
  return { ...base, r, vans, crews: crewRates(r, vans, base.oc) };
}

/**
 * What an hour on a job costs, for Profit on every job, the board and the
 * reports: on the same 6-of-8 hour the pricing pages charge from, so a job's
 * margin and the rate it was priced at are measured on one model.
 *
 * A tech's hour carries the van, the overheads and their own pay — what a
 * tech on their own has to cover. An apprentice riding along adds their own
 * pay over the hours a van bills and nothing more, because the overheads are
 * already on the tech's hour. `costPerHr` is the usual crew, a tech and an
 * apprentice, for sold hours with nobody clocked against them.
 */
export async function hourJobCosts(): Promise<{ costPerHr: number | null; techHr: number | null; appHr: number | null; crew: Array<{ name: string; cost: number | null }> }> {
  const h = await theHour();
  const solo = h.crews.rows.find((c) => c.k === "solo");
  const pair = h.crews.rows.find((c) => c.k === "pair");
  if (!solo || !pair || !(solo.be > 0)) return { costPerHr: null, techHr: null, appHr: null, crew: [] };
  const appHr = pair.be - solo.be;
  const crew = h.people
    .filter((p) => LEVEL_BILLABLE[p.level])
    .map((p) => ({ name: p.name, cost: p.level === "apprentice" ? appHr : solo.be }));
  return { costPerHr: pair.be, techHr: solo.be, appHr, crew };
}
