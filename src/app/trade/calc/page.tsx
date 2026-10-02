import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell } from "@/components/portal/TradeShell";
import { TradeCalc } from "@/components/portal/TradeCalc";
import { crewFigures } from "@/lib/portal/crewRates";
import { can } from "@/lib/portal/caps";

export const dynamic = "force-dynamic";
export const metadata = { title: "Job calculator — Trade portal" };

export default async function TradeCalcPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const { byLevel, ridesAlong } = await crewFigures();

  return (
    <TradeShell
      user={user} active="/trade/calc"
      title="Job calculator"
      sub="Check a job covers your time before you quote it"
      action={
        // Only to someone the office page will let in: it shows what everybody
        // earns, which is why it is behind the overhead capability.
        can(user, "overhead")
          ? <Link href="/portal/job-calculator" className="tr-btn">Full calculator</Link>
          : undefined
      }
    >
      <TradeCalc
        tradesman={byLevel.tradesman ?? null}
        apprentice={byLevel.apprentice ?? null}
        apprenticeRidesAlong={ridesAlong.apprentice ?? false}
      />
    </TradeShell>
  );
}
