import Link from "next/link";
import type { Metrics } from "@/lib/dashboard/metrics";
import type { ProfitLoss } from "@/lib/portal/xero";
import type { YearGoal } from "@/lib/portal/yearGoal";
import type { NeedLine } from "@/lib/portal/needs";
import { money } from "@/lib/portal/format";

type Tone = "good" | "mid" | "bad" | "none";
type Status = { k: Tone; w: string };
const SIGN: Record<Tone, string> = { good: "✓", mid: "!", bad: "▼", none: "" };

/**
 * The prototype's status rule. Money and counts go by ratio — at or over goal
 * is good, within 10% is close — and percentages by points, within two of the
 * goal is close.
 */
function status(actual: number, goal: number, o: { pts?: boolean } = {}): Status {
  let k: Tone;
  if (o.pts) {
    const d = actual - goal;
    k = d >= -0.05 ? "good" : d >= -2.05 ? "mid" : "bad";
  } else {
    const r = goal ? actual / goal : 1;
    k = r >= 1 ? "good" : r >= 0.9 ? "mid" : "bad";
  }
  const ahead = !o.pts && goal > 0 && actual / goal >= 1.1;
  return { k, w: k === "good" ? (ahead ? "Ahead" : "On track") : k === "mid" ? "Close" : "Behind" };
}

function Pill({ st }: { st: Status }) {
  return (
    <span className={`ph-st ${st.k}`}>
      {SIGN[st.k] && <span aria-hidden="true">{SIGN[st.k]}</span>}
      {st.w}
    </span>
  );
}

const clamp = (f: number) => Math.max(0.02, Math.min(1, f));
const n0 = (n: number) => Math.round(n).toLocaleString("en-AU");
const pc = (n: number, dp = 0) => `${n.toFixed(dp)}%`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

type Stat = { key: string; name: string; st: Status; fig: string; bar: number; sub: string; href: string };

export type HomeTodo = { id: string; title: string; notes: string | null; who: string | null; due: string; late: boolean };

export type HomeData = {
  first: string;
  when: string;
  month: string;
  /** Working day of the month, and how many it has. */
  day: { n: number; of: number } | null;
  /** Sees the money: the month bar. */
  office: boolean;
  m: Metrics | null;
  profitYear: ProfitLoss | null;
  goal: YearGoal | null;
  todos: HomeTodo[];
  overdue: number;
  lines: NeedLine[];
  denied: boolean;
};

/**
 * Home, to the prototype: a welcome with the day in one sentence, the month
 * in one bar, then what to get done and what to look at.
 *
 * Every figure is one another page shows too, read from the same snapshot and
 * Xero, so Home can't tell a different story from the page it links to. A
 * figure with nothing behind it says so in grey, never a zero it didn't
 * measure. The prototype's fifth figure, weeks of running costs the bank
 * covers, is left out until Cash to operate is built: nothing here works out
 * the weekly running cost yet.
 */
export function Home(d: HomeData) {
  const { m, month } = d;
  const st = m?.pace?.standing.month ?? null;
  const plan = m?.pace?.month ?? null;
  const mo = m?.paceData?.periods.month ?? null;

  // Sold: dollars against the dollars the goal wants by today. The standing is
  // kept in jobs, so its share of the month gone scales the month's dollars.
  const sold = st?.sold ?? null;
  const elapsed = sold?.need && sold.byNow != null ? sold.byNow / sold.need : null;
  const monthGoal = plan?.sold.value ?? null;
  const soldByNow = monthGoal != null && elapsed != null ? monthGoal * elapsed : null;
  // A goal is saved but the pace couldn't be worked back from it (no win rate
  // or average sale yet): say that, rather than ask for a goal that's there.
  const noPace: Status = { k: "none", w: d.goal ? "No pace yet" : "No goal" };
  const sell: Stat = mo?.soldValue != null && soldByNow
    ? { key: "sold", name: "Sold", st: status(mo.soldValue, soldByNow), fig: money(mo.soldValue), bar: mo.soldValue / soldByNow, sub: `of ${money(soldByNow)} by now · ${money(monthGoal as number)} for ${month}`, href: "/portal/sales" }
    : { key: "sold", name: "Sold", st: mo?.soldValue != null ? noPace : { k: "none", w: "No figures" }, fig: mo?.soldValue != null ? money(mo.soldValue) : "—", bar: 0, sub: mo?.soldValue != null ? (d.goal ? "sold this month" : "set a year goal for a pace") : "waiting on the first sync", href: "/portal/sales" };

  const done = st?.completed ?? null;
  const jobs: Stat = done?.done != null && done.byNow
    ? { key: "jobs", name: "Jobs done", st: status(done.done, done.byNow), fig: n0(done.done), bar: done.done / done.byNow, sub: `of ${n0(done.byNow)} by now`, href: "/portal/jobs" }
    : { key: "jobs", name: "Jobs done", st: mo?.completed != null ? noPace : { k: "none", w: "No figures" }, fig: mo?.completed != null ? n0(mo.completed) : "—", bar: 0, sub: "this month", href: "/portal/jobs" };

  // Net profit: Xero's, for the year so far, against the goal's margin.
  const py = d.profitYear;
  const npPct = py && py.income > 0 ? (py.netProfit / py.income) * 100 : null;
  const goalPct = d.goal?.profitPct ?? null;
  const np: Stat = npPct != null && goalPct
    ? { key: "np", name: "Net profit", st: status(npPct, goalPct, { pts: true }), fig: pc(npPct, 1), bar: npPct / goalPct, sub: `this year · goal ${pc(goalPct)}+`, href: "/portal/finance" }
    : { key: "np", name: "Net profit", st: { k: "none", w: npPct != null ? "No goal" : "No figures" }, fig: npPct != null ? pc(npPct, 1) : "—", bar: 0, sub: npPct != null ? "this year · set a profit goal" : "needs Xero connected", href: "/portal/finance" };

  // Owed, overdue: lower is better. With no limit set yet, nothing overdue is
  // on track, a month or less is one to watch, anything older is too high.
  const od = m?.overdueTotal ?? null;
  const oldest = m?.overdueList?.length ? Math.max(...m.overdueList.map((x) => x.days)) : null;
  const count = m?.overdueCount ?? 0;
  const owed: Stat = od != null
    ? {
        key: "owed", name: "Owed, overdue",
        st: od <= 0 ? { k: "good", w: "On track" } : (oldest ?? 0) > 30 ? { k: "bad", w: "Too high" } : { k: "mid", w: "Watch it" },
        fig: money(od), bar: m?.receivablesTotal ? od / m.receivablesTotal : od > 0 ? 1 : 0,
        sub: od > 0 ? `${plural(count, "invoice")}${oldest ? ` · oldest ${oldest} days` : ""}` : "nothing past its due date", href: "/portal/money",
      }
    : { key: "owed", name: "Owed, overdue", st: { k: "none", w: "No figures" }, fig: "—", bar: 0, sub: "needs Xero connected", href: "/portal/money" };

  const stats = [sell, jobs, np, owed];
  const onTrack = stats.filter((s) => s.st.k === "good").length;
  const measured = stats.filter((s) => s.st.k !== "none").length;
  const look = d.lines;

  return (
    <div className="ph">
      {d.denied && <div className="ph-note"><b>That page isn’t open to you.</b> Ask an admin if you think it should be.</div>}

      <div className="ph-welcome">
        <div>
          <h1>G’day {d.first}.</h1>
          <div className="ph-sub">{d.when}</div>
        </div>
        <p className="ph-say">
          {d.office && (measured
            ? <>{month} is <b>{onTrack} of {measured} on track</b>{d.day ? `, day ${d.day.n} of ${d.day.of}` : ""}. </>
            : <>{month}’s figures aren’t in yet. </>)}
          {plural(d.todos.length, "to-do")} to get done and {plural(look.length, "thing")} to look at today.
        </p>
      </div>

      {d.office && (
        <section className="ph-card ph-month" aria-label={`${month} so far`}>
          <div className="ph-mb-h">
            <b>{month} so far</b>
            {d.day && <span>day {d.day.n} of {d.day.of}</span>}
            {d.day && <div className="ph-mb-track" aria-hidden="true"><i style={{ width: `${(d.day.n / d.day.of) * 100}%` }} /></div>}
          </div>
          <div className="ph-mb-stats">
            {stats.map((s) => (
              <Link key={s.key} href={s.href} className="ph-mb-s">
                <span className="ph-mb-l">{s.name}<Pill st={s.st} /></span>
                <b>{s.fig}</b>
                <div className={`ph-bar ${s.st.k}`} aria-hidden="true"><i style={{ width: `${(s.st.k === "none" ? 0 : clamp(s.bar)) * 100}%` }} /></div>
                <span className="ph-ks">{s.sub}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="ph-today">
        <section className="ph-card ph-pad" aria-labelledby="ph-todo">
          <div className="ph-card-h">
            <b id="ph-todo">To get done</b>
            <span>{d.todos.length} today{d.overdue ? <> · <span className="ph-late">{d.overdue} overdue</span></> : ""}</span>
          </div>
          {d.todos.length ? d.todos.slice(0, 6).map((t) => (
            <Link key={t.id} href="/portal/todo" className="ph-td">
              <span className="ph-td-t">
                <b>{t.title}</b>
                {t.notes && <span>{t.notes}</span>}
              </span>
              <span className="ph-td-meta">
                {t.who && <span className="ph-who"><span className="ph-av" aria-hidden="true">{t.who.slice(0, 1).toUpperCase()}</span>{t.who}</span>}
                <span className={`ph-due${t.late ? " late" : ""}`}>{t.due}</span>
              </span>
            </Link>
          )) : <div className="ph-empty">Nothing due today.</div>}
          <Link href="/portal/todo" className="ph-more">All to-dos ›</Link>
        </section>

        <section className="ph-card ph-pad" aria-labelledby="ph-look">
          <div className="ph-card-h"><b id="ph-look">Look at today</b><span>most urgent first</span></div>
          {look.length ? look.map((l) => {
            const [what, ...rest] = l.text.split(" · ");
            return (
              <Link key={l.href + what} href={l.href} className="ph-row">
                <span className="ph-hn">{l.n}</span>
                <span className="ph-row-t"><b>{what}</b>{rest.length > 0 && <span>{rest.join(" · ")}</span>}</span>
                <span className="ph-chev" aria-hidden="true">›</span>
              </Link>
            );
          }) : <div className="ph-empty">All clear.</div>}
        </section>
      </div>
    </div>
  );
}
