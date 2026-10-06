"use server";

import { randomUUID } from "node:crypto";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { updateRemote } from "@/lib/board/remote";
import { BOARD_PAGES, type BoardPageName, type BoardRemote, type DemoKind } from "@/lib/board/remoteTypes";

export type RemoteResult = { ok: boolean; error?: string; remote?: BoardRemote };

/** How long a demo stays up on the wall unless it's taken down sooner. */
const DEMO_MS = 2 * 60_000;
/** How long one keep-awake from an open Remote page lasts; it's renewed every minute. */
const LIVE_MS = 2 * 60_000;

async function office() {
  const me = await getPortalUser();
  return me && can(me, "overhead") ? me : null;
}

async function press(patch: Partial<BoardRemote>, sign = true): Promise<RemoteResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  const res = await updateRemote(patch, sign ? me.name : null);
  return res.ok ? { ok: true, remote: res.remote } : { ok: false, error: "Couldn't reach the board's settings." };
}

/** Show a page on the wall now, and stay on it if `hold`. */
export async function showPage(page: string, hold: boolean): Promise<RemoteResult> {
  if (!(BOARD_PAGES as readonly string[]).includes(page)) return { ok: false, error: "No such page." };
  return press({ view: { id: randomUUID(), page: page as BoardPageName, hold } });
}

/** Back to turning the pages on its own. */
export async function rotate(): Promise<RemoteResult> {
  return press({ view: { id: randomUUID(), page: null, hold: false } });
}

/** Put a sample alert up on the wall, or take it down. */
export async function showDemo(kind: DemoKind | null): Promise<RemoteResult> {
  if (kind && !["sold", "quote", "done"].includes(kind)) return { ok: false, error: "No such alert." };
  return press({ demo: kind ? { id: randomUUID(), kind, until: new Date(Date.now() + DEMO_MS).toISOString() } : null });
}

export async function setTheme(theme: "light" | "dark" | null): Promise<RemoteResult> {
  return press({ theme });
}

/** Reload the board on the TV — for a screen that has stuck. */
export async function reloadBoard(): Promise<RemoteResult> {
  return press({ reload: randomUUID() });
}

/** Keep the boards checking every few seconds while this page is open. Not signed: it isn't a press. */
export async function keepLive(): Promise<RemoteResult> {
  return press({ liveUntil: new Date(Date.now() + LIVE_MS).toISOString() }, false);
}
