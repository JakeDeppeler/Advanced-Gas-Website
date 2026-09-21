"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A figure that counts up to itself the first time it is scrolled to.
 *
 * Takes the finished string and works out whether there is a number in it,
 * so the four commercial figures can share one component even though only
 * three of them are numeric: `12`, `$20M` and `100%` count, and
 * `Before site` renders as written. Prefix and suffix are preserved, so the
 * dollar sign is there from the first frame and the M arrives with the 20.
 *
 * Three things it will not do:
 *  · run for `prefers-reduced-motion: reduce` — the final figure is what is
 *    rendered, immediately
 *  · reserve no space: the element is sized by the finished string held in a
 *    visually-hidden span, so nothing reflows as the digits change
 *  · leave a zero on screen if the observer never fires — the initial state
 *    is the final value, and counting only starts once it has been seen
 */
export function CountUp({ value, ms = 1100 }: { value: string; ms?: number }) {
  const m = /^(\D*?)([\d.,]+)(.*)$/.exec(value);
  const target = m ? Number(m[2].replace(/,/g, "")) : null;
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (target === null || !Number.isFinite(target)) return;
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const decimals = (m![2].split(".")[1] || "").length;
    const group = m![2].includes(",");
    const fmt = (n: number) => {
      const v = n.toFixed(decimals);
      return group ? Number(v).toLocaleString("en-AU", { minimumFractionDigits: decimals }) : v;
    };

    let raf = 0;
    let started = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (started || !entries.some((e) => e.isIntersecting)) return;
        started = true;
        io.disconnect();
        const t0 = performance.now();
        const step = (now: number) => {
          const p = Math.min(1, (now - t0) / ms);
          // Fast out of the gate and settling at the end, so it reads as a
          // meter landing rather than a slot machine.
          const eased = 1 - Math.pow(1 - p, 3);
          setShown(`${m![1]}${fmt(target * eased)}${m![3]}`);
          if (p < 1) raf = requestAnimationFrame(step);
          else setShown(value);
        };
        setShown(`${m![1]}${fmt(0)}${m![3]}`);
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );

    io.observe(node);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
    // `value` is the whole input; m/target are derived from it.
  }, [value, ms, target]); // eslint-disable-line react-hooks/exhaustive-deps

  if (target === null) return <>{value}</>;

  return (
    <span ref={ref} className="countup">
      <span className="countup__ghost" aria-hidden="true">{value}</span>
      <span className="countup__live">{shown}</span>
    </span>
  );
}
