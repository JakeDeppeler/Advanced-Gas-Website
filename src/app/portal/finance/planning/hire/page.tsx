import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { FinanceHead } from "@/components/portal/FinanceHead";
import { PlanningTabs } from "@/components/portal/PlanningTabs";
import { Locked } from "@/components/portal/Locked";
import { theHour } from "@/lib/portal/cover/load";
import { PAID_HRS_YEAR, scenarios } from "@/lib/portal/cover/hour";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hire someone — Team portal" };

const m0 = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-AU")}`;
const m2 = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const n0 = (n: number) => Math.round(n).toLocaleString("en-AU");

/**
 * What if › Hire someone: what another apprentice, another tech and van, or a
 * whole crew does to the year and the hour. The same sums as What an hour must
 * cover (scenarios), so this tab and that page give the same answer.
 */
export default async function HirePage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Finance" forWhom="managers" />;

  const { lines, fleet, oc, i, r } = await theHour();
  const rows = scenarios(lines, fleet, oc, i).filter((x) => ["now", "app", "tech", "crew"].includes(x.key));
  const loaded = 1 + oc / 100;
  const hrsVan = i.daysOnTools * i.billPerDay;
  const perVanEach = fleet.vans > 0 ? lines.filter((l) => l.perVan).reduce((a, l) => a + l.annual, 0) / fleet.vans : 0;
  const techCost = i.techWage * PAID_HRS_YEAR * loaded + perVanEach;
  const appCost = i.appWage * PAID_HRS_YEAR * loaded;

  return (
    <PortalShell user={user}>
      <FinanceHead title="What if" lede="What another person takes, and what they make. Every figure comes from Pricing & costs; nothing here changes them." />
      <PlanningTabs current="/portal/finance/planning/hire" />
      <div className="pk pt-cover">
        <section className="pk-card pk-pad">
          <div className="pk-card-h"><b>What one more person takes</b><span>a year</span></div>
          <div className="pk-tbl-wrap">
            <table className="pk-tbl">
              <thead><tr><th>Who</th><th>Pay &amp; on-costs</th><th>Van</th><th>Adds to the year</th><th>Hours they bill</th><th>Work it takes to cover them</th></tr></thead>
              <tbody>
                <tr>
                  <td><b>A tech with a van</b><div className="ks">{m2(i.techWage)} an hour</div></td>
                  <td>{m0(techCost - perVanEach)}</td><td>{m0(perVanEach)}</td><td><b>{m0(techCost)}</b></td><td>{n0(hrsVan)}</td>
                  <td>{m0(techCost / 52)} a week of billed work{i.charge > 0 ? ` — ${(techCost / 52 / i.charge).toFixed(1)} hrs at ${m2(i.charge)}` : ""}</td>
                </tr>
                <tr>
                  <td><b>An apprentice</b><div className="ks">{m2(i.appWage)} an hour, riding with a tech</div></td>
                  <td>{m0(appCost)}</td><td>—</td><td><b>{m0(appCost)}</b></td><td>none of their own</td>
                  <td>{m0(appCost / 52)} a week, from the crews they make faster or the crew rate</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="pk-card pk-pad">
          <div className="pk-card-h"><b>What it does to the year</b><span>at {m2(i.charge)} an hour · {i.billPerDay} of {i.dayHrs} hours billed</span></div>
          <div className="pk-tbl-wrap">
            <table className="pk-tbl">
              <thead><tr><th>If we…</th><th>Billed hours</th><th>Break-even</th><th>To make {i.margin}%</th><th>Left a year</th><th>Against now</th></tr></thead>
              <tbody>
                {rows.map((x) => {
                  const d = x.r.leftAtCharge - r.leftAtCharge;
                  return (
                    <tr key={x.key} className={x.key === "now" ? "pt-cover__now" : undefined}>
                      <td><b>{x.label}</b><div className="ks">{x.sub}</div></td>
                      <td>{n0(x.r.billHrs)}</td>
                      <td>{m2(x.r.perHr.total)}</td>
                      <td>{m2(x.r.atMargin)}</td>
                      <td className={x.r.leftAtCharge < 0 ? "pt-cover__neg" : undefined}>{m0(x.r.leftAtCharge)}</td>
                      <td>{x.key === "now" ? "—" : <span className={d < 0 ? "pt-cover__neg" : "pt-cover__pos"}>{d >= 0 ? "▲ " : "▼ "}{m0(Math.abs(d))}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="pk-note" style={{ marginTop: 10 }}>
            A tech only makes this if there&rsquo;s the work to fill their van; with half a diary they cost more than they bring. More or fewer vans, side by side, is on{" "}
            <Link href="/portal/finance/planning">the first tab</Link>; different wages or hours on <Link href="/portal/finance/cover">What an hour must cover</Link>.
          </p>
        </section>
      </div>
    </PortalShell>
  );
}
