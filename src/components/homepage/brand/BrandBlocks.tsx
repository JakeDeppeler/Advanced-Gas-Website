import Image from "next/image";
import { ReasonIcon } from "./ReasonIcon";
import Link from "next/link";
import type { Brand } from "@/lib/brands";
import type { Review } from "@/lib/reviews";
import { installsFor } from "@/lib/brandGallery";
import { CountUp } from "@/components/CountUp";
import { TONES, productHref, bookHref, money, weekly, SHOW_FINANCE, FINANCE_MONTHS } from "@/lib/homepage/data";
import { brandOptions } from "./options";
import { BrandLockup, ThreeDiamonds } from "./BrandMark";
import { BkMotion } from "./BkMotion";
import { SystemPicker, type PickerResult } from "./SystemPicker";
import "./blocks.css";

/**
 * A brand page laid out like the homepage: full-width bands, white ones
 * between navy, cream and the brand's red, the range in a navy box the way
 * the homepage sets "Find your system", and one coloured word in each
 * heading. No light blue (Jake's call). The order is
 * Jake's: the brand and where it's made, the quality, why we choose it,
 * the range, our installs, year ten, which one is right for you, reviews,
 * FAQs, then the quote.
 *
 * Motion comes from BkMotion (cards rising in turn, the route drawing, the
 * timeline filling, the figures counting up), all off for reduced motion.
 * Each section still hides when its field is missing from lib/brands.ts.
 */

/** How many install photos the gallery is laid out for. */
const GALLERY = 6;

/**
 * A heading with one part in colour, the way the homepage sets "Find your
 * system": the coloured part is written in braces in lib/brands.ts.
 */
function accent(text: string) {
  return text.split(/[{}]/).map((part, i) => (i % 2 ? <span key={i}>{part}</span> : part));
}
/** The timeline runs this many years past its last mark, so that label has room. */
const TAIL = 3;

export function BrandBlocks({ brand, reviews }: { brand: Brand; reviews: Review[] }) {
  const options = brandOptions(brand);
  const installs = installsFor(brand.slug).slice(0, GALLERY);
  // No empty "photo goes here" frames, previews included (Jake, Nov 2026:
  // every place should have a photo). The gallery shows the real installs
  // there are, laid out for that many, and hides with none.
  const slots = 0;
  const story = brand.story;
  const timeline = brand.timeline ?? [];
  // Each picker answer resolved to the option it names, with its page and a
  // quote link that arrives at the homepage form with that option chosen.
  const picks: PickerResult[] = (brand.picker?.results ?? []).flatMap((r) => {
    const o = options.find((x) => x.t.model === r.model);
    if (!o) return [];
    return [{
      when: r.when, why: r.why, model: r.model, img: o.t.img, tier: o.t.tier,
      price: typeof o.t.price === "number" ? money(o.t.price) : null,
      href: productHref(o.s, o.t, {}), book: bookHref(o.s, o.t, {}),
    }];
  });
  const tabs = [
    ...(story ? [["brand", "The brand"]] : []),
    ...(brand.quality ? [["quality", brand.quality.tab ?? "Made better"]] : []),
    ["why", "Why we choose it"],
    ...(options.length ? [["range", "The range"]] : []),
    ...(installs.length || slots ? [["installs", "Our installs"]] : []),
    ["support", brand.servicing?.tab ?? "Year ten"],
    ...(picks.length ? [["pick", "Which one?"]] : []),
    ["reviews", "Reviews"],
    ...(brand.faqs?.length ? [["faqs", "FAQs"]] : []),
  ];
  const mark = brand.mark === "three-diamonds";
  // Made better: the points split either side of the photo, the first half
  // on the left, keeping their numbers.
  const quality = brand.quality;
  const qPts = (quality?.points ?? []).map((p, n) => ({ p, n }));
  const qLeft = qPts.slice(0, Math.ceil(qPts.length / 2));
  const qRight = qPts.slice(qLeft.length);
  const span = Math.max(...timeline.map((t) => t.y + TAIL), 1);
  // Marks close together would print their labels over each other: one that
  // follows another by less than a label's width goes above the bar instead.
  const lifts = timeline.map((t, n) => n > 0 && (t.y - timeline[n - 1].y) / span < 0.13);
  lifts.forEach((up, n) => { if (up && lifts[n - 1]) lifts[n] = false; });

  return (
    // data-no-reveal: BkMotion animates this page; the site-wide Reveal would fade the colour blocks themselves.
    <div className="bx bk" data-no-reveal style={{ ["--acc" as string]: brand.blockAccent ?? brand.accent ?? "#C2521A", ...(brand.accentLight ? { ["--acc-l" as string]: brand.accentLight } : {}) }}>
      <BkMotion />
      <nav className="ppx__crumbbar" aria-label="Breadcrumb">
        <div className="wrap ppx__crumbin">
          <ol className="pp__crumbs">
            <li><Link href="/">Home</Link></li>
            <li><Link href="/brands">Brands</Link></li>
            <li aria-current="page">{brand.name}</li>
          </ol>
          <Link href="/#find" className="ppx__back">Find your system →</Link>
        </div>
      </nav>

      <section className="bxh">
        <div className="wrap bxh__in">
          <div className="bxh__copy">
            {mark ? <BrandLockup tone="light" className="bk__herologo" /> : <span className="lk2__eye">{brand.origin}</span>}
            <h1 className={`bxh__h1${mark ? " bk__h1" : ""}`}>{brand.name}</h1>
            <p className="bxh__tag">{brand.tagline}</p>
            {brand.heroSub && <p className="bxh__sub">{brand.heroSub}</p>}
            <div className="bxh__ctas">
              <Link href="/quote" className="abtn abtn--or abtn--flat">Get a free quote →</Link>
              <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="brand-hero">Call (03) 5947 8000</a>
            </div>
          </div>
          {brand.heroProducts ? (
            <div className="bxh__img bxh__show bk__show" role="group" aria-label={`The ${brand.name} range`}>
              {brand.heroProducts.map((p, i) => (
                <figure key={p.src} className={`bxh__prod${i === 0 ? " bxh__prod--lead" : ""}`} style={{ ["--i" as string]: i }}>
                  <span className="bxh__pimg"><Image src={p.src} alt={p.alt} fill priority={i === 0} sizes="(max-width: 900px) 70vw, 380px" /></span>
                  <figcaption><i aria-hidden="true" />{p.label}</figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <div className="bxh__img"><Image src={brand.photo} alt={brand.photoAlt} fill priority sizes="(max-width: 900px) 100vw, 640px" /></div>
          )}
        </div>
      </section>

      <nav className="pxt" aria-label="On this page">
        <div className="wrap pxt__in">{tabs.map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}</div>
      </nav>

      {/* 1. The brand, and the road from Tokyo to a wall here. */}
      {story && (
        <section className="bk__sec bk__sec--white" id="brand">
          <div className="wrap"><div className="bk__blk bk__col bk__brand">
            <div className="bk__brandtop">
              <div className="bk__head">
                <h2 className="h2">{accent(story.heading)}</h2>
                <p>{story.body}</p>
              </div>
              {mark && <ThreeDiamonds className="bk__bigmark" />}
            </div>
            {story.stops && (
              <ol className="bk__trip" data-anim="trip" style={{ ["--n" as string]: story.stops.length }}>
                <span className="bk__track" aria-hidden="true"><i /></span>
                {story.stops.map((st, n) => (
                  <li key={st.place} style={{ ["--i" as string]: n }}>
                    <span className="bk__pin" aria-hidden="true" />
                    <span className="bk__role">{st.role}</span>
                    <strong>{st.place}</strong>
                    <p>{st.d}</p>
                  </li>
                ))}
              </ol>
            )}
            <ul className="bk__marks" data-anim="stagger">
              {story.marks.map((m) => <li key={m.k}><b>{m.v}</b><span>{m.k}</span></li>)}
            </ul>
          </div></div>
        </section>
      )}

      {/* 2. Made better: the product in the middle, what's inside it either
          side, each numbered to a pin on the photo where the part sits. */}
      {quality && (
        <section className="bk__sec bk__sec--navy" id="quality">
          <div className="wrap"><div className="bk__blk bk__q">
            <div className="bk__head bk__head--c">
              <h2 className="h2">{accent(quality.heading)}</h2>
              <p>{quality.intro}</p>
            </div>
            <div className="bk__qbody" data-anim="inside">
              {[qLeft, qRight].map((side, k) => (
                <ul key={k} className={`bk__qlist bk__qlist--${k ? "r" : "l"}`}>
                  {side.map(({ p, n }) => (
                    <li key={p.t} className="bk__qpt" style={{ ["--i" as string]: n }} data-n={n + 1}>
                      <span className="bk__qn" aria-hidden="true">{String(n + 1).padStart(2, "0")}</span>
                      <h3>{p.t}</h3><p>{p.d}</p>
                    </li>
                  ))}
                </ul>
              ))}
              <div className={`bk__qimg${quality.image.cover ? " bk__qimg--cover" : ""}`}>
                <span className="bk__qglow" aria-hidden="true" />
                {quality.inset && (
                  <span className="bk__qinset"><Image src={quality.inset.src} alt={quality.inset.alt} fill sizes="(max-width: 1000px) 50vw, 240px" /></span>
                )}
                <span className="bk__qmain"><Image src={quality.image.src} alt={quality.image.alt} fill sizes="(max-width: 1000px) 80vw, 440px" /></span>
                {quality.points.map((p, n) => p.pin && (
                  <span key={p.t} className="bk__qpin" data-n={n + 1} style={{ left: `${p.pin[0]}%`, top: `${p.pin[1]}%`, ["--i" as string]: n }} aria-hidden="true">{n + 1}</span>
                ))}
              </div>
            </div>
          </div></div>
        </section>
      )}

      {/* 3. Why we choose it: four cards, each with a drawing of the reason, the figures counting up. */}
      <section className="bk__sec bk__sec--white" id="why">
        <div className="wrap"><div className="bk__blk bk__col">
          <header className="bk__head">
            <h2 className="h2">{accent(brand.whyLead?.claim ?? `Why we choose {${brand.name}}.`)}</h2>
            {brand.whyLead?.sub && <p>{brand.whyLead.sub}</p>}
          </header>
          {brand.reasons && (
            <ul className="bk__reasons" data-anim="stagger">
              {brand.reasons.map((r) => (
                <li key={r.k} className={`bk__card${r.icon ? " bk__card--icon" : ""}`}>
                  {r.icon ? (
                    <span className="bk__cicon"><ReasonIcon name={r.icon} /></span>
                  ) : r.img && (
                    <span className={`bk__cimg${r.cover ? " bk__cimg--cover" : ""}`}>
                      <Image src={r.img} alt={r.alt ?? ""} fill sizes="(max-width: 600px) 90vw, (max-width: 1000px) 45vw, 280px" style={r.pos ? { objectPosition: r.pos } : undefined} />
                    </span>
                  )}
                  <span className="bk__ctxt">
                    <b><CountUp value={r.v} /></b>
                    <strong>{r.k}</strong>
                    <span>{r.d}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div></div>
      </section>

      {/* 4. The range. */}
      {options.length > 0 && (
        <section className="bk__sec bk__sec--white" id="range">
          <div className="wrap"><div className="bk__blk bk__boxed bk__col">
            <header className="bk__head">
              <h2 className="h2">The {brand.name} <span>range</span>.</h2>
              <p>Each one has its own page with sizes, specs and the price installed.</p>
            </header>
            <div className="bk__range" data-anim="stagger">
              {options.map(({ s, t, i, cats }) => (
                <Link key={`${s.slug}.${t.slug}`} href={productHref(s, t, {})} className="atile bk__tile">
                  <span className="atile__img"><Image src={t.img} alt="" fill sizes="(max-width: 600px) 45vw, 340px" /></span>
                  <span className="atile__foot">
                    <span className="atile__txt">
                      <span className="bk__tier"><i style={{ background: TONES[i] }} aria-hidden="true" />{t.tier} · {cats.join(" & ")}</span>
                      <strong>{t.model}</strong>
                      {typeof t.price === "number" && (
                        <span className="bk__price">From {money(t.price)}{SHOW_FINANCE ? ` or $${weekly(t.price, FINANCE_MONTHS)}/wk` : ""}</span>
                      )}
                    </span>
                    <span className="atile__go atile__go--sm" aria-hidden="true">→</span>
                  </span>
                </Link>
              ))}
            </div>
          </div></div>
        </section>
      )}

      {/* 5. Our installs. */}
      {(installs.length > 0 || slots > 0) && (
        <section className="bk__sec bk__sec--cream" id="installs">
          <div className="wrap"><div className="bk__blk bk__col">
            <header className="bk__head">
              <h2 className="h2">Our {brand.name} <span>installs</span>.</h2>
              <p>Real jobs by our own crew, around Melbourne&apos;s south-east.</p>
            </header>
            <div className="bk__gal" data-n={Math.min(installs.length, 3)} data-anim="stagger">
              {installs.map((ph) => (
                <figure key={ph.src} className="bk__ph">
                  <Image src={ph.src} alt={ph.alt} fill sizes="(max-width: 600px) 90vw, (max-width: 1000px) 45vw, 380px" />
                  {(ph.suburb || ph.caption) && <figcaption>{[ph.caption, ph.suburb].filter(Boolean).join(" · ")}</figcaption>}
                </figure>
              ))}
              {Array.from({ length: slots }, (_, k) => (
                <div key={k} className="bk__ph bk__ph--slot" aria-hidden="true"><span>Install photo goes here</span></div>
              ))}
            </div>
          </div></div>
        </section>
      )}

      {/* 6. Year ten: the timeline of owning one. */}
      <section className="bk__sec bk__sec--navy" id="support">
        <div className="wrap"><div className="bk__blk bk__col">
          <div className="bk__two">
            <div className="bk__txt">
              <h2 className="h2">{accent(brand.servicing?.heading ?? "Keeping it running.")}</h2>
              <p>{brand.servicing?.body ?? brand.support}</p>
              {brand.servicing?.facts && (
                <ul className="pp__hl">{brand.servicing.facts.map((f) => <li key={f}><span aria-hidden="true">✓</span>{f}</li>)}</ul>
              )}
            </div>
            <div className="bk__team">
              <Image src="/team-photo.webp" alt="The Advanced Gas team with their vans outside the Pakenham workshop" fill sizes="(max-width: 1000px) 90vw, 480px" />
            </div>
          </div>
          {timeline.length > 0 && (
            <div className="bk__time" data-anim="time">
              <div className="bk__tbar" aria-hidden="true">
                <i style={{ width: `${(Math.max(...timeline.map((t) => t.y)) / span) * 100}%` }} />
              </div>
              <ol>
                {timeline.map((t, n) => (
                  <li key={t.t} className={lifts[n] ? "is-up" : undefined} style={{ ["--x" as string]: `${(t.y / span) * 100}%`, ["--i" as string]: n }}>
                    <span className="bk__tdot" aria-hidden="true" />
                    <strong>{t.t}</strong>
                    <span>{t.d}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div></div>
      </section>

      {/* 7. Which one is right for you: a few questions and a quote link. */}
      {picks.length > 0 && brand.picker && (
        <section className="bk__sec bk__sec--red" id="pick">
          <div className="wrap"><div className="bk__blk bk__pick">
            <div className="bk__head">
              <h2 className="h2">Which {brand.name} is <span>right for you</span>?</h2>
              <p>Answer a couple of quick questions and we&apos;ll show you the one we&apos;d fit.</p>
              {(brand.versus || brand.notRightWhen) && (
                <div className="bk__notes">
                  {brand.versus && <p><b>{brand.versusHeading ?? "Compared with the rest"}</b> {brand.versus}</p>}
                  {brand.notRightWhen && <p><b>When we&apos;d say no.</b> {brand.notRightWhen}</p>}
                </div>
              )}
            </div>
            <SystemPicker brand={brand.name} steps={brand.picker.steps} results={picks} />
          </div></div>
        </section>
      )}

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

      {brand.faqs && brand.faqs.length > 0 && (
        <section className="bk__sec bk__sec--cream" id="faqs">
          <div className="wrap"><div className="bk__blk pp__two">
            <div className="bk__head">
              <h2 className="h2">Questions about <span>{brand.name}</span>.</h2>
              <p>Still want a human? <a href="tel:+61359478000" data-call-from="brand-faq">Call (03) 5947 8000</a>.</p>
            </div>
            <div className="afaqs">
              {brand.faqs.map((f) => <details key={f.q} className="afaq"><summary>{f.q}</summary><p>{f.a}</p></details>)}
            </div>
          </div></div>
        </section>
      )}

      <section className="bk__sec bk__sec--white bk__sec--end">
        <div className="wrap">
          <div className={`bk__box bk__box--acc bk__cta${!mark && brand.logo ? " bk__cta--logo" : ""}`}>
            {mark && <ThreeDiamonds className="bk__ctamark" />}
            {!mark && brand.logo && (
              <span className="bk__ctalogo" aria-hidden="true">
                {/* An SVG logo goes through as is: the image optimiser refuses SVGs. */}
                <Image src={brand.logo} alt="" fill sizes="280px" unoptimized={brand.logo.endsWith(".svg")} />
              </span>
            )}
            <div>
              <h2 className="bk__boxh">See what {brand.name} <span>would cost</span>.</h2>
              <p>A free site check, then one fixed price in writing. Six years on our workmanship.</p>
            </div>
            <div className="bxh__ctas">
              <Link href="/quote" className="abtn abtn--or abtn--flat">Get a free quote →</Link>
              <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="brand-cta">Call (03) 5947 8000</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
