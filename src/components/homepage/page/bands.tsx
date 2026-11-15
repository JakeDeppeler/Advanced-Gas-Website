import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { PHOTO } from "@/lib/homepage/data";
import { site } from "@/lib/site";
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

/**
 * The quote box the inside pages end on: the homepage's closing box, the
 * team with the vans behind the site's orange (Jake, Nov 2026: "like the
 * home page, with us as the background"). Category, service, tool, rebate,
 * blog and search pages all end on this one. The brand and product pages
 * keep their own box, which carries the maker's logo.
 */
export function EndCta({ title, text = "A free site check, then one fixed price in writing. Six years on our workmanship.", from = "page-cta", cta = { href: "/quote", label: "Get a free quote →" } }: {
  title: ReactNode;
  text?: ReactNode;
  from?: string;
  /** The main button: a quote, unless the page asks for something else (joining a membership starts on the contact page). */
  cta?: { href: string; label: string };
}) {
  return (
    <section className="bk__sec bk__sec--white bk__sec--end bk__sec--tcta">
      <div className="wrap">
        <div className="bk__tcta">
          <Image src={PHOTO.vans} alt="" fill sizes="(max-width: 1480px) 100vw, 1416px" />
          <div className="bk__cta bk__tctain">
            <div>
              <h2 className="bk__boxh">{title}</h2>
              <p>{text}</p>
            </div>
            <div className="bxh__ctas">
              <Link href={cta.href} className="abtn abtn--navy">{cta.label}</Link>
              <a href={`tel:${site.phoneE164}`} className="abtn abtn--white" data-call-from={from}>Call {site.phone}</a>
            </div>
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
 *
 * `cls` adds to the root. The service pages pass "bx" for the category
 * pages' header (the orange glow and the boxed figures), so a service page
 * opened from /hot-water doesn't drop back to the plainer one; the other
 * pages on this frame keep theirs.
 */
export function BandPage({ children, cls }: { children: ReactNode; cls?: string }) {
  return (
    <div className="ag ag--flat" data-no-reveal>
      <div className={`bk svk${cls ? ` ${cls}` : ""}`} style={{ ["--acc" as string]: "#C2521A" }}>
        <BkMotion />
        {children}
      </div>
    </div>
  );
}
