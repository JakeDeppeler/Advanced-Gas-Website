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

export function TopNav({ sections }: { sections: Section[] }) {
  const here = useHere(sections);
  const shown = sections.filter((s) => s.id !== "you");
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
    </nav>
  );
}

/**
 * The open section's pages, as a row under the bar: on a wide screen the side
 * bar that used to list them is gone, and a tap on a touch screen can't open
 * a pill's list.
 */
export function SectionPages({ sections }: { sections: Section[] }) {
  const here = useHere(sections);
  const s = here.section;
  // A flat section's pages are already its tab row (SectionBar).
  if (!s || s.pages.length < 2 || s.flat) return null;
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
