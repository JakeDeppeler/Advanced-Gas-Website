"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BLOCK_NAME, SECTION_ICON, whereAmI, type Count, type Section } from "@/lib/portal/sections";
import { NAV_COOKIE } from "@/lib/portal/businessTypes";

export const DRAWER_EVENT = "pn:drawer";
const FLY_KEY = "pn-fly";
const forgetFly = () => { try { sessionStorage.removeItem(FLY_KEY); } catch { /* nothing kept */ } };
const flyTop = (el: HTMLElement) => Math.max(8, Math.min(el.getBoundingClientRect().top, window.innerHeight - 340));

export function Icon({ name, size = 15 }: { name: string; size?: number }) {
  // The paths are this file's own constants, never anything typed in.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: SECTION_ICON[name] ?? "" }} />
  );
}

function N({ c }: { c?: Count }) {
  if (!c || c.n <= 0) return null;
  // Red says something's wrong, and the tooltip says it in words, so the
  // colour is never the only signal.
  return <span className={`pn-n${c.red ? " r" : ""}`} title={c.red ? `${c.n} need someone` : `${c.n}`}>{c.n.toLocaleString("en-AU")}</span>;
}

/**
 * The side bar: the business at the top, Home, then each area under the name
 * of its block (Day to day, Getting work, The business), one line each with
 * its count. It never opens into a list: an area's pages are the shortcuts
 * across the top of the page (AreaShortcuts), so the menu stays the same
 * short list wherever you are.
 *
 * « makes it a strip of icons; clicking an icon then goes to that section's
 * first page and slides its pages out beside the strip. The choice is a cookie,
 * so the server draws the right width first time.
 *
 * On a phone it's a drawer, opened from the menu button in the top bar.
 */
export type LiveState = { fresh: boolean; text: string; title: string };

export function Sidebar({ sections, biz, small: initialSmall, foot, live }: {
  sections: Section[];
  biz: { name: string; name2: string; short: string };
  small: boolean;
  foot: ReactNode;
  /** Whether the sync is keeping up; arrives with the counts. */
  live?: LiveState | null;
}) {
  const path = usePathname() ?? "";
  const query = useSearchParams();
  const here = whereAmI(sections, path, new URLSearchParams(query?.toString() ?? ""));
  const [small, setSmall] = useState(initialSmall);
  const [drawer, setDrawer] = useState(false);
  const [fly, setFly] = useState<{ id: string; top: number } | null>(null);
  const ref = useRef<HTMLElement>(null);
  // Hover opens a small bar's section and leaving closes it a moment later,
  // so the pointer can cross the gap from the icon to the list.
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showFly = (id: string, el: HTMLElement) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setFly({ id, top: flyTop(el) });
  };
  const hideFlySoon = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { setFly(null); forgetFly(); }, 250);
  };

  // Each page draws its own shell, so the bar is new after every move — and
  // drawn twice on the way in, once without its counts and once with. A small
  // icon's click goes to the section and opens its pages in the same move, so
  // which one to open is carried across in the tab's session for a few
  // seconds, long enough for both.
  useEffect(() => {
    if (!initialSmall) return;
    let id: string | null = null;
    try {
      const saved = JSON.parse(sessionStorage.getItem(FLY_KEY) ?? "null") as { id: string; at: number } | null;
      if (saved && Date.now() - saved.at < 5000) id = saved.id;
    } catch {
      /* No storage: the section opens without its list. */
    }
    const btn = id ? ref.current?.querySelector<HTMLElement>(`[data-sec="${id}"]`) : null;
    if (id && btn) setFly({ id, top: flyTop(btn) });
  }, [initialSmall]);

  // A tab within the same page doesn't redraw the shell, so close the drawer here too.
  useEffect(() => { setDrawer(false); }, [path, query]);

  useEffect(() => {
    const open = () => setDrawer(true);
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setFly(null); forgetFly(); setDrawer(false); } };
    const away = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setFly(null); forgetFly(); } };
    window.addEventListener(DRAWER_EVENT, open);
    window.addEventListener("keydown", key);
    document.addEventListener("pointerdown", away);
    return () => {
      window.removeEventListener(DRAWER_EVENT, open);
      window.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", away);
    };
  }, []);

  function toggle() {
    const next = !small;
    setSmall(next);
    setFly(null);
    forgetFly();
    // The page column's width hangs off this class, so it moves with the bar.
    document.querySelector(".pn")?.classList.toggle("pn--mini", next);
    try {
      document.cookie = `${NAV_COOKIE}=${next ? "small" : "open"}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* Still works; it just won't be remembered. */
    }
  }

  const flying = fly ? sections.find((s) => s.id === fly.id) : null;

  return (
    <>
      <aside ref={ref} className={`pn-side${drawer ? " open" : ""}`} aria-label="Portal sections">
        <div className="pn-biz">
          <Link href="/portal" className="pn-logo" aria-label={`${biz.name} · Home`}>{biz.short}</Link>
          <span className="pn-bizt">
            <b>{biz.name}</b>
            <span>{biz.name2 ? `${biz.name2} · ` : ""}Team portal</span>
          </span>
          <button type="button" className="pn-tog" onClick={toggle} aria-label={small ? "Open the side bar" : "Make the side bar small"} title={small ? "Open the side bar" : "Make the side bar small"}>
            <span aria-hidden="true">{small ? "»" : "«"}</span>
          </button>
          <button type="button" className="pn-close" onClick={() => setDrawer(false)} aria-label="Close the menu">×</button>
        </div>

        <nav className="pn-navs">
          {sections.map((s, i) => {
            const on = here.section?.id === s.id;
            const many = s.pages.length > 1;
            return (
              <div key={s.id} className="pn-group">
                {/* A new block starts with its name, or a rule when it has none.
                    The small bar has no room for a name and draws it as a rule. */}
                {i > 0 && sections[i - 1].group !== s.group && (BLOCK_NAME[s.group]
                  ? <div className="pn-gh">{BLOCK_NAME[s.group]}</div>
                  : <div className="pn-sep" role="separator" />)}
                <Link
                  href={s.href}
                  className={`pn-btn${on ? " on" : ""}`}
                  aria-current={on ? (many ? "true" : "page") : undefined}
                  aria-label={small ? s.label : undefined}
                  data-sec={s.id}
                  onMouseEnter={small ? (e) => showFly(s.id, e.currentTarget) : undefined}
                  onMouseLeave={small ? hideFlySoon : undefined}
                  onFocus={small ? (e) => showFly(s.id, e.currentTarget) : undefined}
                  onClick={(e) => {
                    if (!small || !many || drawer) { setFly(null); forgetFly(); return; }
                    showFly(s.id, e.currentTarget);
                    try { sessionStorage.setItem(FLY_KEY, JSON.stringify({ id: s.id, at: Date.now() })); } catch { /* opens without the list */ }
                  }}
                >
                  <span className={`pn-nico c-${s.icon}`}><Icon name={s.icon} /></span>
                  <span className="pn-nl">{s.label}</span>
                  <N c={s.count} />
                </Link>
              </div>
            );
          })}
        </nav>

        {flying && fly && (
          <div
            className="pn-fly" style={{ top: fly.top }} role="region" aria-label={flying.label}
            onMouseEnter={() => { if (hideTimer.current) clearTimeout(hideTimer.current); }}
            onMouseLeave={hideFlySoon}
          >
            {/* A one-page section's flyout is its name, to go to it; the rest list their pages. */}
            {flying.pages.length > 1 ? <b>{flying.label}</b> : <Link href={flying.href} className="pn-flyh" onClick={() => { setFly(null); forgetFly(); }}>{flying.label}</Link>}
            {flying.pages.length > 1 && flying.pages.map((p) => (
              <Link key={p.href} href={p.href} className={`pn-sub${p === here.page ? " on" : ""}`} onClick={() => { setFly(null); forgetFly(); }}>
                <span>{p.label}</span>
                <N c={p.count} />
              </Link>
            ))}
          </div>
        )}

        <div className="pn-foot">
          {foot}
          {live && <span className="pn-live" title={live.title}><span className={`pn-dot${live.fresh ? " good" : ""}`} />{live.text}</span>}
        </div>
      </aside>
      {drawer && <button type="button" className="pn-scrim" aria-label="Close the menu" onClick={() => setDrawer(false)} />}
    </>
  );
}

/**
 * The open area's pages, as shortcuts across the top of the page: each with
 * its icon and count, the one you're on dark. A family (Cash, Pricing...) is
 * one shortcut, and inside it its own pages are a second, smaller row. An
 * area of one page has none. On a phone the row scrolls sideways.
 */
export function AreaShortcuts({ sections }: { sections: Section[] }) {
  const path = usePathname() ?? "";
  const query = useSearchParams();
  const { section, page, at } = whereAmI(sections, path, new URLSearchParams(query?.toString() ?? ""));
  if (!section || section.pages.length < 2) return null;
  return (
    <div className="pn-short">
      <nav className="pn-short1" aria-label={`${section.label} pages`}>
        {section.pages.map((p) => (
          <Link key={p.href} href={p.href} className={`pn-sc${p === page ? " on" : ""}`} aria-current={p === page && !p.subs ? "page" : undefined}>
            {p.icon && <Icon name={p.icon} size={15} />}
            <span>{p.label}</span>
            <N c={p.count} />
          </Link>
        ))}
      </nav>
      {page?.subs && (
        <nav className="pn-short2" aria-label={`${page.label} pages`}>
          {page.subs.map((x) => (
            <Link key={x.href} href={x.href} className={x === at ? "on" : undefined} aria-current={x === at ? "page" : undefined}>
              <span>{x.label}</span>
              <N c={x.count} />
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

/** The top bar's menu button: on a phone, where the side bar is a drawer. */
export function MenuButton() {
  return (
    <button type="button" className="pn-menu" aria-label="Open the menu" onClick={() => window.dispatchEvent(new Event(DRAWER_EVENT))}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
    </button>
  );
}

/**
 * Where you are: "Area › Page", or "Area › Family › Page" inside a family. A
 * step named the same as the one before it is said once: "To order", not
 * "To order › To order".
 */
export function Crumb({ sections }: { sections: Section[] }) {
  const path = usePathname() ?? "";
  const query = useSearchParams();
  const { section, page, at } = whereAmI(sections, path, new URLSearchParams(query?.toString() ?? ""));
  if (!section || !page) return <div className="pn-crumb" />;
  const steps = [section.label, ...(section.pages.length > 1 ? [page.label] : []), ...(page.subs && at ? [at.label] : [])]
    .filter((x, i, all) => i === 0 || x !== all[i - 1]);
  return (
    <div className="pn-crumb">
      {steps.map((x, i) => (i < steps.length - 1 ? <span key={i}>{x} › </span> : <b key={i}>{x}</b>))}
    </div>
  );
}
