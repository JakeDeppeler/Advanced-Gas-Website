import Link from "next/link";

/**
 * "See the full range" — brand buttons that go to the brand page.
 *
 * Replaces the brand-pods block, which was a paragraph of prose per
 * brand sitting on a page somebody had already decided to read about a
 * service, not a brand. What they actually want at that point is a door
 * to the models: Mitsubishi Electric, Kaden, whichever — one press each.
 *
 * Server component: nothing here is interactive beyond the links.
 */
export function RangeBand({
  eyebrow = "The range",
  heading,
  blurb,
  brands,
}: {
  eyebrow?: string;
  heading: string;
  blurb?: string;
  brands: { brand: string; href?: string; reason?: string }[];
}) {
  const linked = brands.filter((b) => b.href);

  return (
    <section className="rangeband">
      <div className="wrap">
        <div className="ds-section-head">
          <span className="ds-eyebrow ds-eyebrow--on-dark">
            <span className="ds-dot ds-dot--orange" /> {eyebrow}
          </span>
          <h2 className="ds-h--on-dark">{heading}</h2>
          {blurb && <p className="rangeband__lede">{blurb}</p>}
        </div>
        {linked.length > 0 && (
        <div className="rangeband__row">
          {linked.map((b) => (
            <Link key={b.brand} href={b.href!} className="rangeband__btn">
              <span className="rangeband__name">{b.brand}</span>
              {b.reason && <span className="rangeband__why">{b.reason}</span>}
              <span className="rangeband__go" aria-hidden="true">
                See the full range →
              </span>
            </Link>
          ))}
        </div>
        )}
        <div className="rangeband__all">
          <Link href="/range" className="ds-btn ds-btn--orange ds-btn--lg">
            See the full range →
          </Link>
          <span>Every model we install — filter by brand, system type or rebate.</span>
        </div>
      </div>
    </section>
  );
}
