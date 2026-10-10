import type { PLDetail, PLLine } from "@/lib/portal/xero";

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
export function KpiStack({ detail, label }: { detail: PLDetail; label: string }) {
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
  const gmH: Health = gm >= 0.4 ? "good" : gm >= 0.3 ? "watch" : "low";
  const ohH: Health = ohp <= 0.25 ? "good" : ohp <= 0.35 ? "watch" : "low";
  const npH: Health = np >= 0.15 ? "good" : np >= 0.08 ? "watch" : "low";
  const adminInCogs = cogsLines.filter((l) => /admin|office|director/i.test(l.label));

  const Row = ({ k, name, amount, of, health, aim, items, total, note, highIsBad }: {
    k: string; name: string; amount: number; of: number; health?: Health; aim?: string; items?: PLLine[]; total?: boolean; note?: string;
    /** For a cost: the bad end is too much, not too little. */
    highIsBad?: boolean;
  }) => {
    const word = health === "low" && highIsBad ? "Too high" : health ? HEALTH[health].word : "";
    const icon = health === "low" && highIsBad ? "▲" : health ? HEALTH[health].icon : "";
    const head = (
      <>
        <span className="pt-kpi__name">{name}{aim && <em>{aim}</em>}</span>
        <span className="pt-kpi__bar" aria-hidden="true"><i style={{ width: `${Math.min(100, Math.max(0, Math.abs(of) * 100))}%` }} className={of < 0 ? "is-neg" : undefined} /></span>
        <strong className="pt-kpi__amt">{m0(amount)}</strong>
        <span className="pt-kpi__pc">{pc(of)}</span>
        <span className={`pt-kpi__health${health ? ` is-${health}` : ""}`}>{health ? <><b aria-hidden="true">{icon}</b> {word}</> : ""}</span>
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
      <div className="pt-kpi__head" aria-hidden="true"><span /><span /><span>$</span><span>% of revenue</span><span>How it&rsquo;s going</span></div>
      <Row k="rev" name="Revenue" amount={revenue} of={1} items={revLines} />
      <Row k="cogs" name="Cost of goods sold" aim="parts, equipment, subbies and field wages" amount={cogs} of={share(cogs)} items={cogsLines}
        note={adminInCogs.length ? `${adminInCogs.map((l) => l.label).join(" and ")} ${adminInCogs.length === 1 ? "is" : "are"} filed in cost of sales in Xero. Most businesses put office wages in overheads; moved there, gross margin would read ${pc(share(gp + sum(adminInCogs)))}.` : undefined} />
      <Row k="gp" name="Gross margin" aim="aim for 40%+" amount={gp} of={gm} health={gmH} total />
      <Row k="oh" name="Overheads" aim="aim for 25% or less" amount={overheads} of={ohp} health={ohH} highIsBad items={ohLines} />
      {Math.abs(other) > 0.5 && <Row k="other" name="Other income" aim="grants, incentives, contributions" amount={other} of={share(other)} items={otherLines} />}
      <Row k="np" name="Net profit" aim="aim for 15%+" amount={net} of={np} health={net < 0 ? "low" : npH} total />
    </section>
  );
}
