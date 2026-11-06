import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { Head } from "@/components/portal/kit/Kit";
import { MAX_VISIT_HRS } from "@/lib/portal/onTheTools";
import { clockInsStart, hoursCompared, resolveSpans, type CompareKey, type HoursPerson, type HoursWindow, type RangeKey } from "@/lib/portal/hours/compare";
import { isoDateMelbourne } from "@/lib/dashboard/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hours · Team portal" };

const h1 = (n: number) => `${n.toFixed(1)} hrs`;
const pc = (n: number) => `${Math.round(n * 100)}%`;
const share = (w: { on: number; roster: number }) => (w.roster > 0 ? w.on / w.roster : null);

/**
 * A change, said with its sign and in words, so the arrow isn't the only
 * signal. Grey either way: more hours on site isn't always better, and the
 * page shouldn't colour it as if it were.
 */
function Change({ d, unit, dp = 1 }: { d: number | null; unit: string; dp?: number }) {
  if (d == null) return <span className="hr-chg none">no comparison</span>;
  const r = Number(Math.abs(d).toFixed(dp));
  if (r === 0) return <span className="hr-chg">same</span>;
  return <span className="hr-chg"><span aria-hidden="true">{d > 0 ? "▲" : "▼"}</span> {d > 0 ? "up" : "down"} {r} {unit}</span>;
}

/** Two bars, this span over the other, on one scale. */
const Bars = ({ a, b, max }: { a: number; b: number; max: number }) => (
  <span className="hr-bars" aria-hidden="true">
    <i style={{ width: `${max > 0 ? Math.min(100, (a / max) * 100) : 0}%` }} />
    <i className="b" style={{ width: `${max > 0 ? Math.min(100, (b / max) * 100) : 0}%` }} />
  </span>
);

/**
 * Team › Hours: how much of the crew's paid week goes on customers' jobs,
 * from ServiceTitan's clock-ins, for a range against another. This week so
 * far is set against last week to the same point, so a Wednesday doesn't
 * read as a bad week. Rostered is each person's week on Pricing & costs,
 * scaled to the weekdays the range covers.
 */
export default async function HoursPage({ searchParams }: { searchParams: { r?: string; c?: string; from?: string; to?: string; cfrom?: string; cto?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Hours" forWhom="managers" />;

  const r: RangeKey = (["week", "last", "month", "custom"] as const).find((k) => k === searchParams.r) ?? "week";
  const c: CompareKey = (["prev", "year", "custom"] as const).find((k) => k === searchParams.c) ?? "prev";
  const { range, compare } = resolveSpans(r, c, searchParams);
  const [[a, b], start] = await Promise.all([hoursCompared(range, compare), clockInsStart()]);
  const sa = share(a), sb = share(b);
  // A span with no clock-ins at all is a gap in the record, not a week of
  // nothing: its columns read "—", never 0.
  const noA = a.people.length === 0, noB = b.people.length === 0;
  const before = (w: HoursWindow) => !!start && isoDateMelbourne(w.span.from) < start;
  const startWords = start ? new Date(`${start}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).replace(",", "") : "";

  // The links keep whatever else is set, so picking a range keeps the comparison.
  const link = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...searchParams, ...p })) if (v) u.set(k, v);
    return `/portal/hours${u.toString() ? `?${u}` : ""}`;
  };
  const rangeOpts: [RangeKey, string][] = [["week", "This week"], ["last", "Last week"], ["month", "This month"], ["custom", "Custom"]];
  const cmpOpts: [CompareKey, string][] = [["prev", r === "month" ? "Last month" : r === "custom" ? "The days before" : r === "last" ? "The week before" : "Last week"], ["year", r === "month" ? "Same month last year" : r === "custom" ? "A year earlier" : "Same week last year"], ["custom", "Custom"]];

  // Everyone who clocked in in either span, the crew first by hours, the office after.
  const names = [...new Set([...a.people, ...b.people].map((p) => p.name))];
  const pick = (w: HoursWindow, n: string): HoursPerson | null => w.people.find((p) => p.name === n) ?? null;
  const rows = names.map((n) => ({ n, x: pick(a, n), y: pick(b, n) }))
    .map((row) => ({ ...row, field: (row.x ?? row.y)!.field, roster: (row.x ?? row.y)!.roster }))
    .sort((p, q) => Number(q.field) - Number(p.field) || (q.x?.on ?? 0) - (p.x?.on ?? 0));
  const crew = rows.filter((x) => x.field);
  const office = rows.filter((x) => !x.field);
  const max = Math.max(1, ...rows.flatMap((x) => [x.x?.on ?? 0, x.y?.on ?? 0]));
  const shareOf = (p: HoursPerson | null, w: HoursWindow) => (p && p.roster ? p.on / (p.roster * (w.span.weekdays / 5)) : null);
  const travelShare = (w: HoursWindow) => (w.on + w.travel > 0 ? w.travel / (w.on + w.travel) : null);

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Hours" sub={
          sa != null
            ? <>How much of the crew&rsquo;s paid week goes on customers&rsquo; jobs, from ServiceTitan&rsquo;s clock-ins. {range.short} it&rsquo;s {pc(sa)}{sb != null ? <>, against {pc(sb)} for {compare.label}</> : null}.</>
            : <>How much of the crew&rsquo;s paid week goes on customers&rsquo; jobs, from ServiceTitan&rsquo;s clock-ins.</>
        } />
      </div>

      <div className="hr">
        <section className="pk-card hr-bar" aria-label="Range and comparison">
          <div className="hr-pick">
            <span className="hr-l">Range</span>
            <nav className="tb2-seg" aria-label="Range">
              {rangeOpts.map(([k, l]) => <Link key={k} href={link({ r: k })} className={r === k ? "on" : undefined} aria-current={r === k ? "true" : undefined}>{l}</Link>)}
            </nav>
            <span className="hr-l">Compare to</span>
            <nav className="tb2-seg" aria-label="Compare to">
              {cmpOpts.map(([k, l]) => <Link key={k} href={link({ c: k })} className={c === k ? "on" : undefined} aria-current={c === k ? "true" : undefined}>{l}</Link>)}
            </nav>
          </div>
          <p className="hr-spans"><b>{range.label}</b><br />against <b>{compare.label}</b></p>
          {(before(a) || before(b)) && (
            <p className="hr-warn" role="note">
              ServiceTitan&rsquo;s clock-ins only start properly on {startWords}.{" "}
              {[[a, noA] as const, [b, noB] as const].filter(([w]) => before(w)).map(([w, none]) => none ? `${w.span.label} has none.` : `${w.span.label} reaches back before that, so its figures run low.`).join(" ")}
            </p>
          )}
          {(r === "custom" || c === "custom") && (
            <form method="get" action="/portal/hours" className="hr-custom">
              <input type="hidden" name="r" value={r} />
              <input type="hidden" name="c" value={c} />
              {r === "custom" && <><label htmlFor="hr-from">From</label><input id="hr-from" type="date" name="from" defaultValue={searchParams.from ?? ""} required /><label htmlFor="hr-to">to</label><input id="hr-to" type="date" name="to" defaultValue={searchParams.to ?? ""} required /></>}
              {c === "custom" && <><label htmlFor="hr-cfrom">Against</label><input id="hr-cfrom" type="date" name="cfrom" defaultValue={searchParams.cfrom ?? ""} required /><label htmlFor="hr-cto">to</label><input id="hr-cto" type="date" name="cto" defaultValue={searchParams.cto ?? ""} required /></>}
              <button type="submit" className="pk-btn">Show</button>
            </form>
          )}
        </section>

        <div className="hr-tiles">
          <section className="pk-card hr-tile hero" aria-label="On the tools">
            <span className="hr-tl">On the tools, {range.short.toLowerCase()}</span>
            <b className="hr-fig">{sa != null ? pc(sa) : "—"}</b>
            <span className="hr-sub">{a.roster > 0 ? `${h1(a.on)} on site, of ${h1(a.roster)} rostered` : a.visits ? "nobody clocked in has a rostered week set" : "no clock-ins"}</span>
            <Bars a={sa ?? 0} b={sb ?? 0} max={1} />
            <span className="hr-vs"><span>{compare.short}: {sb != null ? `${pc(sb)} · ${h1(b.on)}` : "no clock-ins"}</span><Change d={sa != null && sb != null ? Math.round(sa * 100) - Math.round(sb * 100) : null} unit="pts" dp={0} /></span>
          </section>
          <section className="pk-card hr-tile" aria-label="Driving between jobs">
            <span className="hr-tl">Driving between jobs</span>
            <b className="hr-fig">{a.visits ? h1(a.travel) : "—"}</b>
            <span className="hr-sub">{travelShare(a) != null ? `${pc(travelShare(a) as number)} of the time out on jobs` : "no clock-ins"}</span>
            <Bars a={a.travel} b={b.travel} max={Math.max(a.travel, b.travel)} />
            <span className="hr-vs"><span>{compare.short}: {b.visits ? `${h1(b.travel)} · ${pc(travelShare(b) ?? 0)}` : "no clock-ins"}</span><Change d={a.visits && b.visits ? a.travel - b.travel : null} unit="hrs" /></span>
            <span className="hr-from">ServiceTitan · dispatched to arrived</span>
          </section>
          <section className="pk-card hr-tile" aria-label="Visits">
            <span className="hr-tl">Visits</span>
            <b className="hr-fig">{a.visits || "—"}</b>
            <span className="hr-sub">{a.visits ? `${h1(a.on / a.visits)} on site each, on average` : "no clock-ins"}</span>
            <Bars a={a.visits} b={b.visits} max={Math.max(a.visits, b.visits)} />
            <span className="hr-vs"><span>{compare.short}: {b.visits ? `${b.visits} · ${h1(b.on / b.visits)} each` : "no clock-ins"}</span><Change d={a.visits && b.visits ? a.visits - b.visits : null} unit="" dp={0} /></span>
            <span className="hr-from">ServiceTitan clock-ins</span>
          </section>
        </div>

        <section className="pk-card hr-people" aria-labelledby="hr-h">
          <div className="hr-ph">
            <h2 id="hr-h">By person</h2>
            <span className="hr-key"><span><i aria-hidden="true" />{range.short}</span><span><i className="b" aria-hidden="true" />{compare.short}</span></span>
          </div>
          <p className="hr-note">
            On site is arrived to done on each visit; driving is dispatched to arrived. Rostered is the week on each person&rsquo;s card on <Link href="/portal/finance/capacity">Pricing &amp; costs</Link>, scaled to the weekdays in the range. A visit clocked over {MAX_VISIT_HRS} hours is left out as a clock left running. The office&rsquo;s visits are listed but kept out of the totals.
          </p>
          {rows.length ? (
            <div className="hr-wrap">
              <table className="hr-t">
                <thead><tr><th scope="col">Who</th><th scope="col">{range.short}</th><th scope="col">{compare.short}</th><th scope="col">Change</th><th scope="col">On site, both</th><th scope="col">On the tools</th><th scope="col">Visits</th></tr></thead>
                <tbody>
                  {crew.map(({ n, x, y }) => {
                    const s1 = shareOf(x, a), s2 = shareOf(y, b);
                    return (
                      <tr key={n}>
                        <th scope="row">{n}</th>
                        <td>{noA ? "—" : h1(x?.on ?? 0)}</td>
                        <td>{noB ? "—" : h1(y?.on ?? 0)}</td>
                        <td><Change d={noA || noB ? null : (x?.on ?? 0) - (y?.on ?? 0)} unit="hrs" /></td>
                        <td><Bars a={x?.on ?? 0} b={y?.on ?? 0} max={max} /></td>
                        <td>{s1 != null || s2 != null ? <>{s1 != null ? pc(s1) : "—"} <span className="hr-dim">vs {s2 != null ? pc(s2) : "—"}</span></> : <span className="hr-dim">no rostered week</span>}</td>
                        <td>{noA ? "—" : x?.visits ?? 0} <span className="hr-dim">vs {noB ? "—" : y?.visits ?? 0}</span></td>
                      </tr>
                    );
                  })}
                  {crew.length > 0 && (
                    <tr className="hr-total">
                      <th scope="row">The crew<span>{crew.length} on the tools{a.roster ? ` · ${h1(a.roster)} rostered` : ""}</span></th>
                      <td>{noA ? "—" : h1(a.on)}</td>
                      <td>{noB ? "—" : h1(b.on)}</td>
                      <td><Change d={noA || noB ? null : a.on - b.on} unit="hrs" /></td>
                      <td><Bars a={a.on} b={b.on} max={Math.max(a.on, b.on)} /></td>
                      <td>{sa != null ? pc(sa) : "—"} <span className="hr-dim">vs {sb != null ? pc(sb) : "—"}</span></td>
                      <td>{noA ? "—" : a.visits} <span className="hr-dim">vs {noB ? "—" : b.visits}</span></td>
                    </tr>
                  )}
                  {office.map(({ n, x, y }) => (
                    <tr key={n} className="hr-office">
                      <th scope="row">{n}<span>office · kept out of the totals</span></th>
                      <td>{noA ? "—" : h1(x?.on ?? 0)}</td>
                      <td>{noB ? "—" : h1(y?.on ?? 0)}</td>
                      <td><Change d={noA || noB ? null : (x?.on ?? 0) - (y?.on ?? 0)} unit="hrs" /></td>
                      <td><Bars a={x?.on ?? 0} b={y?.on ?? 0} max={max} /></td>
                      <td />
                      <td>{noA ? "—" : x?.visits ?? 0} <span className="hr-dim">vs {noB ? "—" : y?.visits ?? 0}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="pt-rep__empty">No clock-ins in either range.</p>}
        </section>
      </div>
    </PortalShell>
  );
}
