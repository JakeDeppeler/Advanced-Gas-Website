/**
 * The wall board's remote: what the portal has asked the TV to do.
 *
 * Shared by the board (a client component on the TV) and the portal's Remote
 * page, so it carries no server code. The state lives in portal_settings under
 * "board-remote"; see remote.ts.
 */

/**
 * The board's pages, in the order it turns them. The board reads its list from here.
 *
 * A name is the key to everything a page has — its grid, its subtitle, its
 * component — so renaming one is renaming all three, and a stored remote
 * press naming the old one falls back to "whatever is up" rather than
 * breaking. "On hold" was here until the office asked for the money owed and
 * owing in its place; the held-work view it replaced is at /portal/stuck.
 */
export const BOARD_PAGES = ["Today", "Pace", "Quotes", "Money", "Invoices", "Daily pace", "Team", "Performance", "Areas"] as const;
export type BoardPageName = (typeof BOARD_PAGES)[number];

/** The board's alerts, as the demo shows them: a sale, a quote, a job to bill, a new lead. */
import { normalisePlan, type SoundPlan } from "@/lib/board/soundTypes";

/**
 * The sample alerts the remote can put on the wall.
 *
 * One list, and everything that validates a demo reads it. It was four
 * separate hardcoded lists — this type, the guard below, the server action
 * behind the button, and the board's own `?alert=` — and adding a fourth kind
 * updated two of them, so the button answered "No such alert." on a kind the
 * board could render perfectly well.
 */
export const DEMO_KINDS = ["sold", "quote", "done", "lead"] as const;
export type DemoKind = (typeof DEMO_KINDS)[number];

export const isDemoKind = (v: unknown): v is DemoKind =>
  typeof v === "string" && (DEMO_KINDS as readonly string[]).includes(v);

export type BoardRemote = {
  /**
   * The page to show and whether to stay on it. A new id is a new press: a
   * board acts on each id once, so somebody at the TV can still skip after it.
   * A board that loads while a page is held goes straight to it.
   */
  view: { id: string; page: BoardPageName | null; hold: boolean } | null;
  /** A sample alert on a loop until `until`, marked as a sample on screen. */
  demo: { id: string; kind: DemoKind; until: string; once?: boolean } | null;
  /** Null: whatever the TV's own address says. */
  theme: "light" | "dark" | null;
  /** A new id reloads every board that has seen the old one. */
  reload: string | null;
  /**
   * Until when somebody has the Remote page open. Boards check for presses
   * every few seconds only until then — the rest of the day they read the
   * remote with the figures, every thirty seconds, at no extra cost.
   */
  liveUntil: string | null;
  by: string | null;
  at: string | null;
  /**
   * Which sound each pop-up makes and how loud, from the Sounds page. Rides
   * with the remote so a change reaches the wall within seconds and without a
   * reload. Null: the board plays what it always has.
   */
  sounds?: SoundPlan | null;
};

export const EMPTY_REMOTE: BoardRemote = { view: null, demo: null, theme: null, reload: null, liveUntil: null, by: null, at: null };

const isPage = (v: unknown): v is BoardPageName => typeof v === "string" && (BOARD_PAGES as readonly string[]).includes(v);
const isDemo = isDemoKind;
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

/** Whatever is stored, as a remote the board can trust. */
export function normaliseRemote(v: unknown): BoardRemote {
  if (!v || typeof v !== "object") return EMPTY_REMOTE;
  const r = v as Record<string, unknown>;
  const view = r.view as Record<string, unknown> | null | undefined;
  const demo = r.demo as Record<string, unknown> | null | undefined;
  return {
    view: view && str(view.id) ? { id: String(view.id), page: isPage(view.page) ? view.page : null, hold: view.hold === true } : null,
    demo: demo && str(demo.id) && isDemo(demo.kind) && str(demo.until)
      ? { id: String(demo.id), kind: demo.kind, until: String(demo.until), ...(demo.once === true ? { once: true } : {}) }
      : null,
    theme: r.theme === "dark" || r.theme === "light" ? r.theme : null,
    reload: str(r.reload),
    liveUntil: str(r.liveUntil),
    by: str(r.by),
    at: str(r.at),
    sounds: r.sounds && typeof r.sounds === "object" ? normalisePlan(r.sounds) : null,
  };
}
