import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { FinanceHead } from "@/components/portal/FinanceHead";
import { Locked } from "@/components/portal/Locked";
import { Bad, Good, Say } from "@/components/portal/kit/Kit";
import { latestBoard } from "@/lib/portal/office";
import { coverBase } from "@/lib/portal/cover/load";
import { coverHour, fleetSizes } from "@/lib/portal/cover/hour";
import { getSettings } from "@/lib/portal/db";
import { readYearGoal } from "@/lib/portal/yearGoal";
import { getPLDetail, rangeSpans } from "@/lib/portal/xero";

export const dynamic = "force-dynamic";
export const metadata = { title: "More or fewer vans · Team portal" };

const m0 = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-AU")}`;
const m2 = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const n0 = (n: number) => Math.round(n).toLocaleString("en-AU");
const short = (n: number) => (n >= 1_000_000 ? `$${(Math.round(n / 100_000) / 10).toString()}M` : `$${Math.round(n / 1000)}K`);
const n1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString("en-AU");
const num = (v: string | undefined, lo: number, hi: number) => {
  const n = Number(v);
  return v != null && v !== "" && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : NaN;
};

/**
 * What if › More or fewer vans: the same business at 2 to 6 vans, side by
 * side, against today as it really is.
 *
 * Each van has a tech and the same share of apprentices as today. The lines
 * that stay put (the factory, the office, the accountant) don't move; the van
 * lines move a van at a time. Worked from the same figures as What an hour
 * must cover, so a column here and that page agree. A GET form: nothing typed
 * here is saved.
 */
export default async function VansPage({ searchParams }: { searchParams: { b?: string; ap?: string; c?: string; gy?: string; gg?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Finance" forWhom="managers" />;

  const span12 = rangeSpans("12m").now;
  const [base, board, goalRow, pl12] = await Promise.all([
    coverBase({ billPerDay: num(searchParams.b, 1, 12), charge: num(searchParams.c, 0, 5000) }),
    latestBoard(),
    getSettings<unknown>("yeargoal").catch(() => null),
    getPLDetail(span12.from, span12.to).catch(() => null),
  ]);
  const goal = readYearGoal(goalRow, new Date());
  const { lines, fleet, oc, i } = base;
  const close = board?.metrics?.closeRate30d ?? null;
  const todayRatio = i.techs > 0 ? i.apps / i.techs : 0;
  const ap = Number.isFinite(num(searchParams.ap, 0, 4)) ? num(searchParams.ap, 0, 4) : Math.round(todayRatio * 10) / 10;
  const now = coverHour(lines, fleet, oc, i);
  const cols = fleetSizes(lines, fleet, oc, { ...i, apps: i.techs * ap }, [2, 3, 4, 5, 6]);
  const best = cols.reduce((a, c) => (c.r.leftAtCharge > a.r.leftAtCharge ? c : a), cols[0]);
  const losing = cols.filter((c) => c.r.leftAtCharge < 0).map((c) => c.vans);

  // What a van brings in a year, from the books: the last twelve months'
  // sales in Xero (before GST, gear and labour together) over today's vans.
  // It's the honest yardstick for a sales goal, which counts everything sold,
  // where the labour line below counts only the hours.
  const perVan = pl12 && pl12.income > 0 && fleet.vans > 0 ? pl12.income / fleet.vans : null;
  const goalY = (searchParams.gy ?? "").trim().slice(0, 20);
  const goalG = num(searchParams.gg?.replace(/[$,\s]/g, ""), 0, 1e9);
  const goals: Array<{ label: string; amount: number }> = [
    ...(goal.floorRevenue ? [{ label: `${short(goal.floorRevenue)} floor`, amount: goal.floorRevenue }] : []),
    ...(goal.revenue ? [{ label: `${short(goal.revenue)} goal`, amount: goal.revenue }] : []),
    ...(Number.isFinite(goalG) && goalG > 0 ? [{ label: `${goalY || "Your year"}: ${short(goalG)}`, amount: goalG }] : []),
  ];
  const vansFor = (amount: number) => (perVan ? Math.ceil(amount / perVan) : null);
  const fleetCols = [{ key: "now", vans: fleet.vans, left: now.leftAtCharge, be: now.perHr.total, hrs: now.billHrs, isNow: true }, ...cols.map((c) => ({ key: String(c.vans), vans: c.vans, left: c.r.leftAtCharge, be: c.r.perHr.total, hrs: c.r.billHrs, isNow: false }))];

  type Row = { label: string; sub?: string; now: string; at: (c: (typeof cols)[number]) => string; strong?: boolean; tone?: (c: (typeof cols)[number] | null) => string | undefined };
  const rows: Row[] = [
    { label: "Techs", now: String(i.techs), at: (c) => String(c.vans) },
    { label: "Apprentices", now: String(i.apps), at: (c) => n1(c.apps) },
    { label: "Overheads a year", sub: "the van lines grow a van at a time", now: m0(now.overhead), at: (c) => m0(c.r.overhead) },
    { label: "Pay a year", sub: "with super, WorkCover & LSL", now: m0(now.techPay + now.appPay), at: (c) => m0(c.r.techPay + c.r.appPay) },
    { label: "Billed hours a year", sub: `${i.billPerDay} of ${i.dayHrs} a day, ${i.daysOnTools} days`, now: n0(now.billHrs), at: (c) => n0(c.r.billHrs) },
    { label: "Break-even an hour", now: m2(now.perHr.total), at: (c) => m2(c.r.perHr.total), strong: true },
    ...(i.margin > 0 ? [{ label: `To make ${i.margin}%`, now: m2(now.atMargin), at: (c: (typeof cols)[number]) => m2(c.r.atMargin) }] : []),
    { label: `Sales a year at ${m2(i.charge)}`, sub: "labour, before materials and GST", now: m0(i.charge * now.billHrs), at: (c) => m0(i.charge * c.r.billHrs) },
    ...(close ? [{ label: "Quotes to write a year", sub: `at our ${Math.round(close * 100)}% close rate`, now: m0((i.charge * now.billHrs) / close), at: (c: (typeof cols)[number]) => m0((i.charge * c.r.billHrs) / close) }] : []),
    {
      label: `Left a year at ${m2(i.charge)}`, now: m0(now.leftAtCharge), at: (c) => m0(c.r.leftAtCharge), strong: true,
      tone: (c) => ((c ? c.r.leftAtCharge : now.leftAtCharge) < 0 ? "pt-cover__neg" : "pt-cover__pos"),
    },
    { label: "Against today", now: "", at: (c) => `${c.r.leftAtCharge >= now.leftAtCharge ? "▲" : "▼"} ${m0(Math.abs(c.r.leftAtCharge - now.leftAtCharge))}`, tone: (c) => (c && c.r.leftAtCharge < now.leftAtCharge ? "pt-cover__neg" : "pt-cover__pos") },
  ];

  return (
    <PortalShell user={user}>
      <FinanceHead title="What if" lede="The business at a different number of vans. Every figure comes from Pricing & costs; nothing here changes them." />
      <div className="pk pt-cover">
        <form method="get" action="/portal/finance/planning" className="pk-card pk-pad pt-cover__form">
          <label className="pt-cover__f" htmlFor="vn-b"><b>Hours billed a day</b><span>out of {i.dayHrs}</span><input id="vn-b" name="b" className="pk-in num" inputMode="decimal" defaultValue={String(i.billPerDay)} /></label>
          <label className="pt-cover__f" htmlFor="vn-ap"><b>Apprentices per van</b><span>today {n1(todayRatio)}</span><input id="vn-ap" name="ap" className="pk-in num" inputMode="decimal" defaultValue={String(ap)} /></label>
          <label className="pt-cover__f" htmlFor="vn-c"><b>What we charge</b><span>$ an hour, tech + apprentice</span><input id="vn-c" name="c" className="pk-in num" inputMode="decimal" defaultValue={String(i.charge)} /></label>
          <label className="pt-cover__f" htmlFor="vn-gy"><b>A year to aim for</b><span>e.g. 2027/28</span><input id="vn-gy" name="gy" className="pk-in" defaultValue={goalY} placeholder="2027/28" /></label>
          <label className="pt-cover__f" htmlFor="vn-gg"><b>Its sales goal</b><span>$ a year, before GST</span><input id="vn-gg" name="gg" className="pk-in num" inputMode="decimal" defaultValue={Number.isFinite(goalG) && goalG > 0 ? String(goalG) : ""} placeholder="4,000,000" /></label>
          <div className="pk-btns pt-cover__go"><button type="submit" className="pk-btn">Compare</button>{Object.keys(searchParams).length ? <Link href="/portal/finance/planning" className="pk-btn g">Back to today&rsquo;s figures</Link> : null}</div>
        </form>

        <Say>
          Today&rsquo;s {fleet.vans} vans leave {m0(now.leftAtCharge)} a year at {m2(i.charge)} an hour. <Good>{best.vans} vans would leave the most, {m0(best.r.leftAtCharge)}</Good>, if there&rsquo;s the work to fill them.{" "}
          {losing.length ? <Bad>{losing.join(" and ")} {losing.length === 1 ? "van loses" : "vans lose"} money.</Bad> : null}
          {perVan && goals.length ? <> On what a van sells now, {goals.map((g) => `${g.label} takes ${vansFor(g.amount)} vans`).join(", ")}.</> : null}
        </Say>

        <div className="wi-cards">
          {fleetCols.map((c) => {
            const sales = perVan ? perVan * c.vans : null;
            return (
              <section key={c.key} className={`pk-card wi-card${c.isNow ? " now" : ""}${c.vans === best.vans && !c.isNow ? " best" : ""}`}>
                <div className="wi-h"><b>{c.vans} vans</b><span>{c.isNow ? "today, as it is" : c.vans === best.vans ? "leaves the most" : ""}</span></div>
                <div className={`wi-left${c.left < 0 ? " neg" : ""}`}><small>Left a year</small>{c.left < 0 ? `${m0(Math.abs(c.left))} short` : m0(c.left)}</div>
                <dl className="wi-dl">
                  <div><dt>Sales a year</dt><dd>{sales != null ? m0(sales) : "needs Xero"}</dd></div>
                  {close ? <div><dt>Quotes to write</dt><dd>{sales != null ? m0(sales / close) : m0((i.charge * c.hrs) / close)}</dd></div> : null}
                  {goals.map((g) => (
                    <div key={g.label} className="wi-goal">
                      <dt>{g.label}</dt>
                      <dd className={sales != null && sales >= g.amount ? "ok" : "short"}>{sales == null ? "" : sales >= g.amount ? "✓ gets there" : `${short(g.amount - sales)} short`}</dd>
                    </div>
                  ))}
                  <div><dt>Break-even an hour</dt><dd>{m2(c.be)}</dd></div>
                </dl>
              </section>
            );
          })}
        </div>

        <details className="pk-card pk-pad wi-more">
          <summary>The working, line by line</summary>
          <div className="pk-tbl-wrap">
            <table className="pk-tbl pt-vans">
              <thead>
                <tr>
                  <th />
                  <th className="pt-vans__now">Today<span>{fleet.vans} vans, as it is</span></th>
                  {cols.map((c) => <th key={c.vans} className={c.vans === best.vans ? "pt-cover__col" : undefined}>{c.vans} vans</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className={row.strong ? "tot" : undefined}>
                    <td>{row.label}{row.sub ? <div className="ks">{row.sub}</div> : null}</td>
                    <td className={`pt-vans__now ${row.tone?.(null) ?? ""}`}>{row.now}</td>
                    {cols.map((c) => <td key={c.vans} className={`${c.vans === best.vans ? "pt-cover__col " : ""}${row.tone?.(c) ?? ""}`}>{row.at(c)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <p className="pk-note">
          <b>Sales a year</b> is what a van sells now, {perVan ? m0(perVan) : "from Xero"} over the last twelve months, times the vans, so a goal is checked against real sales, gear and labour together; it assumes the work is there to fill each van.
          {" "}<b>Today</b> is the crew as it really is: {i.techs} techs and {i.apps} apprentices across {fleet.vans} vans{fleet.vans > i.techs ? `, ${fleet.vans - i.techs} of them driven by an apprentice who doesn't bill on their own` : ""}.
          The other columns put a tech in every van. Each van brings its own running costs; the factory, the office and the accountant stay the same, at some size another office person is
          needed, and that&rsquo;s a line to add on Wages &amp; costs. More vans only make more if there&rsquo;s the work to fill them: a van billing 4 hours a day instead of 6 is the
          {" "}<Link href="/portal/finance/planning?b=4">4-hour version of this page</Link>. The working is on <Link href="/portal/finance/cover">What an hour must cover</Link>.
        </p>
      </div>
    </PortalShell>
  );
}
