/**
 * Where people heard about us: one bar per campaign the office picked when
 * the job was booked, longest first. One series, so one colour and no legend;
 * the number and share sit beside each bar, and hovering a bar says it in full.
 */
export function HeardChart({ rows, month, named }: { rows: Array<{ label: string; n: number }>; month: string; named: boolean }) {
  const total = rows.reduce((t, r) => t + r.n, 0);
  const max = Math.max(1, ...rows.map((r) => r.n));
  const shown = rows.slice(0, 12);
  const rest = rows.slice(12).reduce((t, r) => t + r.n, 0);
  const list = rest ? [...shown, { label: "Everything else", n: rest }] : shown;
  return (
    <section className="pk-card pk-pad hc" aria-labelledby="hc-h">
      <header className="hc-h">
        <h2 id="hc-h">Where they heard about us</h2>
        <span>{total} {total === 1 ? "job" : "jobs"} booked in {month} · from the campaign picked on each job in ServiceTitan</span>
      </header>
      {total === 0 ? <p className="qp-empty">No jobs booked yet in {month}.</p> : (
        <ul className="hc-rows">
          {list.map((r) => {
            const pc = Math.round((r.n / total) * 100);
            return (
              <li key={r.label} title={`${r.label}: ${r.n} ${r.n === 1 ? "job" : "jobs"}, ${pc}% of ${month}`}>
                <span className="hc-l">{r.label}</span>
                <span className="hc-bar"><i style={{ width: `${(r.n / max) * 100}%` }} className={r.label === "Not recorded" ? "none" : undefined} /></span>
                <span className="hc-n"><b>{r.n}</b> {pc}%</span>
              </li>
            );
          })}
        </ul>
      )}
      {!named && total > 0 && <p className="qp-note">ServiceTitan&rsquo;s campaign names couldn&rsquo;t be read just now, so they show by number.</p>}
      {rows.some((r) => r.label === "Not recorded") && <p className="qp-note">&ldquo;Not recorded&rdquo; is a job booked without a campaign picked. Picking one on every booking is what makes this chart true.</p>}
    </section>
  );
}
