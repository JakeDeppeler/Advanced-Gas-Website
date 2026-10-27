"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ThemeChoice } from "@/lib/portal/businessTypes";
import { Icon } from "@/components/portal/shell/Sidebar";
import { ThemeButton } from "@/components/portal/shell/ThemeButton";
import { SEARCH_EVENT } from "@/components/portal/shell/TopNav";

export type DockLink = { href: string; label: string; icon: string; match?: string[]; count?: { n: number; red?: boolean }; section?: string };

/**
 * The floating strip down the left of a wide screen, as Rapport has it: the
 * few places someone goes to many times a day, one tap from anywhere, then
 * light or dark and signing out. Which links it carries is decided on the
 * server from what this person can open, so it never offers a page that
 * would turn them away.
 */
export function Dock({ links, theme }: { links: DockLink[]; theme: ThemeChoice }) {
  const path = usePathname() ?? "";
  // Lit anywhere in its section, not just on the one page it opens. Where two
  // sections claim an address (Suppliers is /portal/supply in Settings, To
  // order /portal/supply/next-week in Orders) the closer page wins, so only
  // one link lights.
  const reach = (l: DockLink) => Math.max(-1, ...(l.match ?? [l.href]).map((h) => { const b = h.split("?")[0]; return path === b || path.startsWith(`${b}/`) ? b.length : -1; }));
  const best = Math.max(-1, ...links.map(reach));
  return (
    <aside className="pn-dock" aria-label="Shortcuts">
      <button type="button" className="pn-dk" onClick={() => window.dispatchEvent(new Event(SEARCH_EVENT))} aria-label="Search">
        <Icon name="search" size={18} />
        <span className="pn-tip" aria-hidden="true">Search</span>
      </button>
      {links.map((l) => {
        const on = best >= 0 && reach(l) === best;
        const label = l.count?.n ? `${l.label}, ${l.count.n}${l.count.red ? " needing you" : ""}` : l.label;
        return (
          <Link key={l.href} href={l.href} className={`pn-dk${on ? " on" : ""}`} aria-label={label} aria-current={on ? "page" : undefined}>
            <Icon name={l.icon} size={18} />
            {l.count?.n ? <span className={`pn-dkc${l.count.red ? " r" : ""}`} aria-hidden="true">{l.count.n > 99 ? "99+" : l.count.n}</span> : null}
            <span className="pn-tip" aria-hidden="true">{l.label}</span>
          </Link>
        );
      })}
      <span className="pn-dksep" aria-hidden="true" />
      <ThemeButton initial={theme} cls="pn-dk" />
      <form action="/api/portal/logout" method="post">
        <button type="submit" className="pn-dk" aria-label="Sign out">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />
          </svg>
          <span className="pn-tip" aria-hidden="true">Sign out</span>
        </button>
      </form>
    </aside>
  );
}
