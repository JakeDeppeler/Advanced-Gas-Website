import "server-only";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { SEED_TOPICS, type ToolboxState } from "./types";

const KEY = "toolbox";
/** Kept a long way back: a talk record is what shows the crew was told. */
const KEEP_TALKS = 2000;

/** Topics and talks; the starting topics until anything is saved. */
export async function loadToolbox(): Promise<ToolboxState> {
  const s = await getSettings<Partial<ToolboxState>>(KEY).catch(() => null);
  return {
    topics: Array.isArray(s?.topics) ? s.topics : SEED_TOPICS,
    talks: Array.isArray(s?.talks) ? s.talks : [],
  };
}

export async function saveToolbox(state: ToolboxState) {
  return saveSettings(KEY, { topics: state.topics, talks: state.talks.slice(0, KEEP_TALKS) });
}
