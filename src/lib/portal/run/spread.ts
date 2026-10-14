import "server-only";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { getPLDetail, type PLDetail, type PLLine } from "@/lib/portal/xero";

/**
 * Once-a-year bills, spread across the year on the KPI pages.
 *
 * Insurance, WorkCover and rego are paid in one hit but are the cost of
 * running the business every day of the year. Left where Xero books them, the
 * month they land looks like a disaster and the other eleven look better than
 * they are. So for the accounts ticked here, any period's figure is the last
 * twelve months' total for that account, per day, times the days in the
 * period — the same yearly view the hourly rate is built on.
 *
 * Anything else, including one-off or unusual spending, stays in the month it
 * happened. Xero itself is never changed.
 */

const KEY = "kpi_spread_accounts";
/** The office's once-a-year accounts as Xero names them. */
export const DEFAULT_SPREAD = ["Insurance", "Workcover", "Motor Vehicle - Insurance & Registrations"];

const norm = (s: string) => s.trim().toLowerCase();

export async function loadSpread(): Promise<string[]> {
  const s = await getSettings<{ accounts?: unknown }>(KEY).catch(() => null);
  return Array.isArray(s?.accounts) ? s.accounts.filter((x): x is string => typeof x === "string") : DEFAULT_SPREAD;
}

export async function saveSpread(accounts: string[]): Promise<boolean> {
  return (await saveSettings(KEY, { accounts })).ok;
}

export type SpreadNote = { label: string; booked: number; counted: number; yearly: number };

const DAY = 86_400_000;
const days = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY) + 1;
const isoMinus = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) - n * DAY).toISOString().slice(0, 10);

/**
 * The period's profit and loss with the ticked accounts spread. Returns the
 * detail unchanged when nothing is ticked or the year can't be read — an
 * unspread figure is still a true one, a guessed one isn't.
 */
export async function spreadDetail(detail: PLDetail, from: string, to: string): Promise<{ detail: PLDetail; notes: SpreadNote[] }> {
  const names = new Set((await loadSpread()).map(norm));
  if (!names.size) return { detail, notes: [] };
  const yearFrom = isoMinus(to, 364);
  const year = await getPLDetail(yearFrom, to).catch(() => null);
  if (!year) return { detail, notes: [] };

  const perDayOf = new Map<string, { label: string; perDay: number; yearly: number; section: string }>();
  for (const s of year.sections) {
    if (s.kind !== "out") continue;
    for (const l of s.lines) if (names.has(norm(l.label)) && l.amount > 0) perDayOf.set(norm(l.label), { label: l.label, perDay: l.amount / 365, yearly: l.amount, section: s.title });
  }
  if (!perDayOf.size) return { detail, notes: [] };

  const n = days(from, to);
  const notes: SpreadNote[] = [];
  const seen = new Set<string>();
  const sections = detail.sections.map((s) => {
    if (s.kind !== "out") return s;
    const lines: PLLine[] = s.lines.map((l) => {
      const p = perDayOf.get(norm(l.label));
      if (!p) return l;
      seen.add(norm(l.label));
      const counted = p.perDay * n;
      notes.push({ label: l.label, booked: l.amount, counted, yearly: p.yearly });
      return { label: l.label, amount: counted };
    });
    // A month with no bill still carries its share: added to the section the year filed it under.
    for (const [k, p] of perDayOf) {
      if (seen.has(k) || p.section !== s.title) continue;
      seen.add(k);
      const counted = p.perDay * n;
      notes.push({ label: p.label, booked: 0, counted, yearly: p.yearly });
      lines.push({ label: p.label, amount: counted });
    }
    return { ...s, lines, total: lines.reduce((a, l) => a + l.amount, 0) };
  });
  const shift = notes.reduce((a, x) => a + x.counted - x.booked, 0);
  return {
    detail: { ...detail, sections, operatingExpenses: detail.operatingExpenses + shift, netProfit: detail.netProfit - shift },
    notes,
  };
}
