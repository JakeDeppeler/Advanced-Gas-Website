import type { SystemSpotlight as Spotlight } from "@/lib/systemDetail";

/**
 * The one section that makes a system page about that system.
 *
 * Four layouts, picked per system in lib/systemDetail.ts, because the
 * arguments genuinely have different shapes. Zoning is a sequence, so it
 * gets numbered steps. Evap versus refrigerated is a comparison, so it
 * gets two columns. Where a split head goes is a set of independent
 * considerations, so it gets cards. Using one card grid for all of them
 * is how ten pages ended up looking like one page.
 *
 * `table` rows encode both cells in `d`, split on "||" — the alternative
 * was a second field that only one layout ever used.
 */

export function SystemSpotlight({ spotlight }: { spotlight: Spotlight }) {
  const { eyebrow, heading, blurb, layout, items, columns, photo, note } = spotlight;

  return (
    <section className={`sysspot sysspot--${layout}`}>
      <div className="wrap">
        <div className="ds-section-head ds-section-head--hl">
          <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> {eyebrow}</span>
          <h2>{heading}</h2>
          {blurb && <p>{blurb}</p>}
        </div>

        {layout === "cards" && (
          <div className="sysspot__cards">
            {items.map((it) => (
              <article className="sysspot__card" key={it.t}>
                <h3>{it.t}</h3>
                <p>{it.d}</p>
              </article>
            ))}
          </div>
        )}

        {layout === "steps" && (
          <ol className="sysspot__steps">
            {items.map((it, i) => (
              <li key={it.t}>
                <span className="sysspot__n">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{it.t}</h3>
                  <p>{it.d}</p>
                </div>
              </li>
            ))}
          </ol>
        )}

        {layout === "split" && (
          <div className="sysspot__split">
            {photo && (
              <div className="sysspot__photo">
                <img src={photo.src} alt={photo.alt} loading="lazy" width="600" height="600" />
              </div>
            )}
            <ul className="sysspot__list">
              {items.map((it) => (
                <li key={it.t}>
                  <strong>{it.t}</strong>
                  <span>{it.d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {layout === "table" && (
          <div className="sysspot__tablewrap">
            <table className="sysspot__table">
              <thead>
                <tr>
                  <th />
                  <th>{columns?.[0]}</th>
                  <th>{columns?.[1]}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const [a, b] = it.d.split("||").map((x) => x.trim());
                  return (
                    <tr key={it.t}>
                      <th scope="row">{it.t}</th>
                      <td>{a}</td>
                      <td>{b}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {note && <p className="sysspot__note">{note}</p>}
      </div>
    </section>
  );
}
