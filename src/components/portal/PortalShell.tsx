"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PortalUser } from "@/lib/portal/session";

const NAV = [
  { href: "/portal", label: "Home", icon: "M3 11.5 12 4l9 7.5M5 10v9h5v-5h4v5h5v-9" },
  { href: "/portal/training", label: "Training", icon: "M4 5h11a3 3 0 0 1 3 3v11a3 3 0 0 0-3-3H4zM20 5h0a3 3 0 0 0-3 3" },
  { href: "/portal/learning", label: "Learning", icon: "M4 5h16v11H4zM10 8.5l4 2.5-4 2.5zM8 20h8" },
  { href: "/portal/information", label: "Information", icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 10v6M12 7v.5" },
  { href: "/portal/tools", label: "Tools", icon: "M14 6a3.5 3.5 0 0 0 4.6 4.6L21 13l-3 3-2.4-2.4A3.5 3.5 0 0 0 11 8.2zM10 14l-6 6" },
];

const ADMIN = { href: "/portal/admin", label: "Admin", icon: "M12 3l7 4v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V7z" };

export function PortalShell({ user, children }: { user: PortalUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const items = user.role === "admin" ? [...NAV, ADMIN] : NAV;
  const isActive = (href: string) => (href === "/portal" ? pathname === "/portal" : pathname.startsWith(href));

  return (
    <div className="pt">
      <aside className="pt__side">
        <div className="pt__brand">
          <span className="pt__brand-mark" aria-hidden="true">◆</span>
          <span className="pt__brand-txt">Advanced Gas<br /><em>Team portal</em></span>
        </div>
        <nav className="pt__nav" aria-label="Portal">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className={`pt__navlink${isActive(it.href) ? " is-on" : ""}`}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={it.icon} />
              </svg>
              {it.label}
            </Link>
          ))}
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
              <span>{user.role === "admin" ? "Admin" : "Team member"}</span>
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
