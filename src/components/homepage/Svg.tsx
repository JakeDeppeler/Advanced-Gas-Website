/** A single-path line icon, drawn in the current text colour unless told otherwise. */
export function Svg({ d, size = 18, stroke = "currentColor", width = 2 }: { d: string; size?: number; stroke?: string; width?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
