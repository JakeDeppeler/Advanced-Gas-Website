import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { site } from "@/lib/site";
import {
  FAULT_CODES,
  FAULT_SYSTEM_LABELS,
  detailedCodes,
  faultSlug,
  findFaultCode,
} from "@/lib/faultCodes";
import { absoluteTitle, metaDescription, seoMeta } from "@/lib/seo";
import { breadcrumbSchema } from "@/lib/schema";
import "./fault-detail.css";
import { Crumbs, Hero } from "@/components/homepage/page/kit";
import { EndCta } from "@/components/homepage/page/bands";
import { BkMotion } from "@/components/homepage/brand/BkMotion";
import "@/components/homepage/brand/blocks.css";
import "@/components/homepage/page/service.css";
import "@/components/homepage/tools/calc-c.css";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
import { JsonLd } from "@/components/JsonLd";

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
  if (!f) notFound();
  return seoMeta({
    title: `${f.brand} ${f.code} fault code`,
    description: `${f.brand} ${f.code}: ${f.meaning}. What causes it, what you can safely check yourself, and what needs a licensed technician. ${site.name}, Pakenham.`,
    canonical: `/tools/fault-codes/${params.brand}/${params.code}`,
    absolute: true,
  });
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
    // Two boxes: the band styles hang off .bk sitting inside .ag, as on the service pages.
    <div className="ag ag--flat" data-no-reveal><div className="bk svk" style={{ ["--acc" as string]: "#C2521A" }}>
      <BkMotion />
      <JsonLd data={crumbs} />
      <JsonLd data={faqSchema} />

      <Crumbs trail={[{ name: "Tools", href: "/tools" }, { name: "Fault codes", href: "/tools/fault-codes" }, { name: `${f.brand} ${f.code}` }]} />
      <Hero eye={`${f.brand} · ${FAULT_SYSTEM_LABELS[f.system]}`} title={<>{f.brand} fault code <em>{f.code}</em></>} sub={`${f.meaning}.`} ctas={false}>
        {/* Severity is written out in words, with a mark that differs by shape, so colour is never the only signal. */}
        <div className={`fd-sev fd-sev--${f.severity}`}>
          <i aria-hidden="true">{f.severity === "info" ? "i" : f.severity === "critical" ? "✕" : "!"}</i>
          <span className="fd-sev__t">
            <strong>{sev.label}</strong>
            <span>{sev.note}</span>
          </span>
        </div>
        <div className="bxh__ctas">
          <a href={`tel:${site.phoneE164}`} className="abtn abtn--or abtn--flat">Call {site.phone}</a>
          <Link href="/#quote" className="abtn abtn--line">Book a service call →</Link>
        </div>
      </Hero>

      {/* 1. What it means, beside the call */}
      <section className="bk__sec bk__sec--white" id="means">
        <div className="wrap"><div className="bk__blk cc-two">
          <div className="bk__col">
            <header className="bk__head"><h2 className="h2">What {f.code} actually <span>means</span>.</h2></header>
            <div className="cc-prose"><p>{d.whatItMeans}</p></div>
          </div>
          <div className="cc-now">
            <h3>Got this code right now?</h3>
            <p>
              We service every major brand, including ones we don&rsquo;t install.
              Same-day across Pakenham, Officer, Berwick, Beaconsfield, Narre Warren
              and Cranbourne.
            </p>
            <a href={`tel:${site.phoneE164}`} className="abtn abtn--or abtn--flat">Call {site.phone}</a>
            <p className="cc-fine">
              Written quoted in writing before we touch anything. Call-out waived
              if the repair goes ahead the same day.
            </p>
          </div>
        </div></div>
      </section>

      {/* 2. Causes, most likely first */}
      <section className="bk__sec bk__sec--cream" id="causes">
        <div className="wrap"><div className="bk__blk bk__col">
          <header className="bk__head">
            <h2 className="h2">What <span>causes</span> it.</h2>
            <p>Most likely first. That order is from what we actually find on site, not from the manual.</p>
          </header>
          <ol className="cc-causes" data-anim="stagger">
            {d.causes.map((c) => <li key={c} className="cc-card">{c}</li>)}
          </ol>
        </div></div>
      </section>

      {/* 3. What you can check, and what we check */}
      <section className="bk__sec bk__sec--white" id="checks">
        <div className="wrap"><div className="bk__blk bk__col">
          <header className="bk__head"><h2 className="h2">Check it yourself, or <span>call us</span>.</h2></header>
          <div className="cc-checks">
            <div className="cc-card cc-check cc-check--diy">
              <h3><i aria-hidden="true">✓</i>Safe to check yourself</h3>
              <p>No tools, no covers off, nothing to do with gas, refrigerant or wiring.</p>
              <ul>{d.diyChecks.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
            <div className="cc-card cc-check cc-check--tech">
              <h3><i aria-hidden="true">⚙</i>What we check on site</h3>
              <p>So you know what you&rsquo;re paying for.</p>
              <ul>{d.techChecks.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
          </div>
        </div></div>
      </section>

      {/* 4. Keep using it, and the fix */}
      <section className="bk__sec bk__sec--cream" id="fix">
        <div className="wrap"><div className="bk__blk cc-pair">
          <div className="cc-card">
            <span className="cc-lbl">Right now</span>
            <h3>Can you keep using it?</h3>
            <p>{d.keepRunning}</p>
          </div>
          <div className="cc-card">
            <span className="cc-lbl">The repair</span>
            <h3>What the fix usually involves</h3>
            <p>{d.typicalFix}</p>
          </div>
        </div></div>
      </section>

      {/* 5. Worth fixing? The question that follows every fault code, so it
          lives here rather than in the Tools menu. Someone reading this has
          already decided something is wrong; the next thing they want to
          know is whether it's worth fixing. */}
      <section className="bk__sec bk__sec--white" id="worth">
        <div className="wrap"><div className="bk__blk cc-two">
          <div className="bk__col">
            <header className="bk__head"><h2 className="h2">Is it worth <span>fixing</span>?</h2></header>
            <div className="cc-prose">
              <p>
                That depends almost entirely on how old the unit is. Past about ten years on
                hot water and gas heating, and twelve on aircon, a significant repair usually
                costs more per remaining year than a replacement does, and it&rsquo;s the same
                point at which the VEU rebate is worth the most, because old inefficient
                appliances are exactly what the scheme pays to remove. If yours is young and
                the fault is a component, we&rsquo;ll fix it and say so.
              </p>
              <p>
                <Link href="/upgrade-or-repair" className="cc-allcodes">
                  Repair or replace? The 10-year rule, and what the rebate is worth →
                </Link>
              </p>
            </div>
          </div>
          <div className="cc-card cc-side">
            <h3>Fix it or replace it?</h3>
            <p>
              How long these systems actually last, the six signs it&rsquo;s replacement
              time, and when we&rsquo;d tell you to repair instead.
            </p>
            <Link href="/upgrade-or-repair" className="abtn abtn--ghost">The 10-year rule →</Link>
          </div>
        </div></div>
      </section>

      {/* 6. Other codes from the same brand and system */}
      {more.length > 0 && (
        <section className="bk__sec bk__sec--cream" id="more">
          <div className="wrap"><div className="bk__blk bk__col">
            <header className="bk__head"><h2 className="h2">Other {f.brand} <span>codes</span>.</h2></header>
            <ul className="cc-codes" data-anim="stagger">
              {more.map((m) => (
                <li key={m.code}>
                  {m.detail ? (
                    <Link href={`/tools/fault-codes/${faultSlug(m.brand)}/${faultSlug(m.code)}`}>
                      <b>{m.code}</b> {m.meaning}
                    </Link>
                  ) : (
                    <span><b>{m.code}</b> {m.meaning}</span>
                  )}
                </li>
              ))}
            </ul>
            <Link href="/tools/fault-codes" className="cc-allcodes">
              Every fault code we have →
            </Link>
          </div></div>
        </section>
      )}

      <EndCta title={`${f.brand} ${f.code} still showing?`} text="Book a service call and we'll diagnose it and quote the repair in writing before touching anything." from="fault-code" />
    </div></div>
  );
}
