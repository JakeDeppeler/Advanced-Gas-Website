/**
 * A radial gauge against a monthly target.
 *
 * Three zones in a fixed order — behind, on track, ahead — with the needle at
 * the current pace. Colour deliberately does not carry the reading on its own:
 * red/green/gold is close to the worst case for red-green colour blindness
 * (the best separable gold still measures ΔE 5.2 under protanopia), so the zone
 * order never changes, the boundaries have visible gaps, and each gauge states
 * its status in words underneath. Someone who sees no colour difference at all
 * still reads it from needle position and text.
 */

const ZONES = [
  { to: 0.85, tone: "behind" },
  { to: 1.1, tone: "ontrack" },
  { to: 1.4, tone: "ahead" },
] as const;

const MAX = 1.4; // the arc tops out at 140% of pace; beyond that the needle pins
const SWEEP = 252; // degrees of arc, leaving a 108° gap centred on the bottom
// Compass degrees: 0 is twelve o'clock, increasing clockwise. Starting at 234
// puts the open gap symmetrically at the bottom, where the status label sits.
const START = 234;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const a = polar(cx, cy, r, from);
  const b = polar(cx, cy, r, to);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
}

export function Gauge({
  label,
  value,
  pacePct,
  target,
  footnote,
}: {
  label: string;
  value: string;
  pacePct: number | null;
  target: string | null;
  footnote?: string;
}) {
  // The arc's lowest point is cy + r·cos(54°) ≈ cy + 0.59r, so the viewBox has
  // to be tall enough for that or the bottom of the dial is clipped.
  const cx = 100;
  const cy = 86;
  const r = 66;

  const frac = (p: number) => START + (Math.min(p, MAX) / MAX) * SWEEP;

  const status =
    pacePct == null ? null : pacePct >= 1.1 ? "ahead" : pacePct >= 0.85 ? "ontrack" : "behind";

  const statusText =
    pacePct == null
      ? "no target set"
      : status === "ahead"
        ? "ahead of pace"
        : status === "ontrack"
          ? "on track"
          : "behind pace";

  const needle = pacePct == null ? null : frac(Math.max(0, pacePct));

  return (
    <div className="tile gauge">
      <span className="tile__label">{label}</span>

      <svg className="gauge__svg" viewBox="0 0 200 142" role="img" aria-label={`${label}: ${value}, ${statusText}`}>
        {ZONES.map((z, i) => {
          const from = frac(i === 0 ? 0 : ZONES[i - 1].to);
          // A degree of padding either side keeps the boundary visible without
          // relying on the hue change to mark it.
          return (
            <path
              key={z.tone}
              d={arc(cx, cy, r, from + (i === 0 ? 0 : 1.5), frac(z.to))}
              className={`gauge__zone gauge__zone--${z.tone} ${status === z.tone ? "is-active" : ""}`}
              fill="none"
            />
          );
        })}

        {needle != null && (
          <>
            <path d={arc(cx, cy, r, needle - 0.9, needle + 0.9)} className="gauge__needle" fill="none" />
            <circle {...polar(cx, cy, r, needle)} r="5.5" className="gauge__dot" />
          </>
        )}

        <text x={cx} y={cy + 2} className="gauge__value" textAnchor="middle">
          {value}
        </text>
        <text x={cx} y={cy + 26} className="gauge__status" textAnchor="middle">
          {statusText}
        </text>
      </svg>

      <span className="tile__sub">
        {target ? `of ${target}` : "no monthly target set"}
        {footnote ? ` · ${footnote}` : ""}
      </span>
    </div>
  );
}
