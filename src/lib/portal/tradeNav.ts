/**
 * The trade portal's destinations — the eleven places a tradesman can go.
 *
 * Three things have to agree about this list: the icon rail on the iPad, the
 * bottom tab bar on a phone, and the tiles on the home screen. The office
 * portal learned this the hard way — when its sidebar went, four pages were
 * stranded because the grid and the sidebar each had their own copy of the
 * list. So one array, read by all three.
 *
 * Pure: no React, no database, no `server-only`, so the client tab bar can
 * import it too.
 */

/** Stroke paths, 24×24, from the design source. */
export const TRADE_ICON: Record<string, string> = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  monday: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9",
  /* The design's van drew its wheels as `a2 2 0 1 0 0-.01` — an arc of almost
     no length, which renders as a speck or nothing at all. This is the office
     portal's truck, which draws two real wheels. */
  van: "M3 6h11v9H3zM14 9h4l3 3v3h-7zM7.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  price: "M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01",
  calc: "M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 7h8M8 12h1M12 12h1M16 12h0M8 16h1M12 16h1M16 16h0",
  tools: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z",
  processes: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  handbook: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5",
  learn: "M4 5h16v14H4zM10 9l5 3-5 3z",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
  me: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3",
};

export type TradeItem = {
  href: string;
  /** What the rail calls it — two words at most, it is 96px wide. */
  label: string;
  /** The longer name, for the home tile and the page heading. */
  full: string;
  icon: keyof typeof TRADE_ICON | string;
  /** On the phone's bottom bar. Four at most, or they stop being tappable. */
  bar?: boolean;
  /** A tile on the home screen. Everything not in the bar needs one, or it is
   *  unreachable on a phone. A string overrides the label on the tile, where
   *  the rail's word is too terse to stand on its own ("Info"). */
  tile?: boolean | string;
};

export const TRADE_NAV: TradeItem[] = [
  { href: "/trade", label: "Home", full: "Home", icon: "home", bar: true },
  { href: "/trade/monday", label: "Monday", full: "Monday van jobs", icon: "monday" },
  { href: "/trade/van", label: "My van", full: "My van", icon: "van", bar: true },
  { href: "/trade/pricebook", label: "Pricebook", full: "Pricebook", icon: "price", tile: true },
  { href: "/trade/calc", label: "Calc", full: "Job calculator", icon: "calc", bar: true },
  { href: "/trade/tools", label: "Tools", full: "Tools", icon: "tools", tile: true },
  { href: "/trade/processes", label: "Processes", full: "Processes & procedures", icon: "processes", tile: true },
  { href: "/trade/handbook", label: "Handbook", full: "Handbook", icon: "handbook", tile: true },
  { href: "/trade/videos", label: "Videos", full: "Videos", icon: "learn", tile: true },
  { href: "/trade/info", label: "Info", full: "Prices & info", icon: "info", tile: "Prices & info" },
  { href: "/trade/me", label: "Me", full: "My file", icon: "me", bar: true },
];

/**
 * Which item a path is on.
 *
 * Longest match wins, so /trade/van/history lights "My van" rather than
 * "Home" — and "/trade" only ever matches itself, because every other href
 * starts with it.
 */
export function activeTrade(pathname: string): TradeItem | null {
  let best: TradeItem | null = null;
  for (const it of TRADE_NAV) {
    const on = it.href === "/trade" ? pathname === "/trade" : pathname === it.href || pathname.startsWith(`${it.href}/`);
    if (on && (!best || it.href.length > best.href.length)) best = it;
  }
  return best;
}

export const TRADE_BAR = TRADE_NAV.filter((i) => i.bar);
export const TRADE_TILES = TRADE_NAV.filter((i) => i.tile);

/** What a home tile is called: its own override, else the rail's short word —
 *  never the long name, which wraps to two lines and lifts that one tile's
 *  icon off the row's baseline. */
export const tileLabel = (i: TradeItem) => (typeof i.tile === "string" ? i.tile : i.label);
