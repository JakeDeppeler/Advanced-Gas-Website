import Image from "next/image";
import Link from "next/link";
import { HwSizeCheck } from "../hw/HwSizeCheck";
import { findBrand } from "@/lib/brands";
import { REVIEWS, RATING_SUMMARY, RATING_TEXT } from "@/lib/reviews";
import {
  type Category, BRAND_SLUGS, PRODUCT_FAQS, TOOLS, installTime, money, systemHref,
} from "@/lib/homepage/data";
import { LEARN, SYS_INTRO, SYS_PROS } from "@/lib/homepage/learn";
import { BkMotion } from "@/components/homepage/brand/BkMotion";
import { BrandLockup } from "@/components/homepage/brand/BrandMark";
import { findTool } from "@/components/homepage/tools/toolList";
import { Crumbs } from "./kit";
import { EndCta } from "./bands";
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
      // The system page's own pros and cons, three of each, for Side by side.
      pc: SYS_PROS[s.slug] ? { pros: SYS_PROS[s.slug].pros.slice(0, 3), cons: SYS_PROS[s.slug].cons.slice(0, 3) } : null,
    };
  });
  const brandNames = [...new Set(systems.flatMap((x) => x.brands))];
  const brands = brandNames.flatMap((n) => {
    const b = BRAND_SLUGS[n] ? findBrand(BRAND_SLUGS[n]) : undefined;
    return b ? [b] : [];
  });
  // Each tool's question, what it works out and its button, from the tool
  // pages' own list, so the box says what the tool page says.
  const tools = copy.tools.flatMap((h) => TOOLS.filter((t) => t.href === h)).map((t) => ({ ...t, info: findTool(t.href.split("/").pop() ?? "") }));
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
              {cat.id === "hw" && <a href="#size" className="abtn abtn--or abtn--flat">Check your tank size ↓</a>}
              <Link href="/quote" className={`abtn ${cat.id === "hw" ? "abtn--line" : "abtn--or abtn--flat"}`}>Get a free quote →</Link>
              {cat.id !== "hw" && <Link href={`/?find=${cat.id}#find`} className="abtn abtn--line">Find yours in a few taps</Link>}
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
          {[...(cat.id === "hw" ? [["size", "Tank size"]] : []), ["systems", "The systems"], ["compare", "Side by side"], ["brands", "Brands"], ["why", "Why us"], ...(tools.length ? [["tools", "Tools"]] : []), ["reviews", "Reviews"], ["faqs", "FAQs"]].map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}
        </div>
      </nav>

      {/* Hot water only: how big a tank, from people and shower length (Jake,
          Nov 2026). In the navy box Side by side and the homepage's finder
          use, so it reads as one thing to work through rather than a heading
          and some cards loose on the band. */}
      {cat.id === "hw" && (
        <section className="bk__sec bk__sec--cream" id="size">
          <div className="wrap"><div className="bk__blk bk__boxed bk__col cx__size">
            <header className="bk__head">
              <h2 className="h2">How much hot water do you <span>need</span>?</h2>
              <p>Tell us how many people shower and for how long. Every tank we fit, at the size that covers you, and how long it lasts.</p>
            </header>
            <HwSizeCheck />
          </div></div>
        </section>
      )}

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
                    <span>{s.tiers.length === 1 ? "One option" : `${s.tiers.length} options`} · {bs.join(", ")}</span>
                  </span>
                  <span className="cx__go">{s.tiers.length === 1 ? `See the ${s.label}` : `See the ${s.label.toLowerCase()} options`} <i aria-hidden="true">→</i></span>
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
          {/* A card per system rather than a table: the picture is what people
              recognise. Every value keeps its label (a dt), and on a wide
              screen the cards share their rows (subgrid), so the pros, the
              cons, "Install" and "Price" line up across and compare at a
              glance. Pros and cons are ticks and crosses (Jake, Nov 2026),
              each list labelled in words too, so colour isn't the signal. */}
          <ul className={`cx__cmp${systems.length > 5 ? " cx__cmp--rows" : ""}`} style={{ ["--n" as string]: systems.length }} role="list" data-anim="stagger">
            {systems.map(({ s, from, time, good, pc }) => (
              <li key={s.slug} className="cx__cc">
                <span className={`cx__ccimg${SCENE.test(s.img) ? " cx__ccimg--cover" : ""}`}><Image src={s.img} alt="" fill sizes="(max-width: 900px) 120px, 260px" /></span>
                <span className="cx__cchd">
                  <span className="cx__tag">{s.sub}</span>
                  {/* The one link; it stretches over the whole card */}
                  <h3><Link href={systemHref(s.slug)}>{s.label}</Link></h3>
                </span>
                <dl className="cx__ccdl">
                  {pc ? (
                    <>
                      <div><dt>Pros</dt><dd><ul className="cx__pc">{pc.pros.map((x) => <li key={x}><i className="cx__pcy" aria-hidden="true" />{x}</li>)}</ul></dd></div>
                      <div><dt>Cons</dt><dd><ul className="cx__pc">{pc.cons.map((x) => <li key={x}><i className="cx__pcn" aria-hidden="true" />{x}</li>)}</ul></dd></div>
                    </>
                  ) : <div><dt>Good for</dt><dd>{good ?? s.sub}</dd></div>}
                  <div><dt>Install</dt><dd>{time}</dd></div>
                  <div className="cx__ccprice"><dt>Price</dt><dd>{from != null ? `From ${money(from)}` : "Free quote"}</dd></div>
                </dl>
                <span className="cx__ccgo" aria-hidden="true">See it <i>→</i></span>
              </li>
            ))}
          </ul>
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
                <Link key={b.slug} href={`/brands/${b.slug}`} className="cx__brand">
                  <span className="cx__bimg"><Image src={b.heroProducts?.[0]?.src ?? b.photo} alt="" fill sizes="(max-width: 600px) 30vw, 300px" /></span>
                  <span className="cx__btxt">
                    {/* The maker's own logo where we have one (alt carries the name);
                        the name set in type where we don't. */}
                    <span className="cx__blogo">
                      {b.mark ? <BrandLockup tone="dark" />
                        : b.logo ? <span className={`cx__blimg${b.logo.endsWith(".svg") ? "" : " cx__blimg--mono"}`}><Image src={b.logo} alt={b.name} fill sizes="160px" unoptimized={b.logo.endsWith(".svg")} /></span>
                        : <strong>{b.name}</strong>}
                    </span>
                    <span className="cx__btag">{b.tagline}</span>
                    <em>Why we choose {b.name} <i aria-hidden="true">→</i></em>
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
      {/* A box in the category's colour on white, like the homepage's tools
          box, rather than a full-width band (Jake, Nov 2026). */}
      {tools.length > 0 && (
        <section className="bk__sec bk__sec--white" id="tools">
          <div className="wrap"><div className="bk__blk cx__tbox">
            <div className="bk__head cx__thead">
              <span className="cx__teye">Free tools</span>
              <h2 className="h2">{accent(copy.toolsHead)}</h2>
              <p>{copy.toolsSub}</p>
              <p className="cx__tfree"><b>Free</b> · No sign-up · No email needed</p>
            </div>
            <ul className="cx__tcards" role="list" data-anim="stagger">
              {tools.map((t) => (
                <li key={t.href} className="cx__tcard">
                  <small>{t.t}</small>
                  {/* The one link; it stretches over the whole card */}
                  <h3><Link href={t.href}>{t.info?.q ?? t.s}</Link></h3>
                  {t.info && <ul className="cx__tpts">{t.info.points.map((p) => <li key={p}>{p}</li>)}</ul>}
                  <span className="cx__tgo" aria-hidden="true">{t.info?.cta ?? "Open"} <i>→</i></span>
                </li>
              ))}
            </ul>
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

      <EndCta title={<>Get a price for your <span>{lower}</span>.</>} from="category-cta" />
    </div></div>
  );
}
