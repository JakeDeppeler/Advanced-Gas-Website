import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The opening of every commercial page that is not the front one.
 *
 * Same navy, same photograph treatment and same type as the front page's
 * hero, at about half the height and without the crane — a reader who is on
 * "What we do" has already been sold the company and is here for the detail.
 *
 * The one thing it adds is the way back. These four pages are branches off
 * `/commercial`, and the site header does not say so; a builder who arrived
 * on the capability statement from a search result has no other way of
 * knowing there is a section above it.
 */

export function CxSubHero({
  eyebrow,
  title,
  lede,
  photo = "/comm/roof-run.jpg",
}: {
  eyebrow: string;
  title: ReactNode;
  lede: ReactNode;
  photo?: string;
}) {
  return (
    <section className="cx-subhero">
      <div className="cx-subhero__bg" aria-hidden="true">
        <Image src={photo} alt="" fill sizes="100vw" priority />
      </div>
      <div className="wrap">
        <Link href="/commercial" className="cx-back">← Commercial</Link>
        <span className="cx-eye cx-eye--sky">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="cx-subhero__lede">{lede}</p>
      </div>
    </section>
  );
}
