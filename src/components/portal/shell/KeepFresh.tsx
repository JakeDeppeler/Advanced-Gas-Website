"use client";

import { useEffect } from "react";

/** The sync's own floor is two minutes; asking more often than this only costs a request. */
const EVERY_MS = 3 * 60_000;
const KEY = "pt-fresh-at";

/**
 * Keeps the replica fresh while the office has the portal open.
 *
 * The ServiceTitan pull ran off the wall board's poll, so with the TV off the
 * portal went hours without a sync (27 Oct: nothing from 7:06 pm, and a quote
 * linked to a job in ServiceTitan never reached To order). Any open portal
 * page now asks, through the same route and the same floors the board uses:
 * a sync at most every two minutes, a recompute at most every minute, and
 * nothing at all while the tab is hidden.
 */
export function KeepFresh() {
  useEffect(() => {
    let stopped = false;
    const ping = () => {
      if (stopped || document.visibilityState !== "visible") return;
      // The shell mounts again on every tab change; the last ask is kept so
      // clicking through ten tabs is still one request every few minutes.
      try {
        const last = Number(sessionStorage.getItem(KEY) ?? 0);
        if (Date.now() - last < EVERY_MS) return;
        sessionStorage.setItem(KEY, String(Date.now()));
      } catch {
        // No storage (private window): the interval below still bounds it.
      }
      fetch("/portal/board/refresh", { method: "POST", cache: "no-store", keepalive: true }).catch(() => undefined);
    };
    const first = window.setTimeout(ping, 4000);
    const t = window.setInterval(ping, EVERY_MS);
    return () => { stopped = true; window.clearTimeout(first); window.clearInterval(t); };
  }, []);
  return null;
}
