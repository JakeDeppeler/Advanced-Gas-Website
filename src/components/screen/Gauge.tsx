/**
 * A half-dial of progress toward a monthly target.
 *
 * Two encodings, deliberately separate: the navy arc is how far the month has
 * got, and the orange tick is where it should be by now. Keeping "how far" and
 * "how far by now" on different marks means neither has to be inferred from a
 * colour change, which is what a zoned dial asks of you — and what nobody with
 * red-green colour blindness can do.
 *
 * The status underneath is a worded pill. Colour reinforces it; it never
 * carries it.
 */

const SWEEP = 180;
const START = 270; // compass degrees: start at nine o'clock, sweep over the top

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
  achieved,
  target,
  progress,
  format,
  unavailable,
}: {
  label: string;
  achieved: number | null;
  target: number | null;
  /** Share of the month's working days already elapsed. */
  progress: number;
  format: (n: number | null) => string;
  /**
   * Why there is no figure, when the reason is the data rather than the link.
   * A dial that says "not connected" about a feed that is connected sends
   * somebody to check the wrong thing.
   */
  unavailable?: string;
}) {
  const cx = 110;
  const cy = 100;
  const r = 86;

  const ratio = target && target > 0 && achieved != null ? achieved / target : null;
  // The arc pins at the end of the dial; the figure underneath keeps the truth.
  const shown = Math.min(1, Math.max(0, ratio ?? 0));
  const at = (t: number) => START + Math.min(1, Math.max(0, t)) * SWEEP;

  const diff = ratio == null ? null : ratio - progress;
  const statusText =
    diff == null
      ? unavailable
        ? unavailable
        : target == null
          ? "no monthly target set"
          : "not connected"
      : Math.abs(diff) < 0.01
        ? "On pace"
        : `${diff > 0 ? "Ahead of" : "Behind"} pace by ${Math.abs(Math.round(diff * 100))}%`;

  // Where the month lands if the rest of it looks like the part so far.
  // Rounded before formatting: a projected job count of 64.308 is arithmetic
  // leaking onto the wall.
  const onPaceFor =
    ratio != null && target != null && progress > 0 ? Math.round((achieved as number) / progress) : null;

  return (
    <div className="tile gauge c3">
      <span className="tile__label">{label}</span>

      <svg
        className="gauge__svg"
        viewBox="0 0 220 116"
        role="img"
        aria-label={`${label}: ${format(achieved)} of ${format(target)}, ${statusText}`}
      >
        <path d={arc(cx, cy, r, START, START + SWEEP)} className="gauge__track" fill="none" strokeWidth="19" strokeLinecap="round" />
        {ratio != null && (
          <path d={arc(cx, cy, r, START, at(shown))} className="gauge__fill" fill="none" strokeWidth="19" strokeLinecap="round" />
        )}
        {target != null && (
          <line
            {...lineAt(cx, cy, r, at(progress))}
            className="gauge__pace"
          />
        )}
        <text
          x={cx}
          y={cy - 2}
          className={`gauge__pct ${ratio == null ? "gauge__pct--na" : ""}`}
          textAnchor="middle"
        >
          {ratio == null ? "—" : `${Math.round(ratio * 100)}%`}
        </text>
      </svg>

      <span className="tile__sub" style={{ textAlign: "center" }}>
        <b>{format(achieved)}</b>
        {target != null ? <> of {format(target)}</> : null}
      </span>

      <span className={`pill ${diff == null ? "pill--quiet" : diff >= 0 ? "pill--ahead" : "pill--behind"}`}>
        {statusText}
      </span>

      {onPaceFor != null && <span className="tile__sub">On pace for {format(onPaceFor)}</span>}
    </div>
  );
}

/** A tick across the band, rather than a dot on it: it reads at four metres. */
function lineAt(cx: number, cy: number, r: number, deg: number) {
  const inner = polar(cx, cy, r - 12, deg);
  const outer = polar(cx, cy, r + 12, deg);
  return { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y };
}
