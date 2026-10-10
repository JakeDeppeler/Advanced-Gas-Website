import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { Figs } from "@/components/portal/Figs";
import { Needs } from "@/components/portal/marketingParts";
import { submittedSheets } from "@/lib/portal/people";
import { hrs, weekTotals } from "@/lib/portal/peopleParts";
import { mondayOf } from "@/components/portal/fleetStatus";
import { localToday } from "@/lib/portal/xero";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hours — Team portal" };

/**
 * Paid hours against billed hours, by person.
 *
 * Paid hours are the timesheets the crew send from the trade portal — real,
 * sent weeks only, never a roster. Billed hours aren't in the replica:
 * invoices come across as totals without their labour lines. So the billed
 * half says what it needs rather than drawing the design's 70% from hours
 * people are rostered for, which would be a plan dressed as a measurement.
 */
export default async function HoursPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Hours" forWhom="managers" />;

  const thisMonday = mondayOf(localToday());
  const fourBack = new Date(thisMonday.getTime() - 3 * 7 * 86_400_000).toISOString().slice(0, 10);
  const weekOf = thisMonday.toISOString().slice(0, 10);
  const sheets = await submittedSheets(fourBack);
  const thisWeek = sheets.filter((s) => s.weekOf === weekOf);
  const paidWeek = thisWeek.reduce((n, s) => n + weekTotals(s.days).total, 0);
  const byPerson = new Map<string, { name: string; weeks: number; total: number; overtime: number }>();
  for (const s of sheets) {
    const t = weekTotals(s.days);
    const p = byPerson.get(s.userId) ?? { name: s.userName ?? "Someone", weeks: 0, total: 0, overtime: 0 };
    p.weeks += 1; p.total += t.total; p.overtime += t.overtime;
    byPerson.set(s.userId, p);
  }

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
          { label: "Paid hours", value: thisWeek.length ? hrs(paidWeek) : null, sub: thisWeek.length ? `this week · ${thisWeek.length} ${thisWeek.length === 1 ? "timesheet" : "timesheets"} sent` : undefined, needs: "no timesheets sent this week yet" },
          { label: "Billed hours", value: null, needs: "labour on invoices" },
          { label: "Not billed", value: null, needs: "and what those hours cost" },
        ]}
      />

      <section className="pt-panel">
        <h2 className="pt-panel__h">Timesheets sent · last four weeks</h2>
        <p className="pt-panel__sub">From the trade portal, as each person sends their week. A half-hour lunch comes off any day over five hours; overtime is past 7.6 hours a day.</p>
        {byPerson.size ? (
          <table className="pt-table">
            <thead><tr><th>Who</th><th>Weeks sent</th><th>Paid hours</th><th>Of it overtime</th></tr></thead>
            <tbody>
              {[...byPerson.values()].sort((a, b) => b.total - a.total).map((p) => (
                <tr key={p.name}><td>{p.name}</td><td>{p.weeks}</td><td>{hrs(p.total)}</td><td>{hrs(p.overtime)}</td></tr>
              ))}
            </tbody>
          </table>
        ) : <div className="pf-empty">No timesheets sent in the last four weeks.</div>}
      </section>

      <Needs
        title="What the billed half needs"
        body="Paid hours now come from the crew's timesheets. Billed hours don't: the sync reads each invoice as a total."
        bullets={[
          "Billed hours: the labour lines on each invoice, which the sync currently reads as a total only",
          "The labour cost per hour is already worked out on Our numbers, so the cost of the unbilled hours follows",
        ]}
      />
      <p className="pt-panel__sub">What each person is rostered for, and their real cost per hour, is on <Link href="/portal/finance/capacity">Our numbers</Link>.</p>
    </PortalShell>
  );
}
