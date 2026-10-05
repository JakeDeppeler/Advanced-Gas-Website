import Link from "next/link";
import { ICON, type NavItem } from "@/lib/portal/nav";

/**
 * One section's cards: icon, count, name and the line under it. Home draws
 * all seven sections with these, and each side-bar tab's page draws its own,
 * so a card looks and links the same wherever it's reached from.
 */
export function NavTiles({ items, badges }: { items: NavItem[]; badges: Record<string, string> }) {
  return (
    <div className="pt-band__grid">
      {items.map((it) => (
        <Link key={it.href} href={it.href} prefetch={it.external ? false : undefined} className="pt-tile">
          <span className="pt-tile__top">
            <span className="pt-tile__ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={ICON[it.icon]} />
              </svg>
            </span>
            {badges[it.href] && <span className="pt-tile__badge">{badges[it.href]}</span>}
          </span>
          <span className="pt-tile__text">
            <span className="pt-tile__name" data-short={it.short}><span>{it.label}</span></span>
            <span className="pt-tile__blurb">{it.blurb}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
