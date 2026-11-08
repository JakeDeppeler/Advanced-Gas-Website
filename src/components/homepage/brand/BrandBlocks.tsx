import Image from "next/image";
import Link from "next/link";
import type { Brand } from "@/lib/brands";
import type { Review } from "@/lib/reviews";
import { installsFor } from "@/lib/brandGallery";
import { TONES, productHref, money, weekly, SHOW_FINANCE, FINANCE_MONTHS } from "@/lib/homepage/data";
import { brandOptions } from "./options";
import "./blocks.css";

/**
 * A brand page laid out like the homepage: white sections with plenty of
 * room between them, navy blocks for the two things that matter most (what
 * makes it better, and the call to act), and few words in each. Jake asked
 * for this after the earlier page read as busy: seven different backgrounds
 * and a paragraph ahead of every point.
 *
 * Only white and navy, with the brand's accent as the one colour. Each
 * section still hides when its field is missing from lib/brands.ts.
 */

/** How many install photos the gallery is laid out for. */
const GALLERY = 6;

export function BrandBlocks({ brand, reviews }: { brand: Brand; reviews: Review[] }) {
  const options = brandOptions(brand);
  const installs = installsFor(brand.slug).slice(0, GALLERY);
  // On preview deployments the gallery shows where the missing photos go,
  // so the layout can be judged before they arrive. Never on the live site:
  // an empty frame there would read as a broken page.
  const showSlots = process.env.VERCEL_ENV !== "production";
  const slots = showSlots ? Math.max(0, GALLERY - installs.length) : 0;
  const steps = brand.installSteps ?? [];
  const tabs = [
    ["why", "Why we choose it"],
    ...(brand.quality ? [["quality", "Made better"]] : []),
    ...(options.length ? [["range", "The range"]] : []),
    ...(steps.length ? [["install", "How we install"]] : []),
    ...(installs.length || slots ? [["installs", "Our installs"]] : []),
    ["support", "Year ten"],
    ...(brand.versus || brand.notRightWhen ? [["fit", "Is it for you?"]] : []),
    ["reviews", "Reviews"],
    ...(brand.faqs?.length ? [["faqs", "FAQs"]] : []),
  ];

  return (
    <div className="bx bk" style={{ ["--acc" as string]: brand.accent ?? "#C2521A" }}>
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
            <span className="lk2__eye">{brand.origin}</span>
            <h1 className="bxh__h1">{brand.name}</h1>
            <p className="bxh__tag">{brand.tagline}</p>
            {brand.heroSub && <p className="bxh__sub">{brand.heroSub}</p>}
            <div className="bxh__ctas">
              <Link href="/#quote" className="abtn abtn--or abtn--flat">Get a free quote →</Link>
              <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="brand-hero">Call (03) 5947 8000</a>
            </div>
          </div>
          {brand.heroProducts ? (
            <div className="bxh__img bxh__show" role="group" aria-label={`The ${brand.name} range`}>
              {brand.heroProducts.map((p, i) => (
                <figure key={p.src} className={`bxh__prod${i === 0 ? " bxh__prod--lead" : ""}`}>
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

      {/* Why: four photo cards, the way the homepage shows its four services. */}
      <section className="bk__sec" id="why">
        <div className="wrap bk__col">
          <header className="bk__head">
            <h2 className="h2">{brand.whyLead?.claim ?? `Why we fit ${brand.name}.`}</h2>
            {brand.whyLead?.sub && <p>{brand.whyLead.sub}</p>}
          </header>
          {brand.reasons && (
            <ul className="bk__reasons">
              {brand.reasons.map((r) => (
                <li key={r.k} className="bk__card">
                  {r.img && (
                    <span className={`bk__cimg${r.cover ? " bk__cimg--cover" : ""}`}>
                      <Image src={r.img} alt={r.alt ?? ""} fill sizes="(max-width: 600px) 90vw, (max-width: 1000px) 45vw, 280px" style={r.pos ? { objectPosition: r.pos } : undefined} />
                    </span>
                  )}
                  <span className="bk__ctxt">
                    <b>{r.v}</b>
                    <strong>{r.k}</strong>
                    <span>{r.d}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Made better: the one navy block in the body, so the quality case is the thing you can't miss. */}
      {brand.quality && (
        <section className="bk__sec bk__sec--tight" id="quality">
          <div className="wrap">
            <div className="bk__box bk__q">
              <div className="bk__qhead">
                <h2 className="bk__boxh">{brand.quality.heading}</h2>
                <p>{brand.quality.intro}</p>
              </div>
              <div className="bk__qbody">
                <div className="bk__qimg"><Image src={brand.quality.image.src} alt={brand.quality.image.alt} fill sizes="(max-width: 1000px) 90vw, 420px" /></div>
                <ul className="bk__qlist">
                  {brand.quality.points.map((p) => (
                    <li key={p.t}><h3>{p.t}</h3><p>{p.d}</p></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {options.length > 0 && (
        <section className="bk__sec" id="range">
          <div className="wrap bk__col">
            <header className="bk__head">
              <h2 className="h2">Pick your {brand.name}.</h2>
              <p>Each one has its own page with sizes, specs and the price installed.</p>
            </header>
            <div className="bk__range">
              {options.map(({ s, t, i, cats }) => (
                <Link key={`${s.slug}.${t.slug}`} href={productHref(s, t, {})} className="atile bk__tile">
                  <span className="atile__img"><Image src={t.img} alt="" fill sizes="(max-width: 600px) 90vw, 340px" /></span>
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
          </div>
        </section>
      )}

      {steps.length > 0 && (
        <section className="bk__sec bk__sec--line" id="install">
          <div className="wrap bk__col">
            <header className="bk__head">
              <h2 className="h2">How we put it in.</h2>
              <p>The same four steps on every {brand.name} job.</p>
            </header>
            {/* Numbered because it is an order: each step happens before the next. */}
            <ol className="bk__steps">
              {steps.map((st, n) => (
                <li key={st.t}><span className="bk__n" aria-hidden="true">{n + 1}</span><h3>{st.t}</h3><p>{st.d}</p></li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {(installs.length > 0 || slots > 0) && (
        <section className="bk__sec bk__sec--tight" id="installs">
          <div className="wrap bk__col">
            <header className="bk__head">
              <h2 className="h2">Our {brand.name} installs.</h2>
              <p>Real jobs by our own crew, around Melbourne&apos;s south-east.</p>
            </header>
            <div className="bk__gal">
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
          </div>
        </section>
      )}

      <section className="bk__sec" id="support">
        <div className="wrap bk__two">
          <div className="bk__txt">
            <h2 className="h2">{brand.servicing?.heading ?? "Keeping it running."}</h2>
            <p>{brand.servicing?.body ?? brand.support}</p>
            {brand.servicing?.facts && (
              <ul className="pp__hl">{brand.servicing.facts.map((f) => <li key={f}><span aria-hidden="true">✓</span>{f}</li>)}</ul>
            )}
          </div>
          <div className="bk__side">
            {brand.warrantyCards && (
              <div className="bk__war">
                <h3>Covered twice.</h3>
                {brand.warrantyCards.map((w) => (
                  <div key={w.k} className="bk__wcard"><b>{w.v}</b><span><strong>{w.k}</strong>{w.d}</span></div>
                ))}
              </div>
            )}
            <div className="bk__team">
              <Image src="/team-photo.webp" alt="The Advanced Gas team with their vans outside the Pakenham workshop" fill sizes="(max-width: 1000px) 90vw, 480px" />
            </div>
          </div>
        </div>
      </section>

      {(brand.versus || brand.notRightWhen) && (
        <section className="bk__sec bk__sec--line" id="fit">
          <div className="wrap bk__col">
            <header className="bk__head"><h2 className="h2">Is it the right one for you?</h2></header>
            <div className="bk__fit">
              {brand.versus && <div><h3>{brand.versusHeading ?? "Compared with the rest"}</h3><p>{brand.versus}</p></div>}
              {brand.notRightWhen && <div><h3>When we&apos;d say no</h3><p>{brand.notRightWhen}</p></div>}
            </div>
          </div>
        </section>
      )}

      <section className="bk__sec bk__sec--line" id="reviews">
        <div className="wrap bk__col">
          <div className="pp__revhead">
            <header className="bk__head"><h2 className="h2">From local households.</h2></header>
            <Link href="/reviews">Read every review →</Link>
          </div>
          <div className="pp__revs">
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
        </div>
      </section>

      {brand.faqs && brand.faqs.length > 0 && (
        <section className="bk__sec bk__sec--line" id="faqs">
          <div className="wrap pp__two">
            <div className="bk__head">
              <h2 className="h2">Questions about {brand.name}.</h2>
              <p>Still want a human? <a href="tel:+61359478000" data-call-from="brand-faq">Call (03) 5947 8000</a>.</p>
            </div>
            <div className="afaqs">
              {brand.faqs.map((f) => <details key={f.q} className="afaq"><summary>{f.q}</summary><p>{f.a}</p></details>)}
            </div>
          </div>
        </section>
      )}

      <section className="bk__sec bk__sec--end">
        <div className="wrap">
          <div className="bk__box bk__cta">
            <div>
              <h2 className="bk__boxh">See what {brand.name} would cost.</h2>
              <p>A free site check, then one fixed price in writing. Six years on our workmanship.</p>
            </div>
            <div className="bxh__ctas">
              <Link href="/#quote" className="abtn abtn--or abtn--flat">Get a free quote →</Link>
              <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="brand-cta">Call (03) 5947 8000</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
