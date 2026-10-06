"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A figure that counts up to its value instead of appearing at it.
 *
 * The board replaces a number the instant a new snapshot lands, which from four
 * metres is indistinguishable from the number having always been that. Counting
 * up is the thing that says *this just moved* — and on a wall that is on all
 * day, it is most of what makes it read as live rather than as a printout.
 *
 * It takes the **formatted** string rather than a number and a formatter, which
 * is deliberate: every figure on this board already arrives formatted by one of
 * half a dozen helpers (`$1.5M`, `$14,850`, `34%`, `—`), and threading a
 * formatter through every card to re-derive what the string already says would
 * have meant changing forty call sites to animate twenty. So the string is read
 * as a template — prefix, number, suffix — and only the number moves.
 *
 * Anything with no number in it (`—`, `no target yet`) renders as itself.
 */

/** ~0.7s: long enough to read as movement, short enough to be done before anyone looks. */
const RUN_MS = 700;

type Parsed = { prefix: string; suffix: string; value: number; decimals: number; grouped: boolean };

/**
 * Pull the one number out of a formatted figure.
 *
 * Deliberately matches the first run of digits only. "1 of 7" is not a figure
 * this renders, and a string with two numbers in it is a sentence — leaving it
 * alone is better than animating half of it.
 */
export function parseFigure(text: string): Parsed | null {
  const m = /^(.*?)(\d[\d,]*(?:\.\d+)?)(.*)$/s.exec(text);
  if (!m) return null;
  const [, prefix, digits, suffix] = m;
  const value = Number(digits.replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;
  const dot = digits.indexOf(".");
  return {
    prefix,
    suffix,
    value,
    decimals: dot === -1 ? 0 : digits.length - dot - 1,
    grouped: digits.includes(","),
  };
}

/** Put a number back in the shape the original was written in. */
export function formatLike(n: number, p: Parsed): string {
  const body = p.grouped
    ? n.toLocaleString("en-AU", { minimumFractionDigits: p.decimals, maximumFractionDigits: p.decimals })
    : n.toFixed(p.decimals);
  return `${p.prefix}${body}${p.suffix}`;
}

/** Fast at the start, settling at the end — a count, not a slide. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Whether this render counts, and from where.
 *
 * Pulled out of the effect so it can be checked: the rules are easy to state
 * and easy to get subtly wrong, and every one of them is only wrong for 700ms.
 *
 * - Nothing numeric to count to → show it and stop.
 * - Never rendered a number before → count from zero. That is the page turning
 *   on, and it is the whole effect.
 * - Same number as last time → do not count. The board re-renders on a thirty
 *   second poll whether or not anything moved, and a figure that re-counts to
 *   the number it already was says something happened when nothing did.
 * - A new number → count from the one the room was looking at, not from zero.
 */
export function planRun(prevValue: number | null, next: Parsed | null, reduceMotion: boolean):
  | { animate: false }
  | { animate: true; from: number } {
  if (!next || reduceMotion) return { animate: false };
  const from = prevValue ?? 0;
  if (from === next.value) return { animate: false };
  return { animate: true, from };
}

export function Ticker({ text }: { text: string }) {
  const [shown, setShown] = useState(text);
  // What the last animation finished on, so a change counts from where the eye
  // last saw the number rather than from zero every time.
  const from = useRef<number | null>(null);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const p = parseFigure(text);
    if (!p) {
      from.current = null;
      setShown(text);
      return;
    }

    const reduce = Boolean(
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    );
    const run = planRun(from.current, p, reduce);
    if (!run.animate) {
      from.current = p.value;
      setShown(text);
      return;
    }
    const start = run.from;

    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / RUN_MS);
      const v = start + (p.value - start) * easeOut(t);
      // The last frame is the real string, not a re-format of it: whatever
      // rounding the board's own helper did stays done.
      setShown(t >= 1 ? text : formatLike(v, p));
      if (t < 1) frame.current = requestAnimationFrame(step);
      else from.current = p.value;
    };
    frame.current = requestAnimationFrame(step);

    return () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
    };
  }, [text]);

  // The settled text is what a screen reader and a screenshot get; the frames
  // in between are decoration.
  return (
    <span aria-label={text}>
      <span aria-hidden>{shown}</span>
    </span>
  );
}
