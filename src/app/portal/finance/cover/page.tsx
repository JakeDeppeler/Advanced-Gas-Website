import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { Bad, Card, Empty, Good, Head, Note, Pill, Say, Tabs, type Status } from "@/components/portal/kit/Kit";
import { dbConfigured, getCapSettings, listUsers, listVehicles } from "@/lib/portal/db";
import { withFleet } from "@/lib/portal/costSettings";
import { computeCapacity, onCostPct, type CrewLevel, type CrewMember } from "@/lib/portal/crew";
import { DAYS_ON_TOOLS, PAID_HRS_YEAR, coverHour, overheadItems, scenarios, vansFor, type CoverInputs, type Fleet } from "@/lib/portal/cover/hour";
import { personDays } from "@/lib/portal/cover/days";

export const dynamic = "force-dynamic";
export const metadata = { title: "What an hour must cover — Team portal" };

const m0 = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-AU")}`;
const m2 = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const h1 = (n: number) => `${(Math.round(n * 10) / 10).toLocaleString("en-AU")}`;
const n0 = (n: number) => Math.round(n).toLocaleString("en-AU");
const pct = (f: number) => `${Math.round(f * 100)}%`;

const PERIODS = [
  { k: "7", label: "Last 7 days", days: 7 },
  { k: "28", label: "Last 4 weeks", days: 28 },
  { k: "90", label: "Last 3 months", days: 90 },
] as const;

type SP = { t?: string; p?: string; tw?: string; aw?: string; tn?: string; an?: string; b?: string; d?: string; c?: string };

const num = (v: string | undefined, dflt: number, lo: number, hi: number) => {
  const n = Number(v);
  return v != null && v !== "" && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
};

/**
 * Pricing & costs › What an hour must cover.
 *
 * The hour: every overhead, a tech's and an apprentice's full pay, divided by
 * the hours that get billed — then what changes with another person or a
 * better day. Each person's day: of the hours paid, how many were on site and
 * how many hours of billed work came out of them.
 *
 * The inputs are a GET form, so a what-if is a link that can be sent to
 * someone and nothing typed here changes a saved figure.
 */
export default async function CoverPage({ searchParams }: { searchParams: SP }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="What an hour must cover" forWhom="managers" />;

  const tab = searchParams.t === "days" ? "days" : "hour";
  const ready = dbConfigured();
  const [users, stored, vehicles] = ready ? await Promise.all([listUsers(), getCapSettings(), listVehicles()]) : [[], null, []];
  const s = withFleet(stored, vehicles);
  const people: CrewMember[] = users
    .filter((u) => u.active && u.id && u.level)
    .map((u) => ({ id: u.id as string, name: u.name, level: u.level as CrewLevel, costing: u.costing }));
  const cap = computeCapacity(people, s);
  const lines = overheadItems(s, cap);
  const oc = onCostPct(s);
  // Techs are the qualified people with a van; an apprentice driving one of their own is still an apprentice.
  const fleet: Fleet = { vans: cap.realVans, techs: cap.per.filter((x) => x.c.chargeable && x.p.level !== "apprentice").length };

  const i: CoverInputs = {
    techWage: num(searchParams.tw, 45, 0, 500),
    appWage: num(searchParams.aw, 28, 0, 500),
    techs: Math.round(num(searchParams.tn, Math.max(1, fleet.techs), 1, 50)),
    apps: Math.round(num(searchParams.an, people.filter((p) => p.level === "apprentice").length, 0, 50)),
    billPerDay: num(searchParams.b, 6, 1, 12),
    dayHrs: 8,
    daysOnTools: Math.round(num(searchParams.d, DAYS_ON_TOOLS, 50, 260)),
    charge: num(searchParams.c, 300, 0, 5000),
    margin: Number(s.margin) || 0,
  };

  const tabHref = (t: string) => {
    const q = new URLSearchParams(Object.entries(searchParams).filter(([k, v]) => k !== "t" && v != null) as [string, string][]);
    if (t !== "hour") q.set("t", t);
    const str = q.toString();
    return `/portal/finance/cover${str ? `?${str}` : ""}`;
  };

  return (
    <PortalShell user={user}>
      <div className="pk pt-cover">
        <Head
          title="What an hour must cover"
          sub="Every overhead and everyone's pay, over the hours we actually bill — and what each person's day turns into"
          info={[
            ["Billed hours", `Of an ${i.dayHrs}-hour day, the hours a customer pays for. The rest is driving, loading, quoting, waiting and call-backs — paid, but not billed.`],
            ["Pay", `The hourly wage plus super, WorkCover and long service leave (${oc.toFixed(1)}% on top), for a 38-hour week all year — leave, public holidays, sick days and RDOs are paid.`],
            ["Days on the tools", `${DAYS_ON_TOOLS} a year: 260 weekdays less 20 days' leave, 13 public holidays, 10 sick days and 12 RDOs.`],
            ["Materials", "Not in here. Gear and units are bought for each job and marked up on their own, so the hour only has to cover people and overheads."],
          ]}
        />
        <Tabs on={tab} label="View" items={[
          { key: "hour", label: "The hour", href: tabHref("hour") },
          { key: "days", label: "Each person's day", href: tabHref("days") },
        ]} />
        {tab === "hour" ? <Hour i={i} lines={lines} fleet={fleet} oc={oc} searchParams={searchParams} /> : <Days i={i} searchParams={searchParams} />}
      </div>
    </PortalShell>
  );
}

function Hour({ i, lines, fleet, oc, searchParams }: { i: CoverInputs; lines: ReturnType<typeof overheadItems>; fleet: Fleet; oc: number; searchParams: SP }) {
  const r = coverHour(lines, fleet, oc, i);
  const sc = scenarios(lines, fleet, oc, i);
  const vans = vansFor(fleet, i.techs);
  const vansNow = fleet.vans;
  const groups = [...new Set(lines.map((l) => l.group))].map((g) => {
    const ls = lines.filter((l) => l.group === g).sort((a, b) => b.annual - a.annual);
    return { label: g, lines: ls };
  });
  const perVanEach = vansNow > 0 ? lines.filter((l) => l.perVan).reduce((a, l) => a + l.annual, 0) / vansNow : 0;
  // A line's cost at the crew being priced: a per-van line grows with the techs.
  const at = (l: (typeof lines)[number]) => (l.perVan && vansNow > 0 ? (l.annual / vansNow) * vans : l.annual);
  const hr = (n: number) => (r.billHrs > 0 ? n / r.billHrs : 0);
  const grid = [4, 5, 6, 7, 8].filter((b) => b <= i.dayHrs);
  const gridRows = [
    { label: "As it is", ch: {} },
    { label: "Add an apprentice", ch: { apps: i.apps + 1 } },
    { label: "Add a tech with a van", ch: { techs: i.techs + 1 } },
    { label: "Add a tech and an apprentice", ch: { techs: i.techs + 1, apps: i.apps + 1 } },
  ];
  const short = r.leftAtCharge < 0;

  return (
    <>
      <Card title="The numbers it's worked on" aside="change any and press Work it out">
        <form method="get" action="/portal/finance/cover" className="pt-cover__form">
          {[
            ["tw", "Tech wage", "$ an hour", i.techWage],
            ["aw", "Apprentice wage", "$ an hour, on average", i.appWage],
            ["tn", "Techs on the road", "one van each", i.techs],
            ["an", "Apprentices", "riding with a tech", i.apps],
            ["b", "Hours billed a day", `out of ${i.dayHrs}`, i.billPerDay],
            ["d", "Days on the tools", "a year, each tech", i.daysOnTools],
            ["c", "What we charge", "$ an hour, crew", i.charge],
          ].map(([k, label, sub, v]) => (
            <label key={k as string} className="pt-cover__f" htmlFor={`cv-${k}`}>
              <b>{label}</b><span>{sub}</span>
              <input id={`cv-${k}`} name={k as string} className="pk-in num" inputMode="decimal" defaultValue={String(v)} />
            </label>
          ))}
          <div className="pk-btns pt-cover__go">
            <button type="submit" className="pk-btn">Work it out</button>
            {Object.keys(searchParams).some((k) => k !== "t") ? <Link href="/portal/finance/cover" className="pk-btn g">Back to the defaults</Link> : null}
          </div>
        </form>
      </Card>

      <Say>
        At {i.billPerDay} of {i.dayHrs} hours billed, every hour on the tools has to bring in <b>{m2(r.perHr.total)}</b> just to cover everything
        {i.margin > 0 ? <>, and <b>{m2(r.atMargin)}</b> to make our {i.margin}%</> : null}.{" "}
        {r.billHrs > 0 && (short
          ? <Bad>At {m2(i.charge)} an hour we&rsquo;d be {m0(-r.leftAtCharge)} a year short.</Bad>
          : <Good>At {m2(i.charge)} an hour that leaves {m0(r.leftAtCharge)} a year — {r.marginAtCharge != null ? pct(r.marginAtCharge) : "—"} of what&rsquo;s billed.</Good>)}
      </Say>

      <Card title="The hour, built up" aside={`${i.techs} ${i.techs === 1 ? "tech" : "techs"} × ${n0(i.daysOnTools)} days × ${i.billPerDay} hours = ${n0(r.billHrs)} billed hours a year`}>
        <div className="pk-tbl-wrap">
          <table className="pk-tbl">
            <thead><tr><th>What has to be paid for</th><th>A year</th><th>Every billed hour</th></tr></thead>
            <tbody>
              <tr><td>Overheads <span className="ks">— every line below</span></td><td>{m0(r.overhead)}</td><td>{m2(r.perHr.overhead)}</td></tr>
              <tr><td>Techs&rsquo; pay <span className="ks">— {i.techs} × {m2(i.techWage)} × {n0(PAID_HRS_YEAR)} hrs + {oc.toFixed(1)}%</span></td><td>{m0(r.techPay)}</td><td>{m2(r.perHr.tech)}</td></tr>
              <tr><td>Apprentices&rsquo; pay <span className="ks">— {i.apps} × {m2(i.appWage)} × {n0(PAID_HRS_YEAR)} hrs + {oc.toFixed(1)}%</span></td><td>{m0(r.appPay)}</td><td>{m2(r.perHr.app)}</td></tr>
              <tr className="tot"><td>To break even</td><td>{m0(r.total)}</td><td>{m2(r.perHr.total)}</td></tr>
              {i.margin > 0 && <tr><td>To make our {i.margin}% <span className="ks">— the break-even ÷ {(1 - i.margin / 100).toFixed(2)}, so {i.margin}% of the price is left</span></td><td>{m0(r.atMargin * r.billHrs)}</td><td><b>{m2(r.atMargin)}</b></td></tr>}
              <tr><td>At what we charge now</td><td>{m0(i.charge * r.billHrs)}</td><td>{m2(i.charge)}</td></tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="What if" aside={`against ${m2(i.charge)} an hour`}>
        <div className="pk-tbl-wrap">
          <table className="pk-tbl">
            <thead><tr><th>If we…</th><th>Billed hours a year</th><th>Break-even an hour</th>{i.margin > 0 && <th>Price at {i.margin}%</th>}<th>Left a year at {m2(i.charge)}</th><th>Against now</th></tr></thead>
            <tbody>
              {sc.map((x) => {
                const d = x.r.leftAtCharge - r.leftAtCharge;
                return (
                  <tr key={x.key} className={x.key === "now" ? "pt-cover__now" : undefined}>
                    <td><b>{x.label}</b><div className="ks">{x.sub}</div></td>
                    <td>{n0(x.r.billHrs)}</td>
                    <td>{m2(x.r.perHr.total)}</td>
                    {i.margin > 0 && <td>{m2(x.r.atMargin)}</td>}
                    <td className={x.r.leftAtCharge < 0 ? "pt-cover__neg" : undefined}>{m0(x.r.leftAtCharge)}</td>
                    <td>{x.key === "now" ? "—" : <span className={d < 0 ? "pt-cover__neg" : "pt-cover__pos"}>{d >= 0 ? "▲ " : "▼ "}{m0(Math.abs(d))}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Note>
          A tech brings a van ({m0(perVanEach)} a year in fuel, insurance, servicing and the rest) and their own billed hours — but only if there&rsquo;s the work to fill them; a new van with half a diary is the &ldquo;Bill 5 of 8&rdquo; row, or worse. An apprentice brings their pay and no hours of their own —
          they pay for themselves only if the crew gets through the work faster or the crew rate covers them.
        </Note>
      </Card>

      <Card title="Break-even an hour, by hours billed a day" aside="the same people, a better or worse day">
        <div className="pk-tbl-wrap">
          <table className="pk-tbl">
            <thead><tr><th>Crew</th>{grid.map((b) => <th key={b} className={b === i.billPerDay ? "pt-cover__col" : undefined}>{b} of {i.dayHrs} hrs</th>)}</tr></thead>
            <tbody>
              {gridRows.map((g) => (
                <tr key={g.label}>
                  <td>{g.label}</td>
                  {grid.map((b) => {
                    const x = coverHour(lines, fleet, oc, { ...i, ...g.ch, billPerDay: b });
                    return <td key={b} className={b === i.billPerDay ? "pt-cover__col" : undefined}>{m2(x.perHr.total)}{x.perHr.total > i.charge ? <span className="pt-cover__neg"> · over</span> : null}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Note>&ldquo;Over&rdquo; is where the break-even is more than the {m2(i.charge)} we charge — every hour billed there loses money.</Note>
      </Card>

      <Card title="Every overhead" aside={`${lines.length} lines · ${m0(r.overhead)} a year`}>
        <div className="pk-tbl-wrap">
          <table className="pk-tbl">
            <thead><tr><th>Overhead</th><th className="l">Grows with</th><th>A month</th><th>A year</th><th>Every billed hour</th></tr></thead>
            {groups.map((g) => (
              <tbody key={g.label}>
                <tr className="pt-cover__grp"><td colSpan={2}>{g.label}</td><td>{m0(g.lines.reduce((a, l) => a + at(l), 0) / 12)}</td><td>{m0(g.lines.reduce((a, l) => a + at(l), 0))}</td><td>{m2(hr(g.lines.reduce((a, l) => a + at(l), 0)))}</td></tr>
                {g.lines.map((l) => (
                  <tr key={l.key}>
                    <td>{l.label}</td>
                    <td className="l"><span className="ks">{l.perVan ? "each van" : "stays put"}</span></td>
                    <td>{m0(at(l) / 12)}</td>
                    <td>{m0(at(l))}</td>
                    <td>{m2(hr(at(l)))}</td>
                  </tr>
                ))}
              </tbody>
            ))}
            <tbody><tr className="tot"><td colSpan={2}>All overheads</td><td>{m0(r.overhead / 12)}</td><td>{m0(r.overhead)}</td><td>{m2(r.perHr.overhead)}</td></tr></tbody>
          </table>
        </div>
        <Note>
          The figures are the ones on <Link href="/portal/finance/capacity?t=overheads">Wages &amp; costs › Overheads</Link>, filed from Xero; change them there. &ldquo;Each van&rdquo; lines are for {vans} {vans === 1 ? "van" : "vans"}{vans !== i.techs ? ` — ${i.techs} ${i.techs === 1 ? "tech" : "techs"} and ${vans - i.techs} driven by an apprentice` : ""}.
          Office &amp; admin staff are their pay with on-costs. The techs&rsquo; and apprentices&rsquo; pay is above, not here.
        </Note>
      </Card>
    </>
  );
}

async function Days({ i, searchParams }: { i: CoverInputs; searchParams: SP }) {
  const per = PERIODS.find((p) => p.k === searchParams.p) ?? PERIODS[1];
  const list = dbConfigured() ? await personDays(per.days, i.dayHrs).catch(() => null) : [];
  const href = (k: string) => {
    const q = new URLSearchParams(Object.entries(searchParams).filter(([key, v]) => key !== "p" && v != null) as [string, string][]);
    q.set("t", "days"); q.set("p", k);
    return `/portal/finance/cover?${q.toString()}`;
  };
  const target = i.billPerDay;
  /*
   * Judged only where the unmeasured time can't change the answer. The low
   * end is the sold time that's known; the high end counts every hour on a
   * billed job with no sold time as worked at their measured speed (or at
   * least 100%). Over the goal on the low end is on target; short of it on
   * the high end is short; anything between depends on time nobody priced,
   * and says so instead of guessing.
   */
  const st = (p: NonNullable<typeof list>[number]): Status => {
    if (p.days === 0) return { k: "none", w: "Can't say yet" };
    const speed = p.onSiteTimed > 0 ? Math.max(1, p.workHrs / p.onSiteTimed) : 1;
    const lo = p.workHrs / p.days;
    const hi = (p.workHrs + p.onSiteUntimed * speed) / p.days;
    if (lo >= target) return { k: "good", w: "On target" };
    if (hi < target - 1.5) return { k: "bad", w: "Well under" };
    if (hi < target) return { k: "mid", w: "Under" };
    return { k: "none", w: "Can't say yet" };
  };
  const and = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

  return (
    <>
      <Tabs on={per.k} label="Period" items={PERIODS.map((p) => ({ key: p.k, label: p.label, href: href(p.k) }))} />
      {list == null ? <Empty>The timesheets couldn&rsquo;t be read just now. Try again in a minute.</Empty> : list.length === 0 ? <Empty>No one has clocked on in ServiceTitan in this stretch.</Empty> : (
        <>
          <Say>
            The goal is {target} hours of billed work out of every {i.dayHrs}-hour day.{" "}
            {(() => {
              const on = list.filter((p) => st(p).k === "good").map((p) => p.tech.split(" ")[0]);
              const off = list.filter((p) => st(p).k === "bad").map((p) => p.tech.split(" ")[0]);
              const unsure = list.filter((p) => st(p).k === "none").length;
              return <>{on.length ? <Good>{and(on)} {on.length === 1 ? "is" : "are"} there.</Good> : null}{" "}{off.length ? <Bad>{and(off)} {off.length === 1 ? "is" : "are"} well short.</Bad> : null}{unsure === list.length ? " Too little of the time is on jobs with a sold time to say for anyone yet." : null}</>;
            })()}
          </Say>
          <Card title="Each person's day" aside={`${per.label.toLowerCase()} · a day is ${i.dayHrs} paid hours`}>
            <div className="pk-tbl-wrap">
              <table className="pk-tbl pt-cover__days">
                <thead>
                  <tr>
                    <th>Person</th><th>Days</th><th>On site a day</th><th>Billed work a day</th><th>Speed</th><th>Billed ex GST</th><th>Billed per paid hour</th><th className="l">Against {target} hrs</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => {
                    const closed = p.onSite - p.onSiteOpen;
                    const measured = closed > 0 ? p.onSiteTimed / closed : 0;
                    const speed = p.onSiteTimed > 0 ? p.workHrs / p.onSiteTimed : null;
                    return (
                      <tr key={p.tech}>
                        <td><b>{p.tech}</b><div className="ks">{p.jobsBilled} of {p.jobs} jobs billed · {pct(measured)} of the time on them has a sold time</div></td>
                        <td>{p.days}</td>
                        <td>{h1(p.onSite / Math.max(1, p.days))} h<div className="ks">{h1(p.onSite)} of {n0(p.paidHrs)} h paid{p.onSiteOpen > 0.5 ? ` · ${h1(p.onSiteOpen)} h on jobs not billed yet` : ""}</div></td>
                        <td><b>{h1(p.workHrs / Math.max(1, p.days))} h</b>{p.onSiteUntimed > 0.5 ? <div className="ks">+ {h1(p.onSiteUntimed / Math.max(1, p.days))} h on jobs with no sold time</div> : null}</td>
                        <td>{speed == null ? "—" : <>{pct(speed)}<div className="ks">{h1(p.workHrs)} h of work in {h1(p.onSiteTimed)} h</div></>}</td>
                        <td>{m0(p.billed)}</td>
                        <td>{p.paidHrs > 0 ? m2(p.billed / p.paidHrs) : "—"}</td>
                        <td className="l"><Pill st={st(p)} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <Note>
            <b>Billed work</b> is the time each finished, invoiced job was sold for — the labour on its invoice, the sold estimate behind an install, or the standard time set for that kind of job.
            A job&rsquo;s sold time is the crew&rsquo;s, so a tech and an apprentice on a 5-hour job are each credited 5 hours. <b>Speed</b> is that sold time over their own time on site for the same jobs:
            7 hours of work done in 5 is 140%. Jobs not finished and billed yet count as time on site only. Billed dollars are split between the people on a job by their time there.
            Where the time on jobs with no sold time could put someone either side of the goal, the page says &ldquo;Can&rsquo;t say yet&rdquo; rather than guess — standard times for each kind of job, set on <Link href="/portal/board/times">Standard times</Link>, fill that in.
            Paid hours are {i.dayHrs} for each day they clocked on; more hours on site than that is overtime, or a clock left running.
          </Note>
        </>
      )}
    </>
  );
}
