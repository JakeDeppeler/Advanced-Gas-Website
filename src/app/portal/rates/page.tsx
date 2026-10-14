import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { latestBoard } from "@/lib/portal/office";
import { dbConfigured, getCapSettings, getSettings, listUsers, listVehicles } from "@/lib/portal/db";
import { withFleet } from "@/lib/portal/costSettings";
import { priceFactor, computeCapacity, LEVEL_LABEL, type CrewLevel, type CrewMember } from "@/lib/portal/crew";
import { normalisePricing } from "@/lib/portal/pricingTypes";
import { money, plural } from "@/lib/portal/run/month";
import { Bad, Btn, Card, Empty, Good, Head, Hero, Pair, Say } from "@/components/portal/kit/Kit";
import { TeamTabs } from "@/components/portal/run/RunTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team — Team portal" };

const m2 = (n: number) => `$${n.toFixed(0)}`;

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
      ["What the team needs", "Everyone’s cost an hour plus the profit we want on top, from Pricing & costs."],
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
  const ours = pricing.hourly;
  const needs = cap.totalBillHrs > 0 ? cap.costPerHr * priceFactor(s.margin) : null;
  const breakEven = cap.totalBillHrs > 0 ? cap.costPerHr : null;
  const people = cap.rates
    .map((r) => ({ r, p: crew.find((c) => c.id === r.id) }))
    .filter((x): x is { r: (typeof cap.rates)[number]; p: CrewMember } => !!x.p && x.r.costPerHr != null && x.r.billHrs > 0);
  const scale = Math.max(ours ?? 0, needs ?? 0, ...people.map((x) => x.r.costPerHr ?? 0)) * 1.05 || 1;

  return (
    <PortalShell user={user}>
      <div className="pk">
        {head}
        <TeamTabs on="rates" />
        <Say>
          {ours && needs ? (
            <>We charge {m2(ours)} an hour. To make {s.margin}% the team needs {m2(needs)}, {ours >= needs ? <Good>{m2(ours - needs)} to spare</Good> : <Bad>{m2(needs - ours)} short</Bad>}.</>
          ) : needs ? (
            <>To make {s.margin}% the team needs {m2(needs)} an hour. Set the rate we charge in Pricing & costs to see how it compares.</>
          ) : <>Nobody on the team has billable hours yet, so there’s no hourly cost to show.</>}
        </Say>
        <Pair>
          <Hero dark label="Our rate" right="ServiceTitan pricebook" fig={ours ? `${m2(ours)} /hr` : "Not set"} frac={ours && needs ? ours / Math.max(ours, needs) : null}
            sub={ours && needs ? (ours >= needs ? `${m2(ours - needs)} over the ${m2(needs)} the team needs` : `${m2(needs - ours)} under the ${m2(needs)} the team needs`) : "Set it in Pricing & costs › Rates & pricing"} href="/portal/finance/hourly" />
          <Hero label="What the team needs" right={`${s.margin}% profit · ${plural(people.length, "person", "people")}`} fig={needs ? `${m2(needs)} /hr` : "—"} frac={needs && ours ? needs / Math.max(ours, needs) : null}
            sub={breakEven ? `Break-even is ${m2(breakEven)} an hour, all in` : undefined} />
        </Pair>
        <Card title="What each person costs against our one rate" aside="per billed hour · before GST">
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
