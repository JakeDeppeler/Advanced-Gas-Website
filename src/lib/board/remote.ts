import "server-only";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { normaliseRemote, type BoardRemote } from "@/lib/board/remoteTypes";
import { soundPlan } from "@/lib/board/sounds";

const KEY = "board-remote";

/**
 * The keep-awake lives in its own row, and that is the whole point.
 *
 * It used to share the remote's row, which made it a read-modify-write of
 * everything every sixty seconds — and on every visibility change, which is to
 * say every time somebody pressed a button and then turned to look at the
 * television. Press Dark, glance at the wall, and the heartbeat that had read
 * the row *before* the press wrote its stale copy back over it. The press was
 * saved and then quietly undone a few seconds later, which on the wall is
 * indistinguishable from a button that does nothing. It was reported as one.
 *
 * Two rows cannot overwrite each other. The heartbeat no longer reads the
 * remote at all.
 */
const LIVE_KEY = "board-remote-live";

export async function readRemote(): Promise<BoardRemote> {
  const [stored, live, sounds] = await Promise.all([
    getSettings<unknown>(KEY).catch(() => null),
    getSettings<{ until?: string }>(LIVE_KEY).catch(() => null),
    soundPlan().catch(() => null),
  ]);
  const remote = normaliseRemote(stored);
  // The heartbeat's row wins on liveUntil: it is the only thing that writes it.
  // The sounds have a row of their own and the Sounds page writes it; they are
  // read here so every way the board hears its remote also hears them.
  return { ...remote, liveUntil: typeof live?.until === "string" ? live.until : null, sounds };
}

/**
 * Change part of the remote. One row; the last press wins. A press is signed
 * with who made it, so the page can say who last pressed what.
 *
 * `liveUntil` is not settable here — see touchRemoteLive. A patch carrying it
 * would be writing the one field another writer owns, which is the race this
 * split exists to end.
 */
export async function updateRemote(
  patch: Partial<Omit<BoardRemote, "liveUntil">>,
  by: string | null,
): Promise<{ ok: boolean; remote: BoardRemote }> {
  const cur = await readRemote();
  const next = { ...cur, ...patch, ...(by ? { by, at: new Date().toISOString() } : {}) };
  // The sounds are the Sounds page's row; a press doesn't write a copy of them here.
  const { sounds: _sounds, ...stored } = next;
  const res = await saveSettings(KEY, stored);
  return { ok: res.ok, remote: next };
}

/**
 * "Somebody has the Remote page open" — a single field in a row of its own, so
 * renewing it can never carry a stale copy of anything else back with it.
 */
export async function touchRemoteLive(until: string): Promise<{ ok: boolean; remote: BoardRemote }> {
  const res = await saveSettings(LIVE_KEY, { until });
  const remote = await readRemote();
  return { ok: res.ok, remote };
}
