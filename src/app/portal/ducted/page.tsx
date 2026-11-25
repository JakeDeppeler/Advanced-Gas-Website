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
// Putting a quote on a job reads the pricebook again and writes forty-odd lines to ServiceTitan one by one.
export const maxDuration = 60;
export const metadata = { title: "Ducted quote · Team portal" };

/**
 * Pipeline › Ducted quote: a ducted system priced from a Trust Trade design's
 * materials list, or from the house's outlets and zones laid out by hand,
 * instead of a fixed template. Prices are read live from the ServiceTitan
 * pricebook, and the quote goes onto a job in ServiceTitan by its number.
 */
export default async function DuctedPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "quotes") && !can(user, "overhead")) return <Locked user={user} what="Ducted quote" forWhom="whoever writes quotes" />;

  const cat = serviceTitanConfigured() ? await loadDuctedCatalogue().catch(() => null) : null;
  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Ducted quote" eyebrow="A ducted system priced from a Trust Trade design or the house's outlets and zones · prices from the ServiceTitan pricebook" info={[
          ["Labour", `${DUCTED.baseHours} hours for the unit, plenum, return air and controller, ${DUCTED.perOutlet * 60} minutes an outlet and ${DUCTED.perZone * 60} a zone, never under two days (${DUCTED.minHours} hours): a standard 8-outlet, 4-zone house comes out at exactly two days. A double storey adds ${DUCTED.doubleStorey} hours, and anything harder goes in as extra hours with the reason. Two people at Our hourly rate.`],
          ["From a design", "The designer's materials list (Outputs › Materials › CSV) brings every duct size in 6 m lengths, each take-off at its sizes, the transition, the outlets, the return air and a damper per zone. Each is matched to the pricebook; a take-off it doesn't stock goes on as the nearest one that fits plus reducers, and anything it can't match is listed to add by hand."],
          ["By hand", "Each outlet's duct by size, rounded up to 6 m lengths, and its downjet; a damper and cable for each zone. Either way, the rest of the kit (fan coil supports, springs, drain, tape, straps, condenser bracket and coil) comes from the unit's own ducted template."],
          ["Zoning", `The Mitsubishi Electric zone controller (up to ${DUCTED.maxZones} zones) on every job, as its own group on the quote. The temperature controls, one per zone unless you say fewer, go with the installation's materials.`],
          ["Into ServiceTitan", "Put in the job number and the quote goes on that job, not sent: each group's head carries its price, with the materials listed under it at $0, as the office quotes by hand. A note on the job says where it came from."],
        ]} />
        {cat ? (
          <>
            <Say>Drop in the design&rsquo;s materials list, or lay the house out by hand, and the quote follows. Check it, then put it on the job.</Say>
            <DuctedBuilder cat={cat} />
          </>
        ) : (
          <Say>The pricebook couldn&rsquo;t be read from ServiceTitan just now, so there&rsquo;s nothing to price from. Try again in a minute.</Say>
        )}
      </div>
    </PortalShell>
  );
}
