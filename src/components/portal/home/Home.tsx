import Link from "next/link";
import { Suspense } from "react";
import { JobMargins, MarginKpi, MarginKpiPending } from "@/components/portal/home/JobMargins";
import type { CrewNow } from "@/lib/portal/home/crewNow";
import type { TeamRow } from "@/components/portal/home/Overview";
import type { Metrics } from "@/lib/dashboard/metrics";
import type { YearGoal } from "@/lib/portal/yearGoal";
import type { NeedLine } from "@/lib/portal/needs";
import { money } from "@/lib/portal/format";
import type { Overview as OverviewData } from "@/lib/portal/home/overview";
import { Overview, type HomeTodo } from "./Overview";

export type { HomeTodo };

type Tone = "good" | "mid" | "bad" | "none";
type Status = { k: Tone; w: string };

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

const n0 = (n: number) => Math.round(n).toLocaleString("en-AU");
const pc = (n: number, dp = 0) => `${n.toFixed(dp)}%`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

type Stat = { key: string; name: string; st: Status; fig: string; bar: number; sub: string; href: string };

export type HomeData = {
  first: string;
  when: string;
  month: string;
  /** Working day of the month, and how many it has. */
  day: { n: number; of: number } | null;
  /** Sees the money: the month bar. */
  office: boolean;
  m: Metrics | null;
  goal: YearGoal | null;
  todos: HomeTodo[];
  /** Flagged important on To-do, most urgent first: beside the overview's chart. */
  important: HomeTodo[];
  overdue: number;
  /** What to look at today. A promise for the office: its counts are the slowest reads on the page. */
  lines: NeedLine[] | Promise<NeedLine[]>;
  denied: boolean;
  /** The office's sales overview, in the Rapport layout. Null for the crew. */
  ov: { data: OverviewData; span: 6 | 12; closeRate: number | null; yearInvoiced: number | null; yearGoal: number | null; yearFloor: number | null; daysLeft: number | null; yearByNow?: number | null; team?: TeamRow[]; crew?: CrewNow[] | null } | null;
};

/**
 * Home, to the prototype: a welcome with the day in one sentence, then what
 * to get done and what to look at. The office's has the sales overview on
 * top, with the important to-dos beside its chart.
 *
 * Every figure is one another page shows too, read from the same snapshot,
 * so Home can't tell a different story from the page it links to. The month
 * strip under the overview ("October so far") went: the overview's figures
 * already say how the month's going, and it cost a Xero read on every visit.
 */
/** The month's figures for the welcome's one sentence: sold, jobs done, owed. */
function monthStats(d: HomeData): Stat[] {
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
    : { key: "sold", name: "Sold", st: mo?.soldValue != null ? noPace : { k: "none", w: "No figures" }, fig: mo?.soldValue != null ? money(mo.soldValue) : "", bar: 0, sub: mo?.soldValue != null ? (d.goal ? "sold this month" : "set a year goal for a pace") : "waiting on the first sync", href: "/portal/sales" };

  const done = st?.completed ?? null;
  const jobs: Stat = done?.done != null && done.byNow
    ? { key: "jobs", name: "Jobs done", st: status(done.done, done.byNow), fig: n0(done.done), bar: done.done / done.byNow, sub: `of ${n0(done.byNow)} by now`, href: "/portal/jobs" }
    : { key: "jobs", name: "Jobs done", st: mo?.completed != null ? noPace : { k: "none", w: "No figures" }, fig: mo?.completed != null ? n0(mo.completed) : "", bar: 0, sub: "this month", href: "/portal/jobs" };

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
    : { key: "owed", name: "Owed, overdue", st: { k: "none", w: "No figures" }, fig: "", bar: 0, sub: "needs Xero connected", href: "/portal/money" };

  return [sell, jobs, owed];
}

/** Look at today, drawn once its counts are in. */
async function LookToday({ lines }: { lines: NeedLine[] | Promise<NeedLine[]> }) {
  const look = await Promise.resolve(lines).catch(() => [] as NeedLine[]);
  return (
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
  );
}

/** Stand-ins while a streamed part comes in: the card's shape, so nothing jumps. */
const Pending = ({ label, tall }: { label: string; tall?: boolean }) => (
  <section className={`ph-card ph-pad ph-pending${tall ? " tall" : ""}`} aria-busy="true" aria-label={label}>
    <div className="ph-card-h"><b>{label}</b></div>
    <span className="ld-b" /><span className="ld-b" /><span className="ld-b" />
  </section>
);

export function Home(d: HomeData) {
  const { month } = d;
  // Only resolved here for the crew, whose lines are cheap and were awaited.
  const look = Array.isArray(d.lines) ? d.lines : null;
  const stats = monthStats(d);
  const onTrack = stats.filter((s) => s.st.k === "good").length;
  const measured = stats.filter((s) => s.st.k !== "none").length;

  return (
    <div className="ph">
      {d.denied && <div className="ph-note"><b>That page isn’t open to you.</b> Ask an admin if you think it should be.</div>}

      {d.ov && (
        <Overview ov={d.ov.data} span={d.ov.span} first={d.first} when={d.when} closeRate={d.ov.closeRate}
          margin={<Suspense fallback={<MarginKpiPending />}><MarginKpi target={d.goal?.profitPct ?? null} /></Suspense>}
          yearInvoiced={d.ov.yearInvoiced} yearGoal={d.ov.yearGoal} yearFloor={d.ov.yearFloor} daysLeft={d.ov.daysLeft} yearByNow={d.ov.yearByNow ?? null} team={d.ov.team ?? []} crew={d.ov.crew ?? null}
          important={d.important} />
      )}
      {/* Its own stream: costing jobs is the slowest read on the page, and the rest needn't wait for it. */}
      {d.ov && <Suspense fallback={null}><JobMargins target={d.goal?.profitPct ?? null} /></Suspense>}

      {!d.ov && <div className="ph-welcome">
        <div>
          <h1>G’day {d.first}.</h1>
          <div className="ph-sub">{d.when}</div>
        </div>
        <p className="ph-say">
          {d.office && (measured
            ? <>{month} is <b>{onTrack} of {measured} on track</b>{d.day ? `, day ${d.day.n} of ${d.day.of}` : ""}. </>
            : <>{month}’s figures aren’t in yet. </>)}
          {plural(d.todos.length, "to-do")} to get done{look ? <> and {plural(look.length, "thing")} to look at today</> : null}.
        </p>
      </div>}

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

        <Suspense fallback={<Pending label="Look at today" tall />}><LookToday lines={d.lines} /></Suspense>
      </div>
    </div>
  );
}
