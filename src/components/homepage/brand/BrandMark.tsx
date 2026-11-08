/**
 * Mitsubishi Electric's three-diamond mark and wordmark, drawn in SVG so it
 * stays sharp at any size and can animate (each diamond is its own path,
 * so the hero can bring them in one after another).
 *
 * The geometry: three rhombuses with 60° tips, meeting at one point and
 * turned 120° from each other. The long diagonal is √3 times the short one.
 * The wordmark is set in the site's display face; it is close to the real
 * lettering, not a copy of it.
 */
const D1 = 100; // long diagonal
const D2 = D1 / Math.sqrt(3); // short diagonal
const DIAMOND = `M0 0 L${(D2 / 2).toFixed(2)} ${-D1 / 2} L0 ${-D1} L${(-D2 / 2).toFixed(2)} ${-D1 / 2} Z`;

export function ThreeDiamonds({ className, title = "Mitsubishi Electric" }: { className?: string; title?: string }) {
  return (
    <svg className={className} viewBox="-90 -104 180 160" role="img" aria-label={title}>
      {[0, 120, 240].map((r, i) => (
        <path key={r} className="bm__d" style={{ ["--i" as string]: i }} d={DIAMOND} transform={`rotate(${r})`} fill="#E60012" />
      ))}
    </svg>
  );
}

/** The mark with the name beside it, for the hero and the brand block. */
export function BrandLockup({ tone = "light", className = "" }: { tone?: "light" | "dark"; className?: string }) {
  return (
    <span className={`bm bm--${tone} ${className}`}>
      <ThreeDiamonds className="bm__mark" />
      <span className="bm__word" aria-hidden="true">MITSUBISHI<br />ELECTRIC</span>
    </span>
  );
}
