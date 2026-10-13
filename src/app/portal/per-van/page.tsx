import Link from "next/link";
import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { perVanMonth } from "@/lib/portal/fleet/perVan";
import { BENCH, benchStatus } from "@/lib/portal/benchmarks";
import { money, pc } from "@/lib/portal/run/month";
import { Bad, Card, Empty, Grid, Head, Note, Say, Tile, none } from "@/components/portal/kit/Kit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Per van, per day — Team portal" };

/** Below this much of the month's finished jobs tied to a tech, a van-a-day figure would mostly be what's missing. */
const ENOUGH = 0.8;

/**
 * Crew & vans › Per van, per day: what each tech's van brought in this month
 * for every day it was out, before GST. How each job reaches a tech is on
 * perVanMonth; the page leads with how much of the month that covered, and
 * holds the figures back when it's too little to stand behind.
 */
export default async function PerVanPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Per van, per day" forWhom="the office" />;

  const d = await perVanMonth();
  const cover = d.done > 0 ? d.tied / d.done : 0;
  const unbilled = d.done - d.billed;
  const rows = d.rows.filter((r) => r.days > 0);
  const totRev = rows.reduce((a, r) => a + r.rev, 0), totDays = rows.reduce((a, r) => a + r.days, 0), totJobs = rows.reduce((a, r) => a + r.jobs, 0);
  const fleet = totDays ? totRev / totDays : 0;
  const best = rows[0], worst = rows[rows.length - 1];
  const info: [string, string][] = [
    ["A van a day", "What’s been invoiced for the jobs a tech finished this month, before GST, divided by the days they were out. It’s the one number that says whether a van and a tech are paying for themselves."],
    ["Not billed yet", "A finished job with no invoice counts as $0 until it’s billed, so billing on the day shows here straight away."],
    ["The band", `${BENCH.rvd.words} — ${BENCH.rvd.why}.`],
    ["Whose job", "The tech ServiceTitan sent to it; split evenly when it sent two. Where nobody was assigned, whoever clocked in on it."],
    ["Low number", "Usually one of three things: too much driving, jobs priced low, or not enough work booked. Drive time is the next page."],
  ];

  const head = <Head title="Per van, per day" sub={`Jobs finished this month · ${d.tied} of ${d.done} tied to a tech`} info={info} />;

  if (!d.done || cover < ENOUGH || !rows.length) {
    return (
      <PortalShell user={user}>
        <div className="pk">
          {head}
          <Empty>
            {!d.done ? "No jobs have been finished yet this month." : <>
              Only {d.tied} of the {d.done} jobs finished this month can be tied to the tech who did them ({pc(cover * 100)}), so a figure per van would mostly measure what’s missing.{" "}
              {d.assignments ? "Jobs nobody was assigned to in ServiceTitan can’t be counted; assigning every dispatched job fixes it." : "ServiceTitan’s appointment assignments haven’t synced yet. Once they have, every dispatched job counts, clocked in or not."}
            </>}
          </Empty>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell user={user}>
      <div className="pk">
        {head}
        <Say>
          The crew brings in <b>{money(fleet)} a van a day</b> this month. {best.name.split(" ")[0]} is top at {money(best.rev / best.days)}
          {rows.length > 1 && <>; {worst.rev / worst.days < BENCH.rvd.lo ? <Bad>{worst.name.split(" ")[0]} is lowest at {money(worst.rev / worst.days)}</Bad> : <>{worst.name.split(" ")[0]} is lowest at {money(worst.rev / worst.days)}</>}</>}.
        </Say>
        <Grid cols={4}>
          <Tile label="Crew, a van a day" st={benchStatus("rvd", fleet)} fig={money(fleet)} frac={fleet / BENCH.rvd.hi} sub={`${money(totRev)} over ${totDays} van days`} />
          <Tile label="Best van" st={{ k: "good", w: best.name.split(" ")[0] }} fig={`${money(best.rev / best.days)}/day`} frac={1} sub={`${best.van ?? "no van signed"} · ${Math.round(best.jobs)} jobs`} />
          <Tile label="A year, per tech" st={fleet * 230 >= 155_000 ? { k: "good", w: "Above median" } : { k: "bad", w: "Below median" }} fig={money(fleet * 230)} frac={(fleet * 230) / 210_000} sub="at 230 working days · median $155K" />
          <Tile label="Jobs a van a day" st={none("")} fig={(totJobs / totDays).toFixed(1)} frac={null} sub="finished jobs" />
        </Grid>
        <Card title="Each van this month" aside="jobs finished, by the tech ServiceTitan sent · days from finished jobs and clock-ins">
          <div className="pk-tbl-wrap">
            <table className="pk-tbl">
              <thead><tr><th>Tech</th><th>Days out</th><th>Jobs</th><th>Invoiced</th><th>A day</th><th>Per job</th><th className="l">Against the band</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const a = r.rev / r.days, s = benchStatus("rvd", a);
                  return (
                    <tr key={r.techId}>
                      <td><b>{r.name}</b><div className="ks">{r.van ?? "no van signed"}</div></td>
                      <td>{r.days}</td>
                      <td>{Math.round(r.jobs)}</td>
                      <td>{money(r.rev)}</td>
                      <td><b>{money(a)}</b></td>
                      <td>{money(r.rev / Math.max(1, r.jobs))}</td>
                      <td className="l"><div className={`pk-bar ${s.k}`} style={{ margin: 0, width: 140 }}><i style={{ width: `${Math.max(2, Math.min(100, (a / BENCH.rvd.hi) * 100))}%` }} /></div><span className="ks">{s.w}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 10 }}>
            <Note>
              {unbilled > 0 ? <>{unbilled} of the {d.done} jobs finished this month aren’t invoiced yet, so they’re in at $0 until they are — <Link href="/portal/jobs?tab=notbilled">see the jobs not billed</Link>. </> : null}
              {d.tied < d.done ? `${d.done - d.tied} finished ${d.done - d.tied === 1 ? "job has" : "jobs have"} nobody assigned in ServiceTitan, so ${d.done - d.tied === 1 ? "it’s" : "they’re"} in no one’s figure.` : null}
            </Note>
          </div>
        </Card>
      </div>
    </PortalShell>
  );
}
