import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { BANDS, BAND_BLURB, BAND_LABEL, byBand, portalNav } from "@/lib/portal/nav";
import { navBadges } from "@/lib/portal/navBadges";
import { NavTiles } from "@/components/portal/NavTiles";
import { localToday } from "@/lib/portal/xero";
import { money } from "@/lib/portal/format";
import { crewRequests, latestBoard, savedGoal, shortMoney, vanIssues } from "@/lib/portal/office";
import { lowStockCount } from "@/lib/portal/stock";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team portal" };

type Line = { n: number; text: string; href: string };

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

/**
 * Home, to the design's Home: what needs someone today, then every part of the
 * portal in seven sections.
 *
 * The panel only carries lines it can count. The design has nine; the ones
 * with nothing behind them yet — chats waiting, hours not billed, jobs that
 * lost money, payment plans, VEU claims — are left off rather than shown as a
 * number nobody measured. Each line is hidden at zero: a panel of "0 waiting"
 * rows is a panel nobody reads by Wednesday.
 */
export default async function PortalHome({ searchParams }: { searchParams: { denied?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const office = can(user, "overhead");
  const [board, issues, goal, low, asks, badges] = await Promise.all([
    office ? latestBoard() : Promise.resolve(null),
    office ? vanIssues() : Promise.resolve([]),
    office ? savedGoal() : Promise.resolve(null),
    office ? lowStockCount() : Promise.resolve(null),
    office ? crewRequests() : Promise.resolve({ orders: [], leave: [], incidents: [] }),
    // The counts on the cards, shared with each side-bar tab's page.
    navBadges(user),
  ]);

  const first = user.name.split(" ")[0];
  const items = portalNav(user, { goalLabel: goal ? shortMoney(goal.revenue) : null });
  const m = board?.metrics;

  // ---- what needs someone today
  const lines: Line[] = [];
  // Safety first: an incident sits at the top until somebody has read it.
  if (asks.incidents.length) {
    const f = asks.incidents[0];
    lines.push({ n: asks.incidents.length, text: `${plural(asks.incidents.length, "incident")} reported · ${f.userName ?? "the crew"}${asks.incidents.length > 1 ? ` and ${asks.incidents.length - 1} more` : ""}`, href: "/portal/requests#incidents" });
  }
  if (m && (m.quotesQuietCount ?? 0) > 0) {
    lines.push({ n: m.quotesQuietCount, text: `${plural(m.quotesQuietCount, "quote")} gone quiet 7+ days`, href: "/portal/quotes#quiet" });
  }
  if (m && (m.overdueCount ?? 0) > 0 && m.overdueTotal != null) {
    lines.push({ n: m.overdueCount as number, text: `${plural(m.overdueCount as number, "invoice")} overdue · ${money(m.overdueTotal)}`, href: "/portal/money" });
  }
  const service = issues.filter((i) => i.kind === "service");
  if (service.length) {
    const f = service[0];
    lines.push({
      n: service.length,
      text: `van ${plural(service.length, "report")} to answer · ${f.item.toLowerCase()} (${f.van}${service.length > 1 ? ` and ${service.length - 1} more` : ""})`,
      href: service.length === 1 ? `/portal/vehicles/${f.vehicleId}?tab=report` : "/portal/requests#reports",
    });
  }
  const tools = issues.filter((i) => i.kind === "tool");
  if (tools.length) {
    const f = tools[0];
    lines.push({
      n: tools.length,
      text: `${plural(tools.length, "tool")} to sort on a van · ${f.item.toLowerCase()} (${f.van}${tools.length > 1 ? ` and ${tools.length - 1} more` : ""})`,
      href: tools.length === 1 ? `/portal/vehicles/${f.vehicleId}?tab=tools` : "/portal/vehicles",
    });
  }
  if (asks.orders.length) {
    const f = asks.orders[0];
    lines.push({ n: asks.orders.length, text: `parts ${plural(asks.orders.length, "order")} to place · ${f.requestedBy ?? "the crew"}${asks.orders.length > 1 ? ` and ${asks.orders.length - 1} more` : ""}`, href: "/portal/requests#parts" });
  }
  if (asks.leave.length) {
    lines.push({ n: asks.leave.length, text: `leave ${plural(asks.leave.length, "request")} to answer`, href: "/portal/requests#leave" });
  }
  if (low && low > 0) {
    lines.push({ n: low, text: `factory stock ${plural(low, "line")} at or under the minimum`, href: "/portal/stock" });
  }

  // Melbourne's date, not the server's: a board that says Thursday on a Friday
  // morning in Pakenham is wrong in the way people notice first.
  const today = localToday().toLocaleDateString("en-AU", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

  return (
    <PortalShell user={user} variant="home">
      <div className="pt-home">
        {/* The phone's own header: the bar is hidden there, as the design has it. */}
        <div className="pt-hphone">
          <Link href="/portal" className="pt-hphone__brand"><strong>Advanced</strong><em>Team portal</em></Link>
          <Link href="/portal/me" className="pt__avatar" aria-label={`${user.name} — my file`}>{user.name.slice(0, 1).toUpperCase()}</Link>
        </div>
        {searchParams.denied && (
          <div className="pt-note pt-note--warn">
            <strong>That page isn&rsquo;t open to you.</strong> Ask an admin if you think it should be.
          </div>
        )}

        <div className="pt-hi">
          <div>
            <span className="pt-hi__date">{today}</span>
            <h1 className="pt-hi__h">G&rsquo;day {first}.</h1>
          </div>
          <Link href="/portal/sops/daily-rhythm" className="pt-hi__flag">
            <span aria-hidden="true" /> Van check is now weekly, Monday morning →
          </Link>
        </div>

        <Link href="/portal/search" className="pt-hsearch">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3" /></svg>
          Search the portal
        </Link>

        {office && (
          <section className="pt-today" aria-labelledby="today-h">
            <div className="pt-today__head">
              <h2 id="today-h">Needs someone today</h2>
              <Link href="/portal/scoreboard">The numbers are on the Scoreboard →</Link>
            </div>
            {lines.length === 0 ? (
              <p className="pt-today__none">
                Nothing waiting on anyone right now.
                {!board && " The board hasn’t made its first snapshot yet, so quotes and overdue invoices aren’t counted."}
              </p>
            ) : (
              <ul className="pt-today__list">
                {lines.map((l) => (
                  <li key={l.text}>
                    <Link href={l.href} className="pt-today__row">
                      <span className="pt-today__n">{l.n.toLocaleString("en-AU")}</span>
                      <span className="pt-today__txt">{l.text}</span>
                      <span className="pt-today__go" aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <div className="pt-bands">
          {BANDS.map((band) => {
            const inBand = byBand(items, band);
            if (!inBand.length) return null;
            const blurb = band === "profit" && goal ? `Margins, the ${shortMoney(goal.revenue)} goal and Xero` : BAND_BLURB[band];
            return (
              <section className="pt-band" key={band} aria-label={BAND_LABEL[band]}>
                <h2 className="pt-band__h">{BAND_LABEL[band]} <span>{blurb}</span></h2>
                <NavTiles items={inBand} badges={badges} />
              </section>
            );
          })}
        </div>
      </div>
    </PortalShell>
  );
}
