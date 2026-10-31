import "server-only";
import { getSettings, saveSettings } from "@/lib/portal/db";

/**
 * Settings › Automatic: what the portal does by itself, each switchable, and
 * a log of every time it did something, newest first. Kept in settings, a
 * few hundred lines: it's a record to glance at, not an audit trail.
 */
export type AutoEntry = { at: string; kind: string; title: string; detail?: string; ok: boolean; jobId?: number; po?: string };
/**
 * Each automatic job, on or off. All on unless switched off, except the van
 * check reminder: the crew don't have the trade iPads yet, so a to-do saying
 * "do your van check" would be asking for something they can't do.
 */
export const AUTO_KEYS = ["quoteTag", "soldNotBooked", "notInvoiced", "factoryMin", "quoteFollow", "overdueInv", "vanCheck", "keepInTouch", "orderTags", "orderMoves", "accountFlow", "workOrderSend", "woNeedsTech", "woNotToday", "quoteToWrite", "jobsToClose", "installPack"] as const;
export type AutoKey = (typeof AUTO_KEYS)[number];
export type AutoSwitches = Record<AutoKey, boolean> & {
  /** Who gets the office's automatic to-dos. Null: the first person in the office. */
  officeTo: string | null;
  /** Who gets the invoicing and overdue to-dos, on Invoice ready and Invoice overdue. Null: the office's person. */
  accountsTo: string | null;
  /**
   * Who's emailed when the portal emails a supplier or the electrician by
   * itself (a work order sent, a moved job passed on), so somebody knows it
   * went. Addresses, comma-separated. Null: the owner.
   */
  notifyTo: string | null;
};

/** Where "it's done" notices go until someone sets the address on To order › Automation. */
export const NOTIFY_DEFAULT = "jake@advancedgas.com.au";
const OFF_UNTIL_ASKED: AutoKey[] = ["vanCheck"];

const LOG = "automation_log";
const SW = "automation";
const KEEP = 400;

export async function loadSwitches(): Promise<AutoSwitches> {
  const s = await getSettings<Partial<AutoSwitches>>(SW).catch(() => null);
  const out = {
    officeTo: typeof s?.officeTo === "string" ? s.officeTo : null,
    accountsTo: typeof s?.accountsTo === "string" ? s.accountsTo : null,
    notifyTo: typeof s?.notifyTo === "string" && s.notifyTo.trim() ? s.notifyTo : null,
  } as AutoSwitches;
  for (const k of AUTO_KEYS) out[k] = OFF_UNTIL_ASKED.includes(k) ? s?.[k] === true : s?.[k] !== false;
  return out;
}

export async function saveSwitches(s: AutoSwitches) {
  return saveSettings(SW, s);
}

export async function loadAutoLog(): Promise<AutoEntry[]> {
  const s = await getSettings<{ entries?: AutoEntry[] }>(LOG).catch(() => null);
  return Array.isArray(s?.entries) ? s.entries : [];
}

export async function logAuto(entries: AutoEntry[]) {
  if (!entries.length) return;
  const cur = await loadAutoLog();
  await saveSettings(LOG, { entries: [...entries, ...cur].slice(0, KEEP) });
}

/* ------------------------------------------------------- sorted by hand */

/**
 * Failures someone has dealt with themselves, by the same key the "needs a
 * look" list groups them under (kind and job), with when. A failure newer
 * than its mark shows again: sorting one doesn't silence the next. Kept
 * apart from the log because the sync rewrites the log on every run, and a
 * mark written into it would race that.
 */
const SORTED = "automation_sorted";

export async function loadSorted(): Promise<Record<string, string>> {
  const s = await getSettings<{ keys?: Record<string, string> }>(SORTED).catch(() => null);
  return s?.keys && typeof s.keys === "object" ? s.keys : {};
}

export async function markSortedKeys(keys: string[]) {
  const cur = await loadSorted();
  const now = new Date().toISOString();
  // A fortnight is as far back as the list looks; older marks have nothing left to hide.
  const cut = new Date(Date.now() - 15 * 86_400_000).toISOString();
  const kept = Object.fromEntries(Object.entries(cur).filter(([, at]) => at >= cut));
  for (const k of keys) kept[k] = now;
  return saveSettings(SORTED, { keys: kept });
}

/* ----------------------------------------------------- what's been done */

/**
 * Everything an automatic job has already done, by key ("sold:j123"), so a
 * to-do is written once and not again on every sync. Kept for four months,
 * which is longer than anything here stays relevant.
 */
const MADE = "automation_made";
const KEEP_DAYS = 120;

export async function loadMade(): Promise<Map<string, string>> {
  const s = await getSettings<{ keys?: Record<string, string> }>(MADE).catch(() => null);
  return new Map(Object.entries(s?.keys ?? {}));
}

export async function saveMade(made: Map<string, string>) {
  const cut = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString();
  const keys = Object.fromEntries([...made].filter(([, at]) => at >= cut));
  return saveSettings(MADE, { keys });
}

/**
 * A work order put back as a draft by hand isn't sent again by itself: the
 * first one went somewhere wrong, and it waits for someone to fix it and
 * press Send. Kept with the rest of what's been done.
 */
export async function holdFromAutoSend(poId: number) {
  const made = await loadMade();
  made.set(`wo-hold:${poId}`, new Date().toISOString());
  await saveMade(made);
}
