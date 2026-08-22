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
import { InstagramFeed } from "@/components/InstagramFeed";
import { BEFORE_AFTER } from "@/lib/gallery";
import "../../detail.css";
import { pageTitle, metaDescription } from "@/lib/seo";

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

  // The range: manufacturer product shots plus the Instagram pitch.
  const rangeSection = (
    <>
      {/* THE GEAR WE INSTALL — manufacturer product shots, with an
          honest note + a link to Instagram where the actual on-the-tools
          install photos live. */}
      {content.photos && content.photos.length > 0 && (
        <section className="svc-photos">
          <div className="wrap">
            <div className="ds-section-head ds-section-head--hl">
              <span className="ds-eyebrow"><span className="ds-dot" /> The gear we install</span>
              <h2>What we put in for {svc.short.toLowerCase()}.</h2>
              <p>
                These are the manufacturer product shots so you can see exactly which unit
                we&rsquo;re quoting. For photos of our actual installs, on the roof,
                in the cupboard, on the wall, head to our Instagram.
              </p>
            </div>
            <div className="svc-photos__grid">
              {content.photos.map((p) => (
                <figure key={p.src} className="svc-photo">
                  <img src={p.src} alt={p.alt} loading="lazy" width="600" height="450" />
                  {p.caption && <figcaption>{p.caption}</figcaption>}
                </figure>
              ))}
            </div>
            {/* Only pitch Instagram here when the live feed below isn't
                carrying the load — otherwise it's two asks in a row. */}
            {igPosts.length === 0 && (
              <InstagramCTA
                heading="See the real thing on Instagram"
                body={`Every ${svc.short.toLowerCase()} job we finish goes up on our feed, real houses, real cupboards, real rooflines across Pakenham, Berwick, Officer and Cranbourne.`}
              />
            )}
          </div>
        </section>
      )}
    </>
  );

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
      <WhyDifferent service={svc.short.toLowerCase()} content={content.whyThese} />
    </>
  );

  return (
    <div className="page-detail">
      {/* HERO — two-column with a photo panel and trust bar, so service
          pages carry the same weight as the home page instead of opening
          with a wall of text on paper. */}
      <section className="dp-hero dp-hero--rich">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb" style={{ paddingTop: 24 }}>
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/services">Services</Link>
            <span className="sep">/</span>
            <span className="cur">{svc.short}</span>
          </nav>

          <div className="dp-hero__grid">
            <div className="dp-hero__col">
              <div className="dp-hero__eyebrow">
                <span className="ds-dot" />
                {svc.short} · Pakenham &amp; within 75 km
              </div>
              <h1>{content.h1}</h1>
              <p className="dp-hero__sub">{content.intro}</p>
              <div className="dp-hero__ctas">
                <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get my free quote →</Link>
                <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost ds-btn--lg">
                  Or call {site.phone}
                </a>
              </div>

              <div className="dp-trust">
                <div className="dp-trust__stat dp-trust__stat--stars">
                  <strong>★★★★★</strong>
                  <span>4.9 / 5 on Google</span>
                </div>
                <div className="dp-trust__div" />
                <div className="dp-trust__stat">
                  <strong>1,200+</strong>
                  <span>installs since 2014</span>
                </div>
                <div className="dp-trust__div" />
                <div className="dp-trust__stat">
                  <strong>6-year</strong>
                  <span>workmanship warranty</span>
                </div>
              </div>
            </div>

            {heroPhoto && (
              <div className="dp-hero__col">
                <div className="dp-hero__media dp-hero__media--contain">
                  <img src={heroPhoto.src} alt={heroPhoto.alt} width="800" height="600" fetchPriority="high" />
                  {content.typical && (
                    <div className="dp-hero__badge">
                      <strong>{content.typical.time.split("·")[0].trim()}</strong>
                      <span>Typical job</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
          {rangeSection}
          {installShots}
          {beforeAfterSection}
        </>
      )}

      {/* BENEFITS — boxed in orange on why-first pages, matching the
          home page's callout, so the run of cream sections gets broken. */}
      <section className={`dp-benefits${content.whyFirst ? " dp-benefits--boxed" : ""}`}>
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot" /> What&apos;s included</span>
            <h2>Every {svc.short.toLowerCase()} we do, done properly.</h2>
          </div>
          <div className="dp-benefits__grid">
            {content.benefits.map((b, i) => (
              <div key={b.t} className="dp-benefit">
                <div className="dp-benefit__num">/{String(i + 1).padStart(2, "0")}</div>
                <h3>{b.t}</h3>
                <p>{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW WE DO IT · numbered install-process steps, distinct per
          service so no two service pages share the same body copy. */}
      {content.steps && content.steps.length > 0 && (
        <section className="svc-steps">
          <div className="wrap">
            <div className="ds-section-head ds-section-head--hl">
              <span className="ds-eyebrow"><span className="ds-dot" /> How we do it</span>
              <h2>Our {svc.short.toLowerCase()} process, step by step.</h2>
              <p>The same six-step run-through we walk you through on the quote call. No surprises on install day.</p>
            </div>
            <ol className="svc-steps__list">
              {content.steps.map((s, i) => (
                <li key={s.title} className="svc-step">
                  <span className="svc-step__num">{String(i + 1).padStart(2, "0")}</span>
                  <div className="svc-step__body">
                    <h3>{s.title}</h3>
                    <p>{s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* SYSTEM TYPES · one anchored block per system, so the header's
          "Split system" / "Multi-head" / "Ducted" menu links land on
          something that actually differs. Ids come from content.systems
          and must match SERVICE_MENU in Header.tsx. */}
      {content.systems && content.systems.length > 0 && (
        <section className="svc-systems">
          <div className="wrap">
            <div className="ds-section-head ds-section-head--hl">
              <span className="ds-eyebrow"><span className="ds-dot" /> Systems we install</span>
              <h2>Which system suits your place.</h2>
              <p>Different homes want different gear. Here&rsquo;s the honest difference between them, including where each one falls down.</p>
            </div>

            <nav className="svc-systems__jump" aria-label="System types">
              {content.systems.map((sys) => (
                sys.intro
                  ? <Link key={sys.id} href={`/services/${svc.slug}/${sys.id}`}>{sys.label}</Link>
                  : <a key={sys.id} href={`#${sys.id}`}>{sys.label}</a>
              ))}
            </nav>

            {content.systems.map((sys, i) => (
              <article
                key={sys.id}
                id={sys.id}
                className={`svc-system${i % 2 === 1 ? " svc-system--flip" : ""}`}
              >
                <div className="svc-system__media">
                  <img src={sys.photo.src} alt={sys.photo.alt} loading="lazy" width="800" height="600" />
                </div>
                <div className="svc-system__body">
                  <h3>{sys.label}</h3>
                  <p className="svc-system__blurb">{sys.blurb}</p>
                  <ul className="svc-system__points">
                    {sys.points.map((pt) => <li key={pt}>{pt}</li>)}
                  </ul>
                  <div className="svc-system__foot">
                    {sys.priceFrom && <span className="svc-system__price">{sys.priceFrom}</span>}
                    {sys.intro ? (
                      <Link href={`/services/${svc.slug}/${sys.id}`} className="ds-btn ds-btn--orange ds-btn--sm">
                        Read more about {sys.label.toLowerCase()} →
                      </Link>
                    ) : (
                      <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--sm">
                        Quote this system →
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {!content.whyFirst && whyUsSection}

      {/* The upgrade + rebate argument, deliberately placed immediately
          before the prices, because it's the thing that makes the prices
          make sense. */}
      <div className="wrap">
        <UpgradeNudge variant={NUDGE_BY_SERVICE[svc.slug] ?? "general"} />
      </div>

      {/* PRICING */}
      <section className="dp-pricing">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Indicative pricing</span>
            <h2>Transparent fixed-price options.</h2>
            <p>Real numbers, not &ldquo;from $X&rdquo; bait. Your final quote depends on site specifics and we confirm it in writing before any work starts.</p>
          </div>
          <div className="dp-pricing__table">
            <table>
              <thead>
                <tr>
                  <th>System</th>
                  <th>Price</th>
                  <th>Includes</th>
                </tr>
              </thead>
              <tbody>
                {content.pricing.map((p) => (
                  <tr key={p.tier}>
                    <td><span className="dp-pricing__tier">{p.tier}</span></td>
                    <td><span className="dp-pricing__price">{p.price}</span></td>
                    <td>{p.includes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          {rangeSection}
          {installShots}
        </>
      )}

      {/* Live Instagram, posts whose caption mentions this kind of job. */}
      <InstagramFeed
        posts={igPosts}
        eyebrow={`${svc.short} on the tools`}
        heading={`Our latest ${svc.short.toLowerCase()} jobs.`}
        blurb={`Straight from our Instagram, real jobs across Melbourne's south-east, posted as we finish them.`}
      />

      {/* BRAND PODS, richer version of the flat brand tag row */}
      {content.brandPods && content.brandPods.length > 0 && (
        <section className="svc-brandpods">
          <div className="wrap">
            <div className="ds-section-head ds-section-head--hl">
              <span className="ds-eyebrow"><span className="ds-dot" /> Brands we install</span>
              <h2>What we quote and why.</h2>
            </div>
            <div className="svc-brandpods__grid">
              {content.brandPods.map((b) => (
                <Link
                  key={b.brand}
                  href={b.href ?? "/brands"}
                  className="svc-brandpod"
                >
                  <div className="svc-brandpod__name">{b.brand}</div>
                  <div className="svc-brandpod__reason">{b.reason}</div>
                  <span className="svc-brandpod__more">See our range →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* BRANDS · flat tag row for SEO + fallback */}
      <section className="dp-brands">
        <div className="wrap">
          <h3>Also supported</h3>
          <div className="dp-brands__row">
            {content.brands.map((b) => <span key={b}>{b}</span>)}
          </div>
        </div>
      </section>


      {/* PROOF · compact reviews row, so the page earns the form below it */}
      <ProofStrip
        subject={svc.short.toLowerCase()}
        heading="Rated 4.9 by the households we work for."
      />

      {/* QUOTE */}
      <section className="dp-quote">
        <div className="wrap dp-quote__grid">
          <div className="dp-quote__copy">
            <span className="ds-eyebrow"><span className="ds-dot" /> Free quote</span>
            <h2>Quote for {svc.short.toLowerCase()}.</h2>
            <p>60 seconds. No obligation. Replied within 2 business hours.</p>
            <h3 style={{ marginTop: 24, marginBottom: 10, fontFamily: "var(--f-mono)", fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)" }}>
              Service areas
            </h3>
            <div className="dp-quote__chips">
              {suburbs.slice(0, 8).map((s) => (
                <Link key={s.slug} href={`/areas/${s.slug}/${svc.slug}`}>{s.name}</Link>
              ))}
            </div>
          </div>
          <QuoteForm presetService={params.slug} />
        </div>
      </section>

      {/* FAQ */}
      <section className="dp-faq">
        <div className="wrap dp-faq__grid">
          <div className="dp-faq__left">
            <span className="ds-eyebrow"><span className="ds-dot" /> Common questions</span>
            <h2>Quick honest answers.</h2>
            <p>If your question isn&apos;t here, call us on <a href={`tel:${site.phoneE164}`} style={{ color: "var(--navy)" }}>{site.phone}</a>.</p>
          </div>
          <div className="dp-faq__right">
            {content.faqs.map((f, i) => (
              <details key={f.q} {...(i === 0 ? { open: true } : {})}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* BIG CTA */}
      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>Ready for your {svc.short.toLowerCase()} quote?</h2>
            <p>Free, no-obligation, replied within 2 business hours.</p>
          </div>
          <div className="bigcta__btns">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--xl">Start my free quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>

      <Script id={`ld-svc-${svc.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema(svc.slug)) }} />
      <Script id={`ld-crumbs-${svc.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <Script id={`ld-faq-svc-${svc.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(content.faqs)) }} />
    </div>
  );
}
