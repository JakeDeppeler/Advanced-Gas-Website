import "server-only";
import { dbConfigured, getCapSettings, getSettings, listUsers, listVehicles } from "@/lib/portal/db";
import { withFleet } from "@/lib/portal/costSettings";
import { computeCapacity, onCostPct, onCostsOf, type CrewLevel, type CrewMember } from "@/lib/portal/crew";
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
