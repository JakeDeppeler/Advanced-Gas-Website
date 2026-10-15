import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { latestBoard } from "@/lib/portal/office";
import { certJobs, CERT_DAYS, type CertJob } from "@/lib/portal/run/certs";
import { melNow, money, pc, plural } from "@/lib/portal/run/month";
import { Av, Bad, Btn, Card, Empty, Grid, Head, Pill, Say, Tile, none, type Status } from "@/components/portal/kit/Kit";
import { JobsTabs } from "@/components/portal/run/RunTabs";
import { markCert } from "./actions";
import { stJobUrl, toBillJobs, TO_BILL_FROM, type ToBillRow } from "@/lib/dashboard/toBill";

export const dynamic = "force-dynamic";
export const metadata = { title: "Jobs — Team portal" };

const ago = (iso: string) => {
  const d = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 86_400_000));
  return d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};

function certStatus(c: CertJob): Status {
  if (c.status === "lodged") return { k: "good", w: c.number ? `Lodged · ${c.number}` : "Lodged" };
  if (c.status === "not_needed") return none("No cert needed");
  if (c.daysLeft < 0) return { k: "bad", w: `${-c.daysLeft} ${c.daysLeft === -1 ? "day" : "days"} late` };
  if (c.daysLeft <= 1) return { k: "bad", w: c.daysLeft === 0 ? "Due today" : "1 day left" };
  if (c.daysLeft <= 3) return { k: "mid", w: `${c.daysLeft} days left` };
  return none(`${c.daysLeft} days left`);
}

/**
 * Run the company › Jobs: today's jobs by person, what the last month's jobs
 * made, and the jobs done but not billed — with the compliance certificates
 * and their five-day clock underneath, because a job that needs a cert can't
 * be billed properly until it's in.
 */
export default async function JobsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  const office = can(user, "overhead");
  if (!office && !can(user, "quotes")) return <Locked user={user} what="Jobs" forWhom="the office" />;
  const tab = (["profit", "notbilled"].includes(searchParams.tab ?? "") ? searchParams.tab : office ? "today" : "notbilled") as "today" | "profit" | "notbilled";

  const [board, certs, toBill] = await Promise.all([
    latestBoard(),
    tab === "notbilled" ? certJobs().catch(() => []) : Promise.resolve([] as CertJob[]),
    // The whole list, read now rather than the board's six from its last snapshot.
    tab === "notbilled" ? toBillJobs().catch(() => null) : Promise.resolve(null as ToBillRow[] | null),
  ]);
  const m = board?.metrics ?? null;
  const now = melNow();
  const techs = m?.daily?.techs ?? [];
  const jobsToday = techs.flatMap((t) => t.jobs.map((j) => ({ ...j, who: t.tech })));
  const tabs = <JobsTabs on={tab} notBilled={m?.toBillCount} today={jobsToday.length} />;
  const head = (
    <Head title="Jobs" sub={`${now.day} · ServiceTitan`} info={[
      ["Running over", "Hours on the job past what it was quoted to take."],
      ["Not billed", "Finished in ServiceTitan with no invoice yet. Every day it waits is a day longer to get paid."],
      ["Compliance certificate", `Lodged with the VBA within ${CERT_DAYS} days of finishing, by the licensed plumber who did or supervised the work.`],
    ]} />
  );

  if (!m) return <PortalShell user={user}><div className="pk">{head}{tabs}<Empty>The board hasn’t made its first snapshot yet.</Empty></div></PortalShell>;

  let body: React.ReactNode;
  if (tab === "today") {
    const done = jobsToday.filter((j) => j.done).length;
    const over = jobsToday.filter((j) => j.quoted != null && j.taken > j.quoted + 0.25);
    const st = (j: (typeof jobsToday)[number]): Status =>
      j.quoted != null && j.taken > j.quoted + 0.25 ? { k: "bad", w: "Running over" } : j.done ? { k: "good", w: "Done" } : j.onNow ? { k: "mid", w: "On site" } : none("Next");
    body = (
      <>
        <Say>
          {jobsToday.length ? <>{done} of {plural(jobsToday.length, "job")} done. </> : <>No jobs on the schedule today. </>}
          {over.length > 0 && <Bad>{over.map((j) => `${j.who.split(" ")[0]}’s ${j.what.toLowerCase()}`).join(" and ")} {over.length > 1 ? "are" : "is"} running over.</Bad>}
        </Say>
        {jobsToday.length ? (
          <Card>
            <div className="pk-tbl-wrap">
              <table className="pk-tbl">
                <thead><tr><th>Job</th><th className="l">Suburb</th><th className="l">Who</th><th>Hours</th><th>Status</th></tr></thead>
                <tbody>
                  {jobsToday.map((j) => (
                    <tr key={j.jobId}>
                      <td><b>{j.what}</b></td>
                      <td className="l">{j.where ?? "—"}</td>
                      <td className="l"><span className="pk-who"><Av name={j.who} />{j.who.split(" ")[0]}</span></td>
                      <td>{j.taken.toFixed(1)}{j.quoted != null ? ` of ${j.quoted.toFixed(1)}` : ""}</td>
                      <td><Pill st={st(j)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : <Empty>Nothing booked for today in ServiceTitan.</Empty>}
      </>
    );
  } else if (tab === "profit") {
    const p = m.jobProfitRecent ?? null;
    body = p && p.costed > 0 ? (
      <>
        <Say>
          {plural(p.costed, "job")} in the last 30 days made {money(p.profit)}, {p.margin != null ? pc(p.margin * 100) : "—"} of what they sold for.{" "}
          {p.losing > 0 && <Bad>{plural(p.losing, "lost money", "lost money")}.</Bad>}
        </Say>
        <Grid>
          <Tile label="Jobs costed" st={none("")} fig={String(p.costed)} frac={p.jobs ? p.costed / p.jobs : null} sub={`of ${p.jobs} invoiced · the rest are missing a cost`} />
          <Tile label="Profit" st={p.profit >= 0 ? { k: "good", w: "Made money" } : { k: "bad", w: "Lost money" }} fig={money(p.profit)} frac={p.revenue ? Math.max(0, p.profit) / p.revenue : null} sub={`on ${money(p.revenue)} before GST`} />
          <Tile label="Under the goal’s margin" st={p.under ? { k: "mid", w: "Look at them" } : { k: "good", w: "None" }} fig={String(p.under)} frac={p.costed ? p.under / p.costed : null} sub="made something, not enough" />
          <Tile label="Lost money" st={p.losing ? { k: "bad", w: "Ran over" } : { k: "good", w: "None" }} fig={String(p.losing)} frac={p.costed ? p.losing / p.costed : null} sub="cost more than they sold for" />
        </Grid>
        <div className="pk-btns"><Btn href="/portal/profit">Every job, one by one ›</Btn></div>
        <p className="pk-note">Cost is parts from ServiceTitan plus the tech’s hours at the team’s cost an hour. A job that runs over eats its own profit.</p>
      </>
    ) : <Empty>No jobs could be costed in the last 30 days.</Empty>;
  } else {
    const rows = toBill ?? m.toBill ?? [];
    const count = toBill ? toBill.length : m.toBillCount;
    const value = toBill ? toBill.reduce((a, r) => a + (r.value ?? 0), 0) : m.toBillValue;
    const since = new Date(`${TO_BILL_FROM}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "long", timeZone: "UTC" });
    const due = certs.filter((c) => c.status === "due");
    body = (
      <>
        <Say>
          {count ? <>{plural(count, "finished job")}{value ? `, ${money(value)} of it sold before the visit,` : ""} {count === 1 ? "hasn’t" : "haven’t"} been invoiced. </> : <>Every finished job has been invoiced. </>}
          {due.length > 0 && <Bad>{plural(due.length, "compliance certificate")} to lodge.</Bad>}
        </Say>
        {rows.length ? (
          <Card title="Finished, not invoiced" aside={`${rows.length} · oldest first`}>
            {rows.map((r) => {
              const days = Math.max(0, Math.round((Date.now() - Date.parse(r.at)) / 86_400_000));
              return (
                <div className="pk-kv pk-kv--act" key={r.id}>
                  <span className="t">
                    <b>{[r.jobType ?? "Job", r.suburb].filter(Boolean).join(" · ")}</b>
                    <span>{[r.jobNumber ? `#${r.jobNumber}` : null, r.customer ?? null, `finished ${ago(r.at)}`].filter(Boolean).join(" · ")}</span>
                  </span>
                  <Pill st={days > 7 ? { k: "bad", w: "Over a week" } : days > 2 ? { k: "mid", w: "Bill it" } : { k: "good", w: "Ready to bill" }} />
                  <span className="v">{r.value != null ? money(r.value) : "—"}</span>
                  <a className="pk-btn g" href={stJobUrl(r.id)} target="_blank" rel="noreferrer" aria-label={`Open job ${r.jobNumber ?? r.id} in ServiceTitan`}>Open in ServiceTitan ↗</a>
                </div>
              );
            })}
          </Card>
        ) : <Empty>Nothing waiting to be billed.</Empty>}
        <p className="pk-note" style={{ margin: "10px 0 18px" }}>
          <b>Where this comes from:</b> ServiceTitan, synced every few minutes. A job is on the list when it&rsquo;s marked Completed in ServiceTitan
          since {since} and its invoice there is still at $0. Quote visits, site assessments and cancelled jobs are left out. Jobs finished before {since}{" "}
          were invoiced in Xero, not ServiceTitan, so they aren&rsquo;t on it. The figure beside a job is what it was sold for before the visit, where it was;
          service work priced on the day shows —.
          {toBill == null ? " ServiceTitan couldn’t be read just now, so this is the board’s last copy." : ""}
        </p>
        <Card title="Compliance certificates" aside={`${CERT_DAYS} days from finishing · VBA · ${due.length} to lodge`}>
          {certs.length ? certs.map((c) => (
            <div className="pk-kv" key={c.jobId}>
              <span className="t"><b>{[c.what, c.suburb].filter(Boolean).join(" · ")}</b><span>{c.jobNumber ? `#${c.jobNumber} · ` : ""}finished {ago(`${c.finished}T12:00:00Z`)}{c.value != null ? ` · ${money(c.value)}` : ""}</span></span>
              <Pill st={certStatus(c)} />
              <form action={markCert} className="pk-certf">
                <input type="hidden" name="job" value={c.jobId} />
                {c.status === "due" ? (
                  <>
                    <input name="number" aria-label="Certificate number" placeholder="Cert no." className="pk-in" />
                    <button name="what" value="lodged" className="pk-btn g">Lodged</button>
                    <button name="what" value="not_needed" className="pk-btn g">No cert needed</button>
                  </>
                ) : <button name="what" value="undo" className="pk-btn g">Undo</button>}
              </form>
            </div>
          )) : <Empty>No finished jobs in the last fortnight look like they need a certificate.</Empty>}
          <p className="pk-note" style={{ marginTop: 10 }}>
            Any job over $750, and every gas appliance, gas pipe or drain whatever the value. Only the licensed plumber who did or supervised it can issue it.
            Picked from the job type and total in ServiceTitan; mark any it gets wrong as not needed.
          </p>
        </Card>
      </>
    );
  }

  return (
    <PortalShell user={user}>
      <div className="pk">
        {head}
        {tabs}
        {body}
      </div>
    </PortalShell>
  );
}
