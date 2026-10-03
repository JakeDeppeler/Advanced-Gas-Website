import Link from "next/link";
import type { PortalUser } from "@/lib/portal/caps";
import { can } from "@/lib/portal/caps";
import { ViewAsBanner } from "@/components/portal/ViewAs";
import { TRADE_BAR, TRADE_ICON, TRADE_NAV } from "@/lib/portal/tradeNav";
import { Bell } from "@/components/portal/Bell";

export function TradeIcon({ path, size = 24 }: { path: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

/**
 * The trade portal's chrome: an icon rail on the iPad, a bottom tab bar on a
 * phone, and the page between them.
 *
 * One shell, two widths, rather than a tablet app and a phone app. The design
 * draws them as separate artboards because that is how artboards work, but the
 * screens behind them are the same screens — the rail becomes a tab bar and the
 * two-column layouts stack. Building them twice would mean fixing everything
 * twice.
 *
 * `active` is passed in rather than read from `usePathname`, which keeps the
 * whole shell on the server: a rail of eleven links has no reason to ship
 * JavaScript.
 */
export function TradeShell({ user, active, title, sub, action, children }: {
  user: PortalUser;
  /** The href of the nav item this page sits under. */
  active: string;
  title: string;
  sub?: string;
  /** Anything that belongs beside the heading — a step counter, a filter. */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  // Only offered to someone the office portal would actually let in. A
  // tradesman has no business seeing a door that turns them away.
  const hasOffice = can(user, "overhead") || can(user, "manage_users") || can(user, "reports_read");

  return (
    // data-no-reveal: the site-wide scroll reveal is for the marketing pages.
    // The trade portal is a tool — a panel that fades in when you scroll to it is an
    // animation in the way of work, and it left every below-the-fold panel at
    // opacity 0 in screenshots and in print.
    <div className="tr" data-no-reveal>
      <nav className="tr__rail" aria-label="Trade portal">
        <Link href="/trade" className="tr__badge" aria-label="Advanced Gas &amp; Aircon — trade home">AG</Link>
        <div className="tr__railscroll">
          {TRADE_NAV.map((it) => {
            const on = it.href === active;
            return (
              <Link key={it.href} href={it.href} aria-current={on ? "page" : undefined} className={`tr__rail-i${on ? " is-on" : ""}`}>
                <TradeIcon path={TRADE_ICON[it.icon]} />
                <span>{it.label}</span>
              </Link>
            );
          })}
        </div>
        {hasOffice && (
          <Link href="/portal" className="tr__office">
            <TradeIcon path="M5 12h14M13 6l6 6-6 6" size={18} />
            <span>Office</span>
          </Link>
        )}
      </nav>

      <div className="tr__main">
        <header className="tr__head">
          <div className="tr__headtxt">
            <h1>{title}</h1>
            {sub && <span>{sub}</span>}
          </div>
          <div className="tr__headright">
            {action}
            <Bell user={user} href="/trade/notifications" cls="tr__bell" size={22} />
          </div>
        </header>

        <main className="tr__body">
          {user.viewingAs && <ViewAsBanner level={user.viewingAs} />}
          {children}
        </main>
      </div>

      <nav className="tr__bar" aria-label="Trade portal">
        {TRADE_BAR.map((it) => {
          const on = it.href === active;
          return (
            <Link key={it.href} href={it.href} aria-current={on ? "page" : undefined} className={`tr__bar-i${on ? " is-on" : ""}`}>
              <TradeIcon path={TRADE_ICON[it.icon]} size={22} />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
