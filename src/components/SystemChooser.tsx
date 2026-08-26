import type { CSSProperties } from "react";
import Link from "next/link";

/**
 * Choose your system — the service-page version of the section the
 * filtration pages carry.
 *
 * "Systems we install" used to be a list of links here, which is what
 * the services mega, the range band and the sub-pages themselves already
 * are. A fourth list of the same links told nobody anything. This is the
 * same set of destinations as a set of products: the shot of the unit,
 * what it costs, which brands it comes in, and four things that are true
 * about it — so the choice between a split and a ducted gets made on the
 * page where it's live, rather than deferred to whichever link you happen
 * to click.
 *
 * Photo paths arrive resolved from the server. Cards are ordered the way
 * the data is, and the first one takes the orange outline: for every
 * service the lead system is the one we fit most.
 */

export type ChooserCard = {
  id: string;
  label: string;
  blurb: string;
  photo: string | null;
  photoAlt: string;
  /** A real scene fills the panel; a cut-out sits inside it. */
  photoScene: boolean;
  brands: string[];
  priceFrom?: string;
  /** A short claim, and the sentence that qualifies it. The tile faces
   *  are written as a pair — the claim alone loses the reason, the
   *  qualifier alone loses the subject — so the bullet carries both. */
  facts: { lead: string; note?: string }[];
  href: string;
  /** True on the system whose page this is. It keeps its card — being
   *  able to see the thing you're reading about next to the three you
   *  aren't is the whole point — but the card says so instead of
   *  offering a link back to itself. */
  current?: boolean;
};

export function SystemChooser({
  cards,
  heading,
  lede,
}: {
  cards: ChooserCard[];
  heading: string;
  lede?: string;
}) {
  if (cards.length === 0) return null;
  const cols = Math.min(cards.length, 4);

  return (
    <section className="dp-choose">
      <div className="wrap">
        <div className="ds-section-head">
          <span className="ds-eyebrow ds-eyebrow--on-dark">
            <span className="ds-dot" /> Choose your system
          </span>
          <h2 className="ds-h--on-dark">{heading}</h2>
          {lede && <p className="dp-choose__lede">{lede}</p>}
        </div>
        {/* Four systems as 3 + 1 leaves an orphan card with two empty
            columns beside it, so the count drives the columns. The class
            carries it as well as the custom property: React writes the
            inline style without a space (`--cols:2`), which an attribute
            selector written the readable way silently misses. */}
        <div className={`wf-styles__grid is-${cols}up`} style={{ "--cols": cols } as CSSProperties}>
          {cards.map((c, i) => (
            <article className={`wf-style${c.current ?? i === 0 ? " is-lead" : ""}`} key={c.id}>
              {c.photo && (
                <div className={`wf-style__photo${c.photoScene ? " is-scene" : ""}`}>
                  <img src={c.photo} alt={c.photoAlt} loading="lazy" width="600" height="450" />
                </div>
              )}
              <div className="wf-style__body">
                {c.priceFrom && <span className="wf-style__tier">{c.priceFrom}</span>}
                <h3>{c.label}</h3>
                {c.brands.length > 0 && (
                  <span className="wf-style__style">{c.brands.join(" · ")}</span>
                )}
                <p>{c.blurb}</p>
                <ul>
                  {c.facts.map((f) => (
                    <li key={f.lead}>
                      <strong>{f.lead}</strong>
                      {f.note && <> &mdash; {f.note}</>}
                    </li>
                  ))}
                </ul>
                {c.current ? (
                  <span className="wf-style__here">You&rsquo;re reading this one</span>
                ) : (
                  <Link className="wf-style__go" href={c.href}>
                    {/* Short on purpose. "The full detail on ducted
                        reverse-cycle air conditioning" wrapped to two lines
                        and pushed the arrow off on its own. */}
                    See the full detail
                    <span aria-hidden="true">→</span>
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
