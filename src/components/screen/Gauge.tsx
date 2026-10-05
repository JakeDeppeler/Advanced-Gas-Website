/**
 * The pace dial: four zones, and a needle at how we are actually going.
 *
 * The needle is not "how much of the target we have done" — on the second of
 * the month that is 7% on every dial on the page and tells the room nothing.
 * It is **done ÷ what the goal says we should have by now**, so the straight-up
 * position is exactly on pace and the needle means the same thing on the first
 * of the month and on the last.
 *
 * The four zones are fixed on that scale, in the same order on every dial, with
 * a gap between each. The one the needle lands in is the only one at full
 * strength; the rest sit back as tints of themselves. That is three readings of
 * the same verdict — needle position, which zone is lit, and the words
 * underneath — so none of them is carried by hue alone, which red/amber/green
 * could never be: the board's rule, and the reason this dial can use the
 * colours the room already understands.
 *
 * The footer carries the key: Behind · Close · On track · Ahead.
 */

/** The dial runs to half as much again as the goal asks of us by now. */
const DIAL_MAX = 1.5;
const SWEEP = 180;
const START = 270; // compass degrees: nine o'clock, sweeping over the top
/** Enough to read as a boundary from four metres, small enough to lose nothing. */
const GAP = 2.4;

export type Verdict = "behind" | "close" | "track" | "ahead";

/**
 * Where the zones end, on the done ÷ by-now scale.
 *
 * On track is a tenth either side of the line. Tighter and a single job flips
 * the wall between colours every hour; looser and "on track" covers a month
 * that is quietly sliding.
 */
export const ZONES: Array<{ k: Verdict; to: number }> = [
  { k: "behind", to: 0.75 },
  { k: "close", to: 0.9 },
  { k: "track", to: 1.1 },
  { k: "ahead", to: DIAL_MAX },
];

export const ZONE_LABEL: Record<Verdict, string> = {
  behind: "Behind",
  close: "Close",
  track: "On track",
  ahead: "Ahead",
};

/**
 * What each word means, in the footer key beside it.
 *
 * Without these the room can see that something is Close and not how close.
 * Worse, the two rows quote their shortfall in different units — the week in
 * jobs ("Behind 2.5"), the month in points of the month ("Behind pace by 5%") —
 * so neither of those numbers tells you which band you are in either. The bands
 * are the one scale all twelve dials share, and the key is where it is stated.
 */
export const ZONE_BAND: Record<Verdict, string> = {
  behind: "under 75%",
  close: "75–90%",
  track: "90–110%",
  ahead: "over 110%",
};

/** Done over what should be done by now. Null when the goal can't say. */
export function paceIndex(done: number | null | undefined, byNow: number | null | undefined): number | null {
  if (done == null || byNow == null) return null;
  // Nothing expected yet — first thing Monday — is on pace, not a division by
  // zero. Anything at all on the board by then is ahead.
  if (byNow <= 0) return done > 0 ? DIAL_MAX : 1;
  return done / byNow;
}

export function verdictOf(index: number | null): Verdict | null {
  if (index == null) return null;
  for (const z of ZONES) if (index < z.to) return z.k;
  return "ahead";
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const a = polar(cx, cy, r, from);
  const b = polar(cx, cy, r, to);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

export function Gauge({
  label,
  index,
  verdict,
  figure,
  sub,
  status,
  foot,
}: {
  label: string;
  /** done ÷ by now. Null draws the dial flat with no needle. */
  index: number | null;
  verdict: Verdict | null;
  /** The headline under the dial. */
  figure: React.ReactNode;
  /** The line under the headline, where there is one. */
  sub?: React.ReactNode;
  status: string;
  foot?: string;
}) {
  // The viewBox is sized to the dial rather than the dial to the viewBox: the
  // card is only ever as wide as a sixth of the board, so every unit of margin
  // in here comes straight off the arc the room is reading.
  const cx = 106;
  const cy = 96;
  const r = 84;
  const w = 20;
  const at = (v: number) => START + (Math.min(DIAL_MAX, Math.max(0, v)) / DIAL_MAX) * SWEEP;

  /*
   * A round cap adds half the stroke width past each end of the path, which at
   * this radius is six degrees — more than the Close band is wide. Drawn
   * naively the small bands came out as circles sitting on top of their
   * neighbours and the gaps between them closed up. Each path is pulled in by a
   * cap at both ends so the *drawn* band lands where the arithmetic says.
   */
  const cap = ((w / 2 / r) * 180) / Math.PI;
  let from = 0;
  const bands = ZONES.map((z) => {
    const a = at(from) + GAP / 2 + cap;
    const b = at(z.to) - GAP / 2 - cap;
    const mid = (a + b) / 2;
    from = z.to;
    // A band too narrow for two caps still gets a dot, not nothing.
    return b > a ? { k: z.k, a, b } : { k: z.k, a: mid - 0.01, b: mid + 0.01 };
  });

  const needle = index == null ? null : at(index);

  return (
    <div className="tile gauge">
      <span className="gauge__label">{label}</span>

      <svg
        className="gauge__svg"
        viewBox="0 0 212 112"
        role="img"
        aria-label={`${label}: ${status}`}
      >
        {bands.map((b) => (
          <path
            key={b.k}
            d={arc(cx, cy, r, b.a, b.b)}
            className={`gauge__zone is-${b.k} ${verdict === b.k ? "is-on" : ""}`}
            fill="none"
            strokeWidth={w}
            strokeLinecap="round"
          />
        ))}
        {needle != null && (
          <>
            <line
              {...(() => {
                const t = polar(cx, cy, r - w / 2 - 4, needle);
                return { x1: cx, y1: cy, x2: t.x, y2: t.y };
              })()}
              className="gauge__needle"
            />
            <circle cx={cx} cy={cy} r="9" className="gauge__hub" />
          </>
        )}
      </svg>

      <span className="gauge__fig">{figure}</span>
      {sub ? <span className="gauge__sub">{sub}</span> : null}
      <span className={`status status--${verdict ?? "quiet"}`}>{status}</span>
      {foot ? <span className="gauge__foot">{foot}</span> : null}
    </div>
  );
}
