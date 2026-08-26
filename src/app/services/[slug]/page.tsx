import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { services, suburbs, site } from "@/lib/site";
import { serviceContent } from "@/lib/serviceContent";
import { breadcrumbSchema, serviceSchema, faqSchema } from "@/lib/schema";
import { QuoteForm } from "@/components/QuoteForm";
import { InstagramCTA } from "@/components/InstagramCTA";
import { BeforeAfter } from "@/components/BeforeAfter";
import { ProofStrip } from "@/components/ProofStrip";
import { WhyDifferent } from "@/components/WhyDifferent";
import { UpgradeNudge } from "@/components/UpgradeNudge";
import type { NudgeVariant } from "@/lib/upgradeAngle";
import { getInstagramForService } from "@/lib/instagram";
import { BEFORE_AFTER } from "@/lib/gallery";
import "../../detail.css";
import { pageTitle, metaDescription } from "@/lib/seo";
import { BenefitTiles } from "@/components/BenefitTiles";
import { ReviewMarquee } from "@/components/ReviewMarquee";
import { RangeBand } from "@/components/RangeBand";
import { SystemAdvisor } from "@/components/SystemAdvisor";
import { SystemChooser } from "@/components/SystemChooser";
import { ADVISORS } from "@/lib/advisor";
import { hasAsset, resolveAsset } from "@/lib/publicAsset";

/** The tile palette, same five the filtration pages rotate through. */
const TILE_TINTS = ["#0B1450", "#00699A", "#2E7D6B", "#C2540F", "#5A5F7A"];

/** "Choose your system" — the heading and the line under it, per service.
 *  Written rather than generated: "Choose your air conditioning
 *  installation system." is what you get from a template, and it's not a
 *  sentence anybody would say. */
const CHOOSE_HEAD: Record<string, { h2: string; lede: string }> = {
  "air-conditioning-installation": {
    h2: "Four shapes. One of them is your house.",
    lede:
      "Before anyone talks model numbers, the choice is what shape the system takes \u2014 one room or the whole house, on the wall or in the roof, refrigerated or evaporative. Everything else follows from that.",
  },
  "heat-pump-installation": {
    h2: "One shell, or two pieces?",
    lede:
      "That's genuinely the whole decision. All-in-one is a single unit where the old tank stood. Split puts the compressor outside and the tank against the wall, which is what buys you the cold-weather performance and the tank options.",
  },
  "aircon-servicing-repairs": {
    h2: "What are we servicing?",
    lede:
      "Refrigerated and evaporative are different machines with different service intervals, different consumables and different prices. Pick the one on your roof.",
  },
  "gas-plumbing": {
    h2: "Heating, hot water, or the gas itself.",
    lede:
      "Three trades on one licence, so this page covers all of them. Start with the one that brought you here \u2014 each has its own page with the models, the prices and the honest limits.",
  },
};

/** Which flavour of the "near ten years old? price the upgrade" argument
 *  each service gets. Gas plumbing leads with ducted heating, so it takes
 *  the heating one. */
const NUDGE_BY_SERVICE: Record<string, NudgeVariant> = {
  "air-conditioning-installation": "cooling",
  "aircon-servicing-repairs": "cooling",
  "heat-pump-installation": "hot-water",
  "gas-plumbing": "heating",
};

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const content = serviceContent[params.slug];
  if (!content) return {};
  return {
    title: pageTitle(content.metaTitle),
    description: metaDescription(content.metaDescription),
    alternates: { canonical: `/services/${params.slug}` },
  };
}

export default async function ServicePage({ params }: { params: { slug: string } }) {
  const content = serviceContent[params.slug];
  const svc = services.find((s) => s.slug === params.slug);
  if (!content || !svc) notFound();

  // Lead photo for the hero panel — first entry in the service's own
  // photo set, so each service opens on the gear it's actually about.
  const heroPhoto = content.photos?.[0];

  // Real install photos for this service, matched on caption keywords —
  // see SERVICE_KEYWORDS in lib/instagram.ts. Empty when the feed isn't
  // configured, so the section hides itself rather than breaking.
  const igPosts = await getInstagramForService(params.slug, 8);

  // Heat pump installs are the one service with a real changeover pair
  // shot so far. Matched by slug so more pairs just drop into gallery.ts.
  const beforeAfter =
    params.slug === "heat-pump-installation"
      ? BEFORE_AFTER.find((b) => b.slug === "electric-storage-to-heat-pump")
      : undefined;

  /** Product cards for "Choose your system". Facts come from the tile
   *  faces where a system has them — they're written to be read at a
   *  glance, which is what a card wants — and fall back to `points`,
   *  which are terse enough to work. */
  const chooserCards = (content.systems ?? []).map((sy) => ({
    id: sy.id,
    label: sy.label,
    blurb: sy.blurb,
    photo: resolveAsset(sy.photo.src),
    photoAlt: sy.photo.alt,
    photoScene: sy.photo.scene ?? false,
    brands: sy.brands ?? content.brands,
    priceFrom: sy.priceFrom,
    facts: (sy.benefitTiles && sy.benefitTiles.length > 0
      ? sy.benefitTiles.map((b) => ({ lead: b.t.trim(), note: b.line }))
      : sy.points.map((pt) => ({ lead: pt }))
    ).slice(0, 4),
    href: `/services/${params.slug}/${sy.id}`,
  }));
  const chooseHead = CHOOSE_HEAD[params.slug];

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Services", url: `${site.url}/services` },
    { name: svc.name, url: `${site.url}/services/${svc.slug}` },
  ]);

  // Real changeover photography, where a matching pair exists.
  const beforeAfterSection = (
    <>
      {/* BEFORE / AFTER — real changeover photography for services that
          have a matching pair in the gallery data. */}
      {beforeAfter && (
        <section className="svc-ba">
          <div className="wrap">
            <div className="ds-section-head ds-section-head--hl">
              <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Before &amp; after</span>
              <h2>{beforeAfter.title}</h2>
              <p>{beforeAfter.blurb}</p>
            </div>
            <div className="svc-ba__row">
              <div className="svc-ba__media">
                <BeforeAfter before={beforeAfter.before} after={beforeAfter.after} ratio="3 / 4" />
              </div>
              <div className="svc-ba__side">
                {beforeAfter.meta && (
                  <ul className="svc-ba__meta">
                    {beforeAfter.meta.map((m) => <li key={m}>{m}</li>)}
                  </ul>
                )}
                <Link href="/gallery" className="ds-btn ds-btn--orange">
                  See more real installs →
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );

  // "The gear we install" was here — a grid of manufacturer product
  // renders. It came out with the brand pods: a reader on a service page
  // wants to know what the job involves, and if they want models there is
  // now a button per brand straight into the brand page.

  // Our own install photography on a navy band, so the page has a dark
  // beat between the light ones. Grows as photos are added to the data.
  const installShots = content.installPhotos && content.installPhotos.shots.length > 0 && (
    <section className="svc-shots">
      <div className="wrap">
        <div className="ds-section-head">
          <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot" /> Our own jobs</span>
          <h2 className="ds-h--on-dark">{content.installPhotos.heading}</h2>
          <p className="svc-shots__lede">{content.installPhotos.blurb}</p>
        </div>
        <div className="svc-shots__grid">
          {content.installPhotos.shots.map((sh) => (
            <figure className="svc-shot" key={sh.src}>
              <img src={sh.src} alt={sh.alt} loading="lazy" width="600" height="750" />
              {sh.caption && <figcaption>{sh.caption}</figcaption>}
            </figure>
          ))}
        </div>
        <div className="svc-shots__foot">
          <Link href="/gallery" className="ds-btn ds-btn--orange">See the full gallery →</Link>
        </div>
      </div>
    </section>
  );

  // Why this gear and why this crew.
  const whyUsSection = (
    <>
      {/* WhyDifferent came out — the benefit tiles say what we fit and
          why, and the range band says it again with a door on it. */}
    </>
  );

  return (
    <div className="page-detail">
      {/* HEADER — the photo full bleed behind the copy, the figures along
          the bottom. Same shape as the filtration pages: the inset photo
          panel it replaces read as a picture pinned beside the text
          rather than a header. */}
      <section
        className={`dp-hero${content.heroPhoto && hasAsset(content.heroPhoto) ? " dp-hero--shot" : ""}`}
        style={
          content.heroPhoto && hasAsset(content.heroPhoto)
            ? {
                backgroundImage:
                  `linear-gradient(180deg, rgba(9,17,52,0.45) 0%, rgba(9,17,52,0.12) 38%, rgba(9,17,52,0.72) 100%), ` +
                  `linear-gradient(100deg, rgba(9,17,52,0.95) 0%, rgba(9,17,52,0.90) 30%, rgba(9,17,52,0.36) 52%, rgba(9,17,52,0.08) 76%), ` +
                  `url("${resolveAsset(content.heroPhoto)}")`,
              }
            : undefined
        }
      >
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/services">Services</Link>
            <span className="sep">/</span>
            <span className="cur">{svc.short}</span>
          </nav>

          <div className="dp-hero__copy">
            <div className="ds-eyebrow ds-eyebrow--on-dark">
              <span className="ds-dot" />
              {svc.short} · Pakenham &amp; within 75 km
            </div>
            <h1>{content.h1}</h1>
            <p className="dp-hero__sub">{content.intro}</p>
            <div className="pg-ctas">
              <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get my free quote →</Link>
              <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost-on-dark ds-btn--lg">
                Or call {site.phone}
              </a>
            </div>
          </div>

          {content.heroFacts && (
            <ul className="dp-hero__at">
              {content.heroFacts.map((f) => (
                <li key={f.k}>
                  <strong>{f.v}</strong>
                  <span>{f.k}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* WHY DO THIS AT ALL — only on services where the customer hasn't
          decided they want the thing yet. When present it leads the page
          and the specification blocks move below it, because a spec sheet
          is no use to somebody still asking why. */}
      {content.whyFirst && (
        <section className="svc-why">
          <div className="wrap">
            <div className="svc-why__grid">
              <div className="svc-why__copy">
                <div className="ds-section-head ds-section-head--hl">
                  <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> {content.whyFirst.eyebrow}</span>
                  <h2>{content.whyFirst.heading}</h2>
                  <p>{content.whyFirst.blurb}</p>
                </div>
                <ul className="svc-why__stats">
                  {content.whyFirst.stats.map((st) => (
                    <li key={st.label}>
                      <strong>{st.value}</strong>
                      <span>{st.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <figure className="svc-why__photo">
                <img src={content.whyFirst.photo.src} alt={content.whyFirst.photo.alt} width="800" height="1000" loading="eager" />
              </figure>
            </div>

            <div className="svc-why__reasons">
              {content.whyFirst.reasons.map((r) => (
                <div className="svc-why__reason" key={r.t}>
                  <h3>{r.t}</h3>
                  <p>{r.d}</p>
                </div>
              ))}
            </div>

            <p className="svc-why__caveat">{content.whyFirst.caveat}</p>
          </div>
        </section>
      )}

      {/* Why this gear and why us, then the range, then the proof. On a
          why-first page these come before the specification. */}
      {content.whyFirst && (
        <>
          {whyUsSection}
          {installShots}
          {beforeAfterSection}
        </>
      )}

      {/* WHAT'S INCLUDED — the tabbed tiles the filtration pages use. Six
          or seven cards of body copy in a grid is a wall; six tiles and
          one panel is the same content you can actually scan. */}
      <section className="dp-benefits">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> What&apos;s included</span>
            <h2>Every {svc.short.toLowerCase()} we do, done properly.</h2>
          </div>
          <BenefitTiles
            benefits={content.benefits.map((b, i) => ({
              area: b.t,
              icon: b.icon,
              tint: TILE_TINTS[i % TILE_TINTS.length],
              line: b.line,
              detail: b.d,
            }))}
          />
        </div>
      </section>

      {/* CHOOSE YOUR SYSTEM — the filtration section, on the service
          pages. Replaces the "Systems we install" list of links: the
          same destinations, but as products you can compare. */}
      {chooseHead && (
        <SystemChooser
          cards={chooserCards}
          heading={chooseHead.h2}
          lede={chooseHead.lede}
        />
      )}

      {/* IS IT RIGHT FOR YOU — the same three questions the system pages
          carry, on the page where the choice between systems is live. */}
      {ADVISORS[params.slug] && (
        <section className="sysfit">
          <div className="wrap">
            <div className="ds-section-head">
              <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Is it right for you</span>
              <h2>Which one you actually want.</h2>
              <p>
                We&rsquo;d rather you read this and ring someone else than have us fit
                the wrong thing and both regret it.
              </p>
            </div>
            <SystemAdvisor service={params.slug} />
          </div>
        </section>
      )}

      {/* HOW WE DO IT — the home page's numbered steps, navy band, three
          across, arrows between. Distinct per service. */}
      {content.steps && content.steps.length > 0 && (
        <section className="process">
          <div className="wrap">
            <div className="ds-section-head">
              <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot ds-dot--orange" /> How we do it</span>
              <h2 className="ds-h--on-dark">Our {svc.short.toLowerCase()} process, step by step.</h2>
            </div>
            <ol className="steps">
              {content.steps.map((st, i) => (
                <li key={st.title} className="step">
                  <span className="step__num">{i + 1}</span>
                  <h3>{st.title}</h3>
                  <p>{st.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* "Systems we install" was here. The services mega, the range
          band and the sub-pages themselves all lead to the same places,
          so a fourth list of the same links was noise. */}

      {/* PRICING — the filtration model cards, on the service pages.
          Service & repair used to be excluded because a table of call-out
          fees was the wrong frame for a call-out; as cards with the shot
          of the unit and the inclusions listed out, it's the same frame as
          everything else, so it's back in. */}
      <section className="dp-pricing">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Indicative pricing</span>
            <h2>Transparent fixed-price options.</h2>
            <p>Real numbers, not &ldquo;from $X&rdquo; bait. Your final quote depends on site specifics and we confirm it in writing before any work starts.</p>
          </div>
          {/* Price cards, built on the same card as "Choose your system"
              above: white panel, photo on top, orange chip, then the
              facts. Two sections on one page that both present products
              should not be two different card designs — the only thing
              that changes here is that the chip carries a number and the
              facts are what the number buys.

              `includes` is one comma-joined sentence in the data. It
              reads as a list because that's what it is — five things you
              get for the number — so it renders as one. */}
          <div className={`wf-styles__grid dp-prices is-${Math.min(content.pricing.length, 3)}up`}>
            {content.pricing.map((p) => {
              const shot = p.photo ? resolveAsset(p.photo) : null;
              // "Message for quote" is a sentence, not a figure. In the
              // chip at figure weight it wraps and reads as a broken
              // label, so it drops to running size.
              const isFigure = /\d/.test(p.price);
              return (
                <article className="wf-style dp-price" key={p.tier}>
                  {shot ? (
                    <div className={`wf-style__photo${p.photoScene ? " is-scene" : ""}`}>
                      <img src={shot} alt={p.tier} loading="lazy" width="600" height="450" />
                    </div>
                  ) : (
                    <div className="wf-style__photo dp-price__noshot" aria-hidden="true">
                      <span>{p.price.replace(/[^0-9]/g, "").slice(0, 3) || "$"}</span>
                    </div>
                  )}
                  <div className="wf-style__body">
                    <span className={`wf-style__tier${isFigure ? "" : " is-words"}`}>{p.price}</span>
                    <h3>{p.tier}</h3>
                    <span className="wf-style__style">
                      {p.group ? `${p.group} · ` : ""}
                      {p.priceKey ?? (isFigure ? "Installed" : "Priced at quote")}
                    </span>
                    <span className="dp-price__rl">What&rsquo;s in the price</span>
                    <ul>
                      {p.includes.split(/,\s+/).map((inc) => (
                        // The source string is one sentence, so everything
                        // after the first comma arrives lowercase. As list
                        // items they each start a line of their own.
                        <li key={inc}>{inc.charAt(0).toUpperCase() + inc.slice(1)}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="dp-pricing__fp">
            *Prices subject to eligibility, site inspection and rebate program changes. Final quote provided in writing.
          </p>

          {(content.included || content.excluded || content.typical) && (
            <div className="svc-scope">
              {content.included && (
                <div className="svc-scope__col svc-scope__col--included">
                  <div className="svc-scope__lbl">What&rsquo;s included</div>
                  <ul>
                    {content.included.map((i) => <li key={i}>{i}</li>)}
                  </ul>
                </div>
              )}
              {content.excluded && (
                <div className="svc-scope__col svc-scope__col--excluded">
                  <div className="svc-scope__lbl">We&rsquo;ll quote it and let you know</div>
                  <ul>
                    {content.excluded.map((e) => <li key={e}>{e}</li>)}
                  </ul>
                </div>
              )}
              {content.typical && (
                <div className="svc-scope__col svc-scope__col--typical">
                  <div className="svc-scope__lbl">Typical job</div>
                  <dl>
                    <dt>Time</dt><dd>{content.typical.time}</dd>
                    <dt>Warranty</dt><dd>{content.typical.warranty}</dd>
                    <dt>Price range</dt><dd>{content.typical.priceRange}</dd>
                    <dt>Follow-up</dt><dd>{content.typical.followUp}</dd>
                  </dl>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {!content.whyFirst && (
        <>
          {beforeAfterSection}
          {installShots}
        </>
      )}

      {/* THE RANGE — a button per brand into the brand page. This
          replaces the brand pods, which were a paragraph of prose each on
          a page somebody picked for the service, not the brand. */}
      <RangeBand
        heading={`The brands we fit for ${svc.short.toLowerCase()}.`}
        blurb="Every model, spec and installed price sits on the brand page. One press each."
        brands={content.brandPods ?? []}
      />

      {/* The proof strip came out. The review marquee at the foot of
          the page is the same content under the same heading. */}

      {/* QUOTE — the home page's orange panel. */}
      <section className="dp-quote quotesec" id="quote">
        <div className="wrap">
          <div className="quotesec__box">
            <div className="quotesec__grid">
              <div className="quotesec__left">
                <span className="ds-eyebrow ds-eyebrow--on-orange">
                  <span className="ds-dot ds-dot--on-orange" /> Free quote
                </span>
                <h2>Quote for {svc.short.toLowerCase()}.</h2>
                <p className="quotesec__lede">
                  60 seconds, no obligation, replied within 2 business hours. Rebates applied and
                  GST included, so the number you get is the number you pay.
                </p>
                <ul className="quotesec__points">
                  <li><span className="tick tick--on-orange">✓</span> Same person quotes as installs</li>
                  <li><span className="tick tick--on-orange">✓</span> No obligation and no pushy call-back</li>
                  <li><span className="tick tick--on-orange">✓</span> Emergency? Call {site.phone} instead</li>
                </ul>
                <div className="quotesec__chips">
                  {suburbs.slice(0, 8).map((sb) => (
                    <Link key={sb.slug} href={`/areas/${sb.slug}/${svc.slug}`}>{sb.name}</Link>
                  ))}
                </div>
              </div>
              <QuoteForm presetService={params.slug} />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ — heading and a human line left, accordions right. */}
      <section className="dp-faq faq">
        <div className="wrap faq__grid">
          <div className="faq__left">
            <span className="ds-eyebrow"><span className="ds-dot" /> Common questions</span>
            <h2>Quick honest answers.</h2>
            <p>
              If your question isn&apos;t here,{" "}
              <a href={`tel:${site.phoneE164}`} style={{ color: "var(--navy)", textUnderlineOffset: 2 }}>
                call {site.phone}
              </a>
              .
            </p>
          </div>
          <div className="faq__right">
            {content.faqs.map((f, i) => (
              <details key={f.q} name="faq" {...(i === 0 ? { open: true } : {})}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <ReviewMarquee heading="Reviews from households across the south-east." />

      {/* BIG CTA */}
      <Script id={`ld-svc-${svc.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema(svc.slug)) }} />
      <Script id={`ld-crumbs-${svc.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <Script id={`ld-faq-svc-${svc.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(content.faqs)) }} />
    </div>
  );
}
