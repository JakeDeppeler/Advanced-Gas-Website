"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ThemeChoice } from "@/lib/portal/businessTypes";
import { Icon } from "@/components/portal/shell/Sidebar";
import { ThemeButton } from "@/components/portal/shell/ThemeButton";
import { SEARCH_EVENT } from "@/components/portal/shell/TopNav";

export type DockLink = { href: string; label: string; icon: string };

/**
 * The floating strip down the left of a wide screen, as Rapport has it: the
 * few places someone goes to many times a day, one tap from anywhere, then
 * light or dark and signing out. Which links it carries is decided on the
 * server from what this person can open, so it never offers a page that
 * would turn them away.
 */
export function Dock({ links, theme }: { links: DockLink[]; theme: ThemeChoice }) {
  const path = usePathname() ?? "";
  return (
    <aside className="pn-dock" aria-label="Shortcuts">
      <button type="button" className="pn-dk" onClick={() => window.dispatchEvent(new Event(SEARCH_EVENT))} aria-label="Search">
        <Icon name="search" size={18} />
        <span className="pn-tip" aria-hidden="true">Search</span>
      </button>
      {links.map((l) => {
        const on = path === l.href.split("?")[0];
        return (
          <Link key={l.href} href={l.href} className={`pn-dk${on ? " on" : ""}`} aria-label={l.label} aria-current={on ? "page" : undefined}>
            <Icon name={l.icon} size={18} />
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
