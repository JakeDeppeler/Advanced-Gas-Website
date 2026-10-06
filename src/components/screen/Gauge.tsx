/**
 * The pace dial: four zones, and a knob at how we are actually going.
 *
 * The knob is not "how much of the target we have done" — on the second of the
 * month that is 7% on every dial on the page and tells the room nothing. It is
 * **done ÷ what the goal says we should have by now**, and that is the number
 * written beside the verdict underneath, so the dial, the words and the key in
 * the footer are all quoting the same scale. Before, the dial was in one unit,
 * the week's shortfall in jobs and the month's in points of the month, and
 * none of the three answered "how close is close".
 *
 * The four zones are fixed on that scale, in the same order on every dial, with
 * a gap between each. The one the knob lands in is the only one at full
 * strength; the rest sit back as tints of themselves. That is three readings of
 * the same verdict — where the knob sits, which zone is lit, and the words
 * underneath — so none of them is carried by hue alone, which red/amber/green
 * could never be: the board's rule, and the reason this dial can use the
 * colours the room already understands.
 *
 * The footer carries the key: Behind · Close · On track · Ahead.
 */

/** The dial runs to half as much again as the goal asks of us by now. */
const DIAL_MAX = 1.5;
/** Three quarters of a circle, open at the bottom where the figure's feet go. */
const SWEEP = 270;
const START = 225; // compass degrees: start at half past seven, sweep clockwise
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
 * The bands are the one scale all twelve dials share, and the key is where it
 * is stated.
 */
export const ZONE_BAND: Record<Verdict, string> = {
  behind: "under 75%",
  close: "75–90%",
  track: "90–110%",
  ahead: "over 110%",
};

/** The glyph each verdict carries, so the word is never alone either. */
const GLYPH: Record<Verdict, string> = { behind: "▼", close: "▼", track: "●", ahead: "▲" };

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

/** "▼ Behind · 59%" — the verdict, and the figure the key's bands are in. */
export function verdictText(index: number | null, verdict: Verdict | null): string {
  if (verdict == null || index == null) return "no target yet";
  return `${GLYPH[verdict]} ${ZONE_LABEL[verdict]} · ${Math.round(index * 100)}%`;
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

/**
 * The figure sits inside the dial, so it has only the dial's width to live in.
 * "$2,888" in the size "14" wants would run out through the arc, and a figure
 * that overflows its own chart is worse than a smaller one.
 */
const figureSize = (text: string) =>
  text.length <= 2 ? 54 : text.length <= 3 ? 48 : text.length <= 4 ? 42 : text.length <= 6 ? 34 : 28;

export function Gauge({
  label,
  index,
  verdict,
  figure,
  of,
  status,
  foot,
  bare = false,
}: {
  label?: string;
  /** done ÷ by now. Null draws the dial flat with no knob. */
  index: number | null;
  verdict: Verdict | null;
  /** What has been done, in the middle of the dial. */
  figure: string;
  /** What it is of, under the figure. */
  of?: string;
  status: string;
  foot?: string;
  /**
   * Drawn inside a card that already has a header, rather than being one.
   *
   * Pace puts a step's week and month in one card under a single name, so the
   * dial there must not bring its own card or repeat the name — the heading
   * belongs to the column, not to either half of it.
   */
  bare?: boolean;
}) {
  // The viewBox hugs the dial: every unit of empty box in here is a gap between
  // the arc and the words under it that the card cannot afford.
  const cx = 100;
  const cy = 92;
  const r = 78;
  const w = 19;
  const at = (v: number) => START + (Math.min(DIAL_MAX, Math.max(0, v)) / DIAL_MAX) * SWEEP;

  /*
   * A round cap adds half the stroke width past each end of the path, which at
   * this radius is seven degrees — more than the Close band is wide. Drawn
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

  const knob = index == null ? null : polar(cx, cy, r, at(index));
  const fs = figureSize(figure);

  return (
    <div className={bare ? "gauge gauge--bare" : "tile gauge"}>
      {!bare && label ? <span className="gauge__label">{label}</span> : null}

      <svg className="gauge__svg" viewBox="0 0 200 162" role="img" aria-label={`${label ? `${label}: ` : ""}${figure}${of ? ` ${of}` : ""}, ${status}`}>
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

        {/* The figure and what it is of, as one block centred on the dial: the
            figure's baseline a little under the middle and its denominator
            under that, so the pair reads as one thing rather than as a number
            with a caption drifting away from it. */}
        <text x={cx} y={cy + (of ? 6 : fs * 0.36)} className="gauge__fig" fontSize={fs} textAnchor="middle">
          {figure}
        </text>
        {of ? (
          <text x={cx} y={cy + 31} className="gauge__of" fontSize="18" textAnchor="middle">
            {of}
          </text>
        ) : null}

        {/* Where we are, as a knob riding the track rather than a needle from
            the middle: the middle is where the figure lives now, and a line
            crossing it was the first thing the eye landed on. */}
        {knob && <circle cx={knob.x} cy={knob.y} r={w / 2 - 1.5} className="gauge__knob" />}
      </svg>

      <span className={`status status--${verdict ?? "quiet"}`}>{status}</span>
      {foot ? <span className="gauge__foot">{foot}</span> : null}
    </div>
  );
}
