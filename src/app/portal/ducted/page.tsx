import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { Head, Say } from "@/components/portal/kit/Kit";
import { DuctedBuilder } from "@/components/portal/DuctedBuilder";
import { serviceTitanConfigured } from "@/lib/dashboard/servicetitan";
import { loadDuctedCatalogue } from "@/lib/ducted/catalogue";
import { DUCTED } from "@/lib/ducted/plan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ducted quote · Team portal" };

/**
 * Pipeline › Ducted quote: a ducted system priced from the house's own
 * outlets and zones instead of a fixed template, with the summary written
 * from the layout. Prices are read live from the ServiceTitan pricebook, so
 * the quote here is the one the pricebook would give.
 */
export default async function DuctedPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "quotes") && !can(user, "overhead")) return <Locked user={user} what="Ducted quote" forWhom="whoever writes quotes" />;

  const cat = serviceTitanConfigured() ? await loadDuctedCatalogue().catch(() => null) : null;
  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Ducted quote" eyebrow="A ducted system priced from the house's outlets and zones · prices from the ServiceTitan pricebook" info={[
          ["Labour", `${DUCTED.baseHours} hours for the unit, plenum, return air and controller, ${DUCTED.perOutlet * 60} minutes an outlet and ${DUCTED.perZone * 60} a zone, never under two days (${DUCTED.minHours} hours): a standard 8-outlet, 4-zone house comes out at exactly two days. A double storey adds ${DUCTED.doubleStorey} hours, and anything harder goes in as extra hours with the reason. Two people at Our hourly rate.`],
          ["Materials", "Each outlet's duct by size, rounded up to 6 m lengths, and its downjet; a damper and cable for each zone; the Zonemate Touch Pro bundle on every job, with extra sensors only when asked for. The rest of the kit (fan coil supports, springs, drain, filter, plenum, tape, straps, condenser bracket and coil) comes from the unit's own ducted template."],
          ["Summary", "Written from the zones, the rooms in each and your notes, ready to paste into the quote in ServiceTitan."],
        ]} />
        {cat ? (
          <>
            <Say>Lay out the house and the quote follows. It starts on a standard house as an example; change the rooms, sizes and runs to the job.</Say>
            <DuctedBuilder cat={cat} />
          </>
        ) : (
          <Say>The pricebook couldn&rsquo;t be read from ServiceTitan just now, so there&rsquo;s nothing to price from. Try again in a minute.</Say>
        )}
      </div>
    </PortalShell>
  );
}
