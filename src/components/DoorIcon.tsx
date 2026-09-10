/**
 * The little icons on the "start here" doors, both sides of the site.
 *
 * Inline rather than an icon font or a sprite: there are eight of them, they
 * are on the first screen, and a request for a sprite sheet to draw eight
 * 20px glyphs costs more than the glyphs do. Stroke-based so they take the
 * colour of the block they sit in.
 */

export type DoorIconKey =
  | "heatpump" | "climate" | "rebate" | "service"
  | "fitout" | "plant" | "maintenance" | "breakdown";

const PATHS: Record<DoorIconKey, React.ReactNode> = {
  // A droplet — heat pump hot water.
  heatpump: <path d="M12 3s6.5 6.9 6.5 10.8a6.5 6.5 0 0 1-13 0C5.5 9.9 12 3 12 3z" />,
  // A snowflake — heating and cooling.
  climate: <><path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1" /></>,
  // A price tag — the rebate.
  rebate: <><path d="M20.6 13.4 12 4.8H4.8V12l8.6 8.6a2 2 0 0 0 2.8 0l4.4-4.4a2 2 0 0 0 0-2.8z" /><path d="M8.6 8.6h.01" /></>,
  // A spanner — servicing.
  service: <path d="M14.6 6.3a1 1 0 0 0 0 1.4l1.7 1.7a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.8 3.8z" />,
  // A building — fit-outs.
  fitout: <><path d="M3 21h18M5 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17M15 21V9h4a1 1 0 0 1 1 1v11" /><path d="M8 7h4M8 11h4M8 15h4" /></>,
  // Arrows swapping — plant replacement.
  plant: <><path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" /></>,
  // A calendar with a tick — scheduled maintenance.
  maintenance: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M9.5 15.5l2 2 3.5-3.5" /></>,
  // A warning triangle — breakdowns.
  breakdown: <><path d="M10.3 3.9 2.4 17.4A2 2 0 0 0 4.1 20.4h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>,
};

export function DoorIcon({ name }: { name: DoorIconKey }) {
  return (
    <svg
      width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
