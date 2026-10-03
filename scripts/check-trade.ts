/**
 * Assertions for the trade portal's two pieces of real logic.
 *
 * Run with `npx tsx scripts/check-trade.ts`.
 *
 * Both of these got it wrong before they got it right, which is why they are
 * checked here rather than trusted:
 *
 *   - the week boundary and the six weekly-check steps, where "done" has to mean
 *     this week and a part-finished step has to say what is left;
 *   - the pricebook's tier matching, which at three separate points put a
 *     price on a model it was not written for — a 2.5 kW tier on a 3.5 kW
 *     unit, the Wombat's price on a Buffalo, and the two-head price on a
 *     six-head system. Each of those is a job quoted at the wrong number by
 *     somebody who had no reason to doubt the screen.
 */

import assert from "node:assert/strict";
import { mondayOf } from "@/components/portal/fleetStatus";
import {
  SENT_KEY, TIDY_LINES, WALKAROUND_TIDY, angleKey, doneCount, fuelOf, isoDay, nextStep, thisWeek, tidyKey, weekSteps,
} from "@/components/portal/mondayJobs";
import { PHOTO_ANGLES, VEHICLE_ITEMS, WEEKLY_CHECK, itemKey, vehicleKey, type CheckItems } from "@/lib/portal/vanChecks";
import { PB_CATEGORIES, publishedTiers, shelf, sizeOf } from "@/lib/portal/installPrices";
import { byOpportunity, closeRate } from "@/lib/dashboard/boardSettings";
import { findProduct, shelfCards, shelfProducts } from "@/lib/portal/pricebook";
import { HEAT_PUMP_UNITS } from "@/lib/heatPumpUnits";
import { dayHours, minutesOf, weekTotals } from "@/lib/portal/peopleParts";
import { toolChip, toolState, type VanTool } from "@/lib/portal/vanParts";

let n = 0;
const is = (a: unknown, b: unknown, m: string) => { n++; assert.deepEqual(a, b, m); };
const ok = (c: unknown, m: string) => { n++; assert.ok(c, m); };

/* ---------- the week boundary ---------- */
// A Wednesday. Its Monday is two days back; the Sunday before is last week.
const wed = new Date(Date.UTC(2026, 9, 7));
is(isoDay(mondayOf(wed)), "2026-10-05", "Monday of a Wednesday");
ok(thisWeek("2026-10-05", wed), "Monday itself is this week");
ok(thisWeek("2026-10-07", wed), "today is this week");
ok(!thisWeek("2026-10-04", wed), "the Sunday before is not");
ok(!thisWeek(null, wed), "nothing logged is not this week");
// On a Monday the week starts that morning, so last Monday has rolled off.
const mon = new Date(Date.UTC(2026, 9, 5));
ok(thisWeek("2026-10-05", mon), "on Monday, Monday counts");
ok(!thisWeek("2026-09-28", mon), "on Monday, last Monday does not");

/* ---------- the six steps ---------- */
const empty = weekSteps({ weekly: null, photos: 0, stock: null, km: null, today: wed });
is(empty.length, 6, "six steps");
is(empty.map((s) => s.key), ["walkaround", "tidy", "check", "stock", "km", "send"], "in the A1 order");
is(doneCount(empty), 0, "a fresh week has nothing done");
is(nextStep(empty), "walkaround", "a fresh week starts at the photos");
is(empty[0].status, `0 of ${PHOTO_ANGLES.length} photos`, "photos counted, not just ticked");
is(empty[1].status, `0 of ${TIDY_LINES.length} done`, "tidy lines counted");
is(empty[2].status, "Not started", "the vehicle check says it hasn't started");
is(empty[3].status, "Not counted", "stock says what is missing");
is(empty[4].status, "Not logged", "km says what is missing");
is(empty[5].status, "Not sent", "and nothing has gone to the office");

// Last week's sheet does not count for this week.
const stale = weekSteps({
  weekly: { checkedOn: "2026-09-28", items: { [SENT_KEY]: { state: "ok", note: "2026-09-28T21:00:00Z" } } }, photos: 6,
  stock: { checkedOn: "2026-09-28", low: 0 }, km: { logDate: "2026-09-28", odometer: 6140, fuel: null }, today: wed,
});
is(doneCount(stale), 0, "last week's sheets do not count");

// Part way: five of six photos is not done.
const five = weekSteps({ weekly: { checkedOn: "2026-10-05", items: {} }, photos: 5, stock: null, km: null, today: wed });
ok(!five[0].done, "five of six photos is not done");
is(five[0].status, "5 of 6 photos", "and it says which");

const six = weekSteps({ weekly: { checkedOn: "2026-10-05", items: {} }, photos: 6, stock: null, km: null, today: wed });
ok(six[0].done, "six of six is done");
is(nextStep(six), "tidy", "then clean & tidy");

// The vehicle check: every line answered, one flagged — still answered, and it says so in orange.
const allLooked: CheckItems = {};
VEHICLE_ITEMS.forEach((item, i) => { allLooked[vehicleKey(item)] = { state: i === 0 ? "action" : "ok" }; });
TIDY_LINES.forEach((t) => { allLooked[t.key] = { state: "ok" }; });
const checked = weekSteps({ weekly: { checkedOn: "2026-10-05", items: allLooked }, photos: 6, stock: null, km: null, today: wed });
ok(checked[1].done, "every tidy line ticked is done");
ok(checked[2].done, "a flagged line still counts as answered");
ok(checked[2].warn, "and the step is marked as having something to look at");
is(checked[2].status, `${VEHICLE_ITEMS.length - 1} OK · 1 to look at`, "with the count in words");
is(nextStep(checked), "stock", "then the stock count");

const half: CheckItems = { [vehicleKey(VEHICLE_ITEMS[0])]: { state: "ok" } };
const started = weekSteps({ weekly: { checkedOn: "2026-10-05", items: half }, photos: 0, stock: null, km: null, today: wed });
ok(!started[2].done, "one line looked at is not done");
ok(started[2].status.endsWith(`${VEHICLE_ITEMS.length - 1} left`), "and it says how many are left");

const sent: CheckItems = { ...allLooked, [SENT_KEY]: { state: "ok", note: "2026-10-05T20:42:00Z" } };
const full = weekSteps({
  weekly: { checkedOn: "2026-10-05", items: sent }, photos: 6,
  stock: { checkedOn: "2026-10-06", low: 2 }, km: { logDate: "2026-10-07", odometer: 6730, fuel: "¾ tank" }, today: wed,
});
is(doneCount(full), 6, "a sent week is six of six");
is(full[3].status, "2 low → your order", "low stock is sent on to the order");
is(full[4].status, "6,730 km · ¾ tank", "the km step reports the reading and the tank");
is(full[5].status, "Sent 7:42am", "sent, in Melbourne time");
is(nextStep(full), "send", "a finished week stays on the last step");
is(fuelOf("Monday reading · ¾ tank"), "¾ tank", "the tank comes back out of the reading's note");

// Keys do not collide: the walk-around's and the vehicle check's lines sit under their own groups.
ok(angleKey("Front") !== itemKey("weekly", "Front"), "photo keys are their own");
ok(tidyKey(WALKAROUND_TIDY[0]).startsWith("walkaround|"), "tidy keys are their own");
ok(vehicleKey("Tyres & pressures").startsWith("vehicle|"), "vehicle-check keys are their own");
ok(!WEEKLY_CHECK.some((t) => tidyKey(WALKAROUND_TIDY[0]) === itemKey("weekly", t.item)), "no collision with the sheet");
is(new Set(TIDY_LINES.map((t) => t.key)).size, TIDY_LINES.length, "no tidy line twice");

/* ---------- the pricebook's tier matching ---------- */
const tiers = publishedTiers();
ok(tiers.length >= 15, "the published tiers are read");
ok(tiers.every((t) => t.includes.length > 0), "every tier says what it includes");

const priced = new Map<string, string>();
for (const c of PB_CATEGORIES) {
  for (const i of shelf(c.key).items) if (i.tier) priced.set(`${i.brand} ${i.name}`, i.tier.tier);
}

// The three mistakes this matcher made before it was tightened.
for (const [model, tier] of priced) {
  if (/3\.5 kW|MSZ-AP35/.test(model)) assert.fail(`a 3.5 kW unit took a tier it has no size for: ${model} → ${tier}`);
  if (/Buffalo/.test(model)) is(tier.includes("Buffalo"), true, "a Buffalo prices off the Buffalo tier");
  if (/Wombat/.test(model)) is(tier.includes("Wombat"), true, "a Wombat prices off the Wombat tier");
  if (/5 Heads|6 Heads|3 Heads/.test(model)) assert.fail(`a multi-head took a tier for a different head count: ${model} → ${tier}`);
}
is(priced.get("Mitsubishi Electric MSZ-AP25 Classic Wall Split"), "Single split system (2.5 kW · bedroom)", "2.5 kW matches its own tier");
is(priced.get("Mitsubishi Electric MSZ-AP50 Classic Wall Split"), "Single split system (5.0 kW · living)", "5 kW matches its own tier");
is(priced.get("Mitsubishi Electric MXZ-4F Multi-Head · 4 Heads"), "Multi-head 4-indoor (Mitsubishi MXZ-4F)", "four heads match the four-head tier");
ok(!priced.has("Thermann Thermann Storage 135 L"), "a storage tank never takes the continuous-flow tier");

// No service-page tier prices a heat pump, so the tier matcher must claim none
// for them. Their prices come from the comparator's list instead (below).
const hp = shelf("hot-water");
ok(hp.items.length > 20, "the heat pump shelf has the catalogue on it");
is(hp.tiers.length, 0, "and no published tier");
ok(hp.items.every((i) => i.tier === null), "so no heat pump shows a price");

// A gas ducted heater is keyed `ducted` in the catalogue and must not land on
// the reverse-cycle shelf at the reverse-cycle price.
ok(!shelf("ducted").items.some((i) => /Wombat|Buffalo|Starpro/.test(i.name)), "gas heaters are off the ducted shelf");
ok(shelf("gas-heating").items.some((i) => /Wombat/.test(i.name)), "and on their own");
ok(!shelf("evap").items.some((i) => /Ducted/.test(i.categoryLabel)), "evap is its own shelf");

// Every shelf's size chips come off its own models.
for (const c of PB_CATEGORIES) {
  const s = shelf(c.key);
  for (const z of s.sizes) ok(s.items.some((i) => sizeOf(i) === z), `${c.label}: the chip ${z} has a model behind it`);
}



/* ---------- the iPad pricebook ---------- */
{
  // Every "from" on a shelf card is a figure the public site already publishes.
  const from = new Map(shelfCards().map((c) => [c.cat.key, c.from]));
  is(from.get("hot-water"), 2610, "heat pumps from the comparator's cheapest");
  is(from.get("split"), 2199, "splits from the published tier");
  is(from.get("multi"), 6500, "multi-head from the published tier");
  is(from.get("ducted"), 12500, "ducted from the published tier");
  is(from.get("evap"), null, "evaporative has no published price, so no from");
  const hpShelf = shelfProducts("hot-water");
  is(hpShelf.filter((p) => p.price != null).length, HEAT_PUMP_UNITS.length, "every comparator unit is priced on the shelf");
  ok(hpShelf.every((p, i, a) => i === 0 || a[i - 1].price != null || p.price == null), "priced models come first");
  ok(hpShelf.some((p) => p.name === "R290 All-in-One 300 L"), "model names cased the way the box is");
  const co2 = hpShelf.find((p) => p.id === "reclaim-co2-315-gl");
  is(co2?.price, 5340, "the CO2 split at the comparator's price");
  ok(findProduct("hot-water", "reclaim-co2-315-gl") != null, "a product is found by its id");
}

/* ---------- the timesheet ---------- */
{
  // The design's own week: 31.75 hrs, 30.20 ordinary, 1.55 overtime.
  const week = weekTotals({
    "2026-10-05": { start: "7:30am", finish: "3:30pm" },
    "2026-10-06": { start: "7:00am", finish: "4:15pm" },
    "2026-10-07": { note: "RDO" },
    "2026-10-08": { start: "7:00am", finish: "3:30pm" },
    "2026-10-09": { start: "7:00am", finish: "3:00pm" },
  });
  is(week.total.toFixed(2), "31.75", "the week totals the design's 31.75");
  is(week.ordinary.toFixed(2), "30.20", "ordinary at 7.6 a day");
  is(week.overtime.toFixed(2), "1.55", "and the rest is overtime");
  is(minutesOf("15:30"), minutesOf("3:30pm"), "24-hour and am/pm read the same");
  is(dayHours({ start: "4:00pm", finish: "8:00am" }), null, "a finish before the start isn't a day");
  is(dayHours({ start: "7:00am", finish: "11:00am" }), 4, "no lunch off a short day");
}

/* ---------- the tool register ---------- */
{
  const today = new Date(Date.UTC(2026, 9, 3));
  const base: VanTool = { id: "x", vehicleId: "v", name: "Vacuum pump", model: null, kind: "refrigeration", boughtOn: "2021-03-01", lifeYears: 6, lastDoneOn: null, lastDone: null, nextDueOn: null, nextDue: null, request: null, requestNote: null, requestedAt: null, requestedBy: null, reply: null };
  const s1 = toolState(base, today);
  is(s1.age, "5 yrs 7 mths", "age in years and months");
  ok(s1.old, "5 yrs 7 mths of a 6-year life is getting old");
  ok(!toolState({ ...base, boughtOn: "2024-01-01" }, today).old, "a young tool isn't");
  ok(toolState({ ...base, lifeYears: null }, today).lifePct === null, "no life set, no guess");
  ok(toolState({ ...base, nextDueOn: "2026-10-20" }, today).due, "due inside a month");
  ok(toolState({ ...base, nextDueOn: "2026-09-20" }, today).overdue, "past due is overdue");
  is(toolChip({ ...base, request: "broken" }, s1).label, "With the office", "an unanswered ask reads as with the office");
  is(toolChip({ ...base, request: "service", reply: "Booked 14 Oct" }, s1).label, "Booked 14 Oct", "the office's answer is the chip");
}

/* ---------- the board's quote arithmetic ---------- */
// Added after the wall reported a 6% close rate on a month that closed 14%:
// ServiceTitan writes one estimate per OPTION, and one job carries about four.
{
  // Good, better and best on one job: one opportunity, won once.
  const threeOptions = [
    { id: 1, jobId: 10, soldOn: null },
    { id: 2, jobId: 10, soldOn: "2026-10-01" },
    { id: 3, jobId: 10, soldOn: null },
  ];
  is(byOpportunity(threeOptions).length, 1, "three options on a job are one opportunity");
  is(closeRate(threeOptions).rate, 1, "and it closed");
  is(closeRate(threeOptions).options, 3, "while still reporting three options written");

  // An option with no job is its own opportunity — lumping them under one key
  // merged a dozen unrelated quotes into a single one that counted once.
  const loose = [
    { id: 7, jobId: null, soldOn: null },
    { id: 8, jobId: null, soldOn: null },
  ];
  is(byOpportunity(loose).length, 2, "two unattached options are two opportunities");

  // The shape of the live month: four options a job, one job in seven won.
  const many = [];
  for (let job = 0; job < 7; job++) {
    for (let opt = 0; opt < 4; opt++) {
      many.push({ id: job * 10 + opt, jobId: job, soldOn: job === 0 && opt === 0 ? "2026-10-01" : null });
    }
  }
  const r = closeRate(many);
  is(r.quoted, 7, "seven jobs quoted");
  is(r.options, 28, "twenty-eight options written");
  is(r.won, 1, "one won");
  ok(Math.abs((r.rate ?? 0) - 1 / 7) < 1e-9, "the rate is per job, not per option");
  ok((r.rate ?? 0) > 1 / 28, "and so is four times what counting options would give");

  is(closeRate([]).rate, null, "nothing quoted is null, not zero");
}

console.log(`${n} assertions passed`);
