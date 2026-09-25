import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The opening of every commercial page that is not the front one.
 *
 * Same navy, same photograph treatment and same type as the front page's
 * hero, and about half its height — a reader who is on "What we do" has
 * already been sold the company and is here for the detail.
 *
 * Two things it always carries. A breadcrumb, because these are branches off
 * /commercial and the site header does not say so; somebody who arrived on
 * the capability statement from a search result has no other way of knowing
 * there is a section above it. And a photograph at 28% under a navy
 * gradient, so the band is a place rather than a coloured box.
 *
 * `aside` puts something beside the words — the building schematic, the
 * capability document. Without it the hero is one column and the lede is
 * allowed to run wider.
 */

export function CxSubHero({
  eyebrow,
  title,
  lede,
  crumb,
  photo,
  ctas,
  stats,
  aside,
  over = false,
  lit = false,
}: {
  eyebrow: string;
  title: ReactNode;
  lede: ReactNode;
  /** The last breadcrumb, which is this page. */
  crumb: string;
  photo?: string;
  ctas?: ReactNode;
  stats?: ReactNode;
  aside?: ReactNode;
  /** Leaves room for a card to overlap the bottom of the hero. */
  over?: boolean;
  /** A brighter photograph, for the one hero whose image is the subject. */
  lit?: boolean;
}) {
  return (
    <section
      className={`cx-subhero${aside ? "" : " cx-subhero--solo"}${over ? " cx-subhero--over" : ""}${lit ? " cx-subhero--lit" : ""}`}
    >
      {photo && (
        <div className="cx-subhero__bg" aria-hidden="true">
          <Image src={photo} alt="" fill sizes="100vw" priority />
        </div>
      )}
      <div className="wrap">
        <p className="cx-crumbs">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/commercial">Business &amp; commercial</Link>
          <span aria-hidden="true">/</span>
          <b>{crumb}</b>
        </p>

        <div className="cx-subhero__grid">
          <div>
            <span className="cx-eye cx-eye--sky">{eyebrow}</span>
            <h1>{title}</h1>
            <p className="cx-subhero__lede">{lede}</p>
            {ctas && <div className="cx-hero__cta" data-hide-sticky-cta>{ctas}</div>}
            {stats}
          </div>
          {aside}
        </div>
      </div>
    </section>
  );
}
