import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { latestBoard } from "@/lib/portal/office";
import { dbConfigured, getCapSettings, getSettings, listUsers, listVehicles } from "@/lib/portal/db";
import { withFleet } from "@/lib/portal/costSettings";
import { priceFactor, computeCapacity, loadedWage, LEVEL_LABEL, LEVEL_BILLABLE, type CrewLevel, type CrewMember } from "@/lib/portal/crew";
import { coverBase } from "@/lib/portal/cover/load";
import { coverHour, crewRates, vansFor } from "@/lib/portal/cover/hour";
import { normalisePricing } from "@/lib/portal/pricingTypes";
import { money, plural } from "@/lib/portal/run/month";
import { Bad, Btn, Card, Empty, Good, Head, Say } from "@/components/portal/kit/Kit";
import { TeamTabs } from "@/components/portal/run/RunTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team — Team portal" };

const m2 = (n: number) => `$${n.toFixed(0)}`;
const mc = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Run the company › Team: labour rates and the leaderboard.
 *
 * Labour rates is the one rate we charge against what each person costs an
 * hour, from the same sums as Our hourly rate (computeCapacity), so the two
 * can't disagree. The rate itself comes from Pricing & costs › Rates & pricing;
 * until it's set, the page says what the team needs and leaves the rest.
 */
export default async function RatesPage({ searchParams }: { searchParams: { tab?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Team" forWhom="the office" />;
  const tab = searchParams.tab === "leaders" ? "leaders" : "rates";
  const head = (
    <Head title="Team" sub={tab === "rates" ? "Labour rates · from Pricing & costs and the crew’s wages" : "Who sold what this month · ServiceTitan"} info={[
      ["What the person costs", "Their pay with super and WorkCover, and their own time off the tools, spread over their billable hours."],
      ["Office share", "The office, the vans and every other overhead, spread over the whole team’s billable hours."],
      ["Crew rates", "What we charge for one person in a van, a tech and an apprentice, and a tech with two apprentices — each against what that crew costs a van a year."],
      ["Leaderboard", "Credit goes to whoever wrote the quote. A re-sold quote counts once, on the day it first sold."],
    ]} />
  );

  if (tab === "leaders") {
    const board = await latestBoard();
    const rows = (board?.metrics?.salesLeaderboard ?? []).filter((r) => r.sold > 0 || r.quoted > 0);
    const top = rows[0];
    return (
      <PortalShell user={user}>
        <div className="pk">
          {head}
          <TeamTabs on="leaders" />
          <Say>{top ? <><b>{top.name.split(" ")[0]} leads the month</b> with {money(top.sold)} sold from {plural(top.soldJobs, "job")}.</> : <>Nobody has sold anything this month yet.</>}</Say>
          <Card>
            {rows.length ? (
              <div className="pk-tbl-wrap">
                <table className="pk-tbl">
                  <thead><tr><th>Person</th><th>Sold this month</th><th>This week</th><th>Today</th><th>Quoted</th><th>Close rate</th></tr></thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.name}>
                        <td><b>{i + 1}. {r.name}</b><div className="ks">{r.soldJobs} sold of {r.quotedJobs} quoted</div></td>
                        <td><b>{money(r.sold)}</b></td>
                        <td>{money(r.soldWeek)}</td>
                        <td>{money(r.soldToday)}</td>
                        <td>{money(r.quoted)}</td>
                        <td>{r.closeRate != null ? `${Math.round(r.closeRate * 100)}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <Empty>No quotes or sales this month yet.</Empty>}
          </Card>
          <p className="pk-note">Commission against the month target comes with Pricing & costs › Commission.</p>
        </div>
      </PortalShell>
    );
  }

  const ready = dbConfigured();
  const [users, stored, vehicles, pricingRaw] = ready
    ? await Promise.all([listUsers(), getCapSettings(), listVehicles(), getSettings<unknown>("pricing").catch(() => null)])
    : [[], null, [], null];
  const s = withFleet(stored, vehicles);
  const crew: CrewMember[] = users.filter((u) => u.active && u.id && u.level).map((u) => ({ id: u.id as string, name: u.name, level: u.level as CrewLevel, costing: u.costing }));
  const cap = computeCapacity(crew, s);
  const pricing = normalisePricing(pricingRaw);
  const base = await coverBase();
  // One person's cost an hour is measured against the one-person rate; the crew rate is for two.
  const ours = pricing.solo ?? pricing.hourly;
  const needs = cap.totalBillHrs > 0 ? cap.costPerHr * priceFactor(s.margin) : null;
  const people = cap.rates
    .map((r) => ({ r, p: crew.find((c) => c.id === r.id) }))
    .filter((x): x is { r: (typeof cap.rates)[number]; p: CrewMember } => !!x.p && x.r.costPerHr != null && x.r.billHrs > 0);
  const scale = Math.max(ours ?? 0, needs ?? 0, ...people.map((x) => x.r.costPerHr ?? 0)) * 1.05 || 1;

  return (
    <PortalShell user={user}>
      <div className="pk">
        {head}
        <TeamTabs on="rates" />
        {(() => {
          const r = coverHour(base.lines, base.fleet, base.oc, base.i);
          const cr = crewRates(r, vansFor(base.fleet, base.i.techs), base.oc);
          const charge: Record<string, number | null> = { solo: base.pricing.solo, pair: base.pricing.hourly, install: base.pricing.install };
          const rows = cr.rows.map((c) => ({ ...c, ours: charge[c.k] ?? null }));
          const short = rows.filter((c) => c.ours != null && c.ours < c.price);
          return (
            <>
              <Say>
                {rows.every((c) => c.ours == null) ? <>None of our crew rates are set yet — put them in on Rates &amp; pricing.</>
                  : short.length === 0 ? <Good>Every crew rate we&rsquo;ve set makes our {base.i.margin}%.</Good>
                  : <Bad>{short.map((c) => c.label.replace(/^A /, "a ")).join(" and ")} {short.length === 1 ? "is" : "are"} under what makes {base.i.margin}%.</Bad>}
              </Say>
              <Card title="What we charge, by who's in the van" aside={`one van · ${cr.hrsVan.toLocaleString("en-AU")} billed hours a year · before GST`}>
                <div className="pk-tbl-wrap">
                  <table className="pk-tbl">
                    <thead><tr><th>Crew</th><th>We charge</th><th>Break-even</th><th>To make {base.i.margin}%</th><th className="l">How it stands</th></tr></thead>
                    <tbody>
                      {rows.map((c) => (
                        <tr key={c.k}>
                          <td><b>{c.label}</b><div className="ks">{c.sub}</div></td>
                          <td><b>{c.ours != null ? mc(c.ours) : "not set"}</b></td>
                          <td>{mc(c.be)}</td>
                          <td>{mc(c.price)}</td>
                          <td className="l">{c.ours == null ? <span className="ks">set it on Rates &amp; pricing</span>
                            : c.ours < c.be ? <span className="pt-cover__neg">▼ {mc(c.be - c.ours)} under break-even</span>
                            : c.ours < c.price ? <span className="pt-cover__neg">! {mc(c.price - c.ours)} short of {base.i.margin}%</span>
                            : <span className="pt-cover__pos">✓ {mc(c.ours - c.price)} over {base.i.margin}%</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="pk-note" style={{ marginTop: 10 }}>
                  Each crew is one van for a year: its share of every overhead ({money(cr.share)}) and the crew&rsquo;s whole pay — a tech at {mc(base.i.techWage)}, apprentices at {mc(base.i.appWage)},
                  with super, WorkCover and long service leave — over {base.i.billPerDay} of {base.i.dayHrs} hours billed. The working is on <a href="/portal/finance/cover">What an hour must cover</a>.
                </p>
              </Card>
              {(() => {
                const onTools = crew.filter((p) => LEVEL_BILLABLE[p.level]);
                const apps = onTools.filter((p) => p.level === "apprentice");
                const appAvg = apps.length ? apps.reduce((a, p) => a + p.costing.wage, 0) / apps.length : null;
                const hrsYear = (p: CrewMember) => p.costing.hrsWeek * (Number(s.weeksYear) || 52);
                return (
                  <Card title="Each person's rate" aside="from their card on Team & wages">
                    <div className="pk-tbl-wrap">
                      <table className="pk-tbl">
                        <thead><tr><th>Who</th><th>Wage an hour</th><th>With super, WorkCover &amp; LSL</th><th>Hours a week</th><th>Their pay a year</th></tr></thead>
                        <tbody>
                          {onTools.map((p) => (
                            <tr key={p.id}>
                              <td><b>{p.name}</b><div className="ks">{LEVEL_LABEL[p.level]}{p.costing.ownVan ? " · own van" : " · rides with a tech"}</div></td>
                              <td><b>{mc(p.costing.wage)}</b></td>
                              <td>{mc(loadedWage(p.costing.wage, s))}</td>
                              <td>{p.costing.hrsWeek}</td>
                              <td>{money(loadedWage(p.costing.wage, s) * hrsYear(p))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="pk-note" style={{ marginTop: 10 }}>
                      The crew rates above are built on a tech at {mc(base.i.techWage)} and an apprentice at {mc(base.i.appWage)}
                      {appAvg != null ? <> — today&rsquo;s apprentices average {mc(appAvg)}</> : null}. Wrong wage? Change it on their card on <a href="/portal/finance/capacity">Team &amp; wages</a>;
                      to work the rates on different wages, use <a href="/portal/finance/cover">What an hour must cover</a>.
                    </p>
                  </Card>
                );
              })()}
            </>
          );
        })()}
        <Card title={`What each person costs against our ${pricing.solo != null ? "one-person" : "crew"} rate`} aside="per billed hour · before GST">
          <div className="pk-legend">
            <span><i style={{ background: "var(--mid-f)" }} />what the person costs</span>
            <span><i style={{ background: "var(--track)" }} />office share</span>
            {ours && <span><i style={{ background: "var(--good-f)" }} />profit</span>}
            {ours && <span><i style={{ background: "var(--bad-f)" }} />loss</span>}
            {ours && <span><i style={{ background: "var(--ink)", width: 2 }} />our rate</span>}
          </div>
          {people.length ? people.map(({ r, p }) => {
            const own = (r.costPerHr ?? 0) - cap.businessPerHr;
            const all = r.costPerHr ?? 0;
            const diff = ours != null ? ours - all : null;
            return (
              <div className="pk-hbar" key={r.id} style={{ gridTemplateColumns: "minmax(110px, 1fr) minmax(80px, 3fr) auto" }}>
                <span className="t">{p.name.split(" ")[0]}<span>{LEVEL_LABEL[p.level]}</span></span>
                <div className="pk-stack" role="img" aria-label={`${p.name}: costs ${m2(own)} an hour, ${m2(cap.businessPerHr)} office share${diff != null ? `, ${diff >= 0 ? "profit" : "loss"} ${m2(Math.abs(diff))} at our rate` : ""}`}>
                  <i className="cost" style={{ width: `${(own / scale) * 100}%` }} />
                  <i className="share" style={{ width: `${(cap.businessPerHr / scale) * 100}%` }} />
                  {diff != null && diff > 0 && <i className="profit" style={{ width: `${(diff / scale) * 100}%` }} />}
                  {diff != null && diff < 0 && ours != null && <i className="loss" style={{ left: `${(ours / scale) * 100}%`, width: `${(-diff / scale) * 100}%` }} />}
                  {ours != null && <em style={{ left: `${(ours / scale) * 100}%` }} />}
                </div>
                <span style={{ textAlign: "right", lineHeight: 1.3 }}>
                  <b>{diff != null ? `${diff >= 0 ? "+" : "−"}${m2(Math.abs(diff))} an hour` : `${m2(all)} an hour`}</b>
                  <span className="pk-ks" style={{ display: "block" }}>costs {m2(all)}</span>
                </span>
              </div>
            );
          }) : <Empty>Add the crew’s wages in Pricing & costs to see what each person costs.</Empty>}
          <div className="pk-btns" style={{ marginTop: 14 }}>
            <Btn href="/portal/finance/hourly">Build our rate ›</Btn>
            <Btn href="/portal/finance/capacity" quiet>Wages in Pricing & costs ›</Btn>
          </div>
        </Card>
      </div>
    </PortalShell>
  );
}
