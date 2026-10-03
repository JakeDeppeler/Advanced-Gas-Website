import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { BANDS, BAND_LABEL, ICON, byBand, portalNav } from "@/lib/portal/nav";
import { localToday } from "@/lib/portal/xero";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team portal" };

/**
 * Home, which is now the navigation.
 *
 * With the sidebar gone this page carries every destination, so it is built
 * from the same list the search indexes — one source, gated by the same
 * capabilities the pages check, so a card is never offered to somebody the page
 * will turn away.
 *
 * Grouped into four bands rather than one long grid: twelve undifferentiated
 * cards is a wall, and the bands are how people already talk about the work —
 * what you do on the job, how we do it, the business, the settings.
 */
export default async function PortalHome({ searchParams }: { searchParams: { denied?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const first = user.name.split(" ")[0];
  const items = portalNav(user);

  // Melbourne's date, not the server's: a board that says Thursday on a Friday
  // morning in Pakenham is wrong in the way people notice first.
  const today = localToday().toLocaleDateString("en-AU", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });

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
          <h1 className="pt-hi__h">
            G&rsquo;day {first}.
          </h1>
        </div>
        <Link href="/portal/sops/daily-rhythm" className="pt-hi__flag">
          <span aria-hidden="true" /> Van check is now weekly, Monday morning →
        </Link>
      </div>

      <Link href="/portal/search" className="pt-hsearch">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3" /></svg>
        Search the portal
      </Link>

      {/* The wrapper exists for the phone layout: the bands collapse into it with
          display:contents so twelve tiles flow as one three-column grid, which
          is how the design has it. Four-item bands would otherwise leave an
          orphan tile on its own row three times down the page. */}
      <div className="pt-bands">
      {BANDS.map((band) => {
        const inBand = byBand(items, band);
        if (!inBand.length) return null;
        return (
          <section className="pt-band" key={band}>
            <h2 className="pt-band__h">{BAND_LABEL[band]}</h2>
            <div className="pt-band__grid">
              {inBand.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  target={it.external ? "_blank" : undefined}
                  rel={it.external ? "noopener" : undefined}
                  // A route that redirects must not be prefetched: Next would
                  // follow the redirect on every load of this page.
                  prefetch={it.external ? false : undefined}
                  className={`pt-tile${it.feature ? " is-feature" : ""}`}
                >
                  <span className="pt-tile__ico" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={ICON[it.icon]} />
                    </svg>
                  </span>
                  <span className="pt-tile__text">
                    <span className="pt-tile__name" data-short={it.short}><span>{it.label}{it.external ? "\u00A0↗" : ""}</span></span>
                    <span className="pt-tile__blurb">{it.blurb}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
      </div>
      </div>
    </PortalShell>
  );
}
