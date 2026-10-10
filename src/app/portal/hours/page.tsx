import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { Figs } from "@/components/portal/Figs";
import { MAX_VISIT_HRS, onTheTools } from "@/lib/portal/onTheTools";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hours — Team portal" };

const h1 = (n: number) => `${n.toFixed(1)} hrs`;
const pc = (n: number) => `${Math.round(n * 100)}%`;

/**
 * Time on the tools, by person, from ServiceTitan's own clock-ins: the moment
 * a tech marks themselves arrived to the moment they mark the job done. Travel
 * is dispatched to arrived. Against the week their card on Our numbers says
 * they're rostered for, that's how much of the paid week went on customers.
 *
 * It replaced three tiles that waited on the crew's portal timesheets, which
 * nobody sends, while ServiceTitan had the real hours all along.
 */
export default async function HoursPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Hours" forWhom="managers" />;

  const { rows, lastOn, lastTravel, lastRoster, lastVisits, lastMonday } = await onTheTools();
  const weekLabel = lastMonday.toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />
      <div className="pt-head">
        <h1>Hours</h1>
        <p>How much of the crew&rsquo;s paid week goes on customers&rsquo; jobs, from ServiceTitan&rsquo;s clock-ins.</p>
      </div>

      <Figs
        cols={3}
        items={[
          {
            label: "On the tools last week", feature: true,
            value: lastRoster > 0 ? pc(lastOn / lastRoster) : null,
            sub: `${h1(lastOn)} on site, of ${h1(lastRoster)} rostered`,
            from: `ServiceTitan clock-ins · week of ${weekLabel}`,
            needs: "No clock-ins last week",
            parts: rows.filter((r) => r.field && r.lastVisits > 0).map((r) => ({ label: r.name, value: r.roster ? `${h1(r.lastOn)} of ${r.roster} · ${pc(r.lastOn / r.roster)}` : h1(r.lastOn) })),
          },
          {
            label: "Driving between jobs", value: lastVisits ? h1(lastTravel) : null,
            sub: lastOn > 0 ? `${pc(lastTravel / (lastOn + lastTravel))} of the time out on jobs` : undefined,
            from: "ServiceTitan · dispatched to arrived", needs: "No clock-ins last week",
          },
          {
            label: "Visits last week", value: lastVisits ? String(lastVisits) : null,
            sub: lastVisits ? `${h1(lastOn / lastVisits)} on site each, on average` : undefined,
            from: "ServiceTitan clock-ins", needs: "No clock-ins last week",
          },
        ]}
      />

      <section className="pt-panel" aria-labelledby="hrs-h">
        <h2 id="hrs-h" className="pt-panel__h">By person</h2>
        <p className="pt-panel__sub">
          On site is arrived to done on each visit; driving is dispatched to arrived. Rostered is the week on their card on <Link href="/portal/finance/capacity">Our numbers</Link>. A visit clocked over {MAX_VISIT_HRS} hours is left out as a clock left running. The office&rsquo;s visits are listed but kept out of the totals above.
        </p>
        {rows.length ? (
          <div className="pt-fleet__wrap">
            <table className="pt-rev__pl">
              <thead><tr><th scope="col">Who</th><th scope="col">Last week on site</th><th scope="col">Rostered</th><th scope="col">On the tools</th><th scope="col">4-week average on site</th><th scope="col">Visits, 4 weeks</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name}>
                    <th scope="row">{r.name}{!r.field && <em> office</em>}</th>
                    <td>{r.lastVisits ? h1(r.lastOn) : "—"}</td>
                    <td>{r.roster ? `${r.roster} hrs` : "—"}</td>
                    <td>{r.roster && r.lastVisits ? pc(r.lastOn / r.roster) : "—"}</td>
                    <td>{h1(r.fourOn / 4)}</td>
                    <td>{r.fourVisits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="pt-rep__empty">No clock-ins in the last four weeks.</p>}
      </section>
    </PortalShell>
  );
}
