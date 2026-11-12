"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Seconds between checks while the board is on screen. */
const EVERY = 6;

/**
 * Keeps an open to-do board in step with everyone else's.
 *
 * Asks for the board's fingerprint every few seconds while the tab is in
 * view, and redraws the page (router.refresh, which keeps anything half
 * typed or open) only when it has moved. Checks at once on coming back to
 * the tab. Not a socket: the portal reaches the database over REST from the
 * server and keeps its keys there, so the browser asks the server instead.
 */
export function LiveTodos() {
  const router = useRouter();
  const last = useRef<string | null>(null);

  useEffect(() => {
    let busy = false;
    const check = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const r = await fetch("/api/portal/todos/stamp", { cache: "no-store" });
        const { stamp } = (await r.json()) as { stamp: string | null };
        if (stamp) {
          if (last.current && stamp !== last.current) router.refresh();
          last.current = stamp;
        }
      } catch {
        // Offline or a slow database: try again next tick.
      } finally {
        busy = false;
      }
    };
    void check();
    const t = window.setInterval(check, EVERY * 1000);
    document.addEventListener("visibilitychange", check);
    return () => { window.clearInterval(t); document.removeEventListener("visibilitychange", check); };
  }, [router]);

  return null;
}
