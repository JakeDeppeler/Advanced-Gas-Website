import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { FinanceHead } from "@/components/portal/FinanceHead";
import { Locked } from "@/components/portal/Locked";
import { theHour } from "@/lib/portal/cover/load";
import { DAYS_ON_TOOLS, PAID_HRS_YEAR } from "@/lib/portal/cover/hour";

export const dynamic = "force-dynamic";
export const metadata = { title: "Our hourly rate · Team portal" };

const m0 = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-AU")}`;
const m2 = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const h0 = (n: number) => `${Math.round(n).toLocaleString("en-AU")} hrs`;

type Bucket = { key: string; label: string; note: string; annual: number; lines: Array<{ label: string; annual: number }> };

/**
 * Build our rate: what the business spends in a year, the hours it bills, and
 * so what an hour costs — then how one crew's hour adds up from the wages on
 * the person's card to the rate.
 *
 * Worked from theHour, the same as What an hour must cover, Running costs and
 * Labour rates. Pay is wage × 1,976 paid hours with super, WorkCover and LSL
 * on top, shown as their own lines; billed hours are 6 of 8 hours on 205 days
 * a tech. The page used to price each person from their own card's leave,
 * travel and admin hours, which gave a different hour from every other page.
 */
export default async function HourlyPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Finance" forWhom="managers" />;

  const h = await theHour();
  const { lines, ocs, oc, i, r, pricing, crews } = h;
  const has = r.billHrs > 0;
  const per = (annual: number) => (has ? annual / r.billHrs : 0);
  const loaded = 1 + oc / 100;
  const hrsVan = i.daysOnTools * i.billPerDay;
  const stretch = hrsVan > 0 ? PAID_HRS_YEAR / hrsVan : 0;

  // Pay, taken apart: the wages, then each on-cost, so super and WorkCover are lines you can see.
  const payLines = (who: string, wages: number) => [
    { label: who, annual: wages },
    { label: `Super, ${ocs.superPct}%`, annual: (wages * ocs.superPct) / 100 },
    ...(ocs.workcoverPct > 0 ? [{ label: `WorkCover, ${ocs.workcoverPct}%`, annual: (wages * ocs.workcoverPct) / 100 }] : []),
    ...(ocs.lslPct > 0 ? [{ label: `Long service leave, ${ocs.lslPct}%`, annual: (wages * ocs.lslPct) / 100 }] : []),
  ];
  const techWages = i.techs * i.techWage * PAID_HRS_YEAR;
  const appWages = i.apps * i.appWage * PAID_HRS_YEAR;
  const office = lines.filter((l) => l.group === "Office & admin staff");
  const officeWages = office.reduce((a, l) => a + l.annual, 0) / loaded;
  const groups = [...new Set(lines.filter((l) => l.group !== "Office & admin staff").map((l) => l.group))];
  const buckets: Bucket[] = [
    { key: "tech", label: "Techs’ pay", note: `${i.techs} × ${m2(i.techWage)} × ${PAID_HRS_YEAR.toLocaleString("en-AU")} hrs · with super & WorkCover`, annual: r.techPay,
      lines: payLines(`Wages, ${i.techs} × ${m2(i.techWage)} × ${PAID_HRS_YEAR.toLocaleString("en-AU")} hrs`, techWages) },
    { key: "app", label: "Apprentices’ pay", note: `${i.apps} × ${m2(i.appWage)} × ${PAID_HRS_YEAR.toLocaleString("en-AU")} hrs · with super & WorkCover`, annual: r.appPay,
      lines: payLines(`Wages, ${i.apps} × ${m2(i.appWage)} × ${PAID_HRS_YEAR.toLocaleString("en-AU")} hrs`, appWages) },
    ...(office.length ? [{ key: "office", label: "Office & admin staff", note: "everyone who doesn't go out on jobs · with super & WorkCover", annual: office.reduce((a, l) => a + l.annual, 0),
      lines: [...office.map((l) => ({ label: `${l.label}, wages`, annual: l.annual / loaded })), ...payLines("", officeWages).slice(1)] }] : []),
    ...groups.map((g) => {
      const ls = lines.filter((l) => l.group === g).sort((a, b) => b.annual - a.annual);
      return { key: g, label: g, note: `${ls.length} ${ls.length === 1 ? "line" : "lines"}`, annual: ls.reduce((a, l) => a + l.annual, 0), lines: ls.map((l) => ({ label: l.label, annual: l.annual })) };
    }),
  ].filter((b) => b.annual > 0.5);
  const top = Math.max(1, ...buckets.map((b) => b.annual));

  const charge: Record<string, number | null> = { solo: pricing.solo, pair: pricing.hourly, install: pricing.install };
  const defaultDays = i.daysOnTools === DAYS_ON_TOOLS;

  return (
    <PortalShell user={user}>
      <FinanceHead title="Our hourly rate" lede="What the business spends in a year, the hours it bills, and so what an hour on the tools has to bring in." />

      {!has ? (
        <div className="pt-note pt-note--warn"><strong>There&rsquo;s no tech who bills yet,</strong> so there&rsquo;s no hour to take apart. Set the crew on <Link href="/portal/finance/cover">What an hour must cover</Link>.</div>
      ) : (
        <>
          <section className="pt-panel pt-hs" aria-labelledby="hs-h">
            <h2 id="hs-h" className="pt-sr">The short version</h2>
            <div className="pt-hs__nums">
              <div><span>We spend a year</span><strong>{m0(r.total)}</strong><em>every wage and every bill</em></div>
              <div><span>Hours we bill</span><strong>{h0(r.billHrs)}</strong><em>{i.techs} techs × {i.daysOnTools} days × {i.billPerDay} of {i.dayHrs} hrs</em></div>
              <div><span>So an hour costs us</span><strong>{m2(r.perHr.total)}</strong><em>{m0(r.total)} ÷ {h0(r.billHrs)}</em></div>
              <div className="is-charge"><span>To make {i.margin}%</span><strong>{m2(r.atMargin)}</strong><em>the cost ÷ {(1 - i.margin / 100).toFixed(2)}</em></div>
            </div>
          </section>

          <section className="pt-panel" aria-labelledby="hs-crew">
            <h2 id="hs-crew" className="pt-panel__h">How a crew&rsquo;s hour adds up</h2>
            <p className="pt-note" style={{ margin: "0 0 12px" }}>
              Someone on {m2(i.techWage)} an hour costs {m2(i.techWage * loaded)} with super, WorkCover and LSL, but that&rsquo;s per hour <em>paid</em>. They&rsquo;re paid for {PAID_HRS_YEAR.toLocaleString("en-AU")} hours
              a year (leave, holidays, sick days and RDOs included) and bill {hrsVan.toLocaleString("en-AU")} of them ({i.daysOnTools} days × {i.billPerDay} hours), so each billed hour has to carry{" "}
              {stretch.toFixed(2)} paid hours. Then the overhead goes on: {m0(r.overhead)} over the {h0(r.billHrs)} the business bills.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table className="pt-table pt-rc">
                <thead>
                  <tr><th scope="col" /> {crews.rows.map((c) => <th key={c.k} scope="col" className="num">{c.label.replace(/^A /, "")}</th>)}</tr>
                </thead>
                <tbody>
                  <tr><th scope="row">Tech, {m2(i.techWage * loaded)} an hour paid</th>{crews.rows.map((c) => <td key={c.k} className="num">{m2(i.techWage * loaded * stretch)}</td>)}</tr>
                  <tr><th scope="row">Apprentices, {m2(i.appWage * loaded)} an hour paid, each</th>{crews.rows.map((c) => <td key={c.k} className="num">{c.apps ? `${c.apps} × ${m2(i.appWage * loaded * stretch)}` : ""}</td>)}</tr>
                  <tr><th scope="row">Overhead on every billed hour</th>{crews.rows.map((c) => <td key={c.k} className="num">{m2(r.perHr.overhead)}</td>)}</tr>
                  <tr className="pt-rc__tot"><th scope="row">Break-even</th>{crews.rows.map((c) => <td key={c.k} className="num">{m2(c.be)}</td>)}</tr>
                  <tr><th scope="row">To make {i.margin}%</th>{crews.rows.map((c) => <td key={c.k} className="num"><strong>{m2(c.price)}</strong></td>)}</tr>
                  <tr>
                    <th scope="row">We charge</th>
                    {crews.rows.map((c) => {
                      const ch = charge[c.k];
                      return <td key={c.k} className="num">{ch == null ? <Link href="/portal/pricing">set it</Link> : <span className={ch < c.price ? "pt-cover__neg" : "pt-cover__pos"}>{ch < c.price ? "! " : "✓ "}{m2(ch)}</span>}</td>;
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="pt-note" style={{ margin: "12px 0 0" }}>
              Adding the hourly wages straight up ({m2(i.techWage * loaded)} + {m2(i.appWage * loaded)} + {m2(i.appWage * loaded)} + the overhead) misses the {(stretch - 1).toFixed(2)} paid hours behind every billed one 
              the leave, the public holidays, the sick days, the RDOs and the two hours a day that don&rsquo;t get billed. Change the wages, crew or hours on{" "}
              <Link href="/portal/finance/cover">What an hour must cover</Link>.
            </p>
          </section>

          <section className="pt-panel" aria-labelledby="hs-spend">
            <h2 id="hs-spend" className="pt-panel__h">Where the money goes each year</h2>
            <p className="pt-note" style={{ margin: "0 0 12px" }}>Open any line to see what&rsquo;s in it. Every overhead and what it does with another van is on <Link href="/portal/finance/running">Running costs</Link>.</p>
            <div className="pt-hs__spend">
              {buckets.map((b) => (
                <details key={b.key} className="pt-hs__open">
                  <summary className="pt-hs__row">
                    <span className="pt-hs__lbl"><span><span className="pt-hs__caret" aria-hidden="true">›</span>{b.label}</span><em>{b.note}</em></span>
                    <span className="pt-hs__bar" aria-hidden="true"><i style={{ width: `${Math.max(0, (b.annual / top) * 100)}%` }} /></span>
                    <strong className="pt-hs__yr">{m0(b.annual)}<em>a year</em></strong>
                    <span className="pt-hs__ph">{m2(per(b.annual))}<em>a billed hour</em></span>
                  </summary>
                  <div className="pt-hs__in">
                    {b.lines.map((l, k) => (
                      <div key={`${l.label}-${k}`} className="pt-hs__inrow"><span>{l.label}</span><span>{m0(l.annual)}</span><span>{m2(per(l.annual))}</span></div>
                    ))}
                  </div>
                </details>
              ))}
              <div className="pt-hs__row is-total">
                <span className="pt-hs__lbl">All of it</span><span />
                <strong className="pt-hs__yr">{m0(r.total)}<em>a year</em></strong>
                <span className="pt-hs__ph">{m2(r.perHr.total)}<em>a billed hour</em></span>
              </div>
            </div>
          </section>

          <section className="pt-panel" aria-labelledby="hs-hours">
            <h2 id="hs-hours" className="pt-panel__h">Where the billed hours come from</h2>
            <div style={{ overflowX: "auto" }}>
              <table className="pt-table pt-rc">
                <tbody>
                  <tr><th scope="row">Weekdays in a year</th><td className="num">260 days</td></tr>
                  {defaultDays ? (
                    <>
                      <tr><th scope="row">Less annual leave</th><td className="num">− 20 days</td></tr>
                      <tr><th scope="row">Less public holidays</th><td className="num">− 13 days</td></tr>
                      <tr><th scope="row">Less sick days</th><td className="num">− 10 days</td></tr>
                      <tr><th scope="row">Less RDOs</th><td className="num">− 12 days</td></tr>
                    </>
                  ) : <tr><th scope="row">Less leave, holidays, sick days and RDOs</th><td className="num">− {260 - i.daysOnTools} days</td></tr>}
                  <tr className="pt-rc__tot"><th scope="row">Days on the tools, each tech</th><td className="num">{i.daysOnTools} days</td></tr>
                  <tr><th scope="row">× hours billed of an {i.dayHrs}-hour day</th><td className="num">× {i.billPerDay}</td></tr>
                  <tr className="pt-rc__tot"><th scope="row">Billed hours, each tech</th><td className="num">{h0(hrsVan)}</td></tr>
                  <tr><th scope="row">× techs who bill</th><td className="num">× {i.techs}</td></tr>
                  <tr className="pt-rc__tot"><th scope="row">Hours the business bills a year</th><td className="num">{h0(r.billHrs)}</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </PortalShell>
  );
}
