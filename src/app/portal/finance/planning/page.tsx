import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { FinanceHead } from "@/components/portal/FinanceHead";
import { PlanningTabs } from "@/components/portal/PlanningTabs";
import { Locked } from "@/components/portal/Locked";
import { Bad, Good, Say } from "@/components/portal/kit/Kit";
import { latestBoard } from "@/lib/portal/office";
import { coverBase } from "@/lib/portal/cover/load";
import { coverHour, fleetSizes } from "@/lib/portal/cover/hour";

export const dynamic = "force-dynamic";
export const metadata = { title: "More or fewer vans · Team portal" };

const m0 = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-AU")}`;
const m2 = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const n0 = (n: number) => Math.round(n).toLocaleString("en-AU");
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
export default async function VansPage({ searchParams }: { searchParams: { b?: string; ap?: string; c?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Finance" forWhom="managers" />;

  const [base, board] = await Promise.all([
    coverBase({ billPerDay: num(searchParams.b, 1, 12), charge: num(searchParams.c, 0, 5000) }),
    latestBoard(),
  ]);
  const { lines, fleet, oc, i } = base;
  const close = board?.metrics?.closeRate30d ?? null;
  const todayRatio = i.techs > 0 ? i.apps / i.techs : 0;
  const ap = Number.isFinite(num(searchParams.ap, 0, 4)) ? num(searchParams.ap, 0, 4) : Math.round(todayRatio * 10) / 10;
  const now = coverHour(lines, fleet, oc, i);
  const cols = fleetSizes(lines, fleet, oc, { ...i, apps: i.techs * ap }, [2, 3, 4, 5, 6]);
  const best = cols.reduce((a, c) => (c.r.leftAtCharge > a.r.leftAtCharge ? c : a), cols[0]);
  const losing = cols.filter((c) => c.r.leftAtCharge < 0).map((c) => c.vans);

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
      <PlanningTabs current="/portal/finance/planning" />
      <div className="pk pt-cover">
        <form method="get" action="/portal/finance/planning" className="pk-card pk-pad pt-cover__form">
          <label className="pt-cover__f" htmlFor="vn-b"><b>Hours billed a day</b><span>out of {i.dayHrs}</span><input id="vn-b" name="b" className="pk-in num" inputMode="decimal" defaultValue={String(i.billPerDay)} /></label>
          <label className="pt-cover__f" htmlFor="vn-ap"><b>Apprentices per van</b><span>today {n1(todayRatio)}</span><input id="vn-ap" name="ap" className="pk-in num" inputMode="decimal" defaultValue={String(ap)} /></label>
          <label className="pt-cover__f" htmlFor="vn-c"><b>What we charge</b><span>$ an hour, tech + apprentice</span><input id="vn-c" name="c" className="pk-in num" inputMode="decimal" defaultValue={String(i.charge)} /></label>
          <div className="pk-btns pt-cover__go"><button type="submit" className="pk-btn">Compare</button>{Object.keys(searchParams).length ? <Link href="/portal/finance/planning" className="pk-btn g">Back to today&rsquo;s figures</Link> : null}</div>
        </form>

        <Say>
          At {m2(i.charge)} an hour and {i.billPerDay} of {i.dayHrs} hours billed, today leaves {m0(now.leftAtCharge)} a year; <Good>{best.vans} vans would leave the most, {m0(best.r.leftAtCharge)}</Good>, if there&rsquo;s the work to fill them.{" "}
          {losing.length ? <Bad>{losing.join(" and ")} {losing.length === 1 ? "van loses" : "vans lose"} money.</Bad> : null}
        </Say>

        <section className="pk-card pk-pad">
          <div className="pk-card-h"><b>Side by side</b><span>a year · each van with a tech and {n1(ap)} {ap === 1 ? "apprentice" : "apprentices"}</span></div>
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
        </section>
        <p className="pk-note">
          <b>Today</b> is the crew as it really is: {i.techs} techs and {i.apps} apprentices across {fleet.vans} vans{fleet.vans > i.techs ? `, ${fleet.vans - i.techs} of them driven by an apprentice who doesn't bill on their own` : ""}.
          The other columns put a tech in every van. Each van brings its own running costs; the factory, the office and the accountant stay the same, at some size another office person is
          needed, and that&rsquo;s a line to add on Wages &amp; costs. More vans only make more if there&rsquo;s the work to fill them: a van billing 4 hours a day instead of 6 is the
          {" "}<Link href="/portal/finance/planning?b=4">4-hour version of this page</Link>. The working is on <Link href="/portal/finance/cover">What an hour must cover</Link>.
        </p>
      </div>
    </PortalShell>
  );
}
