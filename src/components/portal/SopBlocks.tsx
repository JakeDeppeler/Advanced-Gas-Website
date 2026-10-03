import type { SopBlock as SopBlockData } from "@/lib/portal/sops";

/** One part of a procedure: steps, a list, a table or a note. */
export function SopBlock({ b }: { b: SopBlockData }) {
  if (b.kind === "steps") {
    return (
      <div className="pt-sop__block">
        {b.title && <h4>{b.title}</h4>}
        <ol className="pt-sop__steps">{b.items.map((i) => <li key={i}>{i}</li>)}</ol>
      </div>
    );
  }
  if (b.kind === "list") {
    return (
      <div className="pt-sop__block">
        {b.title && <h4>{b.title}</h4>}
        <ul className="pt-sop__list">{b.items.map((i) => <li key={i}>{i}</li>)}</ul>
      </div>
    );
  }
  if (b.kind === "table") {
    return (
      <div className="pt-sop__block">
        {b.title && <h4>{b.title}</h4>}
        <div className="pt-sop__tablewrap">
          <table className="pt-sop__table">
            <thead><tr>{b.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{b.rows.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </div>
    );
  }
  return (
    <div className={`pt-sop__note${b.tone === "warn" ? " is-warn" : ""}`}>
      {b.title && <h4>{b.title}</h4>}
      <p>{b.body}</p>
    </div>
  );
}
