"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { whereAmI, type Count, type Section } from "@/lib/portal/sections";
import { Icon, type LiveState } from "@/components/portal/shell/Sidebar";

/**
 * The menu on a wide screen, after the Rapport dashboard: the sections as
 * pills across the top, each opening a list of its pages, and the section
 * you're in drawn dark.
 *
 * Hover opens a section's list for a mouse; on a touch screen there's no
 * hover, so a tap goes to the section and the row under the bar (SectionPages)
 * lists its pages. Settings isn't a pill — it's the cog on the dock.
 *
 * Below the wide breakpoint none of this shows and the side bar does the job,
 * so a phone and a narrow laptop keep the menu they had.
 */

function Badge({ c }: { c?: Count }) {
  if (!c || c.n <= 0 || !c.red) return null;
  return <span className="pn-pilln" title={`${c.n} need someone`}>{c.n > 99 ? "99+" : c.n}</span>;
}

const useHere = (sections: Section[]) => {
  const path = usePathname() ?? "";
  const query = useSearchParams();
  return whereAmI(sections, path, new URLSearchParams(query?.toString() ?? ""));
};

export function TopNav({ sections, more = [], docked = [] }: { sections: Section[]; more?: string[]; docked?: string[] }) {
  const here = useHere(sections);
  // What's in the dock down the left isn't on the bar as well.
  const all = sections.filter((s) => s.id !== "you" && !docked.includes(s.id));
  // A tucked section stays under More even while you're in it: More goes dark
  // to say you're somewhere inside it, and the page's own row has its tabs.
  const shown = all.filter((s) => !more.includes(s.id));
  const tucked = all.filter((s) => more.includes(s.id));
  const inMore = tucked.some((s) => s.id === here.section?.id);
  return (
    <nav className="pn-pills" aria-label="Sections">
      {shown.map((s) => {
        const on = here.section?.id === s.id;
        const many = s.pages.length > 1;
        return (
          <div key={s.id} className={`pn-pillw${many ? " many" : ""}`}>
            <Link
              href={s.href}
              className={`pn-pill${on ? " on" : ""}`}
              aria-current={on ? "page" : undefined}
              // Leaving focus on the link keeps its list open over the next page.
              onClick={(e) => e.currentTarget.blur()}
            >
              {s.label}
              <Badge c={s.count} />
            </Link>
            {many && (
              <div className="pn-drop">
                <div className="pn-dropin">
                  <span className="pn-droph">{s.blurb || s.label}</span>
                  {s.pages.map((p) => {
                    const at = p.href === here.page?.href;
                    return (
                      <Link
                        key={p.href} href={p.href} className={`pn-dropa${at ? " on" : ""}`} aria-current={at ? "page" : undefined}
                        onClick={(e) => e.currentTarget.blur()}
                      >
                        <span>{p.label}</span>
                        {p.count?.n ? <span className={`pn-n${p.count.red ? " r" : ""}`}>{p.count.n}</span> : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
      <More tucked={tucked} on={inMore} hereId={here.section?.id ?? null} />
    </nav>
  );
}

/**
 * More: the sections tucked off the bar. Which ones are tucked is chosen in
 * Settings, not here: an Edit button on the bar was one more thing to read
 * past on every page for something set once. With nothing tucked, there's no
 * More at all.
 */
function More({ tucked, on, hereId }: { tucked: Section[]; on: boolean; hereId: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", away); window.removeEventListener("keydown", key); };
  }, [open]);
  if (!tucked.length) return null;
  const red = tucked.reduce((n, s) => n + (s.count?.red ? s.count.n : 0), 0);
  return (
    <div ref={ref} className={`pn-pillw pn-morew${open ? " open" : ""}`}>
      <button type="button" className={`pn-pill pn-more${open ? " is-open" : ""}${on ? " on" : ""}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        More
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        {red > 0 && <span className="pn-pilln" title={`${red} need someone`}>{red > 99 ? "99+" : red}</span>}
      </button>
      {open && (
        <div className="pn-moredrop">
          <div className="pn-dropin pn-morein">
            {/* Just the sections: each one's own pages are the row at the top of it. */}
            {tucked.map((s) => (
              <Link key={s.id} href={s.href} className={`pn-dropa pn-moreh${s.id === hereId ? " on" : ""}`} aria-current={s.id === hereId ? "page" : undefined} onClick={() => setOpen(false)}>
                <span>{s.label}</span>
                {s.count?.red && s.count.n ? <span className="pn-n r">{s.count.n}</span> : null}
              </Link>
            ))}
            <Link href="/portal/settings#top-bar" className="pn-choose" onClick={() => setOpen(false)}>Change what&rsquo;s on the bar in Settings</Link>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The open section's pages, as a row under the bar: on a wide screen the side
 * bar that used to list them is gone, and a tap on a touch screen can't open
 * a pill's list. Every page in the section is a tab here, and it's the only
 * row of tabs: no page draws another under it.
 */
export function SectionPages({ sections }: { sections: Section[] }) {
  const here = useHere(sections);
  const s = here.section;
  if (!s || s.pages.length < 2) return null;
  return (
    <nav className="pn-secpages" aria-label={s.label}>
      {s.pages.map((p) => {
        const at = p.href === here.page?.href;
        return (
          <Link key={p.href} href={p.href} className={at ? "on" : undefined} aria-current={at ? "page" : undefined}>
            {p.label}
            {p.count?.n ? <span className={`c${p.count.red ? " r" : ""}`}>{p.count.n}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** The business at the top left of the wide bar, with whether the sync is keeping up. */
export function Brand({ biz, live }: { biz: { name: string; short: string }; live?: LiveState | null }) {
  return (
    // The sync's state is a dot on the mark, as Rapport keeps its bar to a
    // name: green live, amber behind, with the words in its title and to a
    // screen reader, so the colour is never the only signal.
    <Link href="/portal" className="pn-brand" aria-label={`${biz.name} · Overview`} title={live?.title}>
      <span className="pn-logo" aria-hidden="true">
        {biz.short}
        {live && <i className={`pn-logodot${live.fresh ? " good" : ""}`} />}
      </span>
      <span className="pn-brandt">
        <b>{biz.name}</b>
        {live && <span className="pn-vh">{live.fresh ? "Live" : live.text}</span>}
      </span>
    </Link>
  );
}

export const SEARCH_EVENT = "pn:search";

/**
 * The search. On the wide bar it's behind a round button, because the pills
 * need the width a box would take; the dock's magnifier and "/" open it too.
 * Narrower, it's the box in the bar it always was.
 */
export function SearchPop({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const show = () => setOpen(true);
    const away = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      // "/" opens it from anywhere but a box being typed in.
      const t = e.target as HTMLElement | null;
      if (e.key === "/" && !(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener(SEARCH_EVENT, show);
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener(SEARCH_EVENT, show);
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", key);
    };
  }, []);
  useEffect(() => { if (open) ref.current?.querySelector<HTMLInputElement>("input")?.focus(); }, [open]);
  return (
    <div ref={ref} className={`pn-search pn-spop${open ? " open" : ""}`}>
      <button type="button" className="pn-round" aria-label="Search" aria-expanded={open} title="Search ( / )" onClick={() => setOpen((o) => !o)}>
        <Icon name="search" size={17} />
      </button>
      {/* Under the wide breakpoint this is the plain box in the bar; the CSS decides. */}
      <div className="pn-spanel">{children}</div>
    </div>
  );
}
