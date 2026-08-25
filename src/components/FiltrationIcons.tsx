/**
 * Line icons for the everyday-benefits tiles.
 *
 * Inline SVG rather than an icon font or a sprite: five glyphs, no extra
 * request, and they inherit currentColor so they sit correctly on any of
 * the five tints without a second set for dark backgrounds.
 */
export function FiltrationIcon({ name }: { name: string }) {
  const common = {
    width: 40,
    height: 40,
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "tap":
      return (
        <svg {...common}>
          <path d="M14 34h20M18 34v-6a6 6 0 0 1 6-6h4" />
          <path d="M28 22v-6a5 5 0 0 1 10 0v3" />
          <path d="M22 40h4" />
          <circle cx="24" cy="41" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    case "shower":
      return (
        <svg {...common}>
          <path d="M14 20a10 10 0 0 1 20 0z" />
          <path d="M24 20v-8a4 4 0 0 1 8 0" />
          <path d="M18 28v3M24 28v5M30 28v3M21 35v3M27 35v3" />
        </svg>
      );
    case "basin":
      return (
        <svg {...common}>
          <path d="M12 24h24v6a8 8 0 0 1-8 8h-8a8 8 0 0 1-8-8z" />
          <path d="M24 24v-8a4 4 0 0 1 8 0v2" />
          <path d="M10 24h28" />
        </svg>
      );
    case "washer":
      return (
        <svg {...common}>
          <rect x="12" y="10" width="24" height="28" rx="3" />
          <circle cx="24" cy="27" r="7" />
          <path d="M20 27a4 4 0 0 1 8 0" />
          <circle cx="18" cy="16" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="23" cy="16" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      );
    case "hose":
      return (
        <svg {...common}>
          <path d="M12 20h12v8H12z" />
          <path d="M24 24h6" />
          <path d="M30 20h4v8h-4z" />
          <path d="M34 24c4 0 6 3 6 7s-3 7-7 7" />
          <path d="M14 32v6M20 32v6" />
        </svg>
      );
    default:
      return null;
  }
}
