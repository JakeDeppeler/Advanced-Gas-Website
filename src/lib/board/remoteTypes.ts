/**
 * The wall board's remote: what the portal has asked the TV to do.
 *
 * Shared by the board (a client component on the TV) and the portal's Remote
 * page, so it carries no server code. The state lives in portal_settings under
 * "board-remote"; see remote.ts.
 */

/** The board's pages, in the order it turns them. The board reads its list from here. */
export const BOARD_PAGES = ["Today", "Pace", "Quotes", "Invoices", "Team", "Performance", "Areas"] as const;
export type BoardPageName = (typeof BOARD_PAGES)[number];

/** The board's three alerts, as the demo shows them: a sale, a quote, a job to bill. */
export type DemoKind = "sold" | "quote" | "done";

export type BoardRemote = {
  /**
   * The page to show and whether to stay on it. A new id is a new press: a
   * board acts on each id once, so somebody at the TV can still skip after it.
   * A board that loads while a page is held goes straight to it.
   */
  view: { id: string; page: BoardPageName | null; hold: boolean } | null;
  /** A sample alert on a loop until `until`, marked as a sample on screen. */
  demo: { id: string; kind: DemoKind; until: string } | null;
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
};

export const EMPTY_REMOTE: BoardRemote = { view: null, demo: null, theme: null, reload: null, liveUntil: null, by: null, at: null };

const isPage = (v: unknown): v is BoardPageName => typeof v === "string" && (BOARD_PAGES as readonly string[]).includes(v);
const isDemo = (v: unknown): v is DemoKind => v === "sold" || v === "quote" || v === "done";
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

/** Whatever is stored, as a remote the board can trust. */
export function normaliseRemote(v: unknown): BoardRemote {
  if (!v || typeof v !== "object") return EMPTY_REMOTE;
  const r = v as Record<string, unknown>;
  const view = r.view as Record<string, unknown> | null | undefined;
  const demo = r.demo as Record<string, unknown> | null | undefined;
  return {
    view: view && str(view.id) ? { id: String(view.id), page: isPage(view.page) ? view.page : null, hold: view.hold === true } : null,
    demo: demo && str(demo.id) && isDemo(demo.kind) && str(demo.until) ? { id: String(demo.id), kind: demo.kind, until: String(demo.until) } : null,
    theme: r.theme === "dark" || r.theme === "light" ? r.theme : null,
    reload: str(r.reload),
    liveUntil: str(r.liveUntil),
    by: str(r.by),
    at: str(r.at),
  };
}
