import "server-only";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { normaliseRemote, type BoardRemote } from "@/lib/board/remoteTypes";

const KEY = "board-remote";

export async function readRemote(): Promise<BoardRemote> {
  return normaliseRemote(await getSettings<unknown>(KEY).catch(() => null));
}

/**
 * Change part of the remote. One row; the last press wins. A press is signed
 * with who made it; keeping the remote awake (by: null) changes nothing else,
 * so the page can still say who last pressed what.
 */
export async function updateRemote(patch: Partial<BoardRemote>, by: string | null): Promise<{ ok: boolean; remote: BoardRemote }> {
  const cur = await readRemote();
  const next = { ...cur, ...patch, ...(by ? { by, at: new Date().toISOString() } : {}) };
  const res = await saveSettings(KEY, next);
  return { ok: res.ok, remote: next };
}
