import Link from "next/link";
import Image from "next/image";

/**
 * The two page openings this site has.
 *
 * There used to be ten. Every section of the site had been built as its own
 * thing, so `sv-hero`, `ab-hero`, `bl-hero`, `mb-hero`, `wf-hero`, `dp-hero`,
 * `hp-hero`, `brands-hub-hero` and `suburb-hero` all existed, each with its own
 * stylesheet and its own idea of what an opening looks like. Moving between two
 * pages meant crossing two visual identities, which is the single loudest
 * small-business signal a site can give.
 *
 * There are only two kinds of page here:
 *
 *   index  — routes or explains. No photograph: a list of things follows it
 *            immediately and a picture only delays the list.
 *   sell   — asks for a job. Copy one side, a photograph of our own work the
 *            other, and the figures that make the case underneath.
 *
 * Both share the ground, the type scale and the spacing, which is the part
 * that makes them read as one company.
 */

export type Crumb = { href?: string; label: string };
export type HeroFact = { v: string; k: string };

export function PageHero({
  variant = "index",
  eyebrow,
  title,
  sub,
  crumbs,
  chips,
  ctas,
  facts,
  photo,
  photoAlt,
  dot = "sky",
}: {
  variant?: "index" | "sell";
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  crumbs?: Crumb[];
  /** A row of jump links or filters, when the page has one. */
  chips?: React.ReactNode;
  ctas?: React.ReactNode;
  /** Four short pairs across the bottom. Sell pages, mostly. */
  facts?: HeroFact[];
  photo?: string;
  photoAlt?: string;
  dot?: "sky" | "orange";
}) {
  const sell = variant === "sell" && !!photo;

  const copy = (
    <div className="phero__copy">
      <span className="phero__eye">
        <span className={`ds-dot${dot === "orange" ? " ds-dot--orange" : ""}`} />
        {eyebrow}
      </span>
      <h1 className="phero__h1">{title}</h1>
      {sub && <p className="phero__sub">{sub}</p>}
      {ctas && <div className="phero__ctas">{ctas}</div>}
    </div>
  );

  return (
    <section className={`phero phero--${sell ? "sell" : "index"}`}>
      <div className="wrap">
        {crumbs && crumbs.length > 0 && (
          <nav className="phero__crumbs" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={c.label}>
                {i > 0 && <span className="sep">/</span>}
                {c.href ? <Link href={c.href}>{c.label}</Link> : <span className="cur">{c.label}</span>}
              </span>
            ))}
          </nav>
        )}

        {sell ? (
          <div className="phero__grid">
            {copy}
            <div className="phero__frame">
              <Image
                src={photo as string}
                alt={photoAlt ?? ""}
                fill
                sizes="(max-width: 980px) 100vw, 40vw"
                style={{ objectFit: "cover" }}
                priority
              />
            </div>
          </div>
        ) : (
          copy
        )}

        {chips && <div className="phero__chips">{chips}</div>}

        {facts && facts.length > 0 && (
          <ul className="phero__facts">
            {facts.map((f) => (
              <li key={f.k}>
                <strong>{f.v}</strong>
                <span>{f.k}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
