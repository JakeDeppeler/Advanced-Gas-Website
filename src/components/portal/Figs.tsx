import Link from "next/link";

/**
 * One figure: what it is, the number, one line under it, and where to go for
 * more. A figure we can't measure yet keeps its card and says what it needs —
 * a dash with a reason, never a zero nobody counted.
 */
export type Fig = {
  label: string;
  value: string | null;
  sub?: string;
  href?: string;
  /** 0–1: how far along a bar, when the figure has a target. */
  bar?: number | null;
  /** 0–1: where the target says we should be by now. */
  mark?: number | null;
  /** Drawn navy. One per row at most. */
  feature?: boolean;
  /** Shown instead of the value when it's null: what this needs to be measured. */
  needs?: string;
  /**
   * Where the figure comes from and the period it covers, in a few words:
   * "ServiceTitan · this month · ex GST". So nobody has to guess whether two
   * figures on two pages are the same thing.
   */
  from?: string;
  /** What adds up to it, shown under "What makes this up" for whoever wants to check it. */
  parts?: Array<{ label: string; value: string }>;
};

export function Figs({ items, cols = 3 }: { items: Fig[]; cols?: 2 | 3 | 4 }) {
  return (
    <div className={`pt-figs pt-figs--${cols}`}>
      {items.map((f) => {
        const body = (
          <>
            <span className="pt-fig__k">{f.label}</span>
            <strong className="pt-fig__v">{f.value ?? "—"}</strong>
            {f.bar != null && (
              <span className="pt-fig__bar" aria-hidden="true">
                <i style={{ width: `${Math.max(0, Math.min(1, f.bar)) * 100}%` }} />
                {f.mark != null && <b style={{ left: `${Math.max(0, Math.min(1, f.mark)) * 100}%` }} />}
              </span>
            )}
            <span className="pt-fig__sub">{f.value == null ? (f.needs ?? f.sub) : f.sub}</span>
            {f.from && f.value != null && <span className="pt-fig__from">{f.from}</span>}
          </>
        );
        const cls = `pt-fig${f.feature ? " is-feature" : ""}${f.value == null ? " is-unset" : ""}`;
        // A breakdown can't sit inside a link, so a figure with one keeps its
        // link as a line of its own at the foot.
        if (f.parts?.length && f.value != null) {
          return (
            <div key={f.label} className={`${cls} has-parts`}>
              {body}
              <details className="pt-fig__parts">
                <summary>What makes this up</summary>
                <dl>{f.parts.map((x) => <div key={x.label}><dt>{x.label}</dt><dd>{x.value}</dd></div>)}</dl>
              </details>
              {f.href && <Link href={f.href} className="pt-fig__more">Open →</Link>}
            </div>
          );
        }
        return f.href ? (
          <Link key={f.label} href={f.href} className={cls}>{body}<span className="pt-fig__go" aria-hidden="true">→</span></Link>
        ) : (
          <div key={f.label} className={cls}>{body}</div>
        );
      })}
    </div>
  );
}

/** "a minute ago", "3 hours ago" — how old the board's figures are. */
export function ago(iso: string | null | undefined): string {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 2) return "a minute ago";
  if (mins < 60) return `${mins} minutes ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}
