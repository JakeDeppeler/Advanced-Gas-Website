import Link from "next/link";
import type { ReactNode } from "react";
import { BkMotion } from "../brand/BkMotion";
import "../brand/blocks.css";
import "./service.css";

/**
 * The product pages' bands, for the inside pages that are built from
 * optional parts: the service pages and the suburb pages (Jake, Nov 2026:
 * they should all match the product pages).
 */

/** A heading with one part in colour, as the product and brand pages set them: the coloured part is in braces. */
export function accent(text: string) {
  return text.split(/[{}]/).map((part, i) => (i % 2 ? <span key={i}>{part}</span> : part));
}

/** Content headings carry no braces: colour the last word, as the product page's "How it works" does. */
export const lastWord = (h: string) => (/[{}]/.test(h) ? h : h.replace(/(\S+?)([.?!]?)$/, "{$1}$2"));

/** The product page's section head: the heading, and a line under it. */
export function BkHead({ h, children }: { h: string; children?: ReactNode }) {
  return (
    <header className="bk__head">
      <h2 className="h2">{accent(h)}</h2>
      {children && <p>{children}</p>}
    </header>
  );
}

/**
 * One full-width band of the page. These pages are built from optional
 * parts (one suburb has reviews, another doesn't), so the light bands are
 * toned white and cream in turn as they come, rather than fixed per section:
 * fixed tones put two creams together whenever the white between them was
 * missing. Navy bands are fixed, as they are on the product page.
 */
export type Band = { id?: string; tab?: string; navy?: boolean; cls?: string; body: ReactNode };

export function Bands({ list }: { list: Band[] }) {
  let k = 0;
  return (
    <>
      {list.map((b, i) => {
        const tone = b.navy ? "navy" : k++ % 2 ? "cream" : "white";
        return (
          <section key={b.id ?? i} className={`bk__sec bk__sec--${tone}`} id={b.id}>
            <div className="wrap"><div className={`bk__blk ${b.cls ?? "bk__col"}`}>{b.body}</div></div>
          </section>
        );
      })}
    </>
  );
}

/** The tabs under the hero, one per band that has one; none for a page too short to need them. */
export function Tabs({ list }: { list: Band[] }) {
  const tabs = list.filter((b) => b.id && b.tab);
  if (tabs.length < 3) return null;
  return (
    <nav className="pxt" aria-label="On this page">
      <div className="wrap pxt__in">{tabs.map((b) => <a key={b.id} href={`#${b.id}`}>{b.tab}</a>)}</div>
    </nav>
  );
}

/** The quote box every product page ends on. */
export function EndCta({ title, text = "A free site check, then one fixed price in writing. Six years on our workmanship.", from = "page-cta" }: { title: ReactNode; text?: ReactNode; from?: string }) {
  return (
    <section className="bk__sec bk__sec--white bk__sec--end">
      <div className="wrap">
        <div className="bk__box bk__box--acc bk__cta">
          <div>
            <h2 className="bk__boxh">{title}</h2>
            <p>{text}</p>
          </div>
          <div className="bxh__ctas">
            <Link href="/quote" className="abtn abtn--or abtn--flat">Get a free quote →</Link>
            <a href="tel:+61359478000" className="abtn abtn--line" data-call-from={from}>Call (03) 5947 8000</a>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The page root: .bk inside .ag, not on it, because the band styles are
 * written as ".ag .bk …", as the product page nests them. BkMotion brings
 * the cards in turn. The accent is the site's orange: these pages have no
 * brand colour of their own.
 */
export function BandPage({ children }: { children: ReactNode }) {
  return (
    <div className="ag ag--flat" data-no-reveal>
      <div className="bk svk" style={{ ["--acc" as string]: "#C2521A" }}>
        <BkMotion />
        {children}
      </div>
    </div>
  );
}
