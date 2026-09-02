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
    case "tank":
      return (
        <svg {...common}>
          <rect x="15" y="10" width="18" height="28" rx="4" />
          <path d="M15 30h18" />
          <path d="M24 38v4M20 42h8" />
          <path d="M19 16h6" />
        </svg>
      );
    case "element":
      return (
        <svg {...common}>
          <rect x="10" y="14" width="28" height="20" rx="4" />
          <path d="M16 30c3 0 3-8 6-8s3 8 6 8 3-8 4-8" />
          <path d="M14 34h20" />
        </svg>
      );
    case "flow":
      return (
        <svg {...common}>
          <path d="M10 24h6l4-8 6 16 5-12 3 4h4" />
          <circle cx="10" cy="24" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="38" cy="24" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "heatpump":
      return (
        <svg {...common}>
          <rect x="9" y="16" width="18" height="16" rx="3" />
          <path d="M13 20v8M17 20v8M21 20v8" />
          <rect x="31" y="12" width="8" height="24" rx="4" />
          <path d="M35 18v12" />
        </svg>
      );
    case "valve":
      return (
        <svg {...common}>
          <path d="M8 24h10M30 24h10" />
          <circle cx="24" cy="24" r="6" />
          <path d="M24 18v-6M20 12h8" />
        </svg>
      );
    case "kettle":
      return (
        <svg {...common}>
          <path d="M14 20h18a2 2 0 0 1 2 2v10a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V22a2 2 0 0 1 2-2z" />
          <path d="M34 24l5-4" />
          <path d="M18 20v-3a3 3 0 0 1 3-3h4" />
          <path d="M12 38h24" />
        </svg>
      );
    case "fridge":
      return (
        <svg {...common}>
          <rect x="15" y="8" width="18" height="32" rx="3" />
          <path d="M15 20h18" />
          <path d="M19 14v3M19 25v4" />
        </svg>
      );
    case "pot":
      return (
        <svg {...common}>
          <path d="M12 20h24v12a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z" />
          <path d="M10 20h28" />
          <path d="M36 23h4v5h-4M12 23H8v5h4" />
          <path d="M20 15c0-2 2-2 2-4M26 15c0-2 2-2 2-4" />
        </svg>
      );
    case "bottle":
      return (
        <svg {...common}>
          <path d="M21 8h6v6l3 4v20a2 2 0 0 1-2 2H20a2 2 0 0 1-2-2V18l3-4z" />
          <path d="M18 26h12" />
        </svg>
      );
    case "snowflake":
      return (
        <svg {...common}>
          <path d="M24 8v32M10 15l28 18M38 15L10 33" />
          <path d="M24 14l-4-4M24 14l4-4M24 34l-4 4M24 34l4 4" />
        </svg>
      );
    case "flame":
      return (
        <svg {...common}>
          <path d="M24 40c-6 0-10-4-10-9 0-7 7-9 7-16 0 0 6 3 6 9 2-1 3-3 3-5 3 3 4 7 4 12 0 5-4 9-10 9z" />
        </svg>
      );
    case "wrench":
      return (
        <svg {...common}>
          <path d="M33 11a8 8 0 0 0-10 10L12 32a3 3 0 0 0 0 4l2 2a3 3 0 0 0 4 0l11-11a8 8 0 0 0 10-10l-5 5-5-1-1-5z" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M24 8l14 5v11c0 9-6 14-14 18-8-4-14-9-14-18V13z" />
          <path d="M18 24l4 4 8-8" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="15" />
          <path d="M24 15v9l6 4" />
        </svg>
      );
    case "ruler":
      return (
        <svg {...common}>
          <rect x="7" y="18" width="34" height="12" rx="2" transform="rotate(-12 24 24)" />
          <path d="M15 20v4M21 19v6M27 18v4M33 17v6" />
        </svg>
      );
    case "people":
      return (
        <svg {...common}>
          <circle cx="18" cy="18" r="5" />
          <circle cx="31" cy="20" r="4" />
          <path d="M9 37c0-5 4-9 9-9s9 4 9 9" />
          <path d="M29 28c5 0 9 4 9 9" />
        </svg>
      );
    case "tag":
      return (
        <svg {...common}>
          <path d="M9 9h14l16 16-14 14L9 23z" />
          <circle cx="17" cy="17" r="2.6" />
        </svg>
      );
    case "truck":
      return (
        <svg {...common}>
          <path d="M6 15h20v16H6z" />
          <path d="M26 21h7l5 6v4h-12z" />
          <circle cx="14" cy="35" r="3" />
          <circle cx="32" cy="35" r="3" />
        </svg>
      );
    case "alarm":
      return (
        <svg {...common}>
          <path d="M24 10a10 10 0 0 1 10 10v7l3 5H11l3-5v-7a10 10 0 0 1 10-10z" />
          <path d="M21 37a3 3 0 0 0 6 0" />
        </svg>
      );
    case "phone":
      return (
        <svg {...common}>
          <path d="M15 9l5 6-4 4c2 5 6 9 11 11l4-4 6 5-4 5c-2 2-5 2-8 0-8-4-14-11-17-19-2-3-2-6 0-8z" />
        </svg>
      );
    case "gauge":
      return (
        <svg {...common}>
          <path d="M10 32a15 15 0 1 1 28 0" />
          <path d="M24 32l8-8" />
          <circle cx="24" cy="32" r="2.4" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return null;
  }
}
