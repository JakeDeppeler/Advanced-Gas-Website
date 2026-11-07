import Image from "next/image";
import Link from "next/link";
import type { Brand } from "@/lib/brands";
import type { Review } from "@/lib/reviews";
import { CATS, BRAND_SLUGS, TONES, productHref, money, weekly, SHOW_FINANCE, FINANCE_MONTHS } from "@/lib/homepage/data";

/**
 * A brand page in the redesign: why we fit them, what we fit from them, and
 * what owning one is like in year ten. Reached from a product page's brand
 * section, so it leads with our verdict rather than the manufacturer's pitch,
 * and every option links back to the product page it came from.
 *
 * All the words come from the brand's record in lib/brands.ts; this only
 * lays them out.
 */
/** The tiles' icons, keyed by the `icon` each benefit names. */
const ICONS: Record<string, string> = {
  snowflake: "M12 2v20M4.9 6l14.2 12M19.1 6L4.9 18M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5",
  shield: "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 12l2 2 4-4",
  flame: "M12 3c3 4 6 6.5 6 11a6 6 0 0 1-12 0c0-3 1.5-5 3-6.5 0 2 1 3.5 2.5 3.5C11.5 8 11 5.5 12 3z",
  people: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.6-3.5 3.3-5.5 6.5-5.5s5.9 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 6.5M18.5 14.5c1.6.8 2.7 2.6 3 5.5",
  truck: "M2 6h12v10H2zM14 9h4l3 3v4h-7zM6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  phone: "M8 2.5h8a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20V4A1.5 1.5 0 0 1 8 2.5zM11 18.5h2",
  wrench: "M14.7 6.3a4 4 0 0 0-5.4 5.1L3.5 17.2a1.8 1.8 0 0 0 2.6 2.6l5.8-5.8a4 4 0 0 0 5.1-5.4l-2.4 2.4-2.3-.6-.6-2.3z",
};
/** Each tile in its own colour, the way the homepage's cards are. */
const TILE = ["bxt__card--white", "bxt__card--sky", "bxt__card--acc", "bxt__card--navy", "bxt__card--warm", "bxt__card--white"];

export function BrandView({ brand, reviews }: { brand: Brand; reviews: Review[] }) {
  // The finder's options from this brand, matched the same way a product
  // page finds its brand, so the two always agree. A split appears under
  // Cooling and again under Heating (as a reverse-cycle split); list it once,
  // with both categories on its card.
  const all = CATS.flatMap((c) => c.systems.flatMap((s) => s.tiers
    .map((t, i) => ({ c, s, t, i }))
    // An option that is really another one (`same`) is listed as that one.
    .filter(({ t }) => BRAND_SLUGS[t.brand] === brand.slug && !t.same)));
  const options = all
    .filter((o, k) => all.findIndex((x) => x.t.model === o.t.model) === k)
    .map((o) => ({ ...o, cats: [...new Set(all.filter((x) => x.t.model === o.t.model).map((x) => x.c.label))] }));
  const facts = brand.heroFacts ?? [];
  const tabs = [
    ["why", brand.whyLead ? "Why we choose it" : "Why we fit them"], ...(brand.story ? [["brand", "The brand"]] : []), ...(brand.formats ? [["types", "Which one"]] : []), ...(options.length ? [["options", `${brand.name} options`]] : []),
    ["support", "Parts & support"], ...(brand.faqs?.length ? [["faqs", "FAQs"]] : []), ["reviews", "Reviews"],
  ] as const;

  return (
    <div className="bx" style={{ ["--acc" as string]: brand.accent ?? "#C2521A" }}>
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
              {options.length > 0 && <a href="#options" className="abtn abtn--or abtn--flat">See {brand.name} options ↓</a>}
              <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="brand-hero">Call (03) 5947 8000</a>
            </div>
          </div>
          {/* A photograph fills the frame; a studio cut-out sits on white, where it reads as the product. */}
          {brand.heroProducts ? (
            // The range on white: each product named, the first one large.
            <div className="bxh__img bxh__show" role="group" aria-label={`The ${brand.name} range`}>
              {brand.heroProducts.map((p, i) => (
                <figure key={p.src} className={`bxh__prod${i === 0 ? " bxh__prod--lead" : ""}`}>
                  <span className="bxh__pimg"><Image src={p.src} alt={p.alt} fill priority={i === 0} sizes="(max-width: 900px) 70vw, 380px" /></span>
                  <figcaption><i aria-hidden="true" />{p.label}</figcaption>
                </figure>
              ))}
            </div>
          ) : brand.heroScene ? (
            <div className="bxh__img bxh__img--scene bxh__img--photo">
              <Image src={brand.heroScene.src} alt={brand.heroScene.alt} fill priority sizes="(max-width: 900px) 100vw, 640px" />
              <span className="bxh__inset"><Image src={brand.photo} alt={brand.photoAlt} fill sizes="160px" /></span>
              <span className="bxh__chip">{brand.heroScene.caption}</span>
            </div>
          ) : (
            <div className={`bxh__img${brand.photoScene ? " bxh__img--scene" : ""}`}>
              <Image src={brand.photo} alt={brand.photoAlt} fill priority sizes="(max-width: 900px) 100vw, 640px" />
            </div>
          )}
        </div>
        {facts.length > 0 && (
          <div className="wrap">
            <dl className="bxh__facts">{facts.map((f) => <div key={f.k}><dd>{f.v}</dd><dt>{f.k}</dt></div>)}</dl>
          </div>
        )}
      </section>

      <nav className="pxt" aria-label="On this page">
        <div className="wrap pxt__in">{tabs.map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}</div>
      </nav>

      {brand.whyLead ? (
        <section className="pxs bxw" id="why">
          <div className="wrap">
            <div className="bxw__top">
              <div className="bxw__lead">
                <span className="aeye"><i /> Why we choose {brand.name}</span>
                <h2 className="bxw__claim">{brand.whyLead.claim}</h2>
                <p className="bxw__sub">{brand.whyLead.sub}</p>
              </div>
              {brand.verdict && (
                <figure className="bxw__verdict">
                  <blockquote>{brand.verdict}</blockquote>
                  <figcaption>The Advanced Gas &amp; Aircon team</figcaption>
                </figure>
              )}
            </div>
            {brand.reasons && (
              <ul className="bxw__reasons">
                {brand.reasons.map((r) => (
                  <li key={r.k}><b>{r.v}</b><span>{r.k}</span><p>{r.d}</p></li>
                ))}
              </ul>
            )}
            {(brand.notRightWhen || brand.versus) && (
              <div className="bxw__honest">
                {brand.notRightWhen && <div><h3>When we&apos;d fit something else</h3><p>{brand.notRightWhen}</p></div>}
                {brand.versus && <div><h3>{brand.versusHeading ?? "Against the others"}</h3><p>{brand.versus}</p></div>}
              </div>
            )}
          </div>
        </section>
      ) : (
      <section className="pxs pxo bx__why" id="why">
        <div className="wrap pxo__in">
          <div className="pxo__take">
            <span className="aeye"><i /> Our take</span>
            <p className="pxo__quote bx__quote">{brand.ourTake}</p>
            <span className="pxo__by">The Advanced Gas &amp; Aircon team</span>
          </div>
          {brand.keyFeatures && brand.keyFeatures.length > 0 && (
            <div className="pxo__why">
              <h2 className="wl__h">Why we fit {brand.name}</h2>
              <ul className="pp__hl">{brand.keyFeatures.map((f) => <li key={f}><span aria-hidden="true">✓</span>{f}</li>)}</ul>
            </div>
          )}
        </div>
      </section>
      )}

      {brand.story && (
        <section className="bxb" id="brand">
          <div className="wrap bxb__in">
            <div>
              <span className="aeye aeye--dark"><i /> The brand</span>
              <h2 className="h2 h2--sm">{brand.story.heading}</h2>
              <p>{brand.story.body}</p>
            </div>
            <ul className="bxb__marks">
              {brand.story.marks.map((m) => <li key={m.k}><b>{m.v}</b><span>{m.k}</span></li>)}
            </ul>
          </div>
        </section>
      )}

      {brand.formats && (
        <section className="pxs" id="types">
          <div className="wrap pp__col">
            <div className="pp__lead">
              <span className="aeye"><i /> Which one</span>
              <h2 className="h2 h2--sm">{brand.formats.heading}</h2>
            </div>
            <div className="bxf">
              {brand.formats.items.map((f, k) => (
                <article key={f.name} className={`bxf__card bxf__card--${k % 2 ? "b" : "a"}`}>
                  <span className="bxf__img"><Image src={f.img} alt={`${brand.name} ${f.name}`} fill sizes="(max-width: 700px) 90vw, 260px" /></span>
                  <div className="bxf__t">
                    <h3>{f.name}</h3>
                    <strong>{f.line}</strong>
                    <ul className="pp__hl">{f.points.map((p) => <li key={p}><span aria-hidden="true">✓</span>{p}</li>)}</ul>
                    <p className="bxf__best"><b>Best for:</b> {f.best}</p>
                    <Link href={f.href} className="abtn abtn--navy abtn--flat">About the {f.name} →</Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {brand.benefitTiles && brand.benefitTiles.length > 0 && (
        <section className="pxs pxs--cream">
          <div className="wrap pp__col">
            <div className="pp__lead">
              <span className="aeye"><i /> What you get</span>
              <h2 className="h2 h2--sm">{brand.benefitsHeading ?? `What ${brand.name} gets you.`}</h2>
            </div>
            <div className="bxt">
              {brand.benefitTiles.map((b, i) => (
                <article key={b.t} className={`bxt__card ${TILE[i % TILE.length]}`}>
                  <span className="bxt__top">
                    <span className="bxt__ico" aria-hidden="true">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS[b.icon ?? ""] ?? ICONS.shield} /></svg>
                    </span>
                    <span className="bxt__n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  </span>
                  <h3>{b.t}</h3>
                  <strong>{b.line}</strong>
                  <p>{b.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {brand.photos && brand.photos.length > 0 && (
        <section className="pxs bxp">
          <div className="wrap pp__col">
            <div className="pp__lead">
              <span className="aeye"><i /> On site</span>
              <h2 className="h2 h2--sm">What it looks like at home.</h2>
            </div>
            <div className="bxp__row">
              {brand.photos.map((ph, i) => (
                <figure key={ph.src} className={`bxp__ph${i === 0 ? " bxp__ph--big" : ""}`}>
                  <Image src={ph.src} alt={ph.alt} fill sizes="(max-width: 700px) 80vw, 360px" />
                  {ph.caption && <figcaption>{ph.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {options.length > 0 && (
        <section className="pxs pxs--navy" id="options">
          <div className="wrap pp__col">
            <div className="pp__lead">
              <span className="aeye aeye--dark"><i /> {brand.name} options</span>
              <h2 className="h2 h2--sm">What we install from {brand.name}.</h2>
              <p className="bx__lede">Each one has its own page with sizes, specs, the price installed and how it works.</p>
            </div>
            <div className="bxo">
              {options.map(({ s, t, i, cats }) => (
                <Link key={`${s.slug}.${t.slug}`} href={productHref(s, t, {})} className="bxo__card">
                  <span className="bxo__img"><Image src={t.img} alt="" fill sizes="(max-width: 600px) 90vw, 320px" /></span>
                  <span className="bxo__t">
                    <span className="bxo__tier"><i style={{ background: TONES[i] }} aria-hidden="true" />{t.tier} · {cats.join(" & ")}</span>
                    <strong>{t.model}</strong>
                    {typeof t.price === "number" && (
                      <em>From {money(t.price)}{SHOW_FINANCE ? ` or $${weekly(t.price, FINANCE_MONTHS)}/wk` : ""}</em>
                    )}
                  </span>
                  <i className="bxo__go" aria-hidden="true">→</i>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="pxs" id="support">
        <div className={`wrap bxs${brand.servicing?.photo ? " bxs--photo" : ""}`}>
          {brand.servicing?.photo && (
            <div className="bxs__img"><Image src={brand.servicing.photo} alt={brand.servicing.photoAlt ?? ""} fill sizes="(max-width: 1000px) 90vw, 480px" style={brand.servicing.photoPos ? { objectPosition: brand.servicing.photoPos } : undefined} /></div>
          )}
          <div className="bxs__col bxs__col--card">
            <span className="aeye"><i /> Parts &amp; support</span>
            <h2 className="h2 h2--sm">{brand.servicing?.heading ?? "Keeping it running."}</h2>
            <p>{brand.servicing?.body ?? brand.support}</p>
            {brand.servicing?.facts && <ul className="pp__hl">{brand.servicing.facts.map((f) => <li key={f}><span aria-hidden="true">✓</span>{f}</li>)}</ul>}
            {brand.warranty && <p className="bxs__war"><b>Warranty:</b> {brand.warranty}</p>}
          </div>
        </div>
      </section>

      {brand.faqs && brand.faqs.length > 0 && (
        <section className="pxs pxs--sky" id="faqs">
          <div className="wrap pp__two">
            <div className="pp__lead">
              <span className="aeye"><i /> Questions</span>
              <h2 className="h2 h2--sm">About {brand.name}.</h2>
              <p>Still want a human? <a href="tel:+61359478000" data-call-from="brand-faq" style={{ color: "#050A30" }}>Call (03) 5947 8000</a>.</p>
            </div>
            <div className="afaqs">
              {brand.faqs.map((f) => <details key={f.q} className="afaq"><summary>{f.q}</summary><p>{f.a}</p></details>)}
            </div>
          </div>
        </section>
      )}

      <section className="pxs" id="reviews">
        <div className="wrap pp__col">
          <div className="pp__revhead">
            <div className="pp__lead">
              <span className="aeye"><i /> Reviews</span>
              <h2 className="h2 h2--sm">From local households.</h2>
            </div>
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

      <section className="bxc">
        <div className="wrap bxc__in">
          <div>
            <h2 className="h2 h2--sm">Ready to see what {brand.name} would cost?</h2>
            <p>A free site check, then one fixed price in writing. Six years on our workmanship.</p>
          </div>
          <div className="bxh__ctas">
            <Link href="/#quote" className="abtn abtn--or abtn--flat">Get a free quote →</Link>
            <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="brand-cta">Call (03) 5947 8000</a>
          </div>
        </div>
      </section>
    </div>
  );
}
