/**
 * The weekly van check, step by step, and how far through it someone is.
 *
 * Six steps, in the A1 procedure's order: photos, clean and tidy, the vehicle
 * check, the stock count, the odometer, and sending it. Behind them are three
 * records that already exist — the weekly check sheet, the stock count sheet,
 * and a km reading in the van's log — so nothing new is stored to make the
 * stepper work, and a check done this way is the same check the office sees on
 * the fleet page.
 *
 * Pure: the state of the week is worked out from rows the caller has already
 * read, so it can be checked without a database.
 */

import { mondayOf } from "./fleetStatus";
import { PHOTO_ANGLES, VEHICLE_ITEMS, WEEKLY_CHECK, itemKey, vehicleKey, type CheckItems } from "@/lib/portal/vanChecks";

export type StepKey = "walkaround" | "tidy" | "check" | "stock" | "km" | "send";

export const MONDAY_STEPS: { key: StepKey; title: string; hint: string }[] = [
  { key: "walkaround", title: "Photos", hint: "Front, back, both sides, cab and load area — six photos." },
  { key: "tidy", title: "Clean & tidy", hint: "Rubbish out, tools back where they live, the van ready for the week." },
  { key: "check", title: "Vehicle check", hint: "Go round the van. Anything off goes to the office as a service request." },
  { key: "stock", title: "Stock count", hint: "Count what’s on the van. Anything at or under the minimum goes on your order." },
  { key: "km", title: "Odometer & fuel", hint: "The reading off the dash, today, and what’s in the tank." },
  { key: "send", title: "Check & send", hint: "Look it over, then send it to the office." },
];

/** The walk-around's own lines live under their own group so they can't collide
 *  with the weekly sheet's "Van clean inside and out". */
export const WALKAROUND_GROUP = "walkaround";
export const WALKAROUND_TIDY = ["Cab cleaned out", "Load area tidy"];

export const angleKey = (angle: string) => itemKey(WALKAROUND_GROUP, angle);
export const tidyKey = (tidy: string) => itemKey(WALKAROUND_GROUP, tidy);
/** When the week's check was sent: an ISO timestamp in the note of this line. */
export const SENT_KEY = itemKey(WALKAROUND_GROUP, "Sent to the office");

/** Every line on the clean & tidy step: the walk-around's two, then the paperwork's. */
export const TIDY_LINES: { key: string; label: string }[] = [
  ...WALKAROUND_TIDY.map((t) => ({ key: tidyKey(t), label: t })),
  ...WEEKLY_CHECK.map((t) => ({ key: itemKey("weekly", t.item), label: t.item })),
];

export const FUEL_LEVELS = ["Empty", "¼ tank", "½ tank", "¾ tank", "Full"];

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
  /** What the step list says under the title. */
  status: string;
  /** Said in orange: something on this step needs the office. */
  warn?: boolean;
};

export type WeekInput = {
  /** This week's weekly check, if one has been started. */
  weekly: { checkedOn: string; items: CheckItems } | null;
  /** How many walk-around photos are on it. */
  photos: number;
  /** This week's stock count, if done, and how many lines came in low. */
  stock: { checkedOn: string; low: number } | null;
  /** This week's odometer reading, if logged. */
  km: { logDate: string; odometer: number | null; fuel: string | null } | null;
  today: Date;
};

const sentTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-AU", { timeZone: "Australia/Melbourne", hour: "numeric", minute: "2-digit" }).replace(" ", "").toLowerCase();

/**
 * Where the week is at, step by step.
 *
 * A step says what is left rather than only whether it is finished: "4 of 6
 * photos" is the thing a tech needs to read, and a bare tick is not.
 */
export function weekSteps(w: WeekInput): Step[] {
  const weekly = thisWeek(w.weekly?.checkedOn, w.today) ? w.weekly : null;
  const stock = thisWeek(w.stock?.checkedOn, w.today) ? w.stock : null;
  const km = thisWeek(w.km?.logDate, w.today) ? w.km : null;
  const items = weekly?.items ?? {};

  const shots = weekly ? w.photos : 0;
  const tidied = TIDY_LINES.filter((t) => items[t.key]?.state === "ok").length;
  const looked = VEHICLE_ITEMS.filter((i) => items[vehicleKey(i)]?.state).length;
  const flagged = VEHICLE_ITEMS.filter((i) => items[vehicleKey(i)]?.state === "action").length;
  const okCount = looked - flagged;
  const sentAt = items[SENT_KEY]?.note || null;

  const text = (k: StepKey) => {
    const s = MONDAY_STEPS.find((m) => m.key === k)!;
    return { title: s.title, hint: s.hint };
  };

  return [
    {
      key: "walkaround", ...text("walkaround"),
      done: shots >= PHOTO_ANGLES.length,
      status: `${Math.min(shots, PHOTO_ANGLES.length)} of ${PHOTO_ANGLES.length} photos`,
    },
    {
      key: "tidy", ...text("tidy"),
      done: tidied >= TIDY_LINES.length,
      status: `${tidied} of ${TIDY_LINES.length} done`,
    },
    {
      key: "check", ...text("check"),
      done: looked >= VEHICLE_ITEMS.length,
      status: looked === 0 ? "Not started" : `${okCount} OK${flagged ? ` · ${flagged} to look at` : ""}${looked < VEHICLE_ITEMS.length ? ` · ${VEHICLE_ITEMS.length - looked} left` : ""}`,
      warn: flagged > 0,
    },
    {
      key: "stock", ...text("stock"),
      done: !!stock,
      status: stock ? (stock.low ? `${stock.low} low → your order` : "Counted, nothing low") : "Not counted",
      warn: !!stock && stock.low > 0,
    },
    {
      key: "km", ...text("km"),
      done: !!km,
      status: km ? [km.odometer != null ? `${km.odometer.toLocaleString("en-AU")} km` : "Logged", km.fuel].filter(Boolean).join(" · ") : "Not logged",
    },
    {
      key: "send", ...text("send"),
      done: !!sentAt,
      status: sentAt ? `Sent ${sentTime(sentAt)}` : "Not sent",
    },
  ];
}

export const doneCount = (steps: Step[]) => steps.filter((s) => s.done).length;

/** The first step not yet finished — where "carry on" should land. */
export function nextStep(steps: Step[]): StepKey {
  return (steps.find((s) => !s.done) ?? steps[steps.length - 1]).key;
}

/** "¾ tank" back out of a reading's note, if the tech gave one. */
export const fuelOf = (detail: string | null | undefined) => FUEL_LEVELS.find((f) => detail?.includes(f)) ?? null;
