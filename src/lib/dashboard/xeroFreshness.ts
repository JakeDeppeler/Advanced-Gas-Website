/**
 * When a Xero reading is too old to stand behind, and when to ask again.
 *
 * Its own module, with no database and no React in its import graph, for one
 * reason: these two rules decide what the room believes about the money it is
 * owed, and they are reachable otherwise only through a full recompute against
 * live credentials. Here they can be exercised on their own — see
 * scripts/check-xero.ts. (They lived in metrics.ts until an unrelated import
 * dragged React into that file's graph and took the check down with it.)
 */

import type { SourceState } from "./sourceState";

function relativeHours(ms: number): string {
  const h = Math.round(ms / 3_600_000);
  if (h < 48) return `${h} ${h === 1 ? "hour" : "hours"}`;
  return `${Math.round(h / 24)} days`;
}

/**
 * How old a Xero reading may be before the wall admits it.
 *
 * A Xero access token lives thirty minutes and the portal refreshes it when
 * somebody opens a Finance page — this file must never refresh it, see
 * dashboard/xero.ts for why. So on any evening or weekend with nobody in the
 * portal, the token lapses within half an hour; the board went amber and stayed
 * amber, with "xero access token expired" across the footer, while the figures
 * behind it were perfectly good.
 *
 * That is the board crying wolf, and a light that is permanently amber gets
 * read exactly as often as one that is permanently green: never. What the tile
 * carries is money owed to us, which moves when an invoice is raised or paid —
 * daily, not half-hourly. A reading from this morning is the right number to
 * put on a wall this afternoon.
 */
export const XERO_GOOD_FOR_MS = 12 * 60 * 60 * 1000;

/**
 * How often this file is allowed to ask Xero anything.
 *
 * The board recomputes every twenty-five seconds or so, and before this gate
 * every one of those recomputes pulled the whole authorised-receivables ledger
 * — roughly 3,500 calls a day against a tenant limit of 5,000, with the
 * portal's own Finance pages drawing on the same allowance. That was invisible
 * only because the token kept lapsing overnight and most of those calls failed
 * before they counted; now that the sync keeps the token alive, they would all
 * land.
 *
 * Five minutes is well inside the twelve hours a reading is allowed to be old
 * (XERO_GOOD_FOR_MS above), and money owed to us moves when an invoice is
 * raised or paid, not between two refreshes of a wall display.
 */
const XERO_READ_EVERY_MS = 5 * 60 * 1000;

/**
 * Whether Xero is due to be asked again.
 *
 * `lastReadAt` is the last read that SUCCEEDED, which is what makes the gate
 * safe: a Xero that has started failing ages past the interval within the
 * interval and is retried, so this can only ever suppress a call whose answer
 * we already have. Exported so the rule can be exercised without a recompute.
 */
export function xeroReadDue(lastReadAt: string | undefined, now: Date): boolean {
  if (!lastReadAt) return true;
  const ageMs = now.getTime() - Date.parse(lastReadAt);
  if (!Number.isFinite(ageMs)) return true;
  // A timestamp in the future is a clock that has moved, not a fresh reading.
  return ageMs < 0 || ageMs >= XERO_READ_EVERY_MS;
}

/**
 * What the footer light should say about Xero.
 *
 * Exported so the rule can be exercised on its own: it is the one piece of the
 * snapshot that decides what the room believes, and it is reached only through
 * a full recompute otherwise.
 */
export function xeroSourceState(
  ok: boolean,
  lastReadAt: string | undefined,
  now: Date,
  reason: string,
): { state: SourceState; detail?: string; at?: string } {
  if (ok) return { state: "ok", at: now.toISOString() };

  // The time of the last successful READ, not of the last snapshot. Carrying
  // the snapshot's own timestamp meant this advanced every thirty seconds
  // whether or not Xero had answered, so it could never say how old the figures
  // were — which is the one thing it is for.
  const ageMs = lastReadAt ? now.getTime() - Date.parse(lastReadAt) : Number.POSITIVE_INFINITY;
  if (Number.isFinite(ageMs) && ageMs < XERO_GOOD_FOR_MS) return { state: "ok", at: lastReadAt };
  return {
    state: "stale",
    detail: Number.isFinite(ageMs) ? `last read ${relativeHours(ageMs)} ago` : reason,
    at: lastReadAt,
  };
}

