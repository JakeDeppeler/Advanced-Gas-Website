import "server-only";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { SEED_LEADING } from "./seed";
import type { Decision, Leading } from "./types";

const KEY = "leading";
const LOG = "leading_log";
/** A year of calls at a few a week; older ones have done their teaching. */
const KEEP = 600;

export async function loadLeading(): Promise<Leading> {
  const s = await getSettings<Partial<Leading>>(KEY).catch(() => null);
  if (!s || !Array.isArray(s.seats)) return SEED_LEADING;
  return { ...SEED_LEADING, ...s } as Leading;
}

export async function saveLeading(l: Leading) {
  return saveSettings(KEY, l);
}

export async function loadDecisions(): Promise<Decision[]> {
  const s = await getSettings<{ entries?: Decision[] }>(LOG).catch(() => null);
  return Array.isArray(s?.entries) ? s.entries : [];
}

export async function saveDecisions(entries: Decision[]) {
  return saveSettings(LOG, { entries: entries.slice(0, KEEP) });
}
