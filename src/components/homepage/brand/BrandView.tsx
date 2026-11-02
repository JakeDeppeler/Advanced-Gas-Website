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
    ["why", "Why we fit them"], ...(options.length ? [["options", `${brand.name} options`]] : []),
    ["support", "Parts & support"], ...(brand.faqs?.length ? [["faqs", "FAQs"]] : []), ["reviews", "Reviews"],
  ] as const;

  return (
    <div className="bx">
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
          <div className={`bxh__img${brand.photoScene ? " bxh__img--scene" : ""}`}>
            <Image src={brand.photo} alt={brand.photoAlt} fill priority sizes="(max-width: 900px) 100vw, 640px" />
          </div>
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

      <section className="pxs pxo" id="why">
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

      {brand.benefitTiles && brand.benefitTiles.length > 0 && (
        <section className="pxs pxs--cream">
          <div className="wrap pp__col">
            <div className="pp__lead">
              <span className="aeye"><i /> What you get</span>
              <h2 className="h2 h2--sm">{brand.benefitsHeading ?? `What ${brand.name} gets you.`}</h2>
            </div>
            <div className="bxt">
              {brand.benefitTiles.map((b, i) => (
                <article key={b.t} className="bxt__card">
                  <span className="bxt__n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{b.t}</h3>
                  <strong>{b.line}</strong>
                  <p>{b.detail}</p>
                </article>
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
        <div className="wrap bxs">
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
