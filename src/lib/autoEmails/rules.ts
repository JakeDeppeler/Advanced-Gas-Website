/**
 * The customer emails after the quote stage that send by themselves once
 * switched on (Marketing › Customer emails): thanks for going ahead, let's
 * pick a day, all done, invoice reminders, service reminders. The words are
 * templates (lib/email/templates/defaults.ts); the sending is in run.ts.
 *
 * Every one is OFF until someone switches it on, and only from then: a sale,
 * a finished job or an invoice falling due before the switch is left alone,
 * the same rule the quote follow-ups keep (Jake, 8 Nov: "leave the older
 * quotes alone"). Pure, for the check script.
 */

export type AutoKind = "sold" | "pickaday" | "done" | "invoice" | "service";

export const AUTO_KINDS: { k: AutoKind; label: string; when: string; templates: string[] }[] = [
  { k: "sold", label: "Thanks for going ahead", when: "the day a household quote is sold, unless they tapped “Let's go ahead” (they've had that reply)", templates: ["sold.thanks"] },
  { k: "pickaday", label: "Let's pick a day", when: "5 days after a household sale with nothing booked from it", templates: ["sold.pickaday"] },
  { k: "done", label: "All done", when: "the day a household install is completed, with a photo of their job", templates: ["done.thanks"] },
  { k: "invoice", label: "Invoice reminders", when: "3 days, then 10 days, after a household invoice falls due unpaid; never once it's paid", templates: ["invoice.first", "invoice.second"] },
  { k: "service", label: "Service reminder", when: "11 months after a household install or service, unless they've had another job since", templates: ["service.reminder"] },
];

export type AutoSwitch = { on: boolean; since: string | null; by: string | null };
export type AutoSettings = Record<AutoKind, AutoSwitch>;

/** Off, for every kind not switched on. */
export function autoSettingsFrom(raw: unknown): AutoSettings {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const one = (v: unknown): AutoSwitch => {
    const x = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
    return { on: x.on === true, since: typeof x.since === "string" ? x.since : null, by: typeof x.by === "string" ? x.by : null };
  };
  return Object.fromEntries(AUTO_KINDS.map((k) => [k.k, one(o[k.k])])) as AutoSettings;
}

const DAY = 86_400_000;

/** Days late, by calendar day in Melbourne: due Monday, Thursday is 3. */
export function daysLate(dueDate: string, nowMs: number): number {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(new Date(nowMs));
  return Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${dueDate.slice(0, 10)}T00:00:00Z`)) / DAY);
}

/**
 * Which invoice reminder is due: the first at 3 to 9 days late, the second
 * from 10. Past 25 days it's a conversation for the office, not an email.
 * Null when neither.
 */
export function invoiceStep(late: number): "first" | "second" | null {
  if (late >= 3 && late < 10) return "first";
  if (late >= 10 && late <= 25) return "second";
  return null;
}

/** About eleven months: the reminder lands a few weeks before the year is up. */
export const SERVICE_AFTER_DAYS = 335;
/** A reminder that comes due while nothing's sending (switched off) still goes within this window, never later. */
export const SERVICE_WINDOW_DAYS = 14;

/** "$3,060.50", "$1,990". */
export const money = (n: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n);
/** "Mon 3 Nov". */
export const dueWords = (date: string) => new Date(`${date.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", day: "numeric", month: "short" }).replace(",", "");
/** "December". */
export const monthWords = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", month: "long" });

/** Only from the switch: something that happened before it went on is left alone. */
export const afterSwitch = (at: string | null | undefined, s: AutoSwitch) => !!at && !!s.since && Date.parse(at) >= Date.parse(s.since);
