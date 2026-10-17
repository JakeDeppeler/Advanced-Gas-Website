import "server-only";
import { getSettings, saveSettings } from "@/lib/portal/db";

/**
 * Settings › Automatic: what the portal does by itself, each switchable, and
 * a log of every time it did something, newest first. Kept in settings, a
 * few hundred lines: it's a record to glance at, not an audit trail.
 */
export type AutoEntry = { at: string; kind: string; title: string; detail?: string; ok: boolean; jobId?: number };
export type AutoSwitches = { quoteTag: boolean };

const LOG = "automation_log";
const SW = "automation";
const KEEP = 400;

export async function loadSwitches(): Promise<AutoSwitches> {
  const s = await getSettings<Partial<AutoSwitches>>(SW).catch(() => null);
  return { quoteTag: s?.quoteTag !== false };
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
