import Link from "next/link";
import { Suspense } from "react";
import type { PortalUser } from "@/lib/portal/caps";
import { can } from "@/lib/portal/caps";
import { ViewAsBanner } from "@/components/portal/ViewAs";
import { TRADE_ICON, TRADE_NAV, VAN_TABS, type TradeDest } from "@/lib/portal/tradeNav";
import { tradeNotices } from "@/lib/portal/tradeNotices";
import { mondayWeek } from "@/lib/portal/monday";

export function TradeIcon({ path, size = 24, stroke = 2 }: { path: string; size?: number; stroke?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

/** An icon by name from the trade set. */
export const Ic = ({ n, size = 22, stroke }: { n: string; size?: number; stroke?: number }) => <TradeIcon path={TRADE_ICON[n] ?? TRADE_ICON.info} size={size} stroke={stroke} />;

type Dots = Partial<Record<TradeDest, string>>;

function NavBar({ active, dots }: { active: TradeDest; dots: Dots }) {
  return (
    <nav className="tr__nav" aria-label="Trade portal">
      {TRADE_NAV.map((it) => {
        const on = it.key === active;
        const dot = dots[it.key];
        return (
          <Link key={it.key} href={it.href} aria-current={on ? "page" : undefined} className={on ? "is-on" : undefined}>
            <span className="tr__navic">
              <TradeIcon path={TRADE_ICON[it.icon]} size={22} />
              {dot && <span className="tr__dot" />}
            </span>
            <span>{it.label}{dot && <span className="tr-sr">, {dot}</span>}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * The orange dots, streamed in after the page.
 *
 * My van: the week's check isn't finished. Messages: something from the
 * office hasn't been seen. Both take a read of their own, so they arrive a
 * moment after the screen rather than in front of it — the bar draws first
 * without them, which is also what it looks like with nothing waiting.
 */
async function DottedNav({ user, active }: { user: PortalUser; active: TradeDest }) {
  const [week, { unread }] = await Promise.all([
    mondayWeek(user.id).catch(() => null),
    tradeNotices(user).catch(() => ({ unread: 0 })),
  ]);
  const dots: Dots = {};
  if (week?.van && week.done < week.steps.length) dots.van = "weekly check not finished";
  if (unread > 0) dots.messages = `${unread} new`;
  return <NavBar active={active} dots={dots} />;
}

/**
 * The trade portal's chrome: the page's name on navy, a cream panel that
 * rises over it, and the floating bar of five.
 *
 * `active` is passed in rather than read from the path, which keeps the whole
 * shell on the server: five links have no reason to ship JavaScript.
 */
export function TradeShell({ user, active, title, sub, action, children }: {
  user: PortalUser;
  active: TradeDest;
  title: string;
  sub?: string;
  /** Anything that belongs beside the avatar. */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  // Only offered to someone the office portal would let in. A tradesman has
  // no business seeing a door that turns them away.
  const hasOffice = can(user, "overhead") || can(user, "manage_users") || can(user, "reports_read");
  const initial = (user.name.trim()[0] ?? "?").toUpperCase();

  return (
    // data-no-reveal: the site-wide scroll reveal is for the marketing pages.
    <div className="tr" data-no-reveal>
      <header className="tr__head">
        <div style={{ minWidth: 0 }}>
          <h1>{title}</h1>
          {sub && <span className="tr__sub">{sub}</span>}
        </div>
        <div className="tr__right">
          {action}
          {hasOffice && (
            <Link href="/portal" className="tr__office">
              Office <TradeIcon path={TRADE_ICON.chevron} size={16} />
            </Link>
          )}
          <Link href="/trade/me" className="tr__me" aria-label={`${user.name} — your file`}>{initial}</Link>
        </div>
      </header>

      <main className="tr__panel">
        <div className="tr__inner">
          {user.viewingAs && <ViewAsBanner level={user.viewingAs} />}
          {children}
        </div>
      </main>

      <Suspense fallback={<NavBar active={active} dots={{}} />}>
        <DottedNav user={user} active={active} />
      </Suspense>
    </div>
  );
}

/** The My van screens' tab row. */
export function VanTabs({ on }: { on: string }) {
  return (
    <nav className="tr-tabs" aria-label="My van">
      {VAN_TABS.map((t) => (
        <Link key={t.key} href={t.href} aria-current={t.key === on ? "page" : undefined} className={t.key === on ? "is-on" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
