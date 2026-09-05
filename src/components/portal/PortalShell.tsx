"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PortalUser } from "@/lib/portal/caps";
import { can, ROLE_LABELS } from "@/lib/portal/caps";
import { HANDBOOK, LEARNING_TRACKS, INFO_SECTIONS, PORTAL_TOOLS } from "@/lib/portal/content";

type Leaf = { href: string; label: string; external?: boolean };
type NavNode =
  | { kind: "link"; href: string; label: string; icon: string }
  | { kind: "group"; base: string; label: string; icon: string; children: Leaf[] };

const ICON = {
  home: "M3 11.5 12 4l9 7.5M5 10v9h5v-5h4v5h5v-9",
  book: "M4 5h11a3 3 0 0 1 3 3v11a3 3 0 0 0-3-3H4zM20 5h0a3 3 0 0 0-3 3",
  quote: "M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h4",
  calc: "M6 3h12v18H6zM9 7h6M9 11h1M13 11h2M9 14h1M13 14v4M9 17h1",
  play: "M4 5h16v11H4zM10 8.5l4 2.5-4 2.5zM8 20h8",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 10v6M12 7v.5",
  wrench: "M14 6a3.5 3.5 0 0 0 4.6 4.6L21 13l-3 3-2.4-2.4A3.5 3.5 0 0 0 11 8.2zM10 14l-6 6",
  reports: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M17 11l2 2 3-3.5",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20c0-3.3 3-6 7-6s7 2.7 7 6",
  truck: "M3 6h11v9H3zM14 9h4l3 3v3h-7zM7.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  bars: "M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-7",
  chart: "M4 19V5M4 19h16M7 15l3-4 3 2.5 4-6.5",
  shield: "M12 3l7 4v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V7z",
};

export function PortalShell({ user, children }: { user: PortalUser; children: React.ReactNode }) {
  const pathname = usePathname();

  const nodes: NavNode[] = [
    { kind: "link", href: "/portal", label: "Home", icon: ICON.home },
    {
      kind: "group", base: "/portal/handbook", label: "Handbook", icon: ICON.book,
      children: [
        { href: "/portal/handbook", label: "Overview" },
        ...HANDBOOK.map((s) => ({ href: `/portal/handbook/${s.letter.toLowerCase()}`, label: `${s.letter} · ${s.title}` })),
      ],
    },
    { kind: "link", href: "/portal/quote", label: "Quick quote", icon: ICON.quote },
    { kind: "link", href: "/portal/job-calculator", label: "Job calculator", icon: ICON.calc },
    {
      kind: "group", base: "/portal/learning", label: "Learning", icon: ICON.play,
      children: LEARNING_TRACKS.map((t) => ({ href: `/portal/learning/${t.slug}`, label: t.label })),
    },
    {
      kind: "group", base: "/portal/information", label: "Information", icon: ICON.info,
      children: INFO_SECTIONS.map((s) => ({ href: `/portal/information/${s.slug}`, label: s.label })),
    },
    {
      kind: "group", base: "/portal/tools", label: "Tools", icon: ICON.wrench,
      children: PORTAL_TOOLS.filter((t) => t.slug !== "quick-quote" && t.slug !== "job-calculator").map((t) => ({ href: t.href, label: t.label, external: t.external })),
    },
    { kind: "link", href: "/portal/vehicles", label: "Vehicles", icon: ICON.truck },
  ];
  nodes.push({ kind: "link", href: "/portal/me", label: "My file", icon: ICON.user });
  if (can(user, "reports_read")) nodes.push({ kind: "link", href: "/portal/team", label: "Team", icon: ICON.reports });
  if (can(user, "overhead")) nodes.push({
    kind: "group", base: "/portal/finance", label: "Finance", icon: ICON.chart,
    children: [
      { href: "/portal/finance", label: "Overview" },
      { href: "/portal/finance/pl", label: "Profit & loss" },
      { href: "/portal/finance/quotes", label: "Quotes & win rate" },
      { href: "/portal/finance/capacity", label: "Billable capacity" },
      { href: "/portal/finance/planning", label: "Planning" },
      { href: "/portal/finance/overhead", label: "Overhead cost" },
    ],
  });
  if (can(user, "manage_users")) nodes.push({ kind: "link", href: "/portal/admin", label: "Admin", icon: ICON.shield });

  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const linkActive = (href: string) => (href === "/portal" ? pathname === "/portal" : pathname === href || pathname.startsWith(href + "/"));
  const groupCurrent = (base: string) => pathname === base || pathname.startsWith(base + "/");
  const groupOpen = (base: string) => toggled[base] ?? groupCurrent(base);

  return (
    <div className="pt">
      <aside className="pt__side">
        <div className="pt__brand">
          <span className="pt__brand-mark" aria-hidden="true">◆</span>
          <span className="pt__brand-txt">Advanced Gas<br /><em>Team portal</em></span>
        </div>
        <nav className="pt__nav" aria-label="Portal">
          {nodes.map((node) =>
            node.kind === "link" ? (
              <Link key={node.href} href={node.href} className={`pt__navlink${linkActive(node.href) ? " is-on" : ""}`}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={node.icon} /></svg>
                {node.label}
              </Link>
            ) : (
              <div key={node.base} className="pt__group">
                <button
                  type="button"
                  className={`pt__navlink pt__grouphead${groupCurrent(node.base) ? " is-cur" : ""}`}
                  aria-expanded={groupOpen(node.base)}
                  onClick={() => setToggled((t) => ({ ...t, [node.base]: !groupOpen(node.base) }))}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={node.icon} /></svg>
                  {node.label}
                  <svg className={`pt__chev${groupOpen(node.base) ? " is-open" : ""}`} viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                </button>
                <div className={`pt__children${groupOpen(node.base) ? " is-open" : ""}`}>
                  {node.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      target={c.external ? "_blank" : undefined}
                      rel={c.external ? "noopener" : undefined}
                      className={`pt__child${!c.external && pathname === c.href ? " is-on" : ""}`}
                    >
                      {c.label}{c.external ? " ↗" : ""}
                    </Link>
                  ))}
                </div>
              </div>
            ),
          )}
        </nav>
        <div className="pt__side-foot">
          <a href="/" className="pt__backlink">← Main site</a>
        </div>
      </aside>

      <div className="pt__main">
        <header className="pt__top">
          <div className="pt__who">
            <span className="pt__avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
            <span className="pt__who-txt">
              <strong>{user.name}</strong>
              <span>{ROLE_LABELS[user.role]}</span>
            </span>
          </div>
          <form action="/api/portal/logout" method="post">
            <button type="submit" className="pt__logout">Sign out</button>
          </form>
        </header>
        <main className="pt__content">{children}</main>
      </div>
    </div>
  );
}
