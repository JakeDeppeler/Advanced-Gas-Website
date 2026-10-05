"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * The team portal's side bar, to the design's SideNav: Home, then the seven
 * tabs the home page is grouped into.
 *
 * Open it is 288 wide and each tab is a header: tapping one shows only that
 * tab's pages. That is what stops it becoming the sidebar the portal dropped
 * in October, which carried every destination open at once and had grown
 * three levels of groups to fit them. Small it is 84 wide, icons only, and a
 * tab's pages slide out beside it. « and » switch between the two; the choice
 * is kept in a cookie, so the server draws the right width first time and the
 * page doesn't jump on load.
 *
 * On a phone it is a drawer, opened from the menu button in the top bar.
 *
 * Everything arrives from the server as plain rows — the nav module carries
 * the procedure list for the search count, which has no business in the
 * browser.
 */

export type SideTab = { key: string; label: string; icon: string; pages: Array<{ href: string; label: string }> };

const COOKIE = "pt_nav";
export const OPEN_EVENT = "pt-nav:open";

const HOME_ICON = "M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10";

function Ic({ d, size = 20 }: { d: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

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
        const all = [...want.entries()].every(([k, v]) => query.get(k) === v);
        if (!all) continue;
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

export function SideNav({ tabs, small: initialSmall }: { tabs: SideTab[]; small: boolean }) {
  const path = usePathname() ?? "";
  const query = useSearchParams() ?? new URLSearchParams();
  const active = activeHref(tabs, path, new URLSearchParams(query.toString()));
  const home = path === "/portal";
  const activeTab = tabs.find((t) => t.pages.some((p) => p.href === active))?.key ?? null;

  const [smallPref, setSmall] = useState(initialSmall);
  // On a phone the bar is a drawer, and a drawer of bare icons would be a
  // menu you can't read, so it always opens full width there.
  const [phone, setPhone] = useState(false);
  const small = smallPref && !phone;
  // Open: the one tab whose pages show. Starts on the tab you're in.
  const [openTab, setOpenTab] = useState<string | null>(activeTab);
  // Small: the tab whose pages have slid out, if any.
  const [flyout, setFlyout] = useState<string | null>(null);
  // Phone: the drawer.
  const [drawer, setDrawer] = useState(false);
  const ref = useRef<HTMLElement>(null);

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

  const fly = tabs.find((t) => t.key === flyout) ?? null;

  return (
    <>
      <aside ref={ref} className={`pt-side${small ? " is-small" : ""}${drawer ? " is-drawer" : ""}`} aria-label="Portal">
        <div className="pt-side__brand">
          <Link href="/portal" className="pt-side__logo" aria-label="Portal home">
            <span className="pt-side__tile" aria-hidden="true">A</span>
            {!small && (
              <span className="pt-side__name">
                <strong>Advanced</strong>
                <em>Gas &amp; Aircon · Team portal</em>
              </span>
            )}
          </Link>
          <button type="button" className="pt-side__close" onClick={() => setDrawer(false)} aria-label="Close the menu">×</button>
        </div>

        <nav className="pt-side__nav">
          <Link href="/portal" className={`pt-side__home${home ? " is-on" : ""}`} aria-current={home ? "page" : undefined} title={small ? "Home" : undefined}>
            <Ic d={HOME_ICON} />
            {!small && <span>Home</span>}
          </Link>

          <ul className="pt-side__tabs">
            {tabs.map((t) => {
              const isOpen = small ? flyout === t.key : openTab === t.key;
              const holds = t.key === activeTab;
              return (
                <li key={t.key} className={`pt-side__tab${holds ? " has-active" : ""}${isOpen ? " is-open" : ""}`}>
                  <button
                    type="button"
                    className="pt-side__head"
                    aria-expanded={isOpen}
                    aria-controls={small ? "pt-side-fly" : `pt-side-${t.key}`}
                    title={small ? t.label : undefined}
                    onClick={() => (small ? setFlyout((f) => (f === t.key ? null : t.key)) : setOpenTab((o) => (o === t.key ? null : t.key)))}
                  >
                    <Ic d={t.icon} />
                    {!small && (
                      <>
                        <span className="pt-side__label">{t.label}</span>
                        <svg className="pt-side__chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </>
                    )}
                  </button>
                  {!small && isOpen && (
                    <ul className="pt-side__pages" id={`pt-side-${t.key}`}>
                      {t.pages.map((p) => (
                        <li key={p.href}>
                          <Link href={p.href} className={`pt-side__page${p.href === active ? " is-on" : ""}`} aria-current={p.href === active ? "page" : undefined}>
                            {p.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="pt-side__foot">
          <a href="/" className="pt-side__site" title={small ? "Main site" : undefined}>
            <Ic d="M15 18l-6-6 6-6" size={18} />
            {!small && <span>Main site</span>}
          </a>
          <button type="button" className="pt-side__size" onClick={toggleSize} aria-label={small ? "Open the side bar" : "Make the side bar small"} title={small ? "Open the side bar" : "Make the side bar small"}>
            <span aria-hidden="true">{small ? "»" : "«"}</span>
            {!small && <span>Smaller</span>}
          </button>
        </div>

        {small && fly && (
          <div className="pt-side__fly" id="pt-side-fly" role="region" aria-label={fly.label}>
            <span className="pt-side__flyh">{fly.label}</span>
            <ul>
              {fly.pages.map((p) => (
                <li key={p.href}>
                  <Link href={p.href} className={`pt-side__page${p.href === active ? " is-on" : ""}`} aria-current={p.href === active ? "page" : undefined}>
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
      {drawer && <button type="button" className="pt-side__scrim" aria-label="Close the menu" onClick={() => setDrawer(false)} />}
    </>
  );
}

/** The top bar's menu button, on a phone, where the side bar is a drawer. */
export function SideNavButton() {
  return (
    <button type="button" className="pt__menu" aria-label="Open the menu" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  );
}
