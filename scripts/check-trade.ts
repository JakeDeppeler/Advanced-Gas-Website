/**
 * Assertions for the trade portal's two pieces of real logic.
 *
 * Run with `npx tsx scripts/check-trade.ts`.
 *
 * Both of these got it wrong before they got it right, which is why they are
 * checked here rather than trusted:
 *
 *   - the week boundary and the four Monday steps, where "done" has to mean
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
  WALKAROUND_TIDY, angleKey, doneCount, isoDay, nextStep, thisWeek, tidyKey, weekSteps,
} from "@/components/portal/mondayJobs";
import { PHOTO_ANGLES, WEEKLY_CHECK, itemKey, type CheckItems } from "@/lib/portal/vanChecks";
import { PB_CATEGORIES, publishedTiers, shelf, sizeOf } from "@/lib/portal/installPrices";

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

/* ---------- the four steps ---------- */
const empty = weekSteps({ weekly: null, photos: 0, stock: null, km: null, today: wed });
is(empty.length, 4, "four steps");
is(doneCount(empty), 0, "a fresh week has nothing done");
is(nextStep(empty), "walkaround", "a fresh week starts at the walk-around");
is(empty[0].status, `0 of ${PHOTO_ANGLES.length} photos`, "photos counted, not just ticked");
is(empty[1].status, `0 of ${WEEKLY_CHECK.length} checked`, "check lines counted");
is(empty[2].status, "Not counted", "stock says what is missing");
is(empty[3].status, "Not logged", "km says what is missing");

// Last week's sheet does not count for this week.
const stale = weekSteps({
  weekly: { checkedOn: "2026-09-28", items: {} }, photos: 6,
  stock: { checkedOn: "2026-09-28" }, km: { logDate: "2026-09-28", odometer: 6140 }, today: wed,
});
is(doneCount(stale), 0, "last week's sheets do not count");

// Part way: five of six photos is not done.
const five = weekSteps({ weekly: { checkedOn: "2026-10-05", items: {} }, photos: 5, stock: null, km: null, today: wed });
ok(!five[0].done, "five of six photos is not done");
is(five[0].status, "5 of 6 photos", "and it says which");
is(five[0].cta, "Finish", "a started step says finish");

const six = weekSteps({ weekly: { checkedOn: "2026-10-05", items: {} }, photos: 6, stock: null, km: null, today: wed });
ok(six[0].done, "six of six is done");
is(nextStep(six), "check", "then the vehicle check");

// Every line of the weekly sheet ticked — including a flagged one, which is
// still an answer.
const allTicked: CheckItems = {};
WEEKLY_CHECK.forEach((t, i) => { allTicked[itemKey("weekly", t.item)] = { state: i === 2 ? "action" : "ok" }; });
const checked = weekSteps({ weekly: { checkedOn: "2026-10-05", items: allTicked }, photos: 6, stock: null, km: null, today: wed });
ok(checked[1].done, "a flagged line still counts as answered");
is(nextStep(checked), "stock", "then the stock count");

const full = weekSteps({
  weekly: { checkedOn: "2026-10-05", items: allTicked }, photos: 6,
  stock: { checkedOn: "2026-10-06" }, km: { logDate: "2026-10-07", odometer: 6730 }, today: wed,
});
is(doneCount(full), 4, "a finished week is four of four");
is(full[3].status, "6,730 km", "the km step reports the reading");
is(nextStep(full), "km", "a finished week stays on the last step");

// Keys do not collide: the walk-around's own lines sit under their own group.
ok(angleKey("Front") !== itemKey("weekly", "Front"), "photo keys are their own");
ok(tidyKey(WALKAROUND_TIDY[0]).startsWith("walkaround|"), "tidy keys are their own");
ok(!WEEKLY_CHECK.some((t) => tidyKey(WALKAROUND_TIDY[0]) === itemKey("weekly", t.item)), "no collision with the sheet");

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

// Heat pumps carry no published install price anywhere in the repo, so the
// shelf must show none rather than borrowing one.
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

console.log(`${n} assertions passed`);
