/**
 * Who the portal is for, and what that business has.
 *
 * Settings rather than code because the portal is built for AGA first and for
 * other trade businesses after: the name at the top of the side bar, and
 * whether there's an office TV, vans, iPads in the vans or real estate work.
 * A business without one of those doesn't see the pages for it.
 *
 * Pure — shared by the settings form in the browser and the server.
 */

export type BusinessHas = {
  /** An office TV running the wall board. Off hides the Wall board section. */
  wall: boolean;
  /** Vans with drivers. Off hides Vehicles. */
  vans: boolean;
  /** Techs on the trade iPad. Off hides the link to it. */
  ipad: boolean;
  /** Real estate and agency work. Off will hide the real estate split. */
  agents: boolean;
};

export type Business = {
  name: string;
  /** The second line under the name; blank when the name is one line. */
  name2: string;
  /** Two or three letters for the badge. */
  short: string;
  has: BusinessHas;
};

export const DEFAULT_BUSINESS: Business = {
  name: "Advanced",
  name2: "Gas & Aircon",
  short: "AG",
  has: { wall: true, vans: true, ipad: true, agents: true },
};

const text = (v: unknown, max: number, dflt: string) => (typeof v === "string" ? v.trim().slice(0, max) : dflt);

/**
 * Whatever is stored, as a whole Business. A key that isn't there is on, so a
 * business that never opened Settings sees everything rather than nothing.
 */
export function normaliseBusiness(raw: unknown): Business {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const has = (r.has && typeof r.has === "object" ? r.has : {}) as Record<string, unknown>;
  const name = text(r.name, 40, DEFAULT_BUSINESS.name) || DEFAULT_BUSINESS.name;
  return {
    name,
    name2: text(r.name2, 40, DEFAULT_BUSINESS.name2),
    short: (text(r.short, 3, DEFAULT_BUSINESS.short) || name.slice(0, 2)).toUpperCase(),
    has: {
      wall: has.wall !== false,
      vans: has.vans !== false,
      ipad: has.ipad !== false,
      agents: has.agents !== false,
    },
  };
}

/** Light, dark, or whatever the computer is set to. Kept per device. */
export type ThemeChoice = "light" | "dark" | "system";
export const THEME_COOKIE = "pt_theme";
export const readTheme = (v: string | undefined): ThemeChoice => (v === "dark" || v === "system" ? v : "light");

/** The side bar open or small. Kept per device. */
export const NAV_COOKIE = "pt_nav";

/** Where the portal opens. Kept per device, like the theme. */
export const START_COOKIE = "pt_start";
export const START_PAGES: { key: string; label: string; href: string; needs?: "office" | "wall" }[] = [
  { key: "home", label: "Home", href: "/portal" },
  { key: "todo", label: "CRM › To-do", href: "/portal/todo" },
  { key: "today", label: "CRM › Today", href: "/portal/today", needs: "office" },
  { key: "kpis", label: "Finance › KPIs", href: "/portal/kpis", needs: "office" },
  { key: "pipeline", label: "CRM › Quotes", href: "/portal/pipeline", needs: "office" },
  { key: "wall", label: "Settings › Wall board remote", href: "/portal/board/remote", needs: "wall" },
];
