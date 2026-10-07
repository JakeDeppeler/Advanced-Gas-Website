"use client";

import { useEffect, useRef, useState } from "react";
import { normaliseRemote, type BoardPageName, type BoardRemote, type DemoKind } from "@/lib/board/remoteTypes";

/** How often the board checks for presses while somebody has the Remote open. */
const FAST_MS = 4_000;

/**
 * And how often the rest of the time.
 *
 * This used to be "not at all": the remote rode along with the figures every
 * thirty seconds, and the four-second check only started once the board already
 * knew somebody had the Remote page open — which it could only learn from the
 * thirty-second read. So the *first* press after opening the remote took up to
 * half a minute to reach the wall, which from the other end of an office is
 * indistinguishable from a button that does nothing. It was reported as one.
 *
 * Eight seconds costs one row read, and it is the difference between a remote
 * and a suggestion.
 */
const IDLE_MS = 8_000;

/**
 * The portal's remote, as the board obeys it.
 *
 * The remote arrives with the figures every thirty seconds, and the board also
 * reads it on its own — every eight seconds normally, every four while somebody
 * has the Remote page open (liveUntil). So a press reaches the wall about as
 * fast as it reaches the room, including the first one.
 *
 * Each press carries an id and is acted on once, so somebody at the TV can
 * still skip or hold after it. A board that loads while a page is held goes
 * straight to that page; a reload asked for before it loaded is not repeated.
 */
export function useBoardRemote(
  token: string,
  fromPoll: BoardRemote | null,
  act: { show: (page: BoardPageName | null, hold: boolean) => void },
): { theme: "light" | "dark" | null; demo: DemoKind | null } {
  const [remote, setRemote] = useState<BoardRemote | null>(fromPoll);
  const [, tick] = useState(0);
  const actRef = useRef(act);
  actRef.current = act;

  useEffect(() => {
    if (fromPoll) setRemote(fromPoll);
  }, [fromPoll]);

  const liveUntil = remote?.liveUntil ? Date.parse(remote.liveUntil) : 0;
  const live = liveUntil > Date.now();
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`/api/screen/remote?k=${encodeURIComponent(token)}`, { cache: "no-store" });
        if (res.ok && !cancelled) setRemote(normaliseRemote(await res.json()));
      } catch {
        // The thirty-second read carries on regardless.
      }
    };
    const t = setInterval(check, live ? FAST_MS : IDLE_MS);
    // Drop back to the idle cadence when the Remote page's window closes,
    // without waiting for a poll to say so.
    const stop = live
      ? setTimeout(() => tick((n) => n + 1), Math.max(0, liveUntil - Date.now()) + 50)
      : undefined;
    return () => { cancelled = true; clearInterval(t); if (stop) clearTimeout(stop); };
  }, [live, liveUntil, token]);

  // A page to show, once per press — or straight away on load if it's held.
  const seenView = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    // Nothing to compare against until the remote has been read once; a press
    // seen for the first time on a later read would otherwise replay.
    if (!remote) return;
    const v = remote.view;
    const first = seenView.current === undefined;
    if (!first && v?.id === seenView.current) return;
    seenView.current = v?.id ?? null;
    if (!v) return;
    if (first && !v.hold) return;
    actRef.current.show(v.page, v.hold);
  }, [remote]);

  // A reload asked for after this board loaded.
  const seenReload = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!remote) return;
    const r = remote.reload;
    if (seenReload.current === undefined) { seenReload.current = r; return; }
    if (r && r !== seenReload.current) window.location.reload();
  }, [remote]);

  // The demo runs until its time is up, then the board goes back to itself.
  const demoUntil = remote?.demo ? Date.parse(remote.demo.until) : 0;
  const demoOn = !!remote?.demo && demoUntil > Date.now();
  useEffect(() => {
    if (!demoOn) return;
    const t = setTimeout(() => tick((n) => n + 1), Math.max(0, demoUntil - Date.now()) + 50);
    return () => clearTimeout(t);
  }, [demoOn, demoUntil]);

  return { theme: remote?.theme ?? null, demo: demoOn && remote?.demo ? remote.demo.kind : null };
}
