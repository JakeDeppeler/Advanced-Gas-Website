"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A figure that counts up from nothing when the page opens, the way the
 * Rapport dashboard's do. The final figure is what's rendered first — on the
 * server, in a screenshot, with motion turned off — and the count only runs
 * where the browser allows motion, so nobody ever reads a half-counted number.
 */
export function CountUp({ value, kind = "money", ms = 1100 }: { value: number; kind?: "money" | "pct" | "int"; ms?: number }) {
  const [shown, setShown] = useState(value);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const f = Math.min(1, (t - t0) / ms);
      const ease = 1 - Math.pow(1 - f, 3);
      setShown(value * ease);
      if (f < 1) raf = requestAnimationFrame(tick);
    };
    setShown(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  const v = kind === "pct" ? `${Math.round(shown)}%` : kind === "int" ? Math.round(shown).toLocaleString("en-AU") : `$${Math.round(shown).toLocaleString("en-AU")}`;
  return <span className="rp-num">{v}</span>;
}
