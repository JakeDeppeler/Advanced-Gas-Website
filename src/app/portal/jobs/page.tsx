import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { latestBoard } from "@/lib/portal/office";
import { certJobs, CERT_DAYS, type CertJob } from "@/lib/portal/run/certs";
import { melNow, money, pc, plural } from "@/lib/portal/run/month";
import { Av, Bad, Btn, Card, Empty, Grid, Head, Pill, Say, Tabs, Tile, none, type Status } from "@/components/portal/kit/Kit";
import { markCert } from "./actions";
import { listJobs, type JobFilter, type ListedJob } from "@/lib/dashboard/jobList";
import { stJobUrl, toBillAndWaiting, TO_BILL_FROM, type ToBillRow } from "@/lib/dashboard/toBill";
import { Suspense } from "react";
import { XeroBilledCard } from "@/components/portal/run/XeroBilledCard";
import { JobProfitTable } from "@/components/portal/JobProfitTable";
import { jobProfits } from "@/lib/dashboard/jobProfit";
import { hourJobCosts } from "@/lib/portal/cover/load";
import { getSettings } from "@/lib/portal/db";
import { readYearGoal } from "@/lib/portal/yearGoal";
import { addDays, isoDateMelbourne } from "@/lib/dashboard/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Jobs · Team portal" };

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
/** Each view is its own tab in the section row, so each says which it is. */
const TITLE = { today: "Jobs today", list: "All jobs", profit: "Job profit", notbilled: "Not billed" } as const;

export default async function JobsPage({ searchParams }: { searchParams: { tab?: string; f?: string; q?: string; old?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  const office = can(user, "overhead");
  if (!office && !can(user, "quotes")) return <Locked user={user} what="Jobs" forWhom="the office" />;
  const tab = (["profit", "notbilled", "list"].includes(searchParams.tab ?? "") ? searchParams.tab : office ? "today" : "notbilled") as "today" | "profit" | "notbilled" | "list";

  const [board, certs, toBill] = await Promise.all([
    latestBoard(),
    tab === "notbilled" ? certJobs().catch(() => []) : Promise.resolve([] as CertJob[]),
    // The whole list, read now rather than the board's six from its last snapshot.
    tab === "notbilled" ? toBillAndWaiting().catch(() => null) : Promise.resolve(null as ToBillRow[] | null),
  ]);
  const m = board?.metrics ?? null;
  const now = melNow();
  const techs = m?.daily?.techs ?? [];
  const jobsToday = techs.flatMap((t) => t.jobs.map((j) => ({ ...j, who: t.tech })));
  const head = (
    <Head title={TITLE[tab]} sub={`${now.day} · ServiceTitan`} info={[
      ["Running over", "Hours on the job past what it was quoted to take."],
      ["Not billed", "Finished in ServiceTitan with no invoice yet. Every day it waits is a day longer to get paid."],
      ["Compliance certificate", `Lodged with the VBA within ${CERT_DAYS} days of finishing, by the licensed plumber who did or supervised the work.`],
    ]} />
  );

  if (!m) return <PortalShell user={user}><div className="pk">{head}<Empty>The board hasn’t made its first snapshot yet.</Empty></div></PortalShell>;

  let body: React.ReactNode;
  if (tab === "list") {
    const f: JobFilter = searchParams.f === "hold" || searchParams.f === "done" ? searchParams.f : "open";
    const search = (searchParams.q ?? "").slice(0, 60);
    const withOld = searchParams.old === "1";
    const list = await listJobs(f, { search, withOld }).catch(() => null);
    const href = (o: { f?: JobFilter; old?: boolean }) => {
      const p = new URLSearchParams({ tab: "list" });
      const ff = o.f ?? f;
      if (ff !== "open") p.set("f", ff);
      if (search) p.set("q", search);
      if (o.old ?? withOld) p.set("old", "1");
      return `/portal/jobs?${p.toString()}`;
    };
    const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Melbourne" }) : null);
    const state = (j: ListedJob): Status =>
      f === "done" ? { k: "good", w: `Done ${when(j.completedOn) ?? ""}`.trim() }
      : f === "hold" ? { k: "mid", w: j.holdReasons[0] ?? "On hold" }
      : j.status === "InProgress" ? { k: "mid", w: "In progress" }
      : j.nextVisit ? none(`Booked ${when(j.nextVisit)}`) : { k: "bad", w: "Not booked" };
    body = (
      <>
        <div className="pk-btns" style={{ alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <Tabs on={f} label="Which jobs" items={[
            { key: "open", label: "Open", href: href({ f: "open" }), count: list?.counts.open || undefined },
            { key: "hold", label: "On hold", href: href({ f: "hold" }), count: list?.counts.hold || undefined },
            { key: "done", label: "Completed", href: href({ f: "done" }) },
          ]} />
          <form method="get" action="/portal/jobs" className="pk-btns" role="search" style={{ alignItems: "center" }}>
            <input type="hidden" name="tab" value="list" />
            {f !== "open" && <input type="hidden" name="f" value={f} />}
            {withOld && <input type="hidden" name="old" value="1" />}
            <input id="jobs-q" name="q" defaultValue={search} className="pk-in wide" style={{ minWidth: 240 }} placeholder="Job number, customer or suburb" aria-label="Find a job" />
            <button type="submit" className="pk-btn g">Find</button>
          </form>
        </div>
        {!list ? <Empty>ServiceTitan&rsquo;s jobs couldn&rsquo;t be read just now.</Empty> : list.jobs.length === 0 ? (
          <Empty>{search ? <>No {f === "done" ? "completed" : f === "hold" ? "held" : "open"} job matches &ldquo;{search}&rdquo;.</> : f === "hold" ? "Nothing on hold." : f === "open" ? "No open jobs." : "No completed jobs."}</Empty>
        ) : (
          <Card title={f === "open" ? "Open jobs" : f === "hold" ? "On hold" : "Completed"} aside={`${list.jobs.length}${list.capped ? " most recent" : ""} · ${f === "open" ? "next visit first" : f === "hold" ? "longest held first" : "newest first"}`}>
            {list.jobs.map((j) => (
              <div className="pk-kv pk-kv--act" key={j.id}>
                <span className="t">
                  <b>{[j.jobType ?? "Job", j.suburb].filter(Boolean).join(" · ")}</b>
                  <span>{[
                    j.jobNumber ? `#${j.jobNumber}` : null,
                    j.customer,
                    j.createdOn ? `booked ${when(j.createdOn)}` : null,
                    f === "hold" && j.holdReasons.length > 1 ? j.holdReasons.slice(1).join(", ") : null,
                    j.old ? "from the old system" : null,
                  ].filter(Boolean).join(" · ")}</span>
                </span>
                <Pill st={state(j)} />
                <a className="pk-btn g" href={stJobUrl(j.id)} target="_blank" rel="noreferrer" aria-label={`Open job ${j.jobNumber ?? j.id} in ServiceTitan`}>Open in ServiceTitan ↗</a>
              </div>
            ))}
          </Card>
        )}
        <p className="pk-note" style={{ marginTop: 10 }}>
          From ServiceTitan, synced every few minutes. <b>Open</b> is Scheduled or In progress; <b>On hold</b> is a job ServiceTitan has on Hold or one carrying a hold tag
          (set in Settings › Wall board › Held work); <b>Completed</b> shows the newest first{list?.capped ? ", the latest 300" : ""}.
          {list && list.oldHidden > 0 ? <> {list.oldHidden === 1 ? "1 job copied in from the old system still reads as open and is hidden" : `${list.oldHidden} jobs copied in from the old system still read as open and are hidden`}  <a href={href({ old: true })}>show {list.oldHidden === 1 ? "it" : "them"}</a>.</> : null}
          {withOld ? <> Showing jobs from the old system too, <a href={href({ old: false })}>hide them</a>.</> : null}
        </p>
      </>
    );
  } else if (tab === "today") {
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
                      <td className="l">{j.where ?? ""}</td>
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
    // The whole list, job by job, here with the jobs rather than under Finance.
    const [goalRow, crew] = await Promise.all([getSettings<unknown>("yeargoal").catch(() => null), hourJobCosts().catch(() => null)]);
    const target = readYearGoal(goalRow, new Date()).profitPct;
    const todayIso = isoDateMelbourne(new Date());
    const list = await jobProfits(isoDateMelbourne(addDays(new Date(), -30)), todayIso, crew?.costPerHr ?? null, target, crew?.crew ?? []).catch(() => null);
    body = p && p.costed > 0 ? (
      <>
        <Say>
          {plural(p.costed, "job")} in the last 30 days made {money(p.profit)}, {p.margin != null ? pc(p.margin * 100) : ""} of what they sold for.{" "}
          {p.losing > 0 && <Bad>{plural(p.losing, "lost money", "lost money")}.</Bad>}
        </Say>
        <Grid>
          <Tile label="Jobs costed" st={none("")} fig={String(p.costed)} frac={p.jobs ? p.costed / p.jobs : null} sub={`of ${p.jobs} invoiced · the rest are missing a cost`} />
          <Tile label="Profit" st={p.profit >= 0 ? { k: "good", w: "Made money" } : { k: "bad", w: "Lost money" }} fig={money(p.profit)} frac={p.revenue ? Math.max(0, p.profit) / p.revenue : null} sub={`on ${money(p.revenue)} before GST`} />
          <Tile label="Under the goal’s margin" st={p.under ? { k: "mid", w: "Look at them" } : { k: "good", w: "None" }} fig={String(p.under)} frac={p.costed ? p.under / p.costed : null} sub="made something, not enough" />
          <Tile label="Lost money" st={p.losing ? { k: "bad", w: "Ran over" } : { k: "good", w: "None" }} fig={String(p.losing)} frac={p.costed ? p.losing / p.costed : null} sub="cost more than they sold for" />
        </Grid>
        {list && list.rows.length > 0 ? <JobProfitTable rows={list.rows} target={target} /> : null}
        <div className="pk-btns"><Btn href="/portal/profit">Pick another month ›</Btn></div>
        <p className="pk-note">Cost is parts from ServiceTitan plus the tech’s hours at the team’s cost an hour. A job that runs over eats its own profit.</p>
      </>
    ) : <Empty>No jobs could be costed in the last 30 days.</Empty>;
  } else {
    // Visits whose sale was booked as a job of its own are billed on that job, once it's done: not counted here.
    const live = toBill?.filter((r) => !r.waitingOn) ?? null;
    const waiting = toBill?.filter((r) => r.waitingOn) ?? [];
    const rows = live ?? m.toBill ?? [];
    const count = live ? live.length : m.toBillCount;
    const value = live ? live.reduce((a, r) => a + (r.value ?? 0), 0) : m.toBillValue;
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
                  <span className="v">{r.value != null ? money(r.value) : ""}</span>
                  <a className="pk-btn g" href={stJobUrl(r.id)} target="_blank" rel="noreferrer" aria-label={`Open job ${r.jobNumber ?? r.id} in ServiceTitan`}>Open in ServiceTitan ↗</a>
                </div>
              );
            })}
          </Card>
        ) : <Empty>Nothing waiting to be billed.</Empty>}
        {waiting.length > 0 && (
          <Card title="Sold on the visit, billed on the job it was booked as" aside={`${waiting.length} · not counted above`}>
            {waiting.map((r) => (
              <div className="pk-kv pk-kv--act" key={r.id}>
                <span className="t">
                  <b>{[r.jobType ?? "Job", r.suburb].filter(Boolean).join(" · ")}</b>
                  <span>{[r.jobNumber ? `#${r.jobNumber}` : null, r.customer ?? null, `visit finished ${ago(r.at)}`, `sold as #${r.waitingOn!.jobNumber ?? r.waitingOn!.id}, ${(r.waitingOn!.status ?? "booked").toLowerCase()}`].filter(Boolean).join(" · ")}</span>
                </span>
                <Pill st={{ k: "none", w: `Bill once #${r.waitingOn!.jobNumber ?? r.waitingOn!.id} is done` }} />
                <span className="v">{r.value != null ? money(r.value) : ""}</span>
                <a className="pk-btn g" href={stJobUrl(r.waitingOn!.id)} target="_blank" rel="noreferrer" aria-label={`Open job ${r.waitingOn!.jobNumber ?? r.waitingOn!.id} in ServiceTitan`}>Open #{r.waitingOn!.jobNumber ?? r.waitingOn!.id} ↗</a>
              </div>
            ))}
          </Card>
        )}
        <p className="pk-note" style={{ margin: "10px 0 18px" }}>
          <b>Where this comes from:</b> ServiceTitan, synced every few minutes. A job is on the list when it&rsquo;s marked Completed in ServiceTitan
          since {since} and its invoice there is still at $0. Quote visits, site assessments and cancelled jobs are left out. A visit whose sale was booked as a job of its own (an install made from the quote) is billed on that job once it&rsquo;s done, so it&rsquo;s listed apart until then. Jobs finished before {since}{" "}
          were invoiced in Xero, not ServiceTitan, so they aren&rsquo;t on it. The figure beside a job is what it was sold for before the visit, where it was;
          service work priced on the day shows .
          {toBill == null ? " ServiceTitan couldn’t be read just now, so this is the board’s last copy." : ""}
        </p>
        {office && (
          <div style={{ marginBottom: 18 }}>
            <Suspense fallback={<Card title="Before 17 September, checked against Xero"><Empty>Checking the older jobs against Xero…</Empty></Card>}>
              <XeroBilledCard />
            </Suspense>
          </div>
        )}
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
        {body}
      </div>
    </PortalShell>
  );
}
