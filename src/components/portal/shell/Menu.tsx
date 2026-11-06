"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { SECTION_ICON, whereAmI, type Count, type Section } from "@/lib/portal/sections";

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

export type LiveState = { fresh: boolean; text: string; title: string };

const useHere = (sections: Section[]) => {
  const path = usePathname() ?? "";
  const query = useSearchParams();
  return whereAmI(sections, path, new URLSearchParams(query?.toString() ?? ""));
};

/**
 * On a phone the rows scroll sideways, and the one you're on could sit off
 * the edge: centre it in its row (the row only; the page doesn't move).
 */
function useCentred<T extends HTMLElement>(key: string) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const box = ref.current;
    const on = box?.querySelector<HTMLElement>(".on");
    if (box && on && box.scrollWidth > box.clientWidth) box.scrollLeft = on.offsetLeft - (box.clientWidth - on.offsetWidth) / 2;
  }, [key]);
  return ref;
}

/**
 * The top bar, as Jake chose from the mocks: every area in one row of icons
 * across the middle, the one you're in named, and Settings behind your
 * initial in the corner rather than in the row. The row is centred on the
 * page, so the tray of the area's pages under it lines up with it.
 *
 * On a phone the row drops under the business name and scrolls sideways.
 */
export function TopBar({ sections, biz, initial, tools, live }: {
  sections: Section[];
  biz: { name: string; short: string };
  initial: string;
  tools: ReactNode;
  /** Whether the sync is keeping up; arrives with the counts. */
  live?: LiveState | null;
}) {
  const here = useHere(sections);
  const areas = useCentred<HTMLElement>(here.section?.id ?? "");
  const settings = sections.find((s) => s.id === "you");
  const inSettings = here.section?.id === "you";
  return (
    <header className="pn-bar">
      <Link href="/portal" className="pn-brand" aria-label={`${biz.name} · Home`}>
        <span className="pn-logo">{biz.short}</span><b>{biz.name}</b>
      </Link>
      <nav ref={areas} className="pn-areas" aria-label="Areas">
        {sections.filter((s) => s.id !== "you").map((s) => {
          const on = here.section?.id === s.id;
          return (
            <Link key={s.id} href={s.href} className={`pn-area${on ? " on" : ""}`} aria-current={on ? "true" : undefined} aria-label={on ? undefined : s.label} title={s.label}>
              <Icon name={s.icon} size={17} />
              {on && <span>{s.label}</span>}
              <N c={s.count} />
            </Link>
          );
        })}
      </nav>
      <div className="pn-right">
        {tools}
        {settings && (
          <Link href={settings.href} className={`pn-you${inSettings ? " here" : ""}`} aria-label="Settings" title={live ? `Settings · ${live.title}` : "Settings"}>
            <span aria-hidden="true">{initial}</span>
            <span className="pn-cog" aria-hidden="true"><Icon name="cog" size={11} /></span>
            {live && <span className={`pn-sync${live.fresh ? " good" : ""}`} aria-hidden="true" />}
          </Link>
        )}
      </div>
    </header>
  );
}

/**
 * The open area's pages, in a tray under the top bar: centred on it, opening
 * from the middle out, the one you're on a white pill. A family (Get paid,
 * Cash...) is one item, and inside it its own pages are a row of chips under
 * the tray. An area of one page has no tray. On a phone the tray scrolls
 * sideways rather than wrap.
 */
export function AreaShortcuts({ sections }: { sections: Section[] }) {
  const { section, page, at } = useHere(sections);
  const tray = useCentred<HTMLElement>(page?.href ?? "");
  const chips = useCentred<HTMLElement>(at?.href ?? "");
  if (!section || section.pages.length < 2) return null;
  return (
    <div className="pn-tray">
      <nav ref={tray} className="pn-tray1" aria-label={`${section.label} pages`}>
        {section.pages.map((p) => (
          <Link key={p.href} href={p.href} className={`pn-t${p === page ? " on" : ""}`} aria-current={p === page && !p.subs ? "page" : undefined}>
            <span>{p.label}</span>
            <N c={p.count} />
          </Link>
        ))}
      </nav>
      {page?.subs && (
        <nav ref={chips} className="pn-tray2" aria-label={`${page.label} pages`}>
          {page.subs.map((x) => (
            <Link key={x.href} href={x.href} className={`pn-c${x === at ? " on" : ""}`} aria-current={x === at ? "page" : undefined}>
              <span>{x.label}</span>
              <N c={x.count} />
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
