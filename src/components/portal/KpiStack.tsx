import type { PLDetail, PLLine } from "@/lib/portal/xero";
import { BENCH, benchStatus } from "@/lib/portal/benchmarks";
import type { SpreadNote } from "@/lib/portal/run/spread";

const m0 = (n: number) => `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;
const pc = (n: number) => `${(n * 100).toFixed(1)}%`;

type Health = "good" | "watch" | "low";
const HEALTH: Record<Health, { word: string; icon: string }> = {
  good: { word: "Healthy", icon: "✓" },
  watch: { word: "Watch it", icon: "!" },
  low: { word: "Too low", icon: "▼" },
};

/**
 * The company's KPIs as one stack, top to bottom the way money moves: what
 * came in, what the work cost, what that left (gross margin), what running
 * the business cost (overheads), and the profit at the bottom — each as a
 * share of revenue, with a plain healthy / watch / too-low against a trade
 * business's usual targets, and a dropdown of what's in it.
 *
 * The benchmarks are rules of thumb for a trade business with its field wages
 * in cost of sales, as this one's books have them — a guide, not a verdict.
 */
export function KpiStack({ detail, label, aims, revenueGoal, spread }: {
  detail: PLDetail;
  label: string;
  /** The goals from Our numbers, as percentages. Left out, the usual 40 / 25 / 15. */
  aims?: { gm?: number | null; ovh?: number | null; np?: number | null };
  /**
   * What the year goal wants invoiced by now in this period. Margins can all
   * be healthy while the year slips: without enough revenue coming in, no
   * percentage gets us there, so revenue is judged against this.
   */
  revenueGoal?: { byNow: number; year: string } | null;
  /** Once-a-year bills spread across the year (run/spread.ts), to say so under overheads. */
  spread?: SpreadNote[];
}) {
  const aGm = (aims?.gm ?? 40) / 100, aOh = (aims?.ovh ?? 25) / 100, aNp = (aims?.np ?? 15) / 100;
  const isOther = (t: string) => /other income/i.test(t);
  const isCogs = (t: string) => /cost of (sales|goods)|direct cost/i.test(t);
  const lines = (pick: (title: string, kind: string) => boolean) =>
    detail.sections.filter((s) => s.kind !== "summary" && pick(s.title, s.kind)).flatMap((s) => s.lines).filter((l) => Math.abs(l.amount) > 0.5).sort((a, b) => b.amount - a.amount);

  const revLines = lines((t, k) => k === "in" && !isOther(t));
  const otherLines = lines((t, k) => k === "in" && isOther(t));
  const cogsLines = lines((t, k) => k === "out" && isCogs(t));
  const ohLines = lines((t, k) => k === "out" && !isCogs(t));
  const sum = (ls: PLLine[]) => ls.reduce((a, l) => a + l.amount, 0);
  const revenue = sum(revLines) || detail.income;
  const cogs = sum(cogsLines);
  const gp = revenue - cogs;
  const overheads = sum(ohLines);
  const other = sum(otherLines);
  const net = gp - overheads + other;
  if (!(revenue > 0)) return null;

  const share = (n: number) => n / revenue;
  const gm = share(gp), ohp = share(overheads), np = share(net);
  // Within ten points of the aim is one to watch; past that it's off.
  const gmH: Health = gm >= aGm ? "good" : gm >= aGm - 0.1 ? "watch" : "low";
  const ohH: Health = ohp <= aOh ? "good" : ohp <= aOh + 0.1 ? "watch" : "low";
  const npH: Health = np >= aNp ? "good" : np >= aNp / 2 ? "watch" : "low";
  const pcAim = (a: number) => `${Math.round(a * 100)}%`;
  // The fixed service-trade bands, beside our own goals: both, because a goal
  // can be set too soft and a benchmark doesn't know the year we're having.
  const bench = (k: "gm" | "ovh" | "np", v: number, lower = false): { health: Health; word: string } => {
    const b = benchStatus(k, v * 100, lower);
    return { health: b.k === "good" ? "good" : b.k === "mid" ? "watch" : "low", word: b.w };
  };
  const revH: Health | undefined = revenueGoal && revenueGoal.byNow > 0
    ? revenue >= revenueGoal.byNow ? "good" : revenue >= revenueGoal.byNow * 0.9 ? "watch" : "low"
    : undefined;
  const revWord = revH === "good" ? "On track" : revH === "watch" ? "A little behind" : revH === "low" ? "Behind" : "";
  const adminInCogs = cogsLines.filter((l) => /admin|office|director/i.test(l.label));

  const Row = ({ k, name, amount, of, health, aim, items, total, note, highIsBad, said, vs }: {
    k: string; name: string; amount: number; of: number; health?: Health; aim?: string; items?: PLLine[]; total?: boolean; note?: string;
    /** For a cost: the bad end is too much, not too little. */
    highIsBad?: boolean;
    /** The goal column's word, when it isn't the usual healthy / watch / too low. */
    said?: string;
    /** Against the service-trade benchmark. */
    vs?: { health: Health; word: string };
  }) => {
    const word = said ?? (health === "low" && highIsBad ? "Too high" : health ? HEALTH[health].word : "");
    const icon = health === "low" && highIsBad ? "▲" : health ? HEALTH[health].icon : "";
    const pill = (h: Health | undefined, w: string, i: string, title: string) => (
      <span className={`pt-kpi__health${h ? ` is-${h}` : ""}`} title={h ? title : undefined}>{h ? <><b aria-hidden="true">{i}</b> {w}</> : ""}</span>
    );
    const head = (
      <>
        <span className="pt-kpi__name">{name}{aim && <em>{aim}</em>}</span>
        <span className="pt-kpi__bar" aria-hidden="true"><i style={{ width: `${Math.min(100, Math.max(0, Math.abs(of) * 100))}%` }} className={of < 0 ? "is-neg" : undefined} /></span>
        <strong className="pt-kpi__amt">{m0(amount)}</strong>
        <span className="pt-kpi__pc">{pc(of)}</span>
        {pill(health, word, icon, "Against our goal")}
        {pill(vs?.health, vs?.word ?? "", vs ? HEALTH[vs.health].icon : "", "Against a healthy service trade")}
      </>
    );
    return items && items.length ? (
      <details className={`pt-kpi__row${total ? " is-total" : ""}`} id={`kpi-${k}`}>
        <summary>{head}</summary>
        <ul className="pt-kpi__lines">
          {items.map((l) => <li key={l.label}><span>{l.label}</span><strong>{m0(l.amount)}</strong><span>{pc(share(l.amount))}</span></li>)}
        </ul>
        {note && <p className="pt-kpi__note">{note}</p>}
      </details>
    ) : (
      <div className={`pt-kpi__row is-flat${total ? " is-total" : ""}`}>{head}</div>
    );
  };

  return (
    <section className="pt-panel pt-kpi" aria-labelledby="kpi-h">
      <h2 id="kpi-h" className="pt-panel__h">The company&rsquo;s KPIs · {label}</h2>
      <p className="pt-panel__sub">Top to bottom, the way the money moves. Every figure is a share of revenue. Open a line to see what&rsquo;s in it.</p>
      <div className="pt-kpi__head" aria-hidden="true"><span /><span /><span>$</span><span>% of revenue</span><span>Our goal</span><span>Benchmark</span></div>
      <Row k="rev" name="Revenue" aim={revenueGoal ? `goal by now ${m0(revenueGoal.byNow)} · from the ${revenueGoal.year} year` : undefined}
        amount={revenue} of={1} items={revLines} health={revH} said={revWord} />
      <Row k="cogs" name="Cost of goods sold" aim="parts, equipment, subbies and field wages" amount={cogs} of={share(cogs)} items={cogsLines}
        note={adminInCogs.length ? `${adminInCogs.map((l) => l.label).join(" and ")} ${adminInCogs.length === 1 ? "is" : "are"} filed in cost of sales in Xero. Most businesses put office wages in overheads; moved there, gross margin would read ${pc(share(gp + sum(adminInCogs)))}.` : undefined} />
      <Row k="gp" name="Gross margin" aim={`aim for ${pcAim(aGm)}+ · trade ${BENCH.gm.words}`} amount={gp} of={gm} health={gmH} total vs={bench("gm", gm)} />
      <Row k="oh" name="Overheads" aim={`aim for ${pcAim(aOh)} or less · trade ${BENCH.ovh.words}`} amount={overheads} of={ohp} health={ohH} highIsBad items={ohLines} vs={bench("ovh", ohp, true)}
        note={spread?.length ? `Once-a-year bills are spread across the year here, the way the hourly rate counts them: ${spread.map((x) => `${x.label} ${m0(x.counted)}${Math.abs(x.booked - x.counted) > 1 ? ` (${m0(x.booked)} booked in Xero)` : ""}`).join(", ")}. Xero itself is unchanged.` : undefined} />
      {Math.abs(other) > 0.5 && <Row k="other" name="Other income" aim="grants, incentives, contributions" amount={other} of={share(other)} items={otherLines} />}
      <Row k="np" name="Net profit" aim={`aim for ${pcAim(aNp)}+ · trade ${BENCH.np.words}`} amount={net} of={np} health={net < 0 ? "low" : npH} total vs={bench("np", np)} />
    </section>
  );
}
