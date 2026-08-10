import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { services, site } from "@/lib/site";
import { serviceContent } from "@/lib/serviceContent";
import { breadcrumbSchema, faqSchema } from "@/lib/schema";
import { QuoteForm } from "@/components/QuoteForm";
import { ProofStrip } from "@/components/ProofStrip";
import { getInstagramForService } from "@/lib/instagram";
import { InstagramFeed } from "@/components/InstagramFeed";
import "../../../detail.css";

/**
 * A page per system type — /services/gas-plumbing/gas-ducted and so on.
 *
 * These used to be fragments on the parent service page, which meant the
 * header's "Split system" and "Multi-head" links landed a customer on the
 * same page twice. Each system now has somewhere of its own to rank and
 * somewhere of its own to send people.
 *
 * Content lives on serviceContent[svc].systems[] — a system without an
 * `intro` is treated as not ready for its own page and 404s rather than
 * shipping a thin one.
 */

function find(slug: string, systemId: string) {
  const content = serviceContent[slug];
  const svc = services.find((s) => s.slug === slug);
  const system = content?.systems?.find((x) => x.id === systemId);
  if (!content || !svc || !system?.intro) return null;
  return { content, svc, system };
}

export function generateStaticParams() {
  return Object.entries(serviceContent).flatMap(([slug, c]) =>
    (c.systems ?? [])
      .filter((s) => s.intro)
      .map((s) => ({ slug, system: s.id })),
  );
}

export function generateMetadata({
  params,
}: {
  params: { slug: string; system: string };
}): Metadata {
  const found = find(params.slug, params.system);
  if (!found) return {};
  const { system } = found;
  return {
    title: `${system.label} · Pakenham, Berwick & Melbourne's South-East | Advanced Gas & Aircon`,
    description: system.blurb.slice(0, 155),
    alternates: { canonical: `/services/${params.slug}/${params.system}` },
  };
}

export default async function SystemPage({
  params,
}: {
  params: { slug: string; system: string };
}) {
  const found = find(params.slug, params.system);
  if (!found) notFound();
  const { content, svc, system } = found;

  const igPosts = await getInstagramForService(params.slug, 6);
  const siblings = (content.systems ?? []).filter((s) => s.id !== system.id && s.intro);

  // Pricing rows that mention this system, so each page shows its own
  // numbers rather than the service's entire table.
  const words = system.label.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
  const rows = content.pricing.filter((p) =>
    words.some((w) => p.tier.toLowerCase().includes(w)),
  );
  const pricing = rows.length > 0 ? rows : content.pricing;

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Services", url: `${site.url}/services` },
    { name: svc.name, url: `${site.url}/services/${svc.slug}` },
    { name: system.label, url: `${site.url}/services/${svc.slug}/${system.id}` },
  ]);

  return (
    <div className="page-detail">
      <section className="dp-hero dp-hero--rich">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb" style={{ paddingTop: 24 }}>
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/services">Services</Link>
            <span className="sep">/</span>
            <Link href={`/services/${svc.slug}`}>{svc.short}</Link>
            <span className="sep">/</span>
            <span className="cur">{system.label}</span>
          </nav>

          <div className="dp-hero__grid">
            <div className="dp-hero__col">
              <div className="dp-hero__eyebrow">
                <span className="ds-dot" /> {svc.short} · Pakenham &amp; within 75 km
              </div>
              <h1>{system.label}</h1>
              <p className="dp-hero__sub">{system.intro}</p>
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

            <div className="dp-hero__col">
              <div className="dp-hero__media dp-hero__media--contain">
                <img src={system.photo.src} alt={system.photo.alt} width="800" height="600" fetchPriority="high" />
                {system.priceFrom && (
                  <div className="dp-hero__badge">
                    <strong>{system.priceFrom.replace(/^from /, "")}</strong>
                    <span>Typically</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What you get — boxed in orange so it reads as the value list
          rather than another block of body copy. */}
      <section className="dp-benefits dp-benefits--boxed">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> What you get</span>
            <h2>What&rsquo;s in the price.</h2>
            <p>{system.blurb}</p>
          </div>
          <div className="dp-benefits__grid">
            {system.points.map((pt, i) => (
              <div key={pt} className="dp-benefit">
                <div className="dp-benefit__num">/{String(i + 1).padStart(2, "0")}</div>
                <p>{pt}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Right call / wrong call, the honest half */}
      {(system.bestFor || system.watchOut) && (
        <section className="sysfit">
          <div className="wrap">
            <div className="ds-section-head ds-section-head--hl">
              <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Is it right for you</span>
              <h2>Where {system.label.toLowerCase()} works, and where it doesn&rsquo;t.</h2>
              <p>
                We&rsquo;d rather you read this and ring someone else than have us fit
                the wrong thing and both regret it.
              </p>
            </div>
            <div className="sysfit__grid">
              {system.bestFor && (
                <div className="sysfit__col sysfit__col--yes">
                  <h3>The right call when</h3>
                  <ul>{system.bestFor.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              )}
              {system.watchOut && (
                <div className="sysfit__col sysfit__col--no">
                  <h3>Think twice if</h3>
                  <ul>{system.watchOut.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Process, shared with the parent service */}
      {content.steps && content.steps.length > 0 && (
        <section className="svc-steps">
          <div className="wrap">
            <div className="ds-section-head ds-section-head--hl">
              <span className="ds-eyebrow"><span className="ds-dot" /> How we do it</span>
              <h2>What happens, start to finish.</h2>
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

      {/* Pricing */}
      <section className="dp-pricing">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Indicative pricing</span>
            <h2>What {system.label.toLowerCase()} costs.</h2>
            <p>Real numbers. Your final quote depends on site specifics and we confirm it in writing before any work starts.</p>
          </div>
          <div className="dp-pricing__table">
            <table>
              <thead>
                <tr><th>System</th><th>Price</th><th>Includes</th></tr>
              </thead>
              <tbody>
                {pricing.map((p) => (
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
            *Subject to eligibility, site inspection and rebate program changes. Final quote in writing.
          </p>
        </div>
      </section>

      <ProofStrip subject={system.label.toLowerCase()} heading="Rated 4.9 by the households we work for." />

      <InstagramFeed
        posts={igPosts}
        eyebrow={`${svc.short} on the tools`}
        heading="Recent jobs from our Instagram."
        blurb="Real work across Melbourne's south-east, posted as we finish it."
      />

      {/* Quote */}
      <section className="dp-quote">
        <div className="wrap dp-quote__grid">
          <div className="dp-quote__copy">
            <span className="ds-eyebrow"><span className="ds-dot" /> Free quote</span>
            <h2>Quote for {system.label.toLowerCase()}.</h2>
            <p>60 seconds. No obligation. Replied within 2 business hours.</p>

            {siblings.length > 0 && (
              <>
                <h3 style={{ marginTop: 24, marginBottom: 10, fontFamily: "var(--f-mono)", fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                  Weighing up the alternatives
                </h3>
                <div className="dp-quote__chips">
                  {siblings.map((sib) => (
                    <Link key={sib.id} href={`/services/${svc.slug}/${sib.id}`}>{sib.label}</Link>
                  ))}
                  <Link href={`/services/${svc.slug}`}>All {svc.short.toLowerCase()}</Link>
                </div>
              </>
            )}
          </div>
          <QuoteForm presetService={params.slug} />
        </div>
      </section>

      {/* FAQ, system-specific */}
      {system.faqs && system.faqs.length > 0 && (
        <section className="dp-faq">
          <div className="wrap dp-faq__grid">
            <div className="dp-faq__left">
              <span className="ds-eyebrow"><span className="ds-dot" /> Common questions</span>
              <h2>Quick honest answers.</h2>
              <p>
                Anything else, call us on{" "}
                <a href={`tel:${site.phoneE164}`} style={{ color: "var(--navy)" }}>{site.phone}</a>.
              </p>
            </div>
            <div className="dp-faq__right">
              {system.faqs.map((f, i) => (
                <details key={f.q} {...(i === 0 ? { open: true } : {})}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>Ready for a {system.label.toLowerCase()} quote?</h2>
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

      <Script id={`ld-crumbs-${svc.slug}-${system.id}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      {system.faqs && system.faqs.length > 0 && (
        <Script id={`ld-faq-${svc.slug}-${system.id}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(system.faqs)) }} />
      )}
    </div>
  );
}
