import Image from "next/image";
import Link from "next/link";
import { findBrand } from "@/lib/brands";
import { REVIEWS, RATING_SUMMARY, RATING_TEXT } from "@/lib/reviews";
import {
  type Category, BRAND_SLUGS, PRODUCT_FAQS, TOOLS, installTime, money, systemHref,
} from "@/lib/homepage/data";
import { LEARN, SYS_INTRO } from "@/lib/homepage/learn";
import { BkMotion } from "@/components/homepage/brand/BkMotion";
import { Crumbs } from "./kit";
import "@/components/homepage/brand/blocks.css";
import "./category.css";

/**
 * The page behind Cooling, Heating and Hot water in the header: the brand
 * pages' block layout (full-width bands, white between navy, cream and the
 * category's colour), built from the finder's own catalogue so it can never
 * list a system or a price the system pages don't.
 *
 * Order: the systems, a side-by-side, the brands we fit, why us, the tools
 * for this category, reviews, FAQs, then the quote.
 */

export type CategoryCopy = {
  /** Headline; braces mark the coloured part, as on the brand pages. */
  h1: string;
  sub: string;
  /** The band colour for this category. */
  acc: string;
  /** Hrefs of the calculators that belong here, from TOOLS. */
  tools: string[];
  toolsHead: string;
  toolsSub: string;
  /** Picks the reviews that talk about this category. */
  reviewWord: RegExp;
};

/** System pictures that are photographs, not cut-outs: they fill the frame. */
const SCENE = /Milieu|ZM-Touch|ZoneMate-Touch/;

function accent(text: string) {
  return text.split(/[{}]/).map((part, i) => (i % 2 ? <span key={i}>{part}</span> : part));
}

export function CategoryPage({ cat, copy }: { cat: Category; copy: CategoryCopy }) {
  const systems = cat.systems.map((s) => {
    const prices = s.tiers.map((t) => t.price).filter((p): p is number => typeof p === "number");
    return {
      s,
      from: prices.length ? Math.min(...prices) : null,
      brands: [...new Set(s.tiers.filter((t) => !t.same).map((t) => t.brand))],
      time: ((x) => x[0].toUpperCase() + x.slice(1))(installTime(s).replace(/^Usually /, "")),
      good: LEARN[s.slug]?.good[0],
    };
  });
  const brandNames = [...new Set(systems.flatMap((x) => x.brands))];
  const brands = brandNames.flatMap((n) => {
    const b = BRAND_SLUGS[n] ? findBrand(BRAND_SLUGS[n]) : undefined;
    return b ? [b] : [];
  });
  const tools = copy.tools.flatMap((h) => TOOLS.filter((t) => t.href === h));
  const named = REVIEWS.filter((r) => copy.reviewWord.test(`${r.txt} ${r.what} ${r.title}`));
  const reviews = [...named, ...REVIEWS.filter((r) => !named.includes(r))].slice(0, 3);
  // Two questions from each system, the first time each is asked.
  const faqs = [...new Map(cat.systems.flatMap((s) => (PRODUCT_FAQS[s.faq] ?? []).slice(0, 2)).map((f) => [f.q, f])).values()].slice(0, 8);
  const lower = cat.label.toLowerCase();

  return (
    // Two boxes: the blocks styles hang off .bk sitting inside .ag, as on the brand pages.
    <div className="ag ag--flat" data-no-reveal><div className="bx bk cx" style={{ ["--acc" as string]: copy.acc }}>
      <BkMotion />
      <Crumbs trail={[{ name: cat.label }]} back={{ label: "Find yours in a few taps →", href: `/?find=${cat.id}#find` }} />

      <section className="bxh">
        <div className="wrap bxh__in">
          <div className="bxh__copy">
            <span className="lk2__eye cx__eye">{cat.label}</span>
            <h1 className="bxh__h1 cx__h1">{accent(copy.h1)}</h1>
            <p className="bxh__sub">{copy.sub}</p>
            <div className="bxh__ctas">
              <Link href="/quote" className="abtn abtn--or abtn--flat">Get a free quote →</Link>
              <Link href={`/?find=${cat.id}#find`} className="abtn abtn--line">Find yours in a few taps</Link>
            </div>
          </div>
          <div className="bxh__img bxh__img--scene">
            <Image src={cat.photo} alt={cat.alt} fill priority sizes="(max-width: 900px) 100vw, 640px" style={{ objectPosition: cat.pos }} />
          </div>
        </div>
        <div className="wrap">
          <dl className="bxh__facts">
            <div><dd>{systems.length} systems</dd><dt>{systems.map((x) => x.s.label).join(", ")}</dt></div>
            <div><dd>{brands.length} brands</dd><dt>{brands.map((b) => b.name).join(", ")}</dt></div>
            <div><dd>Free quote</dd><dt>One fixed price, in writing</dt></div>
            <div><dd>6 years</dd><dt>On our workmanship</dt></div>
          </dl>
        </div>
      </section>

      <nav className="pxt" aria-label="On this page">
        <div className="wrap pxt__in">
          {[["systems", "The systems"], ["compare", "Side by side"], ["brands", "Brands"], ["why", "Why us"], ...(tools.length ? [["tools", "Tools"]] : []), ["reviews", "Reviews"], ["faqs", "FAQs"]].map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}
        </div>
      </nav>

      {/* 1. The systems */}
      <section className="bk__sec bk__sec--white" id="systems">
        <div className="wrap"><div className="bk__blk bk__col">
          <header className="bk__head">
            <h2 className="h2">Which {lower} <span>system</span>?</h2>
            <p>Each one has its own page: how it works, the options we install and the sizes.</p>
          </header>
          <div className={`cx__sys${systems.length === 4 ? " cx__sys--4" : ""}`} data-anim="stagger">
            {systems.map(({ s, from, brands: bs }) => (
              <Link key={s.slug} href={systemHref(s.slug)} className="cx__card">
                <span className={`cx__img${SCENE.test(s.img) ? " cx__img--cover" : ""}`}><Image src={s.img} alt="" fill sizes="(max-width: 600px) 90vw, (max-width: 1000px) 45vw, 340px" /></span>
                <span className="cx__txt">
                  <span className="cx__tag">{s.sub}</span>
                  <strong>{s.label}</strong>
                  <span className="cx__intro">{SYS_INTRO[s.slug] ?? ""}</span>
                  <span className="cx__meta">
                    <b>{from != null ? `From ${money(from)}` : "Free quote"}</b>
                    <span>{s.tiers.length} options · {bs.join(", ")}</span>
                  </span>
                  <span className="cx__go">See the {s.label.toLowerCase()} options <i aria-hidden="true">→</i></span>
                </span>
              </Link>
            ))}
          </div>
        </div></div>
      </section>

      {/* 2. Side by side */}
      <section className="bk__sec bk__sec--white" id="compare">
        <div className="wrap"><div className="bk__blk bk__boxed bk__col">
          <header className="bk__head">
            <h2 className="h2">Side by <span>side</span>.</h2>
            <p>Still not sure? The finder asks about your home and narrows it to three options.</p>
          </header>
          <div className="cx__tblwrap">
            <table className="cx__tbl">
              <thead><tr><th scope="col">System</th><th scope="col">Good for</th><th scope="col">Install</th><th scope="col">Price</th></tr></thead>
              <tbody>
                {systems.map(({ s, from, time, good }) => (
                  <tr key={s.slug}>
                    <th scope="row"><Link href={systemHref(s.slug)}>{s.label}</Link></th>
                    {/* data-l: the column name, shown above each value once the rows stack on a phone */}
                    <td data-l="Good for">{good ?? s.sub}</td>
                    <td data-l="Install">{time}</td>
                    <td data-l="Price">{from != null ? `From ${money(from)}` : "Free quote"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href={`/?find=${cat.id}#find`} className="abtn abtn--or abtn--flat cx__find">Find your {lower} in a few taps →</Link>
        </div></div>
      </section>

      {/* 3. Brands */}
      {brands.length > 0 && (
        <section className="bk__sec bk__sec--cream" id="brands">
          <div className="wrap"><div className="bk__blk bk__col">
            <header className="bk__head">
              <h2 className="h2">The brands <span>we fit</span>.</h2>
              <p>Each one is here for a reason, and each has a page on why we choose it and when we wouldn&apos;t.</p>
            </header>
            <div className="cx__brands" data-anim="stagger">
              {brands.map((b) => (
                <Link key={b.slug} href={`/brands/${b.slug}`} className="cx__brand" style={{ ["--b" as string]: b.blockAccent ?? b.accent }}>
                  <span className="cx__bimg"><Image src={b.heroProducts?.[0]?.src ?? b.photo} alt="" fill sizes="(max-width: 600px) 40vw, 200px" /></span>
                  <span className="cx__btxt">
                    <strong>{b.name}</strong>
                    <span>{b.tagline}</span>
                    <em>Why we choose {b.name} →</em>
                  </span>
                </Link>
              ))}
            </div>
          </div></div>
        </section>
      )}

      {/* 4. Why us */}
      <section className="bk__sec bk__sec--navy" id="why">
        <div className="wrap"><div className="bk__blk bk__col">
          <header className="bk__head">
            <h2 className="h2">The same crew, <span>every job</span>.</h2>
            <p>The person who quotes your job is on the same team as the person who installs it.</p>
          </header>
          <ul className="cx__why" data-anim="stagger">
            <li><b>12 yrs</b><strong>On the tools</strong><span>Across Pakenham and the south-east.</span></li>
            <li><b>6 yrs</b><strong>Workmanship warranty</strong><span>On every install, on top of the manufacturer&apos;s.</span></li>
            <li><b>In writing</b><strong>One fixed price</strong><span>It only changes if the job does, and you approve it first.</span></li>
            <li><b>{RATING_TEXT}</b><strong>On Google</strong><span>From {RATING_SUMMARY.count} reviews by local households.</span></li>
          </ul>
        </div></div>
      </section>

      {/* 5. The tools for this category */}
      {tools.length > 0 && (
        <section className="bk__sec bk__sec--red" id="tools">
          <div className="wrap"><div className="bk__blk cx__tools">
            <div className="bk__head">
              <h2 className="h2">{accent(copy.toolsHead)}</h2>
              <p>{copy.toolsSub}</p>
            </div>
            <div className="cx__tlist">
              {tools.map((t) => (
                <Link key={t.href} href={t.href} className="cx__tool"><strong>{t.t}</strong><span>{t.s}</span><i aria-hidden="true">→</i></Link>
              ))}
            </div>
          </div></div>
        </section>
      )}

      {/* 6. Reviews */}
      <section className="bk__sec bk__sec--white" id="reviews">
        <div className="wrap"><div className="bk__blk bk__col">
          <div className="pp__revhead">
            <header className="bk__head"><h2 className="h2">From local <span>households</span>.</h2></header>
            <Link href="/reviews">Read every review →</Link>
          </div>
          <div className="pp__revs" data-anim="stagger">
            {reviews.map((r) => (
              <article key={r.who + r.title} className="rev">
                <span className="stars stars--ink" aria-hidden="true">★★★★★</span>
                <h3>{r.title}</h3>
                <p>&ldquo;{r.txt}&rdquo;</p>
                <div className="rev__who">
                  <span aria-hidden="true">{r.a}</span>
                  <span className="rev__whot"><strong>{r.who}</strong><small>{r.what}</small></span>
                </div>
              </article>
            ))}
          </div>
        </div></div>
      </section>

      {/* 7. FAQs */}
      {faqs.length > 0 && (
        <section className="bk__sec bk__sec--cream" id="faqs">
          <div className="wrap"><div className="bk__blk pp__two">
            <div className="bk__head">
              <h2 className="h2">Questions about <span>{lower}</span>.</h2>
              <p>Still want a human? <a href="tel:+61359478000" data-call-from="category-faq">Call (03) 5947 8000</a>.</p>
            </div>
            <div className="afaqs">
              {faqs.map((f) => <details key={f.q} className="afaq"><summary>{f.q}</summary><p>{f.a}</p></details>)}
            </div>
          </div></div>
        </section>
      )}

      <section className="bk__sec bk__sec--white">
        <div className="wrap">
          <div className="bk__box bk__box--acc bk__cta">
            <div>
              <h2 className="bk__boxh">Get a price for your <span>{lower}</span>.</h2>
              <p>A free site check, then one fixed price in writing. Six years on our workmanship.</p>
            </div>
            <div className="bxh__ctas">
              <Link href="/quote" className="abtn abtn--or abtn--flat">Get a free quote →</Link>
              <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="category-cta">Call (03) 5947 8000</a>
            </div>
          </div>
        </div>
      </section>
    </div></div>
  );
}
