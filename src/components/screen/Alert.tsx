"use client";

import { useEffect } from "react";
import { cheer } from "./cheer";

/**
 * The three full-screen alerts: a quote written, a job finished, a sale closed.
 *
 * These take the whole wall for a few seconds. That is the point — the room is
 * four metres away and doing something else, so an event that matters has to
 * interrupt rather than appear in a corner. They replace the rocket card, which
 * only ever fired for a sale and was small enough to miss.
 *
 * Sizes come from the design and are written as `--u` multiples of the px it
 * specifies at 1920 wide: 150px headline is 7.8125u, 96px figure is 5u, and so
 * on. Same picture at 1920, and it still holds on a panel that isn't.
 *
 * Motion is decorative in all three — every figure and word is in the DOM from
 * the first frame, so `prefers-reduced-motion` drops the animation and loses
 * nothing. The digit roll is the one exception and it degrades to the final
 * number, which is the only one that was ever true.
 */

export type AlertKind = "quote" | "done" | "sold";

/** One bar on the Sold alert: where a number was, where it is, and the target. */
export type SoldBar = {
  label: string;
  /** The sentence to the right of the label. Already composed — see soldBars(). */
  detail: string;
  /** 0–1. Where the bar sat before this sale. */
  from: number;
  /** 0–1. Where it sits now. */
  to: number;
};

export type BoardAlert = {
  kind: AlertKind;
  /** Stable per event, so the board can tell a new one from a repeat. */
  id: string;
  /** "4:55 pm" — the event's own time, not the time it reached the board. */
  time: string;
  amount: number;
  /** "Heat pump HWS install" */
  name: string;
  /** "Officer · Tech 1" — whatever of the two we actually know. */
  where: string;
  /** The line in the pill. Omitted when there is nothing worth saying. */
  chip?: string | null;
  /** Sold only: the two progress bars, and the line under them. */
  bars?: SoldBar[];
  note?: string | null;
};

/** How long each one holds the wall. The countdown bar is drawn from this. */
const HOLD_MS: Record<AlertKind, number> = { quote: 7000, done: 9000, sold: 11000 };

const money = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;

/**
 * The figure, as a row of digits that roll up into place.
 *
 * Each glyph is a 1em window over a strip of 0–9 twice; the strip is translated
 * so the right digit lands in the window. Two passes rather than one so every
 * digit travels a visible distance — a 1 that only moves one row reads as a
 * typo rather than a count. Punctuation doesn't roll: a comma spinning is noise.
 */
function Rolling({ value, className }: { value: number; className: string }) {
  const text = money(value);
  return (
    <span className={className} aria-label={text}>
      {text.split("").map((ch, i) => {
        const digit = ch >= "0" && ch <= "9";
        if (!digit) {
          return (
            <span key={i} className="alert__glyph" aria-hidden>
              {ch}
            </span>
          );
        }
        // The strip runs 0–9 twice, so landing on the second pass is a full
        // turn plus the digit: --t rows up from the top.
        const t = 10 + Number(ch);
        return (
          <span key={i} className="alert__glyph alert__glyph--roll" aria-hidden>
            <span className="alert__strip" style={{ ["--t" as string]: String(t), animationDelay: `${1.35 + i * 0.06}s` }}>
              {Array.from({ length: 20 }, (_, d) => (
                <span key={d} className="alert__digit">
                  {d % 10}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/**
 * Confetti, fired from the two bottom corners.
 *
 * The pieces are placed from a seeded generator rather than Math.random, so the
 * same alert looks the same on every panel and the same in a screenshot as on
 * the wall. Random per mount would also mean a figure could never be compared
 * between two renders, which is how the board gets checked.
 */
function confetti(count: number) {
  let s = 0x2f6e2b1;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
  const ink = ["#f36722", "#050a30", "#ffffff", "#facc15", "#1f9d4f", "#e02424"];
  return Array.from({ length: count }, (_, i) => ({
    i,
    left: i % 2 === 0,
    w: 12 + Math.floor(rnd() * 7),
    h: 24 + Math.floor(rnd() * 7),
    round: rnd() > 0.72,
    bg: ink[Math.floor(rnd() * ink.length)],
    dx: (14 + rnd() * 16) * (i % 2 === 0 ? 1 : -1),
    dy: -(34 + rnd() * 22),
    rot: Math.round((rnd() * 1600 - 800)),
    dur: 2.3 + rnd() * 0.6,
    delay: rnd() * 2.2,
  }));
}

const CONFETTI = confetti(92);

/** The ring of sparks a firework throws. Decorative; never the only signal. */
function Burst({ at, ink, delay }: { at: { left: string; top: string }; ink: string; delay: string }) {
  return (
    <span className="alert__burst" style={{ left: at.left, top: at.top }} aria-hidden>
      {Array.from({ length: 16 }, (_, i) => (
        <span
          key={i}
          className="alert__spark"
          style={{
            background: ink,
            boxShadow: `0 0 calc(0.63 * var(--u)) ${ink}`,
            ["--r" as string]: `${i * 22.5}deg`,
            ["--dist" as string]: `calc(${[8.85, 10.4, 11.98][i % 3]} * var(--u))`,
            animationDelay: delay,
          }}
        />
      ))}
    </span>
  );
}

export function Alert({ alert, onDone }: { alert: BoardAlert; onDone: () => void }) {
  const hold = HOLD_MS[alert.kind];

  useEffect(() => {
    const t = setTimeout(onDone, hold);
    return () => clearTimeout(t);
  }, [alert.id, hold, onDone]);

  /*
   * A quote and a sale make a noise; a finished job does not.
   *
   * The restraint is the point: a board that chimes at every event is a board
   * somebody turns the speakers off on, and then the sale makes no noise
   * either. Keyed on the alert's id so a re-render inside the hold does not
   * play it twice.
   */
  useEffect(() => {
    if (alert.kind !== "sold" && alert.kind !== "quote") return;
    cheer(alert.kind);
  }, [alert.id, alert.kind]);

  const head = alert.kind === "quote" ? "New quote" : alert.kind === "done" ? "Time to bill" : "SOLD!";
  const eyebrow =
    alert.kind === "quote"
      ? `First quote on this job · ${alert.time}`
      : alert.kind === "done"
        ? `Job completed · ${alert.time}`
        : `Sold · ${alert.time}`;

  return (
    <div
      className={`alert alert--${alert.kind}`}
      role="status"
      aria-live="polite"
      style={{ ["--hold" as string]: `${hold}ms` }}
    >
      <span className="alert__glint" aria-hidden />

      {alert.kind === "sold" && (
        <>
          <Burst at={{ left: "16%", top: "22%" }} ink="#ffffff" delay="0.9s" />
          <Burst at={{ left: "84%", top: "20%" }} ink="#050a30" delay="1.3s" />
          <span className="alert__coins" aria-hidden>
            {Array.from({ length: 14 }, (_, i) => (
              <span
                key={i}
                className="alert__coin"
                style={{ left: `${4 + i * 7}%`, animationDelay: `${0.4 + (i % 7) * 0.33}s`, animationDuration: `${3.4 + (i % 4) * 0.5}s` }}
              >
                $
              </span>
            ))}
          </span>
          <span className="alert__confetti" aria-hidden>
            {CONFETTI.map((c) => (
              <span
                key={c.i}
                className={`alert__piece ${c.left ? "is-left" : "is-right"}`}
                style={{
                  width: `calc(${c.w / 19.2} * var(--u))`,
                  height: `calc(${c.h / 19.2} * var(--u))`,
                  borderRadius: c.round ? "999px" : `calc(0.16 * var(--u))`,
                  background: c.bg,
                  ["--dx" as string]: `calc(${c.dx} * var(--u))`,
                  ["--dy" as string]: `calc(${c.dy} * var(--u))`,
                  ["--rot" as string]: `${c.rot}deg`,
                  animationDuration: `${c.dur}s`,
                  animationDelay: `${c.delay}s`,
                }}
              />
            ))}
          </span>
        </>
      )}

      <div className="alert__stack">
        {alert.kind === "sold" ? (
          <span className="alert__medal" aria-hidden>
            $
          </span>
        ) : (
          <span className="alert__medallion" aria-hidden>
            <span className="alert__ripple" style={{ animationDelay: "0.6s" }} />
            <span className="alert__ripple" style={{ animationDelay: alert.kind === "done" ? "1.3s" : "1.5s" }} />
            {alert.kind === "done" && <span className="alert__ripple" style={{ animationDelay: "2s" }} />}
            <span className="alert__disc">{alert.kind === "done" ? <TickIcon /> : <DocIcon />}</span>
          </span>
        )}

        <span className="alert__eyebrow">{eyebrow}</span>
        {/* SOLD! drops in a letter at a time and settles upright; the other two
            land as one word, stamped. Both are the design's own motion. */}
        {alert.kind === "sold" ? (
          <span className="alert__head" aria-label={head}>
            {head.split("").map((ch, i) => (
              <span key={i} className="alert__letter" style={{ animationDelay: `${0.35 + i * 0.08}s` }} aria-hidden>
                {ch}
              </span>
            ))}
          </span>
        ) : (
          <span className="alert__head">{head}</span>
        )}

        <span className="alert__row">
          <Rolling value={alert.amount} className="alert__figure" />
          {alert.kind === "sold" ? (
            <span className="alert__slab">
              {alert.name}
              <span className="alert__slabsub">{alert.where}</span>
            </span>
          ) : (
            <span className="alert__what">
              {alert.name}
              <span className="alert__where">{alert.where}</span>
            </span>
          )}
        </span>

        {alert.kind === "sold" && alert.bars && alert.bars.length > 0 && (
          <span className="alert__bars">
            {alert.bars.map((b) => (
              <span key={b.label} className="alert__bar">
                <span className="alert__barhead">
                  <span className="alert__barlabel">{b.label}</span>
                  <span className="alert__bardetail">{b.detail}</span>
                </span>
                <span className="alert__track">
                  {/* Where it already was, so the sale's own contribution is the
                      part that grows rather than the whole bar re-filling. */}
                  <span
                    className="alert__fill"
                    style={{ ["--from" as string]: `${Math.round(b.from * 100)}%`, ["--to" as string]: `${Math.round(b.to * 100)}%` }}
                  />
                </span>
              </span>
            ))}
          </span>
        )}

        {alert.chip && <span className="alert__chip">{alert.chip}</span>}
        {alert.kind === "sold" && alert.note && <span className="alert__note">{alert.note}</span>}
      </div>

      {/* How long is left, as a bar that empties. The room reads it without
          reading it — nobody waits on a wall display wondering if it is stuck. */}
      <span className="alert__count" aria-hidden />
    </div>
  );
}

function TickIcon() {
  return (
    <svg viewBox="0 0 96 96" className="alert__icon" aria-hidden>
      <path
        className="alert__stroke"
        d="M20 50 L40 70 L77 28"
        fill="none"
        stroke="#15803d"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="140"
        style={{ animationDelay: "0.75s", animationDuration: "0.55s" }}
      />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg viewBox="0 0 96 96" className="alert__icon" aria-hidden>
      <rect
        className="alert__stroke"
        x="24"
        y="12"
        width="48"
        height="66"
        rx="7"
        fill="none"
        stroke="#f36722"
        strokeWidth="8"
        strokeDasharray="230"
        style={{ animationDelay: "0.7s", animationDuration: "0.6s" }}
      />
      {[32, 46, 60].map((y, i) => (
        <path
          key={y}
          className="alert__stroke"
          d={`M35 ${y} h${y === 60 ? 16 : 26}`}
          stroke="#f36722"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray="140"
          style={{ animationDelay: `${1 + i * 0.12}s`, animationDuration: "0.4s" }}
        />
      ))}
    </svg>
  );
}

/**
 * Sample figures for `?alert=…`, so the design can be judged on the wall.
 *
 * Deliberately marked as a preview on screen. A full-screen "SOLD! $5,340" that
 * nobody sold is exactly the kind of thing this board must never do, and a
 * preview left running on the TV would otherwise be indistinguishable from the
 * real one.
 */
export function previewAlert(kind: AlertKind): BoardAlert {
  if (kind === "quote") {
    return {
      kind,
      id: "preview-quote",
      time: "2:15 pm",
      amount: 14800,
      name: "Ducted reverse cycle",
      where: "Beaconsfield · Tech 1",
      chip: "Preview · follow up in 2 days if it hasn't closed",
    };
  }
  if (kind === "done") {
    return {
      kind,
      id: "preview-done",
      time: "4:55 pm",
      amount: 5340,
      name: "Heat pump HWS install",
      where: "Officer · Tech 1",
      chip: "Preview · compliance cert first, then bill it",
    };
  }
  return {
    kind: "sold",
    id: "preview-sold",
    time: "4:55 pm",
    amount: 5340,
    name: "Tech 1",
    where: "Heat pump HWS · Officer",
    bars: [
      { label: "Tech 1 · this month", detail: "$9,460 → $14,800 · $25,200 to the $40K bonus", from: 0.236, to: 0.37 },
      { label: "Team · this week", detail: "$4,800 → $10,140 of $60,700 · 17% of the week", from: 0.079, to: 0.167 },
    ],
    chip: "Preview · sample figures",
    note: "3rd sale this month",
  };
}
