/**
 * The number formats the portal uses, in one place.
 *
 * They were duplicated at the top of every component that showed a dollar
 * figure, which is fine right up until two of them disagree about decimal
 * places on the same screen.
 */
export const money = (n: number) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

export const money2 = (n: number) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const hrs = (n: number) => `${Math.round(n).toLocaleString("en-AU")} hrs`;

export const pct = (n: number) => `${Math.round(n * 100)}%`;

/** How long ago, in the words a person would say it. Past a day it gives the date instead. */
export function ago(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return `${s} sec ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });
}
