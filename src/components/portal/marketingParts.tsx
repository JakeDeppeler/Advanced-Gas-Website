import Link from "next/link";

/**
 * The three shapes every Marketing tab is built from.
 *
 * Here rather than in the page so each tab reads as what it says rather than
 * as another eighty lines of the same markup — and so a change to how a bar
 * or a head looks lands on all nine at once.
 */

/** The row of figures across the top of a tab. The first one is the feature. */
export function Heads({
  items,
}: {
  items: { label: string; value: string; sub?: string; feature?: boolean }[];
}) {
  return (
    <div className="pt-mkheads">
      {items.map((i) => (
        <div key={i.label} className={`pt-mkhead${i.feature ? " is-feature" : ""}`}>
          <span className="pt-mkhead__k">{i.label}</span>
          <strong className="pt-mkhead__v">{i.value}</strong>
          {i.sub && <span className="pt-mkhead__sub">{i.sub}</span>}
        </div>
      ))}
    </div>
  );
}

/**
 * A list of labelled bars, scaled to the biggest.
 *
 * The count sits at the end of every row, so the bar is the comparison and the
 * number is the fact — a bar alone makes the reader estimate, which on a small
 * count like six is worse than useless.
 */
export function Bars({
  title, rows, empty,
}: {
  title?: string;
  rows: { label: string; n: number }[];
  empty: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <section className={title ? "pt-panel" : ""}>
      {title && <h2 className="pt-panel__h">{title}</h2>}
      {rows.length === 0 ? (
        <p className="pt-rep__empty">{empty}</p>
      ) : (
        <div className="pt-bars">
          {rows.map((r) => (
            <div className="pt-bar" key={r.label}>
              <span className="pt-bar__k">{r.label}</span>
              <span className="pt-bar__track">
                {/* A floor of 2%, so a row with one of something is still a
                    mark rather than an empty track reading as nothing. */}
                <span className="pt-bar__fill" style={{ width: `${Math.max(2, (r.n / max) * 100)}%` }} />
              </span>
              <strong className="pt-bar__n">{r.n}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * A tab that cannot be built yet, saying exactly what it needs.
 *
 * Not a "coming soon" — a list of the specific things that have to exist, so
 * the page is a decision waiting to be made rather than a promise. Drawing the
 * chart with invented numbers was the alternative, and a wall chart nobody can
 * trace to a source is how a dashboard stops being looked at.
 */
export function Needs({
  title, body, bullets, alt,
}: {
  title: string;
  body: string;
  bullets?: string[];
  alt?: { href: string; label: string };
}) {
  return (
    <section className="pt-panel pt-needs">
      <h2 className="pt-panel__h">{title}</h2>
      <p className="pt-panel__sub">{body}</p>
      {bullets && (
        <ul className="pt-needs__list">
          {bullets.map((b) => <li key={b}>{b}</li>)}
        </ul>
      )}
      {alt && <Link href={alt.href} className="pt-btn pt-btn--orange pt-needs__alt">{alt.label}</Link>}
    </section>
  );
}
