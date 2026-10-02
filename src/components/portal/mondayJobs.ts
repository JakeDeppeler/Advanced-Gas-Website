/**
 * The four jobs that start a tradesman's week, and how far through them they
 * are.
 *
 * The design draws these as a four-step wizard: wash and photograph the van,
 * check it over, count the stock, read the odometer. Behind it they are three
 * records that already exist — the weekly check sheet, the stock count sheet,
 * and a km reading in the van's log — so nothing new is stored to make the
 * wizard work, and a check done this way is the same check the office sees on
 * the fleet page.
 *
 * Pure: the state of the week is worked out from rows the caller has already
 * read, so it can be checked without a database.
 */

import { mondayOf } from "./fleetStatus";
import { PHOTO_ANGLES, WEEKLY_CHECK, itemKey, type CheckItems } from "@/lib/portal/vanChecks";

export type StepKey = "walkaround" | "check" | "stock" | "km";

export const MONDAY_STEPS: { key: StepKey; title: string; hint: string }[] = [
  { key: "walkaround", title: "Van wash & photos", hint: "Clean it, then take the six walk-around photos." },
  { key: "check", title: "Vehicle check", hint: "Go round the van. Anything off goes to the office." },
  { key: "stock", title: "Stock count", hint: "Count what’s on the van. Anything at or under the minimum gets ordered today." },
  { key: "km", title: "Km reading", hint: "The number off the dash, today." },
];

/** The walk-around's own lines live under their own group so they can't collide
 *  with the weekly sheet's "Van clean inside and out". */
export const WALKAROUND_GROUP = "walkaround";
export const WALKAROUND_TIDY = ["Cab cleaned out", "Load area tidy"];

export const angleKey = (angle: string) => itemKey(WALKAROUND_GROUP, angle);
export const tidyKey = (tidy: string) => itemKey(WALKAROUND_GROUP, tidy);

/** Melbourne's date as YYYY-MM-DD, which is what every check is stamped with. */
export const isoDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });

/** Was this dated on or after the Monday of the week `today` falls in? */
export function thisWeek(checkedOn: string | null | undefined, today: Date): boolean {
  if (!checkedOn) return false;
  return checkedOn >= isoDay(mondayOf(today));
}

export type Step = {
  key: StepKey;
  title: string;
  hint: string;
  done: boolean;
  /** What the home screen and the step rail say under the title. */
  status: string;
  /** The word on the button that opens it. */
  cta: string;
};

export type WeekInput = {
  /** This week's weekly check, if one has been started. */
  weekly: { checkedOn: string; items: CheckItems } | null;
  /** How many walk-around photos are on it. */
  photos: number;
  /** This week's stock count, if done. */
  stock: { checkedOn: string } | null;
  /** This week's odometer reading, if logged. */
  km: { logDate: string; odometer: number | null } | null;
  today: Date;
};

/**
 * Where the week is at, step by step.
 *
 * A step says what is left rather than only whether it is finished: "4 of 6
 * photos" is the thing a tech needs to read, and a bare tick or cross is not.
 */
export function weekSteps(w: WeekInput): Step[] {
  const weekly = thisWeek(w.weekly?.checkedOn, w.today) ? w.weekly : null;
  const stock = thisWeek(w.stock?.checkedOn, w.today) ? w.stock : null;
  const km = thisWeek(w.km?.logDate, w.today) ? w.km : null;

  const shots = weekly ? w.photos : 0;
  const ticked = weekly ? WEEKLY_CHECK.filter((t) => weekly.items[itemKey("weekly", t.item)]?.state).length : 0;

  const out: Step[] = [
    {
      key: "walkaround",
      ...stepText("walkaround"),
      done: shots >= PHOTO_ANGLES.length,
      status: shots >= PHOTO_ANGLES.length ? "Done" : `${shots} of ${PHOTO_ANGLES.length} photos`,
      cta: shots > 0 ? "Finish" : "Photos",
    },
    {
      key: "check",
      ...stepText("check"),
      done: ticked >= WEEKLY_CHECK.length,
      status: ticked >= WEEKLY_CHECK.length ? "Done" : `${ticked} of ${WEEKLY_CHECK.length} checked`,
      cta: ticked > 0 ? "Finish" : "Check",
    },
    {
      key: "stock",
      ...stepText("stock"),
      done: !!stock,
      status: stock ? "Done" : "Not counted",
      cta: "Count",
    },
    {
      key: "km",
      ...stepText("km"),
      done: !!km,
      status: km ? (km.odometer != null ? `${km.odometer.toLocaleString("en-AU")} km` : "Done") : "Not logged",
      cta: "Log km",
    },
  ];
  return out;
}

function stepText(key: StepKey): { title: string; hint: string } {
  const s = MONDAY_STEPS.find((m) => m.key === key)!;
  return { title: s.title, hint: s.hint };
}

export const doneCount = (steps: Step[]) => steps.filter((s) => s.done).length;

/** The first step not yet finished — where "carry on" should land. */
export function nextStep(steps: Step[]): StepKey {
  return (steps.find((s) => !s.done) ?? steps[steps.length - 1]).key;
}
