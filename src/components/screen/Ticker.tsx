"use client";

import { createContext, useContext, useLayoutEffect, useRef, useState } from "react";

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
 * What each figure last showed the room, kept outside the page.
 *
 * The board rebuilds a page from nothing every time it rotates in (the grid is
 * keyed on the page so the tile entrance replays), so a figure's own state dies
 * every thirty seconds. Kept in the component, every figure counted up from
 * zero every time its page came round, all day, and a count that happens every
 * time says nothing. Kept here, a figure counts only
 * when it moved since the room last saw it, which is the only time a count
 * means anything.
 *
 * Mirrored to localStorage so the morning switch-on knows what the evening
 * left. Entries carry the day they were seen: a figure remembered from
 * yesterday is not a baseline for today, because "Sold today" restarting at
 * $0 and climbing to $6,000 by nine is not $6,000 of news against last night's
 * $5,000.
 */
const STORE_KEY = "screen.ticker.v1";
type Seen = { v: number; d: string };
let seen: Map<string, Seen> | null = null;

const today = () => new Date().toLocaleDateString("en-CA");

function memory(): Map<string, Seen> {
  if (seen) return seen;
  seen = new Map();
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) for (const [k, e] of Object.entries(JSON.parse(raw) as Record<string, Seen>)) seen.set(k, e);
  } catch {
    // Private window, blocked storage, a corrupt entry: start with no memory,
    // which means nothing counts until something moves. That is the safe side.
  }
  return seen;
}

function lastSeen(key: string): number | null {
  const e = memory().get(key);
  return e && e.d === today() ? e.v : null;
}

function remember(key: string, v: number) {
  const mem = memory();
  mem.set(key, { v, d: today() });
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(mem)));
  } catch {
    // Memory for this session still holds; only the next reload loses it.
  }
}

/**
 * Which page a figure is on, so "Quoted today" on Today and "Quoted today" on
 * Quotes are remembered apart — they are different figures under one label.
 */
export const TickerScope = createContext("");

/**
 * Whether this render counts, and from where.
 *
 * Pulled out of the effect so it can be checked: the rules are easy to state
 * and easy to get subtly wrong, and every one of them is only wrong for 700ms.
 *
 * - Nothing numeric to count to → show it and stop.
 * - Never seen this figure today → show it and stop. This used to count from
 *   zero, on the reasoning that it was the page turning on; but the page turns
 *   on every rotation, so every figure on the board was counting all day and
 *   the one that had genuinely moved looked like all the rest.
 * - Same number as last seen → do not count.
 * - Lower than last seen → show it and stop. What the room is waiting for — a
 *   job sold, a quote written — only ever adds. A figure going down is a
 *   cancellation, a correction or the day rolling over, and counting it
 *   would dress a correction up as news.
 * - Higher → count from the one the room last saw.
 */
export function planRun(prevValue: number | null, next: Parsed | null, reduceMotion: boolean):
  | { animate: false }
  | { animate: true; from: number } {
  if (!next || reduceMotion || prevValue == null) return { animate: false };
  if (next.value <= prevValue) return { animate: false };
  return { animate: true, from: prevValue };
}

/**
 * `id` names the figure within its page. It has to be stable across the
 * page's rotations and unique on the page; the card's label is usually both.
 */
export function Ticker({ text, id }: { text: string; id: string }) {
  const scope = useContext(TickerScope);
  const key = `${scope}/${id}`;
  const [shown, setShown] = useState(text);
  const frame = useRef<number | null>(null);

  // A layout effect, so the first painted frame of a count is the number the
  // room last saw. In a plain effect the new figure paints first and then jumps
  // back to count up to itself, which flashes the answer before the count.
  useLayoutEffect(() => {
    const p = parseFigure(text);
    if (!p) {
      setShown(text);
      return;
    }

    const reduce = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
    const run = planRun(lastSeen(key), p, reduce);
    // Remembered now rather than when the count lands: the page can rotate
    // away mid-count, and the room has been told this number either way.
    remember(key, p.value);
    if (!run.animate) {
      setShown(text);
      return;
    }
    const start = run.from;
    setShown(formatLike(start, p));

    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / RUN_MS);
      const v = start + (p.value - start) * easeOut(t);
      // The last frame is the real string, not a re-format of it: whatever
      // rounding the board's own helper did stays done.
      setShown(t >= 1 ? text : formatLike(v, p));
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);

    return () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
    };
  }, [text, key]);

  // The settled text is what a screen reader and a screenshot get; the frames
  // in between are decoration.
  return (
    <span aria-label={text}>
      <span aria-hidden>{shown}</span>
    </span>
  );
}
