"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ago } from "@/lib/portal/format";

/**
 * "11 seconds ago" that keeps counting.
 *
 * Rendered on the server it was true for the instant the page was made and
 * then sat there, so a page left open said eleven seconds for an hour. It
 * starts from the server's clock so the first paint matches, then ticks.
 */
export function LiveAge({ at, now }: { at: string; now: number }) {
  const [t, setT] = useState(now);
  useEffect(() => {
    setT(Date.now());
    const id = setInterval(() => setT(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span suppressHydrationWarning style={{ fontVariantNumeric: "tabular-nums" }}>{ago(at, t)}</span>;
}

/**
 * Re-read the page's figures every so often while it's being looked at.
 * A hidden tab waits, and catches up the moment it's shown again.
 *
 * With `poke`, it first asks that address to bring the figures up to date —
 * the wall board page does, so it stays live with the TV switched off.
 */
export function RefreshEvery({ ms, poke }: { ms: number; poke?: string }) {
  const router = useRouter();
  useEffect(() => {
    let last = Date.now();
    let busy = false;
    // On arrival the page is already current, so it only re-reads if the
    // poke actually made new figures; on the interval it always re-reads, to
    // pick up what the TV recomputed in the meantime.
    const go = async (onlyIfNew = false) => {
      if (document.visibilityState !== "visible" || busy) return;
      busy = true;
      last = Date.now();
      try {
        const made = poke
          ? await fetch(poke, { method: "POST", cache: "no-store" }).then((r) => r.json()).then((j) => Boolean(j?.refreshed)).catch(() => false)
          : false;
        if (!onlyIfNew || made) router.refresh();
      } finally {
        busy = false;
      }
    };
    const id = setInterval(() => void go(), ms);
    const shown = () => { if (Date.now() - last > ms) void go(); };
    document.addEventListener("visibilitychange", shown);
    if (poke) void go(true);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", shown); };
  }, [ms, poke, router]);
  return null;
}
