import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { Card, Empty, KpiHead, Note, PeriodTabs, Pill, Say, Tabs, type Status } from "@/components/portal/kit/Kit";
import { stJobUrl } from "@/lib/dashboard/toBill";
import { dbConfigured } from "@/lib/portal/db";
import { loadRoles } from "@/lib/portal/roles/store";
import { PERIODS, serviceDay, serviceScorecard, type Period } from "@/lib/portal/service/load";
import { MIN_COSTED, REWORK_DAYS } from "@/lib/portal/service/scoreTypes";
import "./service.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Service manager · Team portal" };

/**
 * The Service manager's home (Jake, 5 Nov): what to check every day, each
 * tech's numbers (who's most efficient, who's losing money, who's selling,
 * who's on time, who has call-backs), where the business makes and loses
 * money, and the seat itself. Every figure is one the portal already works
 * out elsewhere, read the same way, so this page can't disagree with Profit
 * on every job or the wall.
 */

const TABS = [
  { key: "today", label: "Today" },
  { key: "team", label: "Team" },
  { key: "money", label: "Money" },
  { key: "role", label: "Your role" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const money = (v: number) => `${v < 0 ? "−" : ""}$${Math.round(Math.abs(v)).toLocaleString("en-AU")}`;
const pct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const hrs = (v: number) => `${v.toFixed(1)} h`;
const day = (iso: string) => new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", day: "numeric", month: "short" }).format(new Date(iso)).replace(",", "");

export default async function ServiceManagerPage({ searchParams }: { searchParams: { tab?: string; p?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "team")) return <Locked user={user} what="Service manager" forWhom="the service manager" />;

  const tab: Tab = TABS.some((t) => t.key === searchParams.tab) ? (searchParams.tab as Tab) : "today";
  const period: Period = PERIODS.some((p) => p.k === searchParams.p) ? (searchParams.p as Period) : "month";
  const ready = dbConfigured();

  return (
    <PortalShell user={user} variant="wide">
      <div className="pk">
        <Tabs on={tab} label="Service manager" items={TABS.map((t) => ({ key: t.key, label: t.label, href: `/portal/service${t.key === "today" ? "" : `?tab=${t.key}`}` }))} />
        {!ready ? <Empty>The database isn&rsquo;t connected here.</Empty>
          : tab === "today" ? await TodayTab({ first: user.name.split(" ")[0] })
          : tab === "team" ? await TeamTab({ period })
          : tab === "money" ? await MoneyTab({ period })
          : await RoleTab()}
      </div>
    </PortalShell>
  );
}

/* ------------------------------------------------------------------ today */

type Step = { key: string; title: string; how: string; st: Status; detail?: React.ReactNode; more?: { href: string; label: string; ext?: boolean } };

const tally = (n: number, late = false, word = "to do"): Status => (n === 0 ? { k: "good", w: "Clear" } : { k: late ? "bad" : "mid", w: `${n} ${word}` });

async function TodayTab({ first }: { first: string }) {
  const d = await serviceDay();
  const over = (d.pace ?? []).filter((t) => (t.hoursQuoted ?? 0) > 0 && (t.hoursTakenQuoted ?? 0) > (t.hoursQuoted ?? 0) * 1.1);
  const gearSoon = d.gear.reduce((a, g) => a + g.soon, 0);
  const gearAll = d.gear.reduce((a, g) => a + g.count, 0);

  const steps: Step[] = [
    {
      key: "pace", title: "Check today's jobs are running to time",
      how: "Who is over the hours their quoted jobs allowed. Ring them: is it the job, the quote, or the tech? Move the afternoon if it's slipping.",
      st: d.pace == null ? { k: "none", w: "Not read" } : tally(over.length, false, "running over"),
      detail: over.length ? <ul className="sv-list">{over.map((t) => <li key={t.tech}><b>{t.tech}</b> · {hrs(t.hoursTakenQuoted ?? 0)} on jobs quoted at {hrs(t.hoursQuoted ?? 0)}</li>)}</ul> : null,
      more: { href: "/portal/pace", label: "Today's pace" },
    },
    {
      key: "gear", title: "Gear and bookings for the next few days",
      how: "Materials and systems ordered, the skip bin and the electrician booked, before the day. The same list goes to admin@ each morning.",
      st: tally(gearSoon, gearSoon > 0, "in the next 2 days"),
      detail: gearAll ? <ul className="sv-list">{d.gear.filter((g) => g.count).map((g) => <li key={g.key}><b>{g.title}</b> · {g.count} in the next week{g.soon ? `, ${g.soon} within 2 days` : ""}</li>)}</ul> : null,
      more: { href: "/portal/supply/next-week", label: "To order" },
    },
    {
      key: "losing", title: "Look at the jobs that lost money this week",
      how: "Each one: was it priced wrong, took too long, or had parts nobody charged for? Fix the price or talk to the tech.",
      st: tally(d.losing.length, d.losing.length > 0, "lost money"),
      detail: d.losing.length ? <JobList rows={d.losing.slice(0, 6).map((j) => ({ id: j.jobId, num: j.jobNumber, t: [j.customer, j.jobType].filter(Boolean).join(" · "), sub: j.techs.join(", ") || "nobody on the timesheets", v: money(j.profit ?? 0) }))} /> : null,
      more: { href: "/portal/service?tab=money", label: "Where money's made and lost" },
    },
    {
      key: "rework", title: "Call-backs from the last fortnight",
      how: `We went back within ${REWORK_DAYS} days of finishing, for a look, a fix or a warranty, and nobody had quoted it. Talk to the tech who did the first job.`,
      st: tally(d.rework.length, d.rework.length > 0, d.rework.length === 1 ? "call-back" : "call-backs"),
      detail: d.rework.length ? <JobList rows={d.rework.slice(0, 6).map((r) => ({ id: r.back.id, num: r.back.jobNumber, t: `${r.back.jobType ?? "Return visit"} · ${r.days} days after #${r.first.jobNumber ?? r.first.id}`, sub: `first job: ${r.first.jobType ?? ""} by ${r.first.techs.join(", ") || "nobody assigned"}`, v: "" }))} /> : null,
      more: { href: "/portal/service?tab=team", label: "Call-backs by tech" },
    },
    {
      key: "bill", title: "Every finished job billed",
      how: "Yesterday's finished jobs should be invoiced by now. Push the office, or the tech whose paperwork is missing.",
      st: tally(d.toBillOld, d.toBillOld > 0, "older than yesterday"),
      detail: d.toBill ? <p className="pk-note" style={{ margin: 0 }}>{d.toBill} finished and not billed, {d.toBillOld} of them from before yesterday.</p> : null,
      more: { href: "/portal/jobs?tab=notbilled", label: "Not billed" },
    },
    {
      key: "calls", title: "Customers waiting on a call",
      how: "Emails asking us to ring them. Make the call and mark the email's flag complete in Outlook.",
      st: tally(d.callBacks, false, "waiting"),
    },
    {
      key: "quotes", title: "Quotes the techs wrote, followed up",
      how: "Every quote out has a next call. A tech who quotes and never closes needs a ride-along, not a lecture.",
      st: { k: "none", w: "In the pipeline" },
      more: { href: "/portal/pipeline", label: "Quotes" },
    },
  ];
  const waiting = steps.filter((s) => s.st.k === "bad" || s.st.k === "mid").length;

  return (
    <>
      <KpiHead title={<>Service<br />manager</>} kpis={[
        { icon: "doc", fig: `${steps.filter((s) => s.st.k === "good").length} of ${steps.length}`, label: "Checks clear" },
        { icon: "clock", fig: String(waiting), label: "Need you today", badge: steps.some((s) => s.st.k === "bad") ? "act" : undefined, tone: "down" },
      ]} />
      <Say>{waiting === 0 ? <>Morning {first}, everything&rsquo;s clear.</> : <>Morning {first}, {waiting} of the {steps.length} checks need you today.</>}</Say>
      <ol className="pt-office">
        {steps.map((s, i) => (
          <li key={s.key} className={`pt-office__step pk-card pk-pad${s.st.k === "good" ? " is-clear" : ""}`}>
            <div className="pt-office__head">
              <span className="pt-office__n" aria-hidden="true">{i + 1}</span>
              <div className="pt-office__t"><b>{s.title}</b><span>{s.how}</span></div>
              <div className="pt-office__count"><Pill st={s.st} /></div>
            </div>
            {s.detail ? <div className="pt-office__list">{s.detail}</div> : null}
            {s.more ? <div className="pk-btns" style={{ marginTop: 10 }}><Link className="pk-btn g" href={s.more.href}>{s.more.label} ›</Link></div> : null}
          </li>
        ))}
      </ol>
      <Card title="Every week">
        <ul className="sv-list">
          <li><b>Monday:</b> go through the Team tab with each tech: their profit per hour, time against quote, selling and call-backs. Praise the top, coach the bottom.</li>
          <li><b>Wednesday:</b> the Money tab: which kinds of job are losing money, and whether the price or the time allowed needs changing.</li>
          <li><b>Friday:</b> next week&rsquo;s gear ordered and bookings made, and nothing finished this week left unbilled.</li>
        </ul>
      </Card>
    </>
  );
}

function JobList({ rows }: { rows: { id: number | null; num: string | null; t: string; sub: string; v: string }[] }) {
  return (
    <>
      {rows.map((r, i) => (
        <div className="pk-kv pk-kv--act" key={`${r.id ?? i}`}>
          <span className="t"><b>{r.num ? `#${r.num}` : "Job"}{r.t ? ` · ${r.t}` : ""}</b><span>{r.sub}</span></span>
          <span className="v">{r.v}</span>
          {r.id ? <a className="pk-btn g" href={stJobUrl(r.id)} target="_blank" rel="noreferrer" aria-label={`Open job ${r.num ?? r.id} in ServiceTitan`}>Open ↗</a> : <span />}
        </div>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ team */

async function TeamTab({ period }: { period: Period }) {
  const s = await serviceScorecard(period);
  const rated = s.techs.filter((t) => t.profitPerHour != null);
  const best = rated[0];
  const worst = rated.length > 1 ? rated[rated.length - 1] : null;
  const loser = [...s.techs].sort((a, b) => b.losing - a.losing)[0];
  const cb = [...s.techs].sort((a, b) => b.callBacks - a.callBacks)[0];

  return (
    <>
      <PeriodTabs on={period} href={(k) => `/portal/service?tab=team&p=${k}`} items={PERIODS} />
      <KpiHead title={<>The<br />team</>} kpis={[
        { icon: "trend", fig: best ? `${money(best.profitPerHour!)}/h` : "—", label: best ? `Most efficient: ${best.name}` : "Most efficient" },
        { icon: "clock", fig: worst ? `${money(worst.profitPerHour!)}/h` : "—", label: worst ? `Least: ${worst.name}` : "Least efficient" },
        { icon: "doc", fig: String(s.summary?.losing ?? 0), label: `Jobs that lost money${loser?.losing ? `, most with ${loser.name}` : ""}`, tone: "down" },
        { icon: "people", fig: String(s.rework.length), label: `Call-backs${cb?.callBacks ? `, most on ${cb.name}'s jobs` : ""}`, tone: "down" },
      ]} />
      {!s.techs.length ? <Empty>No jobs with a tech on them in {s.label} yet.</Empty> : (
        <Card title={`Each tech, ${s.label}`} aside="most efficient first: profit for every hour on site">
          <div className="pk-tbl-wrap">
            <table className="pk-tbl sv-tbl">
              <thead><tr><th>Tech</th><th>Jobs</th><th>Invoiced</th><th>Profit</th><th>Margin</th><th>Profit an hour</th><th>Lost money</th><th>On time</th><th>Call-backs</th><th>Selling</th></tr></thead>
              <tbody>
                {s.techs.map((t) => {
                  const time = t.timeJobs ? t.timeActual / t.timeAllowed : null;
                  const enough = t.costed >= MIN_COSTED;
                  return (
                    <tr key={t.name}>
                      <td><b>{t.name}</b>{!enough ? <div className="ks">{t.costed} costed, too few to rate</div> : null}</td>
                      <td>{t.jobs}</td>
                      <td>{money(t.revenue)}</td>
                      <td>{enough ? money(t.profit) : "—"}</td>
                      <td>{pct(t.margin)}</td>
                      <td><b>{t.profitPerHour != null ? money(t.profitPerHour) : "—"}</b>{t.revenuePerHour != null ? <div className="ks">{money(t.revenuePerHour)} invoiced an hour</div> : null}</td>
                      <td>{t.losing ? <span className="sv-bad">{t.losing} {t.losing === 1 ? "job" : "jobs"}</span> : "none"}</td>
                      <td>{time == null ? <span className="ks">no quoted times</span> : <><b>{time <= 1.05 ? "On time" : `${Math.round((time - 1) * 100)}% over`}</b><div className="ks">{hrs(t.timeActual)} on {hrs(t.timeAllowed)} allowed · {t.timeOver} of {t.timeJobs} over</div></>}</td>
                      <td>{t.callBacks ? <span className="sv-bad">{t.callBacks}</span> : "none"}<div className="ks">of {t.finished} finished</div></td>
                      <td>{t.sales ? <><b>{money(t.sales.sold)}</b><div className="ks">{t.sales.soldJobs} of {t.sales.quotedJobs} quoted · {pct(t.sales.closeRate)} close</div></> : <span className="ks">{s.salesMonth ? "no quotes this month" : "this month only"}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 10 }}>
            <Note>
              Money and hours are from Profit on every job: the invoice before GST, less equipment, materials and the hours on site. A job two techs were on is split between them.
              A tech needs {MIN_COSTED} costed jobs before they&rsquo;re rated. &ldquo;On time&rdquo; is hours on site against what the quote allowed, on the jobs that have both; over by more than 10% counts as over.
              A call-back is going back to the same site within {REWORK_DAYS} days for a look, a fix or a warranty that nobody quoted, put against whoever did the first job.
              Selling is the wall&rsquo;s leaderboard, by who wrote the quote.
            </Note>
          </div>
        </Card>
      )}
      {s.rework.length > 0 && (
        <Card title={`Call-backs, ${s.label}`} aside="newest first">
          <JobList rows={s.rework.map((r) => ({ id: r.back.id, num: r.back.jobNumber, t: `${r.back.jobType ?? "Return visit"}, ${day(r.back.createdOn)}`, sub: `${r.days} days after #${r.first.jobNumber ?? r.first.id} (${r.first.jobType ?? ""}) by ${r.first.techs.join(", ") || "nobody assigned"}`, v: "" }))} />
        </Card>
      )}
      <Card title="Not on this page yet">
        <ul className="sv-list">
          <li><b>Calls:</b> how each person speaks on the phone and books the job comes with ServiceTitan Dispatch Pro, which records and coaches the calls.</li>
          <li><b>Reviews by tech:</b> no reviews are connected to the portal yet, so who gets the most can&rsquo;t be counted here.</li>
        </ul>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ money */

async function MoneyTab({ period }: { period: Period }) {
  const s = await serviceScorecard(period);
  const making = s.types.filter((t) => t.profit > 0);
  const losing = s.types.filter((t) => t.profit < 0 || t.losing > 0).sort((a, b) => a.profit - b.profit);
  return (
    <>
      <PeriodTabs on={period} href={(k) => `/portal/service?tab=money&p=${k}`} items={PERIODS} />
      <KpiHead title={<>Where the<br />money is</>} kpis={s.summary ? [
        { icon: "trend", fig: money(s.summary.profit), label: `Profit on ${s.summary.costed} costed jobs` },
        { icon: "doc", fig: pct(s.summary.margin), label: "Margin" },
        { icon: "clock", fig: String(s.summary.losing), label: "Jobs that lost money", tone: "down" },
      ] : []} />
      {!s.summary ? <Empty>Profit couldn&rsquo;t be worked out just now.</Empty> : (
        <>
          <Card title="By kind of job" aside="most profit first">
            <div className="pk-tbl-wrap">
              <table className="pk-tbl sv-tbl">
                <thead><tr><th>Job type</th><th>Jobs</th><th>Invoiced</th><th>Profit</th><th>Margin</th><th>Lost money</th></tr></thead>
                <tbody>
                  {s.types.map((t) => (
                    <tr key={t.jobType}>
                      <td><b>{t.jobType}</b>{t.costed < t.jobs ? <div className="ks">{t.jobs - t.costed} not costed</div> : null}</td>
                      <td>{t.jobs}</td>
                      <td>{money(t.revenue)}</td>
                      <td>{t.profit < 0 ? <span className="sv-bad">{money(t.profit)}</span> : money(t.profit)}</td>
                      <td>{pct(t.margin)}</td>
                      <td>{t.losing ? `${t.losing} of ${t.costed}` : "none"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Say>
            {making.length ? <>Most of the money is made on {making.slice(0, 3).map((t) => t.jobType).join(", ")}. </> : null}
            {losing.length ? <>The money leaks on {losing.slice(0, 3).map((t) => `${t.jobType} (${t.losing} ${t.losing === 1 ? "job" : "jobs"} lost money)`).join(", ")}.</> : <>No kind of job lost money in {s.label}.</>}
          </Say>
          {s.worst.length > 0 && (
            <Card title="The jobs that lost the most" aside={s.label}>
              <JobList rows={s.worst.map((j) => ({ id: j.jobId, num: j.jobNumber, t: [j.customer, j.jobType].filter(Boolean).join(" · "), sub: `${j.techs.join(", ") || "nobody on the timesheets"} · charged ${money(j.price)}, ${j.actualHours != null && j.allowedHours != null ? `${hrs(j.actualHours)} on ${hrs(j.allowedHours)} allowed` : j.hours != null ? `${hrs(j.hours)} on site` : "hours unknown"}`, v: money(j.profit ?? 0) }))} />
              <div className="pk-btns" style={{ marginTop: 10 }}><Link className="pk-btn g" href="/portal/profit">Profit on every job ›</Link></div>
            </Card>
          )}
          {s.summary.uncostedRevenue > 0 && <Note>{money(s.summary.uncostedRevenue)} of jobs invoiced in {s.label} couldn&rsquo;t be costed (no equipment cost or no hours) and aren&rsquo;t in these figures.</Note>}
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ role */

async function RoleTab() {
  const state = await loadRoles().catch(() => null);
  const seat = state?.roles.find((r) => r.id === "service-manager");
  return (
    <>
      <KpiHead title={<>Your<br />role</>} kpis={[]} />
      {!seat ? <Empty>The Service Manager seat isn&rsquo;t on the Roles page.</Empty> : (
        <>
          <Say>{seat.tagline}</Say>
          <Card title="The job"><p style={{ margin: 0 }}>{seat.intro}</p></Card>
          <Card title="Your day"><ul className="sv-list">{seat.day.map((x) => <li key={x}>{x}</li>)}</ul></Card>
          <Card title="What you own"><ul className="sv-list">{seat.owns.map((x) => <li key={x}>{x}</li>)}</ul></Card>
          <Card title="What you're measured on"><ul className="sv-list">{seat.measured.map((x) => <li key={x}>{x}</li>)}</ul></Card>
          {seat.notOwns.length ? <Card title="Not yours"><ul className="sv-list">{seat.notOwns.map((x) => <li key={x}>{x}</li>)}</ul></Card> : null}
          <Note>Reports to {seat.reportsTo}. Manages {seat.manages}. The owner keeps this up to date on <Link href="/portal/roles">Roles</Link>.</Note>
        </>
      )}
    </>
  );
}
