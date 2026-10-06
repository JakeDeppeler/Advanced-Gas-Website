"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * The team portal's side bar, to the design's SideNav: the brand and its «,
 * the search, Home, the tabs the home page is grouped into, and you at
 * the foot — the whole of the portal's chrome, so the page itself starts at
 * the top with nothing over it.
 *
 * Open it is 288 wide. A tab's header goes to that tab's page — its options as
 * cards — and the arrow beside it shows only that tab's pages in the bar, each
 * with its own count (Leads 236, Quotes 42 out). One tab open at a time is what
 * stops it becoming the sidebar the portal dropped in October, which had every
 * destination open at once. The number beside a tab is how many of Home's
 * "Needs someone today" lines open one of its pages.
 *
 * Small it is 84 wide, icons only: a tab's icon goes to its page, and hovering
 * it slides the pages out. « and » switch; the choice is a cookie, so the
 * server draws the right width first time.
 *
 * On a phone it is a drawer, opened from the menu button in the phone's bar.
 *
 * The search and the foot (bell, you, sign out) are server-rendered and handed
 * in, and the counts arrive a moment after the page: see PortalShell.
 */

export type SidePage = { href: string; label: string; badge?: string };
export type SideTab = { key: string; label: string; icon: string; pages: SidePage[]; need?: number };

const COOKIE = "pt_nav";
export const OPEN_EVENT = "pt-nav:open";

const HOME_ICON = "M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10";
const TODO_ICON = "M9 6h11M9 12h11M9 18h11M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 11M3.5 18l1.5 1.5L7.5 17";

/** The To-do link's count: mine overdue or due today, and how many of those are overdue. */
export type TodoCount = { due: number; overdue: number };

function Ic({ d, size = 20 }: { d: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const Chev = () => (
  <svg className="pt-side__chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

/**
 * Which page the address is on. Some pages are one route with a tab in the
 * query (Website leads, On the site, Drop-off are all /portal/website), so a
 * link with a query wins only when the query matches; otherwise the longest
 * path that the address starts with.
 */
function activeHref(tabs: SideTab[], path: string, query: URLSearchParams): string | null {
  let best: { href: string; score: number } | null = null;
  for (const t of tabs) {
    for (const p of t.pages) {
      const [base, qs] = p.href.split("?");
      const onPath = path === base || path.startsWith(`${base}/`);
      if (!onPath) continue;
      let score = base.length * 10;
      if (qs) {
        const want = new URLSearchParams(qs);
        if (![...want.entries()].every(([k, v]) => query.get(k) === v)) continue;
        score += 5;
      } else if (query.get("tab") && t.pages.some((o) => o.href.startsWith(`${base}?`) && new URLSearchParams(o.href.split("?")[1]).get("tab") === query.get("tab"))) {
        // A sibling link names this exact tab; let it have the highlight.
        continue;
      }
      if (!best || score > best.score) best = { href: p.href, score };
    }
  }
  return best?.href ?? null;
}

export function SideNav({ tabs, small: initialSmall, search, foot, todo }: {
  tabs: SideTab[];
  small: boolean;
  search: ReactNode;
  foot: ReactNode;
  todo?: TodoCount;
}) {
  const path = usePathname() ?? "";
  const query = useSearchParams() ?? new URLSearchParams();
  const active = activeHref(tabs, path, new URLSearchParams(query.toString()));
  const home = path === "/portal";
  const onTodo = path === "/portal/todo";
  // A tab's own page (/portal/section/run) belongs to that tab.
  const sectionKey = path.startsWith("/portal/section/") ? path.split("/")[3] ?? null : null;
  const activeTab = sectionKey ?? tabs.find((t) => t.pages.some((p) => p.href === active))?.key ?? null;

  const [smallPref, setSmall] = useState(initialSmall);
  // On a phone the bar is a drawer, and a drawer of bare icons would be a menu
  // you can't read, so it always opens full width there.
  const [phone, setPhone] = useState(false);
  const small = smallPref && !phone;
  const [openTab, setOpenTab] = useState<string | null>(activeTab);
  const [flyout, setFlyout] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const ref = useRef<HTMLElement>(null);
  // Hover opens a small tab's pages and leaving closes them a moment later, so
  // the pointer can cross the gap from the icon to the list.
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = (key: string) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setFlyout(key);
  };
  const hideSoon = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setFlyout(null), 220);
  };

  // Moving to another page closes anything that slid out, and opens the tab
  // the new page belongs to.
  useEffect(() => {
    setFlyout(null);
    setDrawer(false);
    if (activeTab) setOpenTab(activeTab);
  }, [path, activeTab]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const sync = () => setPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const open = () => setDrawer(true);
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setFlyout(null); setDrawer(false); } };
    const click = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setFlyout(null); };
    window.addEventListener(OPEN_EVENT, open);
    window.addEventListener("keydown", key);
    document.addEventListener("mousedown", click);
    return () => {
      window.removeEventListener(OPEN_EVENT, open);
      window.removeEventListener("keydown", key);
      document.removeEventListener("mousedown", click);
    };
  }, []);

  function toggleSize() {
    const next = !smallPref;
    setSmall(next);
    setFlyout(null);
    // The page column's width hangs off this class, so it changes with the bar
    // rather than a render later.
    document.querySelector(".pt")?.classList.toggle("pt--navsmall", next);
    try {
      document.cookie = `${COOKIE}=${next ? "small" : "open"}; path=/portal; max-age=31536000; samesite=lax`;
    } catch {
      /* The bar still works; it just won't be remembered. */
    }
  }

  return (
    <>
      <aside ref={ref} className={`pt-side${small ? " is-small" : ""}${drawer ? " is-drawer" : ""}`} aria-label="Portal">
        <div className="pt-side__brand">
          {!small && (
            <Link href="/portal" className="pt-side__logo" aria-label="Portal home">
              <strong>Advanced</strong>
              <em>Gas &amp; Aircon · Team portal</em>
            </Link>
          )}
          <button type="button" className="pt-side__size" onClick={toggleSize} aria-label={small ? "Open the side bar" : "Make the side bar small"} title={small ? "Open the side bar" : "Make the side bar small"}>
            <span aria-hidden="true">{small ? "»" : "«"}</span>
          </button>
          <button type="button" className="pt-side__close" onClick={() => setDrawer(false)} aria-label="Close the menu">×</button>
        </div>

        {small ? (
          <button type="button" className="pt-side__home pt-side__searchbtn" onClick={toggleSize} aria-label="Search — opens the side bar" title="Search">
            <Ic d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3" size={19} />
          </button>
        ) : (
          <div className="pt-side__search">{search}</div>
        )}

        <nav className="pt-side__nav">
          <Link href="/portal" className={`pt-side__home${home ? " is-on" : ""}`} aria-current={home ? "page" : undefined} title={small ? "Home" : undefined} aria-label={small ? "Home" : undefined}>
            <Ic d={HOME_ICON} />
            {!small && <span>Home</span>}
          </Link>
          {/* Beside Home rather than in a tab: everyone has a list, and the
              number on it is the one thing in the bar that is only yours. */}
          <Link
            href="/portal/todo"
            className={`pt-side__home pt-side__todo${onTodo ? " is-on" : ""}`}
            aria-current={onTodo ? "page" : undefined}
            title={small ? "To-do" : undefined}
            aria-label={small || todo?.due ? `To-do${todo?.due ? `, ${todo.due} due${todo.overdue ? `, ${todo.overdue} overdue` : ""}` : ""}` : undefined}
          >
            <Ic d={TODO_ICON} />
            {!small && <span className="pt-side__label">To-do</span>}
            {!!todo?.due && (
              <span className={`pt-side__need${todo.overdue ? " is-late" : ""}`} title={todo.overdue ? `${todo.overdue} overdue` : `${todo.due} due today`}>{todo.due}</span>
            )}
          </Link>

          <ul className="pt-side__tabs">
            {tabs.map((t) => {
              const isOpen = small ? flyout === t.key : openTab === t.key;
              const holds = t.key === activeTab;
              const href = `/portal/section/${t.key}`;
              const onPage = sectionKey === t.key;
              const need = t.need ?? 0;
              return (
                <li
                  key={t.key}
                  className={`pt-side__tab${holds ? " has-active" : ""}${isOpen ? " is-open" : ""}`}
                  onMouseEnter={small ? () => show(t.key) : undefined}
                  onMouseLeave={small ? hideSoon : undefined}
                >
                  <div className="pt-side__headrow">
                    <Link
                      href={href}
                      className={`pt-side__head${onPage ? " is-on" : ""}`}
                      aria-current={onPage ? "page" : undefined}
                      title={small ? t.label : undefined}
                      aria-label={small ? `${t.label}${need ? `, ${need} need you` : ""}` : undefined}
                      onFocus={small ? () => show(t.key) : undefined}
                      onClick={() => { if (!small) setOpenTab(t.key); }}
                    >
                      <Ic d={t.icon} />
                      {!small && <span className="pt-side__label">{t.label}</span>}
                      {need > 0 && <span className="pt-side__need" title={`${need} need you`}>{need}</span>}
                    </Link>
                    {!small && (
                      <button
                        type="button"
                        className="pt-side__chevbtn"
                        aria-expanded={isOpen}
                        aria-controls={`pt-side-${t.key}`}
                        aria-label={`${isOpen ? "Hide" : "Show"} the ${t.label} pages`}
                        onClick={() => setOpenTab((o) => (o === t.key ? null : t.key))}
                      >
                        <Chev />
                      </button>
                    )}
                  </div>
                  {!small && isOpen && (
                    <ul className="pt-side__pages" id={`pt-side-${t.key}`}>
                      {t.pages.map((p) => (
                        <li key={p.href}>
                          <Link href={p.href} className={`pt-side__page${p.href === active ? " is-on" : ""}`} aria-current={p.href === active ? "page" : undefined}>
                            <span>{p.label}</span>
                            {p.badge && <em>{p.badge}</em>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  {small && isOpen && (
                    <div className="pt-side__fly" role="region" aria-label={t.label} onMouseEnter={() => show(t.key)} onMouseLeave={hideSoon}>
                      <Link href={href} className="pt-side__flyh">{t.label} →</Link>
                      <ul>
                        {t.pages.map((p) => (
                          <li key={p.href}>
                            <Link href={p.href} className={`pt-side__page${p.href === active ? " is-on" : ""}`} aria-current={p.href === active ? "page" : undefined}>
                              <span>{p.label}</span>
                              {p.badge && <em>{p.badge}</em>}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="pt-side__foot">{foot}</div>
      </aside>
      {drawer && <button type="button" className="pt-side__scrim" aria-label="Close the menu" onClick={() => setDrawer(false)} />}
    </>
  );
}

/** The phone bar's menu button, where the side bar is a drawer. */
export function SideNavButton() {
  return (
    <button type="button" className="pt__menu" aria-label="Open the menu" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  );
}
