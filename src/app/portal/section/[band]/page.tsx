import { notFound, redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { NavTiles } from "@/components/portal/NavTiles";
import { BANDS, BAND_BLURB, BAND_LABEL, byBand, portalNav, type NavBand } from "@/lib/portal/nav";
import { navBadges } from "@/lib/portal/navBadges";
import { savedGoal, shortMoney } from "@/lib/portal/office";

export const dynamic = "force-dynamic";

const isBand = (b: string): b is Exclude<NavBand, "hidden"> => b !== "hidden" && (BANDS as string[]).includes(b);

export function generateMetadata({ params }: { params: { band: string } }) {
  return { title: `${isBand(params.band) ? BAND_LABEL[params.band] : "Section"} — Team portal` };
}

/**
 * One side-bar tab as a page: its cards, with the same counts the home page
 * shows. Tapping a tab's header lands here, so the header goes somewhere
 * useful in the small bar too, where there is no list under it to open.
 *
 * Only the pages this person can open, from the same list the home grid and
 * the bar are built from. A tab with nothing in it for them is a 404 rather
 * than an empty page.
 */
export default async function SectionPage({ params }: { params: { band: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!isBand(params.band)) notFound();

  const band = params.band;
  const goal = band === "profit" ? await savedGoal().catch(() => null) : null;
  const items = byBand(portalNav(user, { goalLabel: goal ? shortMoney(goal.revenue) : null }), band);
  if (!items.length) notFound();
  const badges = await navBadges(user);
  const blurb = band === "profit" && goal ? `Margins, the ${shortMoney(goal.revenue)} goal and Xero` : BAND_BLURB[band];

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />
      <div className="pt-head">
        <h1>{BAND_LABEL[band]}</h1>
        <p>{blurb}.</p>
      </div>
      <section className="pt-band pt-band--page" aria-label={BAND_LABEL[band]}>
        <NavTiles items={items} badges={badges} />
      </section>
    </PortalShell>
  );
}
