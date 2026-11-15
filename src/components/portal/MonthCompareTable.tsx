import Link from "next/link";
import { Bad, Card, Good, Pill, Say, type Status } from "@/components/portal/kit/Kit";
import type { MonthCompare, MonthFigures } from "@/lib/portal/run/monthCompare";
import { clock } from "@/lib/portal/hours/dayShape";

type Fmt = "money" | "count" | "pct" | "hrs" | "clock";

/**
 * One KPI across the three spans. `total` compares this month so far with
 * last month to the same point; `rate` compares with all of last month,
 * because a rate doesn't grow with the days and the whole month is the
 * steadier figure. `up` is whether more is better.
 */
type Line = {
  name: string;
  means: string;
  get: (f: MonthFigures) => number | null;
  fmt: Fmt;
  kind: "total" | "rate";
  up: boolean;
  href: string;
  /** How to improve it: `worse` when it's gone backwards, `steady` otherwise. */
  worse: string;
  steady: string;
};

const LINES: Line[] = [
  { name: "Sold", means: "Work customers said yes to", get: (f) => f.sold, fmt: "money", kind: "total", up: true, href: "/portal/sales",
    worse: "Most of the gap is sitting in quotes already out. Work Follow up today in the pipeline every morning, and ring the biggest quiet quotes yourself.",
    steady: "Keep the follow-up going: every quote rung on day 2, then four days later, then a week after." },
  { name: "Quoted", means: "Each quote once, at the average of its options", get: (f) => f.quoted, fmt: "money", kind: "total", up: true, href: "/portal/pipeline",
    worse: "Fewer quotes are going out. Book quote visits within two days of the enquiry, and send the quote the day of the visit, not later in the week.",
    steady: "Send every quote the day of the visit, while the customer still remembers the tech." },
  { name: "Quotes sent", means: "How many quotes went out", get: (f) => f.quotedJobs, fmt: "count", kind: "total", up: true, href: "/portal/pipeline",
    worse: "Every enquiry rung within 5 minutes and booked the same day is the fastest way to more quotes. Check the leads that never got a visit.",
    steady: "Ring every enquiry within 5 minutes and book the visit on the call." },
  { name: "Win rate", means: "Sold jobs for every quote sent", get: (f) => f.winRate, fmt: "pct", kind: "rate", up: true, href: "/portal/pipeline/lost",
    worse: "Ring every quote on day 2, give a good, better and best on installs, and read the Lost reasons each week: mostly price means the pricebook, mostly no response means the follow-up.",
    steady: "Give options on every install quote. The customer picks between ours instead of between us and someone else." },
  { name: "Average job", means: "What a sold job is worth", get: (f) => f.avgJob, fmt: "money", kind: "rate", up: true, href: "/portal/sales",
    worse: "Quote a better and a best beside the basic option, and price the extras on the quote rather than leaving them for the day.",
    steady: "Keep quoting options: the better option is where the average job grows." },
  { name: "Followed up in 2 days", means: "Quotes rung, texted or sold within two days", get: (f) => f.followup, fmt: "pct", kind: "rate", up: true, href: "/portal/pipeline",
    worse: "Work the Follow up today column first thing, and log every call, no answer included, so the board books the next one.",
    steady: "Log every call on the quote so nothing slips past day 2." },
  { name: "Enquiries", means: "Website and email enquiries", get: (f) => f.leads, fmt: "count", kind: "total", up: true, href: "/portal/leads",
    worse: "Open Leads to see which source dropped. Ask every finished job for a Google review, and keep the ads running through quiet weeks.",
    steady: "Ask every finished job for a Google review: it's what the next customer reads." },
  { name: "Booked", means: "New work into the diary: quote visits, services, breakdowns, repairs", get: (f) => f.booked, fmt: "count", kind: "total", up: true, href: "/portal/today",
    worse: "Answer every call live, ring back a missed one straight away, and book the job on the call rather than calling back with a time.",
    steady: "Book on the call. A customer told \"we'll ring you back with a time\" rings someone else." },
  { name: "Jobs done", means: "Jobs finished", get: (f) => f.jobsDone, fmt: "count", kind: "total", up: true, href: "/portal/jobs",
    worse: "Fill the days: first job by 7:30, jobs booked close together, parts picked up the afternoon before.",
    steady: "Keep the days full and close together." },
  { name: "Invoiced", means: "Everything billed, with GST", get: (f) => f.invoiced, fmt: "money", kind: "total", up: true, href: "/portal/jobs?tab=notbilled",
    worse: "Clear Not billed oldest first, and invoice the visit the same day the tech marks it done.",
    steady: "Invoice the same day the job's done, every time." },
  { name: "Job margin", means: "Left from each job after parts and hours", get: (f) => f.margin, fmt: "pct", kind: "rate", up: true, href: "/portal/profit",
    worse: "Open Profit on every job worst first. Hours over the quote, parts not billed and pricebook prices that are too low are the three usual causes.",
    steady: "Check the worst five jobs each week and fix the pricebook item behind each." },
  { name: "Jobs that lost money", means: "Costed jobs that paid less than their parts and hours", get: (f) => f.losing, fmt: "count", kind: "total", up: false, href: "/portal/profit",
    worse: "For each one: more hours than quoted, parts used and not billed, or a price too low. Change the price or the hours on that pricebook item so it doesn't happen again.",
    steady: "Keep looking at each one the week it happens." },
  { name: "On site a day", means: "Hours on jobs per tech per weekday, from the clock-ins", get: (f) => f.onSite, fmt: "hrs", kind: "rate", up: true, href: "/portal/hours",
    worse: "First job by 7:30, the van loaded and the parts picked up the afternoon before, and each tech's jobs booked close together.",
    steady: "Hold the first job at 7:30 and keep the jobs close together." },
  { name: "First job of the day", means: "When the first job is dispatched, on average", get: (f) => f.start, fmt: "clock", kind: "rate", up: false, href: "/portal/hours",
    worse: "Load the van the afternoon before and have the supplier deliver to site, so the morning starts at the first job, not at the supplier.",
    steady: "Keep the first job at or before 7:30." },
];

function fmt(v: number | null, f: Fmt): string {
  if (v == null) return "—";
  if (f === "money") return `$${Math.round(v).toLocaleString("en-AU")}`;
  if (f === "pct") return `${Math.round(v * 100)}%`;
  if (f === "hrs") return `${v.toFixed(1)} hrs`;
  if (f === "clock") return clock(v);
  return Math.round(v).toLocaleString("en-AU");
}

/** The change, in the KPI's own units, with its sign written out. */
function change(a: number | null, b: number | null, f: Fmt): string {
  if (a == null || b == null) return "";
  const d = a - b;
  if (Math.abs(d) < 1e-9) return "No change";
  if (f === "pct") return `${d >= 0 ? "+" : "−"}${Math.abs(Math.round(d * 100))} pts`;
  if (f === "hrs") return `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(1)} hrs`;
  if (f === "clock") return `${Math.abs(Math.round(d * 60))} min ${d >= 0 ? "later" : "earlier"}`;
  const pct = b !== 0 ? ` (${d >= 0 ? "+" : "−"}${Math.abs(Math.round((d / b) * 100))}%)` : "";
  return `${d >= 0 ? "+" : "−"}${f === "money" ? `$${Math.abs(Math.round(d)).toLocaleString("en-AU")}` : Math.abs(Math.round(d)).toLocaleString("en-AU")}${pct}`;
}

/** Better, worse or about the same: within 3% (or 2 points, or 10 minutes) is the same. */
function verdict(l: Line, a: number | null, b: number | null): Status {
  if (a == null || b == null) return { k: "none", w: "No comparison" };
  const d = a - b;
  const small = l.fmt === "pct" ? Math.abs(d) < 0.02 : l.fmt === "clock" ? Math.abs(d) < 1 / 6 : l.fmt === "hrs" ? Math.abs(d) < 0.15 : Math.abs(d) <= Math.max(Math.abs(b) * 0.03, l.fmt === "count" ? 0.5 : 0);
  if (small) return { k: "none", w: "About the same" };
  return (d > 0) === l.up ? { k: "good", w: "Better" } : { k: "bad", w: "Worse" };
}

const dayWord = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Our KPIs › This month vs last: every number we're measured by, this month
 * so far beside last month at the same point and all of last month, and
 * under each one what to do about it. The verdict is written on the pill, so
 * the colour is never the only signal.
 */
export function MonthCompareTable({ c }: { c: MonthCompare }) {
  const rows = LINES.map((l) => {
    const now = l.get(c.now), same = l.get(c.same), last = l.get(c.last);
    const base = l.kind === "total" ? same : last;
    return { l, now, same, last, base, v: verdict(l, now, base) };
  });
  const worse = rows.filter((r) => r.v.k === "bad"), better = rows.filter((r) => r.v.k === "good");
  const names = (xs: typeof rows) => {
    const n = xs.map((r) => r.l.name.toLowerCase());
    return n.length < 2 ? n.join("") : `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`;
  };
  const sameTo = dayWord(c.same.to);

  return (
    <>
      <Say>
        {better.length > 0 && <Good>{better.length} better than {c.lastName}</Good>}
        {better.length > 0 && worse.length > 0 && "; "}
        {worse.length > 0 && <Bad>{worse.length} worse: {names(worse)}</Bad>}
        {!better.length && !worse.length && <>Much the same as {c.lastName} so far</>}
        {". "}Running totals are set against {c.lastName} up to {sameTo}; rates against the whole of {c.lastName}.
      </Say>
      <Card title={`${c.monthName} against ${c.lastName}`}>
        <div className="pk-tbl-wrap">
          <table className="pk-tbl kc-t">
            <thead>
              <tr>
                <th scope="col">What</th>
                <th scope="col">{c.monthName} so far</th>
                <th scope="col">{c.lastName} to {sameTo}</th>
                <th scope="col">Change</th>
                <th scope="col">All of {c.lastName}</th>
              </tr>
            </thead>
            {rows.map(({ l, now, same, last, base, v }) => (
              <tbody key={l.name} className="kc-kpi">
                <tr>
                  <th scope="row"><Link href={l.href}>{l.name}</Link><span>{l.means}</span></th>
                  <td data-l={`${c.monthName} so far`}><b>{fmt(now, l.fmt)}</b></td>
                  <td data-l={`${c.lastName} to ${sameTo}`} className={l.kind === "total" ? "kc-base" : undefined}>{l.kind === "total" ? fmt(same, l.fmt) : <span className="kc-dim">{fmt(same, l.fmt)}</span>}</td>
                  <td data-l="Change" className="kc-v"><span className="kc-chg">{change(now, base, l.fmt)}</span><Pill st={v} /></td>
                  <td data-l={`All of ${c.lastName}`} className={l.kind === "rate" ? "kc-base" : undefined}>{l.kind === "rate" ? fmt(last, l.fmt) : <span className="kc-dim">{fmt(last, l.fmt)}</span>}</td>
                </tr>
                <tr className="kc-tip">
                  <td colSpan={5}><b>{v.k === "bad" ? "To improve:" : "To keep it there:"}</b> {v.k === "bad" ? l.worse : l.steady}</td>
                </tr>
              </tbody>
            ))}
          </table>
        </div>
        <p className="pk-note" style={{ marginTop: 10 }}>
          Every figure is worked out the same way for each span, from ServiceTitan&rsquo;s own records. The figure each change is measured against is in bold type: last month to the same day for running totals, all of last month for rates. A rate with too few jobs behind it shows a dash rather than a number that would swing on one job.
        </p>
      </Card>
    </>
  );
}
