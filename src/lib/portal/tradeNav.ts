/**
 * The trade portal's five destinations, and the icons every trade screen draws.
 *
 * Five, in a floating pill at the bottom: Home, Pricebook, My van, Messages,
 * Tools. Everything else a tech looks up — codes, processes, the handbook,
 * videos, prices — lives one tap down, under Tools, which is how the design
 * keeps the bar to a size a gloved thumb can't miss on.
 *
 * Pure: no React, no database, no `server-only`.
 */

/** Stroke paths, 24×24. */
export const TRADE_ICON: Record<string, string> = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  price: "M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01",
  /* The office portal's truck: two real wheels, where the design's arcs of
     almost no length drew a speck. */
  van: "M3 6h11v9H3zM14 9h4l3 3v3h-7zM7.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  chat: "M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.6A8 8 0 1 1 21 12z",
  tools: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z",
  plus: "M12 5v14M5 12h14",
  box: "M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8",
  check: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9",
  warn: "M12 3l10 18H2zM12 10v4M12 17.5h.01",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  list: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  book: "M4 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2zM4 18a2 2 0 0 1 2-2h12",
  play: "M4 5h16v14H4zM10 9l5 3-5 3z",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
  pin: "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  wrench: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z",
  tag: "M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  chevron: "M9 6l6 6-6 6",
  back: "M15 6l-6 6 6 6",
  camera: "M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  tick: "M5 12l5 5L20 7",
  me: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  calc: "M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 7h8M8 12h1M12 12h1M16 12h0M8 16h1M12 16h1M16 16h0",
};

export type TradeDest = "home" | "pricebook" | "van" | "messages" | "tools";

export const TRADE_NAV: { key: TradeDest; href: string; label: string; icon: string }[] = [
  { key: "home", href: "/trade", label: "Home", icon: "home" },
  { key: "pricebook", href: "/trade/pricebook", label: "Pricebook", icon: "price" },
  { key: "van", href: "/trade/van", label: "My van", icon: "van" },
  { key: "messages", href: "/trade/messages", label: "Messages", icon: "chat" },
  { key: "tools", href: "/trade/tools", label: "Tools", icon: "tools" },
];

/** The look-ups under Tools, in the design's order. */
export const TRADE_TOOLS: { href: string; label: string; sub: string; icon: string; tint?: "warn" }[] = [
  { href: "/trade/codes", label: "Codes & sizing", sub: "Fault codes, sizing, rebates", icon: "search" },
  { href: "/trade/take5", label: "Take 5", sub: "Safety check before you start", icon: "shield", tint: "warn" },
  { href: "/trade/processes", label: "Processes", sub: "How we do every job", icon: "list" },
  { href: "/trade/handbook", label: "Handbook", sub: "The operations manual", icon: "book" },
  { href: "/trade/videos", label: "Videos", sub: "Method videos from the crew", icon: "play" },
  { href: "/trade/info", label: "Prices & info", sub: "Service prices, call-outs", icon: "info" },
];

/** The My van screens' tabs. */
export const VAN_TABS: { key: string; href: string; label: string }[] = [
  { key: "overview", href: "/trade/van", label: "Overview" },
  { key: "check", href: "/trade/van/check", label: "Weekly check" },
  { key: "report", href: "/trade/van/report", label: "Damage & service" },
  { key: "parts", href: "/trade/van/parts", label: "Order parts" },
  { key: "tools", href: "/trade/van/tools", label: "Tools & gear" },
];
