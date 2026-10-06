import "server-only";
import { computeSnapshot, latestSnapshot, storeSnapshot, type Snapshot } from "@/lib/dashboard/metrics";
import { isoDateMelbourne, startOfMonthMelbourne, startOfWeekMelbourne, weekdayMelbourne, type WorkingCalendar } from "@/lib/dashboard/dates";
import { normaliseBoardSettings } from "@/lib/dashboard/boardSettings";
import { shiftIso } from "@/lib/dashboard/pace";
import { jobProfits } from "@/lib/dashboard/jobProfit";
import { crewFigures } from "@/lib/portal/crewRates";
import { getSettings } from "@/lib/portal/db";
import { buildReport, type Period } from "@/lib/reports/build";
import { claimReport, getReport, reportKey, reportRecipients, saveReport } from "@/lib/reports/store";
import { sendReportEmail } from "@/lib/reports/send";
import type { Report, ReportKind } from "@/lib/reports/types";
import { overdueByPerson } from "@/lib/todos/store";

/**
 * When the reports go, and the going.
 *
 * At half past five on a working day — late enough that the day's invoices
 * are in, early enough to read before tea:
 *   - the day, every working day;
 *   - the week, on its last working day (Friday, on the board's calendar);
 *   - the month, on its last working day.
 * Any run after that time can send one that's due and not yet sent: a daily
 * Vercel schedule in the evening, and the ServiceTitan sync through the day
 * as a backstop. Each is claimed before it's built, so only one run sends it.
 */

const CUTOFF_MIN = 17 * 60 + 30;
const MAX_TRIES = 3;

function minutesMelbourne(d: Date): number {
  const [h, m] = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(d).split(":").map(Number);
  return h * 60 + m;
}

const noon = (iso: string) => new Date(`${iso}T12:00:00+10:00`);
const working = (iso: string, cal: WorkingCalendar) => cal.days.includes(weekdayMelbourne(noon(iso))) && !cal.holidays.includes(iso);
const fmtDay = (iso: string, opts: Intl.DateTimeFormatOptions) => noon(iso).toLocaleDateString("en-AU", { ...opts, timeZone: "Australia/Melbourne" });

/** The last working day from `from` up to `to`, or null if there is none. */
function lastWorking(from: string, to: string, cal: WorkingCalendar): string | null {
  for (let d = to; d >= from; d = shiftIso(d, -1)) if (working(d, cal)) return d;
  return null;
}

export async function boardCalendar(): Promise<WorkingCalendar> {
  const cfg = normaliseBoardSettings(await getSettings<Record<string, unknown>>("dashboard").catch(() => null));
  return { days: cfg.workingDays, holidays: cfg.holidays };
}

/** The period each kind of report covers as of `now`, whether or not it's due yet. */
export function periodOf(kind: ReportKind, now: Date): Period {
  const today = isoDateMelbourne(now);
  if (kind === "daily") return { key: today, from: today, to: today, label: fmtDay(today, { weekday: "long", day: "numeric", month: "long" }) };
  if (kind === "weekly") {
    const from = isoDateMelbourne(startOfWeekMelbourne(now));
    return { key: from, from, to: today, label: `Week of ${fmtDay(from, { day: "numeric", month: "long" })}` };
  }
  const from = isoDateMelbourne(startOfMonthMelbourne(now));
  return { key: today.slice(0, 7), from, to: today, label: fmtDay(from, { month: "long", year: "numeric" }) };
}

/** Which reports are due at `now`. */
export function dueKinds(now: Date, cal: WorkingCalendar): ReportKind[] {
  const today = isoDateMelbourne(now);
  const late = minutesMelbourne(now) >= CUTOFF_MIN;
  const past = (last: string | null) => !!last && (today > last || (today === last && late));
  const out: ReportKind[] = [];
  if (working(today, cal) && late) out.push("daily");
  const weekFrom = isoDateMelbourne(startOfWeekMelbourne(now));
  if (past(lastWorking(weekFrom, shiftIso(weekFrom, 6), cal))) out.push("weekly");
  const monthFrom = isoDateMelbourne(startOfMonthMelbourne(now));
  const monthEnd = shiftIso(isoDateMelbourne(startOfMonthMelbourne(new Date(noon(monthFrom).getTime() + 32 * 86_400_000))), -1);
  if (past(lastWorking(monthFrom, monthEnd, cal))) out.push("monthly");
  return out;
}

/** The board's figures, no older than a quarter of an hour. */
async function freshSnapshot(given?: Snapshot & { computedAt?: string }): Promise<{ snap: Snapshot; at: string }> {
  if (given) return { snap: given, at: given.computedAt ?? new Date().toISOString() };
  const last = await latestSnapshot();
  if (last && Date.now() - Date.parse(last.computedAt) < 15 * 60_000) return { snap: last, at: last.computedAt };
  const snap = await computeSnapshot();
  await storeSnapshot(snap).catch(() => undefined);
  return { snap, at: new Date().toISOString() };
}

async function build(kind: ReportKind, now: Date, snap: Snapshot, at: string): Promise<Report> {
  const period = periodOf(kind, now);
  let weekProfit = null;
  if (kind === "weekly") {
    weekProfit = await crewFigures()
      .then((c) => jobProfits(period.from, period.to, c.costPerHr, snap.metrics.pace?.profitPct ?? null))
      .then((r) => r.summary)
      .catch(() => null);
  }
  const lateTodos = await overdueByPerson().catch(() => []);
  return buildReport(kind, period, snap.metrics, at, { weekProfit, lateTodos });
}

async function deliver(report: Report): Promise<Report> {
  const to = await reportRecipients();
  const sent = await sendReportEmail(report, to);
  const tries = (report.tries ?? 0) + 1;
  const done: Report = sent.ok
    ? { ...report, status: "sent", sentTo: to, sentAt: new Date().toISOString(), error: null, tries }
    : { ...report, status: "failed", sentTo: [], error: sent.error ?? "Couldn't send", tries };
  await saveReport(done);
  return done;
}

/** Build and send whatever is due and not yet sent. Safe to call from anywhere, as often as you like. */
export async function runDueReports(now = new Date(), snapshot?: Snapshot & { computedAt?: string }): Promise<Array<{ key: string; status: string; error?: string }>> {
  const due = dueKinds(now, await boardCalendar());
  if (!due.length) return [];
  const out: Array<{ key: string; status: string; error?: string }> = [];
  let figures: { snap: Snapshot; at: string } | null = null;
  for (const kind of due) {
    const key = reportKey(kind, periodOf(kind, now).key);
    const existing = await getReport(key);
    if (existing) {
      // Made but not delivered — the mail service was down, say: the next
      // runs try again, as it was built, up to three times in all.
      if (existing.status === "failed" && (existing.tries ?? 1) < MAX_TRIES) {
        const again = await deliver(existing);
        out.push({ key, status: again.status, ...(again.error ? { error: again.error } : {}) });
      }
      continue;
    }
    figures ??= await freshSnapshot(snapshot);
    const report = await build(kind, now, figures.snap, figures.at);
    // The claim: whoever makes the row sends it.
    if (!(await claimReport(report))) continue;
    const done = await deliver(report);
    out.push({ key, status: done.status, ...(done.error ? { error: done.error } : {}) });
  }
  return out;
}

/** "Send it now" from the Reports page: this period's report, rebuilt from the current figures and sent. */
export async function sendReportNow(kind: ReportKind, now = new Date()): Promise<Report> {
  const { snap, at } = await freshSnapshot();
  return deliver(await build(kind, now, snap, at));
}

/**
 * This period's report from the figures as they are now — built, not kept and
 * not sent. What the preview shows, and what "send it to me" sends.
 */
export async function previewReport(kind: ReportKind, now = new Date()): Promise<Report> {
  const { snap, at } = await freshSnapshot();
  return build(kind, now, snap, at);
}

/**
 * A test copy to one address. Not kept and not counted as the period's
 * report, so it can't stop the real one going at half past five.
 */
export async function sendTestReport(kind: ReportKind, to: string): Promise<{ ok: boolean; error?: string }> {
  return sendReportEmail(await previewReport(kind), [to]);
}

/** Send a kept report again, as it was. */
export async function resendReport(key: string): Promise<Report | null> {
  const r = await getReport(key);
  return r ? deliver(r) : null;
}
