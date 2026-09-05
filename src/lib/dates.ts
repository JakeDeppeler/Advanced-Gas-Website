// Every date boundary on the dashboard is computed in Melbourne time, never in
// the server's timezone and never in an upstream system's. ServiceTitan, Xero
// (set to Australia/Sydney) and HubSpot (set to US/Eastern) all disagree about
// when "today" starts; if we trusted any of them, the "leads today" tile would
// roll over in the middle of the Melbourne afternoon.

export const TZ = "Australia/Melbourne";

const partsFmt = new Intl.DateTimeFormat("en-AU", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

type Parts = { year: number; month: number; day: number; hour: number; minute: number };

function parts(d: Date): Parts {
  const out: Record<string, string> = {};
  for (const p of partsFmt.formatToParts(d)) {
    if (p.type !== "literal") out[p.type] = p.value;
  }
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    // Intl gives "24" for midnight in some engines; normalise to 0.
    hour: Number(out.hour) % 24,
    minute: Number(out.minute),
  };
}

/** Offset between UTC and Melbourne at the given instant, in ms (handles AEDT). */
function offsetMs(d: Date): number {
  const p = parts(d);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  // Seconds/ms are dropped by the formatter, so compare on the same granularity.
  return asUtc - Math.floor(d.getTime() / 60000) * 60000;
}

/** The instant at which the Melbourne day containing `d` began. */
export function startOfDayMelbourne(d: Date = new Date()): Date {
  const p = parts(d);
  const guess = new Date(Date.UTC(p.year, p.month - 1, p.day, 0, 0) - offsetMs(d));
  // Re-derive the offset at the candidate instant so DST transition days land right.
  const corrected = new Date(Date.UTC(p.year, p.month - 1, p.day, 0, 0) - offsetMs(guess));
  return corrected;
}

/** Start of the Melbourne week (Monday) containing `d`. */
export function startOfWeekMelbourne(d: Date = new Date()): Date {
  const dayStart = startOfDayMelbourne(d);
  // getUTCDay on the local-midnight instant would be off by the offset, so read
  // the weekday in Melbourne directly.
  const weekday = new Intl.DateTimeFormat("en-AU", { timeZone: TZ, weekday: "short" }).format(d);
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const idx = Math.max(0, order.indexOf(weekday));
  return new Date(dayStart.getTime() - idx * 86400000);
}

/** Start of the Melbourne month containing `d`. */
export function startOfMonthMelbourne(d: Date = new Date()): Date {
  const p = parts(d);
  const first = new Date(Date.UTC(p.year, p.month - 1, 1, 0, 0));
  return new Date(first.getTime() - offsetMs(d));
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}

/** YYYY-MM-DD as seen in Melbourne. */
export function isoDateMelbourne(d: Date = new Date()): string {
  const p = parts(d);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** How far through the current Melbourne month we are, 0..1. Drives pace-vs-target. */
export function monthProgress(d: Date = new Date()): number {
  const start = startOfMonthMelbourne(d);
  const p = parts(d);
  const nextMonth = new Date(Date.UTC(p.year, p.month, 1, 0, 0)).getTime() - offsetMs(d);
  return (d.getTime() - start.getTime()) / (nextMonth - start.getTime());
}
