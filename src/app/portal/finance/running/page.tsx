import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { FinanceHead } from "@/components/portal/FinanceHead";
import { Locked } from "@/components/portal/Locked";
import { listUsers, getCapSettings, listVehicles, dbConfigured } from "@/lib/portal/db";
import { withFleet } from "@/lib/portal/costSettings";
import {
  computeCapacity, fleetDepOf, LEVEL_LABEL, OVERHEAD_FIELDS, OVERHEAD_GROUPS, officeCost, overheadLines, overheadSplit, scaleModel, scaleOf,
  type CapSettings, type CrewLevel, type CrewMember,
} from "@/lib/portal/crew";

export const dynamic = "force-dynamic";
export const metadata = { title: "Running costs — Team portal" };

const m0 = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
const m2 = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const h0 = (n: number) => `${Math.round(n).toLocaleString("en-AU")} hrs`;

type Line = { key: string; label: string; group: string; annual: number; perVan: boolean };

/**
 * Every overhead on one list: what it costs a year, a month and an hour, and
 * what it does when another van goes on the road.
 *
 * Read from the same settings and the same computeCapacity as Our hourly rate,
 * so the totals here are the totals there. A line either stays put however
 * many vans there are (the factory, the office, the accountant) or arrives
 * with each van (its fuel, insurance, tools, phone) — the switch is set per
 * line on Pricing & costs. Nothing new is worked out; it is the same model laid
 * out line by line, with the next two vans beside today.
 */
export default async function RunningCostsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Finance" forWhom="managers" />;

  const ready = dbConfigured();
  const [users, stored, vehicles] = ready ? await Promise.all([listUsers(), getCapSettings(), listVehicles()]) : [[], null, []];
  const s: CapSettings = withFleet(stored, vehicles);
  const people: CrewMember[] = users
    .filter((u) => u.active && u.id && u.level)
    .map((u) => ({ id: u.id as string, name: u.name, level: u.level as CrewLevel, costing: u.costing }));
  const cap = computeCapacity(people, s);
  const vans = cap.realVans;
  const has = vans > 0 && cap.totalBillHrs > 0;
  const hrsEach = has ? cap.totalBillHrs / vans : 0;

  const internal = s.ohSource === "internal";
  const split = overheadSplit(s);
  const oh = overheadLines(s);
  const fleetDep = fleetDepOf(s);
  const groupLabel = (k: string) => OVERHEAD_GROUPS.find((g) => g.key === k)?.label ?? "";

  const lines: Line[] = internal
    ? [
        { key: "fixed", label: "Overheads that stay put", group: "Kept as one figure", annual: split.fixed, perVan: false },
        { key: "perVan", label: "Overheads that come with each van", group: "Kept as one figure", annual: split.perVan, perVan: true },
      ]
    : OVERHEAD_FIELDS.map((f) => ({
        key: f.key,
        label: f.key === "vehDep" && fleetDep > 0 ? "Van depreciation (from Vehicles)" : f.label,
        group: groupLabel(f.group),
        annual: Number(oh[f.key]) || 0,
        perVan: scaleOf(s, f.key) === "perVan",
      })).filter((l) => l.annual > 0);
  // The office is wages, not a bill, but it is the biggest thing that stays put.
  const office = officeCost(cap);
  const officeLines: Line[] = office.rows.filter((r) => r.cost > 0).map((r) => ({ key: `office-${r.id}`, label: r.name, group: "Office & admin staff", annual: r.cost, perVan: false }));
  // Tradesmen's own office hours are counted on the office line too; they aren't on the rows above.
  const officeRest = cap.officeOh - office.total;
  if (officeRest > 1) officeLines.push({ key: "office-crew", label: "Crew's office hours", group: "Office & admin staff", annual: officeRest, perVan: false });

  const all = [...officeLines, ...lines];
  const groups = [...new Set(all.map((l) => l.group))].map((g) => {
    const ls = all.filter((l) => l.group === g).sort((a, b) => b.annual - a.annual);
    return { label: g, lines: ls, annual: ls.reduce((a, l) => a + l.annual, 0) };
  });
  const total = all.reduce((a, l) => a + l.annual, 0);
  const fixedTotal = all.filter((l) => !l.perVan).reduce((a, l) => a + l.annual, 0);
  const perVanTotal = total - fixedTotal;
  const extraVan = has ? perVanTotal / vans : 0;
  const at = (l: Line, n: number) => (l.perVan && has ? (l.annual / vans) * n : l.annual);
  const cols = has ? [vans, vans + 1, vans + 2] : [];
  const perHr = (annual: number, n: number) => (hrsEach > 0 ? annual / (hrsEach * n) : 0);

  // The whole hour at each fleet size, crew wages included.
  const scale = has ? scaleModel(cap, s).filter((r) => r.vans >= 1) : [];

  // What one more person brings, read off the people already here: their pay
  // and on-costs, the van's costs if they drive one, and the hours they add.
  const kinds = new Map<string, { label: string; n: number; pay: number; van: number; hrs: number }>();
  for (const { p, c } of cap.per) {
    const k = `${p.level}:${c.chargeable ? "van" : c.ridesCost > 0 ? "rides" : "office"}`;
    const label = c.chargeable ? `${LEVEL_LABEL[p.level]} with a van` : c.ridesCost > 0 ? `${LEVEL_LABEL[p.level]} riding along` : LEVEL_LABEL[p.level];
    const got = kinds.get(k) ?? { label, n: 0, pay: 0, van: 0, hrs: 0 };
    got.n += 1; got.pay += c.wageCost; got.van += c.chargeable ? extraVan : 0; got.hrs += c.billHrs;
    kinds.set(k, got);
  }
  const adds = [...kinds.values()].map((k) => ({ ...k, pay: k.pay / k.n, van: k.van / k.n, hrs: k.hrs / k.n })).sort((a, b) => b.pay + b.van - (a.pay + a.van));

  return (
    <PortalShell user={user}>
      <FinanceHead title="Running costs" lede="Every overhead, what it costs to keep the doors open, and what changes when another van goes on the road." />

      {!has ? (
        <div className="pt-note pt-note--warn">
          <strong>There&rsquo;s no crew with a van and billable hours yet,</strong> so nothing can be spread per hour or per van. Add the crew on <Link href="/portal/finance/capacity">Pricing & costs</Link>.
        </div>
      ) : (
        <>
          <section className="pt-panel pt-hs pt-rc-sum" aria-labelledby="rc-h">
            <h2 id="rc-h" className="pt-sr">The short version</h2>
            <div className="pt-hs__nums">
              <div><span>Overheads a year</span><strong>{m0(total)}</strong><em>{m0(total / 12)} a month · {m0(total / 52)} a week</em></div>
              <div><span>Stays put</span><strong>{m0(fixedTotal)}</strong><em>the same with one van or ten</em></div>
              <div><span>Each van brings</span><strong>{m0(extraVan)}</strong><em>a year, on top of the crew&rsquo;s pay</em></div>
              <div className="is-charge"><span>On every billable hour</span><strong>{m2(perHr(total, vans))}</strong><em>{m0(total)} ÷ {h0(cap.totalBillHrs)} across {vans} {vans === 1 ? "van" : "vans"}</em></div>
            </div>
          </section>

          <section className="pt-panel" aria-labelledby="rc-lines">
            <h2 id="rc-lines" className="pt-panel__h">Every overhead, now and with more vans</h2>
            <p className="pt-note" style={{ margin: "0 0 12px" }}>
              <strong>Stays put</strong> lines don&rsquo;t move when a van is added, so the same dollars spread over more hours.{" "}
              <strong>Per van</strong> lines grow by today&rsquo;s cost of one van. Crew wages aren&rsquo;t here — they&rsquo;re a labour cost on each job;
              the table under this one has them. Change a figure or which way a line goes on <Link href="/portal/finance/capacity?t=overheads">Wages &amp; costs › Overheads</Link>.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table className="pt-table pt-rc">
                <thead>
                  <tr>
                    <th scope="col">Overhead</th>
                    <th scope="col">Grows with</th>
                    <th scope="col" className="num">A month</th>
                    {cols.map((n, i) => <th key={n} scope="col" className="num">{i === 0 ? `A year now · ${n} vans` : `With ${n} vans`}</th>)}
                    <th scope="col" className="num">An hour now</th>
                  </tr>
                </thead>
                {groups.map((g) => (
                  <tbody key={g.label}>
                    <tr className="pt-rc__grp">
                      <th scope="rowgroup" colSpan={3}>{g.label}</th>
                      {cols.map((n) => <td key={n} className="num">{m0(g.lines.reduce((a, l) => a + at(l, n), 0))}</td>)}
                      <td className="num">{m2(perHr(g.annual, vans))}</td>
                    </tr>
                    {g.lines.map((l) => (
                      <tr key={l.key}>
                        <th scope="row">{l.label}</th>
                        <td>{l.perVan ? "Per van" : "Stays put"}</td>
                        <td className="num">{m0(l.annual / 12)}</td>
                        {cols.map((n) => <td key={n} className="num">{m0(at(l, n))}</td>)}
                        <td className="num">{m2(perHr(l.annual, vans))}</td>
                      </tr>
                    ))}
                  </tbody>
                ))}
                <tfoot>
                  <tr className="pt-rc__tot">
                    <th scope="row" colSpan={2}>All overheads</th>
                    <td className="num">{m0(total / 12)}</td>
                    {cols.map((n) => <td key={n} className="num">{m0(fixedTotal + extraVan * n)}</td>)}
                    <td className="num">{m2(perHr(total, vans))}</td>
                  </tr>
                  <tr>
                    <th scope="row" colSpan={3}>Hours we can bill</th>
                    {cols.map((n) => <td key={n} className="num">{h0(hrsEach * n)}</td>)}
                    <td />
                  </tr>
                  <tr className="pt-rc__tot">
                    <th scope="row" colSpan={3}>Overhead on every billable hour</th>
                    {cols.map((n) => <td key={n} className="num">{m2(perHr(fixedTotal + extraVan * n, n))}</td>)}
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="pt-panel" aria-labelledby="rc-people">
            <h2 id="rc-people" className="pt-panel__h">What one more person adds</h2>
            <p className="pt-note" style={{ margin: "0 0 12px" }}>
              The average of who&rsquo;s here now. A tech with a van brings the van&rsquo;s costs and billable hours; an apprentice riding along brings their pay
              and no extra hours — the customer pays for them through the higher crew rate. For a different wage, use <Link href="/portal/finance/planning">What if</Link>.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table className="pt-table pt-rc">
                <thead>
                  <tr>
                    <th scope="col">Who</th>
                    <th scope="col" className="num">Pay &amp; on-costs a year</th>
                    <th scope="col" className="num">Van costs</th>
                    <th scope="col" className="num">Adds to the year</th>
                    <th scope="col" className="num">Hours they bill</th>
                  </tr>
                </thead>
                <tbody>
                  {adds.map((a) => (
                    <tr key={a.label}>
                      <th scope="row">{a.label}{a.n > 1 ? <em className="pt-rc__n"> · average of {a.n}</em> : null}</th>
                      <td className="num">{m0(a.pay)}</td>
                      <td className="num">{a.van > 0 ? m0(a.van) : "—"}</td>
                      <td className="num"><strong>{m0(a.pay + a.van)}</strong></td>
                      <td className="num">{a.hrs > 0 ? h0(a.hrs) : "none of their own"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {scale.length > 0 && (
            <section className="pt-panel" aria-labelledby="rc-scale">
              <h2 id="rc-scale" className="pt-panel__h">The whole hour at each number of vans</h2>
              <p className="pt-note" style={{ margin: "0 0 12px" }}>
                Crew wages included, each van crewed like today&rsquo;s average, at our {s.margin}% margin. The hour gets cheaper with every van because the
                {" "}{m0(fixedTotal)} that stays put is shared by more hours — it flattens out because each van brings {m0(extraVan)} of its own.
              </p>
              <div style={{ overflowX: "auto" }}>
                <table className="pt-table pt-rc">
                  <thead>
                    <tr>
                      <th scope="col">Vans</th>
                      <th scope="col" className="num">Overheads a year</th>
                      <th scope="col" className="num">Billable hours</th>
                      <th scope="col" className="num">Overhead an hour</th>
                      <th scope="col" className="num">An hour costs</th>
                      <th scope="col" className="num">Charge-out</th>
                      <th scope="col" className="num">Sales to cover it</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scale.map((r) => (
                      <tr key={r.vans} className={r.isNow ? "is-now" : undefined}>
                        <th scope="row">{r.vans}{r.isNow ? <em className="pt-rc__n"> · today</em> : null}</th>
                        <td className="num">{m0(r.overhead)}</td>
                        <td className="num">{h0(r.billHrs)}</td>
                        <td className="num">{m2(r.overheadPerHr)}</td>
                        <td className="num">{m2(r.costPerHr)}</td>
                        <td className="num"><strong>{m2(r.chargeOut)}</strong></td>
                        <td className="num">{m0(r.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </PortalShell>
  );
}
