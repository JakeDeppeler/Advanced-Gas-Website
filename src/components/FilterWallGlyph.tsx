/**
 * A drawn FilterWall, for the slots where the product photo hasn't
 * arrived yet.
 *
 * Better than an empty grey box and better than borrowing the
 * manufacturer's render: it's ours, it's the right shape, and it makes
 * the card look finished rather than broken. Swaps out automatically the
 * moment a real photo lands in /public.
 */
export function FilterWallGlyph({ large = false }: { large?: boolean }) {
  return (
    <svg
      viewBox="0 0 220 200"
      role="img"
      aria-label="Whole-house filter unit"
      className={large ? "fwglyph fwglyph--lg" : "fwglyph"}
    >
      <rect width="220" height="200" fill="none" />
      <ellipse cx="110" cy="168" rx="66" ry="7" fill="#0B1450" opacity="0.10" />
      {/* cover */}
      <rect x="52" y="40" width="116" height="126" rx="6" fill="#E7E4DA" stroke="#0B1450" strokeWidth="2.5" />
      <path d="M52 40 h116 v9 H52z" fill="#0B1450" opacity="0.18" />
      <rect x="52" y="158" width="116" height="8" rx="2.5" fill="#0B1450" opacity="0.28" />
      {/* badge */}
      <rect x="94" y="92" width="32" height="7" rx="3.5" fill="#0B1450" opacity="0.35" />
      {/* pipework */}
      <path d="M34 112 H52M168 112 H186" stroke="#00B0ED" strokeWidth="5" strokeLinecap="round" />
      <circle cx="34" cy="112" r="4" fill="#F36722" />
      <circle cx="186" cy="112" r="4" fill="#F36722" />
    </svg>
  );
}
