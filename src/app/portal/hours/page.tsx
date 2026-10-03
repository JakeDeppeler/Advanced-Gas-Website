import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { Figs } from "@/components/portal/Figs";
import { Needs } from "@/components/portal/marketingParts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hours — Team portal" };

/**
 * Paid hours against billed hours, by person. Neither half is in the replica:
 * the sync doesn't read ServiceTitan's timesheets, and invoices come across as
 * totals without their labour lines. The page says that rather than drawing
 * the design's 70% from the hours people are rostered for, which would be a
 * plan dressed as a measurement.
 */
export default async function HoursPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Hours" forWhom="managers" />;

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />
      <div className="pt-head">
        <h1>Hours</h1>
        <p>Paid hours against billed hours, by person — how much of the week the crew is paid for actually ends up on an invoice.</p>
      </div>

      <Figs
        cols={4}
        items={[
          { label: "Billed", feature: true, value: null, needs: "of paid hours · target 75%" },
          { label: "Paid hours", value: null, needs: "from timesheets" },
          { label: "Billed hours", value: null, needs: "labour on invoices" },
          { label: "Not billed", value: null, needs: "and what those hours cost" },
        ]}
      />

      <Needs
        title="What this needs"
        body="Both halves come from ServiceTitan, and the sync reads neither yet. Once it does, this page fills in by itself, per person and for the month."
        bullets={[
          "Paid hours: ServiceTitan Payroll → Timesheets, read by the sync for everyone on the tools",
          "Billed hours: the labour lines on each invoice, which the sync currently reads as a total only",
          "The labour cost per hour is already worked out on Costs & capacity, so the cost of the unbilled hours follows",
        ]}
      />
      <p className="pt-panel__sub">What each person is rostered for, and their real cost per hour, is on <Link href="/portal/finance/capacity">Costs &amp; capacity</Link>.</p>
    </PortalShell>
  );
}
