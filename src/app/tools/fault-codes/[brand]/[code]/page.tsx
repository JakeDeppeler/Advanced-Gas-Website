import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import {
  FAULT_CODES,
  FAULT_SYSTEM_LABELS,
  detailedCodes,
  faultSlug,
  findFaultCode,
} from "@/lib/faultCodes";
import { absoluteTitle, metaDescription } from "@/lib/seo";
import { breadcrumbSchema } from "@/lib/schema";
import "../../../../detail.css";
import "./fault-detail.css";

/**
 * One page per fault code.
 *
 * This is the best-shaped search on the whole site. Someone typing
 * "brivis h01 40" has a broken heater, a code on a wall controller and
 * a decision to make, and everything Google currently returns is a PDF
 * of a service manual or a forum thread from 2014. A page that answers
 * the question properly wins that search without much of a fight, and
 * the person on the other end of it needs a technician today.
 *
 * Only codes with a `detail` block get a page. A route that generated
 * all 149 would be 149 pages of two sentences each, which is the same
 * thin-page problem that stopped the suburb pages being indexed. The
 * rest stay in the lookup table until someone writes the substance.
 *
 * The DIY list is deliberately conservative: filters, vents, isolators,
 * things you can do without tools or taking a cover off. Anything
 * involving gas, refrigerant or wiring is in the technician column,
 * because this page will be read by people standing in front of a
 * broken appliance who would quite like to fix it themselves.
 */

type Params = { brand: string; code: string };

export function generateStaticParams() {
  return detailedCodes().map((f) => ({
    brand: faultSlug(f.brand),
    code: faultSlug(f.code),
  }));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const f = findFaultCode(params.brand, params.code);
  if (!f) return {};
  return {
    title: absoluteTitle(`${f.brand} ${f.code} fault code`),
    description: metaDescription(
      `${f.brand} ${f.code}: ${f.meaning}. What causes it, what you can safely check yourself, and what needs a licensed technician. ${site.name}, Pakenham.`,
    ),
    alternates: { canonical: `/tools/fault-codes/${params.brand}/${params.code}` },
  };
}

const SEVERITY: Record<string, { label: string; note: string }> = {
  info: { label: "Informational", note: "Not a breakdown. Worth understanding, not worth panicking about." },
  warn: { label: "Needs attention", note: "Book someone. It won't fix itself and it usually gets worse." },
  critical: { label: "Stop using it", note: "Turn the system off and don't restart it until it's been looked at." },
};

export default function FaultCodePage({ params }: { params: Params }) {
  const f = findFaultCode(params.brand, params.code);
  if (!f || !f.detail) notFound();
  const d = f.detail;
  const sev = SEVERITY[f.severity];

  // Same brand, same system, so "other codes" stays relevant.
  const siblings = FAULT_CODES.filter(
    (x) => x.brand === f.brand && x.code !== f.code && x.system === f.system,
  );
  const related = (d.related ?? [])
    .map((c) => FAULT_CODES.find((x) => x.brand === f.brand && x.code === c))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
  const more = (related.length ? related : siblings).slice(0, 6);

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Tools", url: `${site.url}/tools` },
    { name: "Fault codes", url: `${site.url}/tools/fault-codes` },
    { name: `${f.brand} ${f.code}`, url: `${site.url}/tools/fault-codes/${params.brand}/${params.code}` },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { q: `What does ${f.brand} fault code ${f.code} mean?`, a: d.whatItMeans },
      { q: `Can I keep using it with ${f.code} showing?`, a: d.keepRunning },
      { q: `What does it cost to fix ${f.brand} ${f.code}?`, a: d.typicalFix },
    ].map((x) => ({
      "@type": "Question",
      name: x.q,
      acceptedAnswer: { "@type": "Answer", text: x.a },
    })),
  };

  return (
    <div className="page-detail fault-detail">
      <Script id={`ld-fault-crumbs-${params.brand}-${params.code}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <Script id={`ld-fault-faq-${params.brand}-${params.code}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <section className="dp-hero">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/tools/fault-codes">Fault codes</Link>
            <span className="sep">/</span>
            <span className="cur">{f.brand} {f.code}</span>
          </nav>
          <div className="dp-hero__eyebrow">
            <span className="ds-dot ds-dot--orange" />
            {f.brand} · {FAULT_SYSTEM_LABELS[f.system]}
          </div>
          <h1>
            {f.brand} fault code <span className="accent">{f.code}</span>
          </h1>
          <p className="dp-hero__sub">{f.meaning}.</p>

          <div className={`fd-sev fd-sev--${f.severity}`}>
            <strong>{sev.label}</strong>
            <span>{sev.note}</span>
          </div>

          <div className="dp-hero__ctas">
            <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--orange ds-btn--lg">
              Call {site.phone}
            </a>
            <Link href="/quote" className="ds-btn ds-btn--ghost ds-btn--lg">
              Book a service call →
            </Link>
          </div>
        </div>
      </section>

      <section className="fd-body">
        <div className="wrap fd-grid">
          <div className="fd-main">
            <h2>What {f.code} actually means</h2>
            <p>{d.whatItMeans}</p>

            <h2>What causes it</h2>
            <ol className="fd-causes">
              {d.causes.map((c) => <li key={c}>{c}</li>)}
            </ol>
            <p className="fd-note">Most likely first. That order is from what we actually find on site, not from the manual.</p>

            <div className="fd-checks">
              <div className="fd-checks__col fd-checks__col--diy">
                <h3>Safe to check yourself</h3>
                <p>No tools, no covers off, nothing to do with gas, refrigerant or wiring.</p>
                <ul>{d.diyChecks.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
              <div className="fd-checks__col fd-checks__col--tech">
                <h3>What we check on site</h3>
                <p>So you know what you&rsquo;re paying for.</p>
                <ul>{d.techChecks.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
            </div>

            <h2>Can you keep using it?</h2>
            <p>{d.keepRunning}</p>

            <h2>What the fix usually involves</h2>
            <p>{d.typicalFix}</p>

            {/* The question that follows every fault code, so it lives
                here rather than in the Tools menu. Someone reading this
                has already decided something is wrong; the next thing
                they want to know is whether it's worth fixing. */}
            <h2>Is it worth fixing?</h2>
            <p>
              That depends almost entirely on how old the unit is. Past about ten years on
              hot water and gas heating, and twelve on aircon, a significant repair usually
              costs more per remaining year than a replacement does — and it&rsquo;s the same
              point at which the VEU rebate is worth the most, because old inefficient
              appliances are exactly what the scheme pays to remove. If yours is young and
              the fault is a component, we&rsquo;ll fix it and say so.
            </p>
            <p>
              <Link href="/upgrade-or-repair" className="fd-inline-link">
                Repair or replace? The 10-year rule, and what the rebate is worth →
              </Link>
            </p>
          </div>

          <aside className="fd-side">
            <div className="fd-card">
              <h3>Got this code right now?</h3>
              <p>
                We service every major brand, including ones we don&rsquo;t install.
                Same-day across Pakenham, Officer, Berwick, Beaconsfield, Narre Warren
                and Cranbourne.
              </p>
              <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--orange ds-btn--sm">
                Call {site.phone}
              </a>
              <p className="fd-card__fine">
                Fixed price quoted in writing before we touch anything. Call-out waived
                if the repair goes ahead the same day.
              </p>
            </div>

            {more.length > 0 && (
              <div className="fd-card fd-card--plain">
                <h3>Other {f.brand} codes</h3>
                <ul className="fd-more">
                  {more.map((m) => (
                    <li key={m.code}>
                      {m.detail ? (
                        <Link href={`/tools/fault-codes/${faultSlug(m.brand)}/${faultSlug(m.code)}`}>
                          <strong>{m.code}</strong> {m.meaning}
                        </Link>
                      ) : (
                        <span><strong>{m.code}</strong> {m.meaning}</span>
                      )}
                    </li>
                  ))}
                </ul>
                <Link href="/tools/fault-codes" className="fd-more__all">
                  Every fault code we have →
                </Link>
              </div>
            )}

            <div className="fd-card fd-card--plain">
              <h3>Fix it or replace it?</h3>
              <p>
                How long these systems actually last, the six signs it&rsquo;s replacement
                time, and when we&rsquo;d tell you to repair instead.
              </p>
              <Link href="/upgrade-or-repair" className="fd-more__all">
                The 10-year rule →
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
