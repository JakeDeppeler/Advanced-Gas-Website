import type { ArtKind } from "@/lib/portal/pricebook";

const NAVY = "#04092f";
const SAND = "#d8cfbd";
const ORANGE = "#f36621";
const WHITE = "#ffffff";

/**
 * The pricebook's drawings: one flat line picture per kind of system, in the
 * design's palette, so a shelf reads at a glance without a photo library to
 * keep in step with the catalogue.
 */
export function ProductArt({ kind, label }: { kind: ArtKind; label: string }) {
  return (
    <svg viewBox="0 0 200 120" role="img" aria-label={label}>
      {art(kind)}
    </svg>
  );
}

function tank(x: number, y: number, w: number, h: number, cap = true) {
  return (
    <g>
      {cap && <rect x={x + w / 2 - 18} y={y - 14} width="36" height="16" rx="5" fill={NAVY} />}
      {cap && <circle cx={x + w / 2} cy={y - 6} r="4.5" fill="none" stroke={WHITE} strokeWidth="2" />}
      <rect x={x} y={y} width={w} height={h} rx="10" fill={WHITE} stroke={SAND} strokeWidth="3" />
      <rect x={x + w / 2 - 7} y={y + 18} width="14" height="4" rx="2" fill={ORANGE} />
    </g>
  );
}

function fanBox(x: number, y: number, s: number) {
  return (
    <g>
      <rect x={x} y={y} width={s} height={s * 0.82} rx="7" fill={NAVY} />
      <circle cx={x + s / 2} cy={y + s * 0.41} r={s * 0.26} fill="none" stroke={WHITE} strokeWidth="3" />
      <circle cx={x + s / 2} cy={y + s * 0.41} r={s * 0.07} fill={WHITE} />
    </g>
  );
}

function flame(cx: number, cy: number, s = 1) {
  return <path d={`M${cx} ${cy - 11 * s} C ${cx + 7 * s} ${cy - 3 * s}, ${cx + 6 * s} ${cy + 6 * s}, ${cx} ${cy + 7 * s} C ${cx - 6 * s} ${cy + 6 * s}, ${cx - 7 * s} ${cy - 3 * s}, ${cx} ${cy - 11 * s} Z`} fill={ORANGE} />;
}

function art(kind: ArtKind) {
  switch (kind) {
    case "hp-aio":
      return tank(80, 26, 40, 84);
    case "hp-split":
      return (
        <g>
          <line x1="104" y1="92" x2="132" y2="92" stroke={SAND} strokeWidth="4" />
          {tank(62, 18, 42, 92, false)}
          {fanBox(126, 66, 48)}
        </g>
      );
    case "split":
      return (
        <g>
          <rect x="36" y="30" width="128" height="34" rx="8" fill={WHITE} stroke={SAND} strokeWidth="3" />
          <rect x="52" y="50" width="96" height="3.5" rx="1.75" fill={NAVY} />
          <circle cx="148" cy="40" r="3" fill={ORANGE} />
          {[78, 100, 122].map((x) => (
            <path key={x} d={`M${x} 76 q 4 8 0 16`} fill="none" stroke={SAND} strokeWidth="3" strokeLinecap="round" />
          ))}
        </g>
      );
    case "multi":
      return (
        <g>
          <rect x="44" y="16" width="52" height="18" rx="5" fill={WHITE} stroke={SAND} strokeWidth="3" />
          <rect x="104" y="16" width="52" height="18" rx="5" fill={WHITE} stroke={SAND} strokeWidth="3" />
          <path d="M70 34 v12 h60 v-12 M100 46 v14" fill="none" stroke={SAND} strokeWidth="3" />
          {fanBox(78, 60, 44)}
        </g>
      );
    case "ducted":
      return (
        <g>
          <rect x="34" y="18" width="132" height="5" rx="2.5" fill={SAND} />
          <rect x="70" y="30" width="60" height="22" rx="6" fill={NAVY} />
          <path d="M70 41 H52 V78 M130 41 H148 V78" fill="none" stroke={SAND} strokeWidth="4" />
          <rect x="40" y="78" width="24" height="9" rx="3" fill={WHITE} stroke={NAVY} strokeWidth="2" />
          <rect x="136" y="78" width="24" height="9" rx="3" fill={WHITE} stroke={NAVY} strokeWidth="2" />
          <rect x="92" y="86" width="16" height="14" rx="3" fill={ORANGE} />
        </g>
      );
    case "evap":
      return (
        <g>
          <path d="M40 98 L100 70 L160 98" fill="none" stroke={SAND} strokeWidth="4" strokeLinecap="round" />
          <rect x="76" y="22" width="48" height="40" rx="5" fill={WHITE} stroke={SAND} strokeWidth="3" />
          {[32, 40, 48].map((y) => <rect key={y} x="84" y={y} width="32" height="3" rx="1.5" fill={NAVY} />)}
          <rect x="94" y="62" width="12" height="10" fill={NAVY} />
        </g>
      );
    case "gas-flow":
      return (
        <g>
          <rect x="62" y="14" width="6" height="96" rx="3" fill={SAND} />
          <rect x="86" y="26" width="48" height="66" rx="8" fill={WHITE} stroke={SAND} strokeWidth="3" />
          <rect x="100" y="38" width="20" height="4" rx="2" fill={NAVY} />
          {flame(110, 68)}
        </g>
      );
    case "gas-heater":
      return (
        <g>
          <rect x="66" y="22" width="68" height="76" rx="8" fill={NAVY} />
          {[36, 44, 52].map((y) => <rect key={y} x="78" y={y} width="44" height="3" rx="1.5" fill="#2a3170" />)}
          {flame(100, 78, 1.1)}
        </g>
      );
    case "gas-tank":
      return (
        <g>
          {tank(78, 18, 44, 84, false)}
          {flame(100, 88, 0.8)}
        </g>
      );
    case "controls":
      return (
        <g>
          <rect x="70" y="24" width="60" height="72" rx="10" fill={WHITE} stroke={SAND} strokeWidth="3" />
          <rect x="80" y="34" width="40" height="26" rx="4" fill={NAVY} />
          <text x="100" y="52" textAnchor="middle" fontSize="12" fontWeight="800" fill={WHITE} fontFamily="Archivo, sans-serif">22°</text>
          <circle cx="100" cy="78" r="6" fill={ORANGE} />
        </g>
      );
  }
}
