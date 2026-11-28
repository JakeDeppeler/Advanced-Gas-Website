import { localToday } from "@/lib/portal/xero";
import { firstName } from "@/lib/todos/types";
import { FAULT_BRANDS, FAULT_CODES } from "@/lib/faultCodes";

/**
 * The words the Daily tools pages put over their titles, the way the home
 * screen does (Jake, 28 Nov).
 */

/** "G'day Jake · Saturday 28 November", the home screen's line over its title. */
export function greeting(name: string): string {
  return `G’day ${firstName(name)} · ${dayWords()}`;
}

/** Melbourne's date in words, for the line over a tool's title. */
export function dayWords(): string {
  return localToday().toLocaleDateString("en-AU", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
}

/** "Mon 30 Nov", for a figure beside a title. */
export const shortDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).replace(",", "");

/** "today", "tomorrow", "in 3 days". */
export const inDays = (d: number) => (d <= 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`);

/** The fault-code finder's reach: the codes it knows and the brands they cover. */
export const faultReach = () => ({ codes: FAULT_CODES.length, brands: FAULT_BRANDS.length });
