import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { BANDS, BAND_BLURB, BAND_LABEL, ICON, byBand, portalNav, type NavBand } from "@/lib/portal/nav";
import { needsByBand, needsToday } from "@/lib/portal/needs";
import { NeedsList } from "@/components/portal/NeedsList";
import { localToday } from "@/lib/portal/xero";
import { latestBoard, savedGoal, shortMoney } from "@/lib/portal/office";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team portal" };

/** Each section's icon: the same as its tab in the side bar. */
const TAB_ICONS: Record<NavBand, string> = {
  run: ICON.trend, board: ICON.screen, customers: ICON.chat, profit: ICON.chart, marketing: ICON.speaker,
  crew: ICON.truck, "how-we-work": ICON.book, settings: ICON.user, hidden: ICON.grid,
};

/**
 * Home, to the mock: the day, what needs someone today, then the portal's
 * eight sections as cards — each with how many of today's lines are its, and
 * how many pages it holds. The pages themselves are a tap away in the side
 * bar or on each section's page; listing all forty here as well made Home a
 * second copy of the side bar.
 *
 * The list only carries lines it can count (needs.ts), and hides at zero.
 */
export default async function PortalHome({ searchParams }: { searchParams: { denied?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const office = can(user, "overhead");
  const [board, goal, lines] = await Promise.all([
    office ? latestBoard() : Promise.resolve(null),
    office ? savedGoal() : Promise.resolve(null),
    needsToday(user).catch(() => []),
  ]);

  const first = user.name.split(" ")[0];
  const items = portalNav(user, { goalLabel: goal ? shortMoney(goal.revenue) : null });
  const need = needsByBand(lines);

  // Melbourne's date, not the server's: a board that says Thursday on a Friday
  // morning in Pakenham is wrong in the way people notice first.
  const today = localToday().toLocaleDateString("en-AU", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

  return (
    <PortalShell user={user} variant="home">
      <div className="pt-home">
        {searchParams.denied && (
          <div className="pt-note pt-note--warn">
            <strong>That page isn&rsquo;t open to you.</strong> Ask an admin if you think it should be.
          </div>
        )}

        <div className="pt-hi">
          <span className="pt-hi__date">{today}</span>
          <h1 className="pt-hi__h">G&rsquo;day {first}.</h1>
        </div>

        <Link href="/portal/search" className="pt-hsearch">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3" /></svg>
          Search the portal
        </Link>

        {office && <NeedsList lines={lines} empty={board ? undefined : "The board hasn’t made its first snapshot yet, so quotes and overdue invoices aren’t counted."} />}

        <div className="pt-secs">
          {BANDS.map((band) => {
            const inBand = byBand(items, band);
            if (!inBand.length || band === "hidden") return null;
            const blurb = band === "profit" && goal ? `Margins, the ${shortMoney(goal.revenue)} goal and Xero` : BAND_BLURB[band];
            const n = need[band] ?? 0;
            return (
              <Link key={band} href={`/portal/section/${band}`} className="pt-sec">
                <span className="pt-sec__top">
                  <span className="pt-tile__ico" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={TAB_ICONS[band]} />
                    </svg>
                  </span>
                  {n > 0 && <span className="pt-tile__badge">{n} need you</span>}
                </span>
                <span className="pt-sec__text">
                  <span className="pt-sec__name">{BAND_LABEL[band]}</span>
                  <span className="pt-sec__blurb">{blurb}</span>
                  <span className="pt-sec__go">{inBand.length} {inBand.length === 1 ? "page" : "pages"} →</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </PortalShell>
  );
}
