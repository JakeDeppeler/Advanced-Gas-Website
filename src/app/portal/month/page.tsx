import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { Bad, Card, Empty, Good, Grid, Head, Note, Pill, Say, Tabs, Tile, none, status, type Status } from "@/components/portal/kit/Kit";
import { monthTrack, type SoldJob } from "@/lib/portal/run/monthTrack";
import { dbConfigured } from "@/lib/portal/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "The month so far · Team portal" };

const money = (v: number) => `${v < -0.5 ? "−" : ""}$${Math.abs(Math.round(v)).toLocaleString("en-AU")}`;
const pc = (f: number) => `${Math.round(f * 100)}%`;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthName = (m: string) => MONTHS[Number(m.slice(5, 7)) - 1];
const shift = (m: string, by: number) => {
  const d = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + by, 1));
  return d.toISOString().slice(0, 7);
};
const day = (iso: string) => (iso ? new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Melbourne" }) : "");

const STATE: Record<SoldJob["state"], Status> = {
  billed: { k: "good", w: "Invoiced" },
  done: { k: "bad", w: "Done, not invoiced" },
  booked: { k: "none", w: "Still to do" },
};

/**
 * How the month is going, the day each job is sold — not weeks later when the
 * Reece statement lands in Xero. Every sold job carries its price and the cost
 * of the gear on it; price less gear is what it leaves to pay the month's
 * wages and overheads, which are known in advance. See run/monthTrack.ts.
 */
/** Every row named: the job number and customer, or whatever of the job there is to go by. */
const jobName = (j: { jobNumber?: string | null; customer?: string | null; jobId?: number | null; jobType?: string | null }) =>
  [j.jobNumber ? `#${j.jobNumber}` : j.jobId ? `Job ${j.jobId}` : null, j.customer ?? (j.jobNumber || j.jobId ? null : j.jobType ?? "Job not linked")].filter(Boolean).join(" · ");

export default async function MonthPage({ searchParams }: { searchParams: { m?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="The month so far" forWhom="managers" />;

  const now = new Date(Date.now() + 10 * 3_600_000).toISOString().slice(0, 7);
  const months = [now, shift(now, -1), shift(now, -2)];
  const month = months.includes(searchParams?.m ?? "") ? (searchParams.m as string) : now;
  const t = dbConfigured() ? await monthTrack(month).catch(() => null) : null;
  const name = monthName(month);

  const tabs = <Tabs on={month} label="Which month" items={months.map((m, i) => ({ key: m, label: i === 0 ? `${monthName(m)} so far` : monthName(m), href: i === 0 ? "/portal/month" : `/portal/month?m=${m}` }))} />;

  if (!t) {
    return (
      <PortalShell user={user}>
        <div className="pk">
          <Head title="The month so far" />
          {tabs}
          <Empty>ServiceTitan&rsquo;s jobs couldn&rsquo;t be read just now. Try again in a moment.</Empty>
        </div>
      </PortalShell>
    );
  }

  const sales = t.sold.reduce((a, j) => a + j.price, 0);
  const gear = t.sold.reduce((a, j) => a + j.gear, 0);
  const left = sales - gear;
  const share = sales > 0 ? gear / sales : null;
  const uncosted = t.sold.filter((j) => j.uncosted > 0 || (j.price > 0 && j.gear === 0 && /install|replace|supply/i.test(j.jobType ?? "")));
  // Estimates before mid-September 2026 were imported without their costs.
  const noCosts = sales > 0 && gear === 0;
  const cover = t.toCover;
  const current = month === now;
  const goalByNow = t.salesGoal != null ? (current ? (t.salesGoal * t.dayOf) / t.daysIn : t.salesGoal) : null;
  // The sales the month needs at the gear share it's selling at: to cover
  // everything, and to cover everything and keep the profit we want.
  const breakEven = cover != null && share != null && share < 1 ? cover / (1 - share) : null;
  const forProfit = cover != null && share != null && 1 - share - t.margin > 0 ? cover / (1 - share - t.margin) : null;
  const priced = t.unbilled.filter((j) => j.price != null);
  const nbValue = priced.reduce((a, j) => a + (j.price ?? 0), 0);
  const nbGear = priced.reduce((a, j) => a + (j.gear ?? 0), 0);
  const over = (j: SoldJob) => t.maxGear != null && j.price > 0 && j.gear / j.price > t.maxGear;

  const soldSt: Status = goalByNow ? status(sales, goalByNow) : none();
  const gearSt: Status = share == null || noCosts ? none(noCosts ? "No costs" : "Nothing sold") : t.maxGear != null ? status(share * 100, t.maxGear * 100, { pts: true, lower: true }) : none();
  const coverSt: Status = cover == null || noCosts ? none(noCosts ? "No costs" : "Costs not set") : status(left, cover);
  const nbSt: Status = t.unbilled.length ? { k: "bad", w: `${t.unbilled.length} ${t.unbilled.length === 1 ? "job" : "jobs"}` } : { k: "good", w: "None" };

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head
          title="The month so far"
          sub="From jobs as they're sold in ServiceTitan, it doesn't wait for the Reece bill"
          info={[
            ["Sold", "Estimates marked sold this month, before GST."],
            ["Gear", "Units and materials on those estimates, at the cost ServiceTitan's pricebook puts on each line."],
            ["Gear in it / Gear %", "How much of a job's price is gear, in dollars and as a share. The rest is what's left to pay the crew, the overheads and the profit."],
            ["To cover", "Every wage and overhead for the month from Pricing & costs, everything except the gear that goes into jobs."],
            ["Most gear a job can carry", "What's left of a sale after the month's share of wages and overheads and the profit we want. Over it, the job can't pay its way."],
          ]}
        />
        {tabs}

        <Say>
          {t.sold.length === 0 ? <>Nothing sold in {name} yet.</> : noCosts ? (
            <>{t.sold.length} jobs sold in {name} for {money(sales)}, but their estimates carry no gear costs. ServiceTitan only has costs on its own estimates from mid-September 2026, so this month can&rsquo;t be read here.</>
          ) : (
            <>
              {t.sold.length} {t.sold.length === 1 ? "job" : "jobs"} sold in {name}{current ? " so far" : ""} for <b>{money(sales)}</b>, with {money(gear)} of gear in {t.sold.length === 1 ? "it" : "them"} ({pc(share!)}).
              {cover != null ? (
                <>
                  {" "}That leaves {money(left)} towards the month&rsquo;s {money(cover)} of wages and overheads,{" "}
                  {left >= cover ? <Good>{money(left - cover)} over, and that&rsquo;s profit</Good> : <Bad>{money(cover - left)} short of breaking even</Bad>}.
                  {forProfit != null ? <> At {pc(share!)} gear, {name} needs {money(forProfit)} of sales to make {pc(t.margin)}.</> : <> At {pc(share!)} gear, no amount of sales makes {pc(t.margin)}.</>}
                </>
              ) : null}
            </>
          )}
        </Say>

        <Grid cols={4}>
          <Tile label={`Sold in ${name}`} st={soldSt} fig={money(sales)} frac={t.salesGoal ? sales / t.salesGoal : null}
            sub={t.salesGoal ? `goal ${money(t.salesGoal)} for the month${current ? ` · ${money(goalByNow!)} by today` : ""}` : "no sales goal set"} />
          <Tile label="Gear in it" st={gearSt} fig={share == null || noCosts ? "" : pc(share)} frac={share}
            sub={t.maxGear != null ? `most a job can carry: ${pc(t.maxGear)}` : "set a sales goal to see the most a job can carry"} />
          <Tile label="Left to cover the month" st={coverSt} fig={noCosts ? "" : money(left)} frac={cover ? left / cover : null}
            sub={cover != null ? `of ${money(cover)} wages & overheads${breakEven != null && !noCosts ? ` · break even at ${money(breakEven)} sold` : ""}` : "set the crew and costs on Pricing & costs"} />
          <Tile label="Done, not invoiced" st={nbSt} fig={t.unbilled.length ? String(t.unbilled.length) : "0"} frac={null} href="/portal/stuck"
            sub={t.unbilled.length
              ? priced.length
                ? `${money(nbValue)} sold on ${priced.length} of them, ${money(nbGear)} of gear bought${priced.length < t.unbilled.length ? " · the others are priced on the invoice" : ""}`
                : "service calls, priced when they're invoiced"
              : "every finished job is billed"} />
        </Grid>

        <Card title={`Jobs sold in ${name}`} aside={t.maxGear != null ? `▲ over ${pc(t.maxGear)} gear can't pay its way` : undefined}>
          <p className="pk-note" style={{ marginTop: -2, marginBottom: 8 }}><b>Gear</b> is the units and materials in a job, at cost. <b>Gear %</b> is its share of the price, and <b>Left</b> is what&rsquo;s left to pay the crew, the overheads and the profit.</p>
          {t.sold.length === 0 ? <Empty>No jobs sold yet.</Empty> : (
            <div className="pk-tbl-wrap">
              <table className="pk-tbl">
                <thead><tr><th>Job</th><th>Sold</th><th>Price</th><th>Gear</th><th>Gear %</th><th>Left</th><th className="l">Where it&rsquo;s up to</th></tr></thead>
                <tbody>
                  {t.sold.map((j, i) => {
                    const pct = j.price > 0 ? j.gear / j.price : null;
                    const hot = over(j);
                    return (
                      <tr key={`${j.jobId ?? "x"}-${i}`}>
                        <td>
                          <b>{jobName(j)}</b>
                          <div className="ks">{[j.jobType, j.soldBy ? `sold by ${j.soldBy}` : null].filter(Boolean).join(" · ")}</div>
                        </td>
                        <td>{day(j.soldOn)}</td>
                        <td>{money(j.price)}</td>
                        <td>{j.gear > 0 ? money(j.gear) : ""}{j.uncosted > 0 ? <div className="ks">{j.uncosted} {j.uncosted === 1 ? "line" : "lines"} with no cost</div> : null}</td>
                        <td>{pct == null ? "" : <b className={hot ? "pk-hot" : undefined}>{pc(pct)}{hot ? " ▲" : ""}</b>}</td>
                        <td>{money(j.price - j.gear)}</td>
                        <td className="l"><Pill st={STATE[j.state]} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {uncosted.length > 0 && !noCosts ? (
            <div style={{ marginTop: 10 }}>
              <Note>{uncosted.length} {uncosted.length === 1 ? "job has" : "jobs have"} gear on the estimate with no cost in the pricebook, so {uncosted.length === 1 ? "it reads" : "they read"} better than {uncosted.length === 1 ? "it is" : "they are"}. Put a cost on those items in ServiceTitan&rsquo;s pricebook.</Note>
            </div>
          ) : null}
        </Card>

        <div style={{ marginTop: 18 }}>
          <Card title="Done, but not invoiced" aside="finished since ServiceTitan took over invoicing · the work is done, the customer hasn't been charged">
            {t.unbilled.length === 0 ? <Empty>Every finished job has an invoice.</Empty> : (
              <div className="pk-tbl-wrap">
                <table className="pk-tbl">
                  <thead><tr><th>Job</th><th>Finished</th><th>Sold for</th><th className="l">Gear in it</th></tr></thead>
                  <tbody>
                    {t.unbilled.slice(0, 25).map((j) => (
                      <tr key={j.jobId}>
                        <td><b>{jobName(j)}</b><div className="ks">{j.jobType}</div></td>
                        <td>{day(j.doneOn)}</td>
                        <td>{j.price != null ? money(j.price) : <span className="ks">no sold estimate</span>}</td>
                        <td className="l">{j.gear ? money(j.gear) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {t.unbilled.length > 25 ? <div style={{ marginTop: 10 }}><Note>{t.unbilled.length - 25} more on <Link href="/portal/stuck">Stuck money</Link>.</Note></div> : null}
          </Card>
        </div>

        <div style={{ marginTop: 18 }}>
          <Note>
            Invoiced in {name}: {money(t.invoiced.price)} across {t.invoiced.count} invoices, with {money(t.invoiced.gear)} of gear on them
            {t.invoiced.price > 0 ? ` (${pc(t.invoiced.gear / t.invoiced.price)})` : ""}. Sold and invoiced are different months for the same job when it&rsquo;s done after the month it was sold,
            {" "}this page reads both straight from ServiceTitan, so neither waits for the supplier&rsquo;s bill. Wages and overheads are this month&rsquo;s share of the year on <Link href="/portal/finance/running">Running costs</Link>.
          </Note>
        </div>
      </div>
    </PortalShell>
  );
}
