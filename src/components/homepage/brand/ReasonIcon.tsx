/**
 * The drawn icons on the brand pages' "Why we choose" cards (Jake, Nov 2026),
 * in the finder tiles' style. They replaced a product shot per card: four
 * cut-outs of the same tank said nothing about "-7 °C" or "same day", where
 * a snowflake and a clock do. The brand's colour is currentColor; navy and
 * the soft fills are fixed so every brand's set reads as one family.
 */
export type ReasonIconName =
  | "clock" | "heritage" | "star" | "wrench" | "check" | "quiet" | "controller" | "cold" | "shield"
  | "aus" | "leaf" | "rebate" | "bolt" | "tank" | "duct" | "heatcool" | "range" | "fan" | "zones";

const N = "#050A30";
const L = { fill: "none", stroke: "currentColor", strokeWidth: 3.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const K = { ...L, stroke: N };

const DRAW: Record<ReasonIconName, JSX.Element> = {
  clock: (<><circle cx="32" cy="34" r="20" {...K} /><path d="M32 22 V34 L41 39" {...L} /><path d="M26 10 H38" {...K} /></>),
  heritage: (<><rect x="12" y="16" width="40" height="36" rx="5" {...K} /><path d="M12 26 H52" {...K} /><path d="M22 11 V19 M42 11 V19" {...K} /><path d="M24 40 L29 45 L41 33" {...L} /></>),
  star: (<path d="M32 10 L38.5 24 L53 25.5 L42 35.5 L45.5 50 L32 42.5 L18.5 50 L22 35.5 L11 25.5 L25.5 24 Z" {...L} fill="currentColor" fillOpacity=".15" />),
  wrench: (<><path d="M41 12 a12 12 0 0 0 -11 16 L13 45 a4.5 4.5 0 0 0 6 6 L36 34 a12 12 0 0 0 16 -11 l-7 4 l-6 -2 l-2 -6 Z" {...K} /><circle cx="17" cy="47" r="1.5" fill={N} /><path d="M44 44 L52 52" {...L} /></>),
  check: (<><path d="M32 8 L50 15 V31 C50 43 42 51 32 56 C22 51 14 43 14 31 V15 Z" {...K} /><path d="M23 32 L30 39 L42 26" {...L} /></>),
  quiet: (<><path d="M10 26 H18 L28 17 V47 L18 38 H10 Z" {...K} /><path d="M36 26 q4 6 0 12" {...L} /><path d="M43 21 q8 11 0 22" {...L} strokeOpacity=".55" /><path d="M50 16 q12 16 0 32" {...L} strokeOpacity=".25" /></>),
  controller: (<><rect x="14" y="10" width="36" height="44" rx="6" {...K} /><circle cx="32" cy="30" r="10" {...L} /><path d="M32 24 V30" {...L} /><path d="M22 46 H42" {...K} /></>),
  cold: (<><path d="M32 8 V56 M11 20 L53 44 M11 44 L53 20" {...L} /><path d="M26 12 L32 18 L38 12 M26 52 L32 46 L38 52" {...L} /></>),
  shield: (<><path d="M32 8 L50 15 V31 C50 43 42 51 32 56 C22 51 14 43 14 31 V15 Z" {...L} fill="currentColor" fillOpacity=".12" /><path d="M24 31 L30 37 L41 25" {...K} /></>),
  aus: (<><circle cx="32" cy="32" r="22" {...K} /><g fill="currentColor">{[[32, 18, 3.6], [24, 30, 3], [40, 28, 3], [33, 42, 3.6], [36, 34, 1.8]].map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />)}</g></>),
  leaf: (<><path d="M14 50 C14 26 30 14 52 12 C52 36 40 50 18 50" {...L} fill="currentColor" fillOpacity=".12" /><path d="M14 50 L38 26" {...K} /></>),
  rebate: (<><path d="M12 14 H32 L52 34 L34 52 L14 32 Z" {...L} fill="currentColor" fillOpacity=".12" /><circle cx="23" cy="23" r="3.5" fill="currentColor" /><path d="M30 40 L40 30" {...K} /></>),
  bolt: (<path d="M36 8 L16 36 H30 L26 56 L48 26 H34 Z" {...L} fill="currentColor" fillOpacity=".15" />),
  tank: (<><rect x="20" y="10" width="24" height="44" rx="8" {...K} /><path d="M20 30 H44" {...L} /><path d="M27 54 V58 M37 54 V58" {...K} /><path d="M50 18 V46 M47 21 L50 18 L53 21 M47 43 L50 46 L53 43" {...L} strokeWidth={2.5} /></>),
  duct: (<><path d="M8 30 L32 12 L56 30" {...K} /><path d="M14 26 V52 H50 V26" {...K} /><path d="M18 36 H30 V48 M46 36 H34 V48" {...L} /></>),
  heatcool: (<><circle cx="22" cy="24" r="8" {...L} /><path d="M22 8 V11 M22 37 V40 M6 24 H9 M35 24 H38 M11 13 L13 15 M31 33 L33 35 M11 35 L13 33 M31 15 L33 13" {...L} /><path d="M44 30 V56 M33 37 L55 49 M33 49 L55 37" {...K} /></>),
  range: (<><rect x="10" y="12" width="20" height="18" rx="3" {...K} /><rect x="34" y="12" width="20" height="18" rx="3" {...L} /><rect x="10" y="34" width="20" height="18" rx="3" {...L} /><rect x="34" y="34" width="20" height="18" rx="3" {...K} /></>),
  fan: (<><circle cx="32" cy="32" r="22" {...K} />{[0, 120, 240].map((a) => <path key={a} d="M32 32 C30 24 33 16 39 14 C42 22 38 29 32 32Z" fill="currentColor" transform={`rotate(${a} 32 32)`} />)}<circle cx="32" cy="32" r="3" fill={N} /></>),
  zones: (<><rect x="10" y="12" width="44" height="40" rx="4" {...K} /><path d="M30 12 V34 H10 M30 26 H54 M40 26 V52" {...K} /><rect x="14" y="16" width="12" height="14" rx="1.5" fill="currentColor" fillOpacity=".3" /><rect x="44" y="30" width="6" height="18" rx="1.5" fill="currentColor" fillOpacity=".3" /></>),
};

export function ReasonIcon({ name }: { name: ReasonIconName }) {
  return <svg viewBox="0 0 64 64" aria-hidden="true">{DRAW[name]}</svg>;
}

