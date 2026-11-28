import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { KpiHead, Say } from "@/components/portal/kit/Kit";
import { DuctDesigner } from "@/components/portal/DuctDesigner";
import { serviceTitanConfigured } from "@/lib/dashboard/servicetitan";
import { loadDuctedCatalogue } from "@/lib/ducted/catalogue";

export const dynamic = "force-dynamic";
// Update quote puts forty-odd lines on one by one before the old ones come off.
export const maxDuration = 120;
export const metadata = { title: "Duct design · Team portal" };

/** The Trust Trade designer. Set DUCT_DESIGNER_URL to try a preview of it. */
const DESIGNER = process.env.DUCT_DESIGNER_URL || "https://trusttrade.au/tools/hvac-designer/";

/**
 * Daily tools › Duct design (Jake, 28 Nov 2026): "push this to a tool in the
 * portal but have a way to link it to a job and then it pulls the information
 * and then i can design it and then it will build a full quote in the job ...
 * and then i can reopen it and if i move vents or add i can push a button and
 * it will update the quote".
 */
export default async function DuctDesignPage({ searchParams }: { searchParams: { job?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "quotes") && !can(user, "overhead")) return <Locked user={user} what="Duct design" forWhom="whoever writes quotes" />;
  const job = searchParams?.job;
  const cat = serviceTitanConfigured() ? await loadDuctedCatalogue().catch(() => null) : null;
  return (
    <PortalShell user={user}>
      <div className="rp">
        <KpiHead hi="Daily tools · design the ducts for a job, and its quote follows" title="Duct design" kpis={[]} info={[
          ["The job", "Put in the ServiceTitan job number. The customer and address go into the designer, and the design is kept against the job as you draw it, plan image and all, so it opens again from any computer."],
          ["Build quote", "On the designer's last step, Build quote prices the design from the pricebook as it is now: the unit, the zone controller, two days' labour and every material, in the same groups as the ducted quote. Return air uses the grille sizes we stock."],
          ["Parts with no match", "Anything the pricebook has no item for is listed, and nothing goes on the job until each has one. Pick it once and it's remembered for the next job."],
          ["Update quote", "Move a vent or add one, press Update quote, and choose: update the quote already on the job (its lines swapped for the new ones, the summary rewritten), or make a new quote and dismiss the old one. A sold quote is never changed."],
        ]} />
      </div>
      <div className="pk">
        {cat ? (
          <>
            <Say>Open a job, design it, then Build quote from the designer&rsquo;s last step.</Say>
            <DuctDesigner cat={cat} designerUrl={DESIGNER} start={/^\d{3,9}$/.test(job ?? "") ? job! : ""} />
          </>
        ) : (
          <Say>The pricebook couldn&rsquo;t be read from ServiceTitan just now, so there&rsquo;s nothing to price from. Try again in a minute.</Say>
        )}
      </div>
    </PortalShell>
  );
}
