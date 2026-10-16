import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { FinanceHead } from "@/components/portal/FinanceHead";
import { Locked } from "@/components/portal/Locked";
import { latestBoard } from "@/lib/portal/office";
import { TeamTabs } from "@/components/portal/run/RunTabs";
import { theHour } from "@/lib/portal/cover/load";
import { PAID_HRS_YEAR, fleetSizes } from "@/lib/portal/cover/hour";

export const dynamic = "force-dynamic";
export const metadata = { title: "Running costs — Team portal" };

const m0 = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-AU")}`;
const m2 = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const h0 = (n: number) => `${Math.round(n).toLocaleString("en-AU")} hrs`;
const n1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString("en-AU");

/**
 * Every overhead on one list: what it costs a year, a month and on every
 * billed hour, and what it does when another van goes on the road.
 *
 * Worked from theHour — the same lines, the same billed hours (6 of 8, 205
 * days, a van per tech) and the same wages as What an hour must cover, Build
 * our rate and Labour rates — so a figure here is the figure there.
 */
export default async function RunningCostsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Finance" forWhom="managers" />;

  const [h, board] = await Promise.all([theHour(), latestBoard()]);
  const { lines, fleet, oc, i, r, vans } = h;
  // The board's 30-day close rate: of the quotes decided, how many were won. A count, not dollars.
  const close = board?.metrics?.closeRate30d ?? null;
  const has = r.billHrs > 0;

  const perVanLines = lines.filter((l) => l.perVan && fleet.vans > 0);
  const fixedTotal = lines.filter((l) => !l.perVan || fleet.vans <= 0).reduce((a, l) => a + l.annual, 0);
  const perVanEach = fleet.vans > 0 ? perVanLines.reduce((a, l) => a + l.annual, 0) / fleet.vans : 0;
  const at = (l: (typeof lines)[number], n: number) => (l.perVan && fleet.vans > 0 ? (l.annual / fleet.vans) * n : l.annual);
  const cols = [vans, vans + 1, vans + 2];
  const hrsVan = i.daysOnTools * i.billPerDay;
  const perHr = (annual: number) => (has ? annual / r.billHrs : 0);
  const groups = [...new Set(lines.map((l) => l.group))].map((g) => {
    const ls = lines.filter((l) => l.group === g).sort((a, b) => b.annual - a.annual);
    return { label: g, lines: ls };
  });

  const loaded = 1 + oc / 100;
  const techPay = i.techWage * PAID_HRS_YEAR * loaded;
  const appPay = i.appWage * PAID_HRS_YEAR * loaded;
  const scale = fleetSizes(lines, fleet, oc, i, [1, 2, 3, 4, 5, 6, 7, 8]);
  const appsPerVan = i.techs > 0 ? i.apps / i.techs : 0;

  return (
    <PortalShell user={user}>
      <FinanceHead title="Running costs" lede="Every overhead, what it costs to keep the doors open, and what changes when another van goes on the road." />
      <div className="pk" style={{ marginBottom: 14 }}><TeamTabs on="running" /></div>

      {!has ? (
        <div className="pt-note pt-note--warn">
          <strong>There&rsquo;s no tech on the road yet,</strong> so nothing can be spread over billed hours. Add the crew on <Link href="/portal/team">Team</Link>.
        </div>
      ) : (
        <>
          <section className="pt-panel pt-hs pt-rc-sum" aria-labelledby="rc-h">
            <h2 id="rc-h" className="pt-sr">The short version</h2>
            <div className="pt-hs__nums">
              <div><span>Overheads a year</span><strong>{m0(r.overhead)}</strong><em>{m0(r.overhead / 12)} a month · {m0(r.overhead / 52)} a week</em></div>
              <div><span>Stays put</span><strong>{m0(fixedTotal)}</strong><em>the same with one van or ten</em></div>
              <div><span>Each van brings</span><strong>{m0(perVanEach)}</strong><em>a year, on top of the crew&rsquo;s pay</em></div>
              <div className="is-charge"><span>On every billed hour</span><strong>{m2(r.perHr.overhead)}</strong><em>{m0(r.overhead)} ÷ {h0(r.billHrs)} — {i.techs} techs × {i.daysOnTools} days × {i.billPerDay} hrs</em></div>
            </div>
          </section>

          <section className="pt-panel" aria-labelledby="rc-lines">
            <h2 id="rc-lines" className="pt-panel__h">Every overhead, now and with more vans</h2>
            <p className="pt-note" style={{ margin: "0 0 12px" }}>
              <strong>Stays put</strong> lines don&rsquo;t move when a van is added, so the same dollars spread over more hours.{" "}
              <strong>Per van</strong> lines grow by today&rsquo;s cost of one van. The crew&rsquo;s own pay isn&rsquo;t here — it&rsquo;s on{" "}
              <Link href="/portal/finance/hourly">Build our rate</Link>. Change a figure or which way a line goes on <Link href="/portal/finance/capacity?t=overheads">Wages &amp; costs › Overheads</Link>.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table className="pt-table pt-rc">
                <thead>
                  <tr>
                    <th scope="col">Overhead</th>
                    <th scope="col">Grows with</th>
                    <th scope="col" className="num">A month</th>
                    {cols.map((n, k) => <th key={n} scope="col" className="num">{k === 0 ? `A year now · ${n} vans` : `With ${n} vans`}</th>)}
                    <th scope="col" className="num">A billed hour</th>
                  </tr>
                </thead>
                {groups.map((g) => (
                  <tbody key={g.label}>
                    <tr className="pt-rc__grp">
                      <th scope="rowgroup" colSpan={3}>{g.label}</th>
                      {cols.map((n) => <td key={n} className="num">{m0(g.lines.reduce((a, l) => a + at(l, n), 0))}</td>)}
                      <td className="num">{m2(perHr(g.lines.reduce((a, l) => a + at(l, vans), 0)))}</td>
                    </tr>
                    {g.lines.map((l) => (
                      <tr key={l.key}>
                        <th scope="row">{l.label}</th>
                        <td>{l.perVan ? "Per van" : "Stays put"}</td>
                        <td className="num">{m0(at(l, vans) / 12)}</td>
                        {cols.map((n) => <td key={n} className="num">{m0(at(l, n))}</td>)}
                        <td className="num">{m2(perHr(at(l, vans)))}</td>
                      </tr>
                    ))}
                  </tbody>
                ))}
                <tfoot>
                  <tr className="pt-rc__tot">
                    <th scope="row" colSpan={2}>All overheads</th>
                    <td className="num">{m0(r.overhead / 12)}</td>
                    {cols.map((n) => <td key={n} className="num">{m0(fixedTotal + perVanEach * n)}</td>)}
                    <td className="num">{m2(r.perHr.overhead)}</td>
                  </tr>
                  <tr>
                    <th scope="row" colSpan={3}>Hours we bill</th>
                    {cols.map((n) => <td key={n} className="num">{h0(hrsVan * (i.techs + n - vans))}</td>)}
                    <td />
                  </tr>
                  <tr className="pt-rc__tot">
                    <th scope="row" colSpan={3}>Overhead on every billed hour</th>
                    {cols.map((n) => {
                      const hrs = hrsVan * (i.techs + n - vans);
                      return <td key={n} className="num">{hrs > 0 ? m2((fixedTotal + perVanEach * n) / hrs) : "—"}</td>;
                    })}
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="pt-panel" aria-labelledby="rc-people">
            <h2 id="rc-people" className="pt-panel__h">What one more person adds</h2>
            <p className="pt-note" style={{ margin: "0 0 12px" }}>
              Pay is the wage × {PAID_HRS_YEAR.toLocaleString("en-AU")} paid hours (a 38-hour week, all year — leave, holidays, sick days and RDOs are paid) with super, WorkCover and LSL ({oc.toFixed(1)}%).
              A tech with a van brings the van&rsquo;s costs and {h0(hrsVan)} billed; an apprentice brings their pay and no hours of their own.
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
                  <tr>
                    <th scope="row">A tech with a van <em className="pt-rc__n"> · at {m2(i.techWage)} an hour</em></th>
                    <td className="num">{m0(techPay)}</td><td className="num">{m0(perVanEach)}</td>
                    <td className="num"><strong>{m0(techPay + perVanEach)}</strong></td><td className="num">{h0(hrsVan)}</td>
                  </tr>
                  <tr>
                    <th scope="row">An apprentice riding along <em className="pt-rc__n"> · at {m2(i.appWage)} an hour</em></th>
                    <td className="num">{m0(appPay)}</td><td className="num">—</td>
                    <td className="num"><strong>{m0(appPay)}</strong></td><td className="num">none of their own</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="pt-panel" aria-labelledby="rc-scale">
            <h2 id="rc-scale" className="pt-panel__h">The whole hour at each number of vans</h2>
            <p className="pt-note" style={{ margin: "0 0 12px" }}>
              Each van with a tech and {n1(appsPerVan)} apprentices — today&rsquo;s mix — at {i.billPerDay} of {i.dayHrs} hours billed. Break-even is everything (overheads and the crew&rsquo;s whole pay) over
              the hours billed; with {n1(appsPerVan)} apprentices a van it sits between the one-person and two-person crew rates on <Link href="/portal/rates">Labour rates</Link>. The {m0(fixedTotal)} that stays
              put is shared by more hours with each van; each van brings {m0(perVanEach)} of its own.
            </p>
            <p className="pt-note" style={{ margin: "0 0 12px" }}>
              <strong>Sales a year</strong> is what it takes to cover it at the {r.inputs.margin}% price: the hours billed × the rate, labour only, before materials, units and GST.{" "}
              {close ? (
                <>
                  <strong>Quotes a year</strong> is that ÷ our close rate of {Math.round(close * 100)}% over the last 30 days: {m0(100 / close)} of quotes for every $100 sold.{" "}
                  {close < 0.85 ? <>At {Math.round((close + 0.1) * 100)}% it would be {m0(100 / (close + 0.1))}.{" "}</> : null}
                  The close rate counts quotes won, not dollars.
                </>
              ) : <>The close rate isn&rsquo;t measured yet, so the quotes it would take aren&rsquo;t shown.</>}
            </p>
            <div style={{ overflowX: "auto" }}>
              <table className="pt-table pt-rc">
                <thead>
                  <tr>
                    <th scope="col">Vans</th>
                    <th scope="col" className="num">Overheads a year</th>
                    <th scope="col" className="num">Billed hours</th>
                    <th scope="col" className="num">Overhead an hour</th>
                    <th scope="col" className="num">Break-even</th>
                    <th scope="col" className="num">To make {r.inputs.margin}%</th>
                    <th scope="col" className="num">Sales a year</th>
                    {close ? <th scope="col" className="num">Quotes a year</th> : null}
                    {close ? <th scope="col" className="num">Quotes a week</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {scale.map((x) => {
                    const sales = x.r.atMargin * x.r.billHrs;
                    const isNow = x.vans === fleet.vans;
                    return (
                      <tr key={x.vans} className={isNow ? "is-now" : undefined}>
                        <th scope="row">{x.vans}{isNow ? <em className="pt-rc__n"> · today&rsquo;s fleet</em> : null}</th>
                        <td className="num">{m0(x.r.overhead)}</td>
                        <td className="num">{h0(x.r.billHrs)}</td>
                        <td className="num">{m2(x.r.perHr.overhead)}</td>
                        <td className="num">{m2(x.r.perHr.total)}</td>
                        <td className="num"><strong>{m2(x.r.atMargin)}</strong></td>
                        <td className="num">{m0(sales)}</td>
                        {close ? <td className="num">{m0(sales / close)}</td> : null}
                        {close ? <td className="num">{m0(sales / close / 52)}</td> : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="pt-note" style={{ margin: "12px 0 0" }}>
              Today&rsquo;s fleet is {fleet.vans} vans with {i.techs} techs{fleet.vans > i.techs ? ` — ${fleet.vans - i.techs} driven by an apprentice who doesn't bill on their own` : ""}; this table puts a tech in every van.
              The business as it is, and 3 vans against 5, is on <Link href="/portal/finance/planning">What if</Link>.
            </p>
          </section>
        </>
      )}
    </PortalShell>
  );
}
