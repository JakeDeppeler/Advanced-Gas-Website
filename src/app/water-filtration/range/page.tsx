import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import { faqSchema, breadcrumbSchema } from "@/lib/schema";
import { pageTitle, metaDescription } from "@/lib/seo";
import { RANGE, CAPABILITIES, TIERS, type CapabilityKey } from "@/lib/waterFiltration";
import "../filtration.css";

/**
 * The full range, as a capability matrix.
 *
 * "Which filter do I need" is genuinely hard to answer from marketing
 * copy, because every product page claims to make your water better and
 * none of them says what it doesn't do. A grid of what each family
 * actually removes answers it in one screen, and it's the page a
 * homeowner comparing three quotes will actually use.
 *
 * Everything on it comes off the BWT cheat sheet and the 2025 brochure —
 * real descriptions, real Reece codes, real warranty terms. Where a
 * column isn't ticked on the source, it isn't ticked here.
 */

export const metadata: Metadata = {
  title: pageTitle("The Full Water Filtration Range"),
  description: metaDescription(
    "Every water filtration type we fit, and exactly what each one removes — sediment, hardness, chlorine, PFAS, lead, bacteria. Whole house, under sink, softeners and UV, compared in one table.",
  ),
  keywords: [
    "water filter comparison australia",
    "which water filter do i need",
    "whole house vs under sink water filter",
    "water filter that removes pfas",
    "water filter that removes lead",
    "bwt water filter melbourne",
    "puretec water filter installer",
  ],
  alternates: { canonical: "/water-filtration/range" },
};

const FAQS = [
  {
    q: "Which water filter removes the most?",
    a: "Reverse osmosis, by a distance — it's the only thing on this page that reaches dissolved salts, PFAS and pharmaceuticals. That doesn't make it the right choice. It's slow, it sends several litres to drain for every litre it makes, it strips minerals along with contaminants, and it only feeds one tap. Most households are better served by a whole-house twin system and an under-sink cartridge.",
  },
  {
    q: "What removes PFAS from drinking water?",
    a: "Of the systems we fit, reverse osmosis is the one rated for PFAS and PFOA. Standard sediment and carbon cartridges are not, and we won't tell you otherwise. If PFAS is your actual concern, start by finding out whether it's present in your supply — for most Melbourne mains connections it isn't a live issue.",
  },
  {
    q: "Do I need whole house and under sink?",
    a: "Plenty of people run both, and they do different jobs. Whole house handles sediment and chlorine everywhere — shower, washing machine, hot water system. Under sink runs a finer cartridge on the water you actually drink, which is how it reaches lead and cysts. If budget only stretches to one, tell us the symptom and we'll tell you which one addresses it.",
  },
  {
    q: "What's the difference between BWT and Puretec?",
    a: "Both are quality ranges and both come through Reece, which is where we get nearly everything. We've standardised on Puretec for most residential work. BWT is the range with a published capability matrix, and on softeners and backwash filters it's the stronger product. We'll quote whichever suits your water and tell you why.",
  },
  {
    q: "Are these Reece codes I can order myself?",
    a: "They're the TRS codes, so yes, they're real. We've published them because we'd rather you could check our pricing against the trade catalogue than take it on faith. Bear in mind filtration ties into your potable supply, which brings backflow protection into it — it's licensed plumbing work, not a weekend job.",
  },
];

const CHECK = "✓";

function Ticks({ treats }: { treats: readonly CapabilityKey[] }) {
  return (
    <>
      {CAPABILITIES.map((c) => (
        <td key={c.key} className={treats.includes(c.key) ? "wr-yes" : "wr-no"}>
          {treats.includes(c.key) ? <span aria-label="yes">{CHECK}</span> : <span className="wr-dash" aria-label="no">—</span>}
        </td>
      ))}
    </>
  );
}

export default function RangePage() {
  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Water filtration", url: `${site.url}/water-filtration` },
    { name: "Full range", url: `${site.url}/water-filtration/range` },
  ]);

  return (
    <div className="page-filtration page-range">
      <Script id="wr-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(FAQS)) }} />
      <Script id="wr-crumbs" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />

      <section className="wf-hero wf-hero--tier">
        <div className="wrap">
          <nav className="wf-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href="/water-filtration">Water filtration</Link>
            <span aria-hidden="true">/</span>
            <span>Full range</span>
          </nav>
          <div className="ds-eyebrow ds-eyebrow--on-dark wf-eyebrow">
            <span className="ds-dot" />
            Every type we fit, and what each one actually removes
          </div>
          <h1>The full range.</h1>
          <p className="wf-hero__sub">
            Every filtration product page on the internet claims to make your water better and
            almost none of them says what it doesn&rsquo;t do. This is the table that does.
            Six families, ten things they might remove, and an honest note on where each one is
            and isn&rsquo;t the right answer.
          </p>
          <div className="pg-ctas">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get a filtration quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost-on-dark ds-btn--lg">
              {site.phone}
            </a>
          </div>
        </div>
      </section>

      {/* THE MATRIX */}
      <section className="wr-matrix">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot" /> What removes what</span>
            <h2>The whole thing in one table.</h2>
            <p>
              Scroll it sideways on a phone. A tick means the manufacturer rates that family for
              that contaminant; a dash means they don&rsquo;t, and we won&rsquo;t tell you
              otherwise to win a job.
            </p>
          </div>
          <div className="wr-tablewrap">
            <table className="wr-table">
              <thead>
                <tr>
                  <th className="wr-th--name" rowSpan={2}>Type</th>
                  <th colSpan={3} className="wr-th--group">Asset protection</th>
                  <th colSpan={7} className="wr-th--group">Health &amp; wellbeing</th>
                  <th rowSpan={2}>Fits</th>
                  <th rowSpan={2}>Water</th>
                </tr>
                <tr>
                  {CAPABILITIES.map((c) => (
                    <th key={c.key} className="wr-th--cap"><span>{c.label}</span></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RANGE.map((r) => (
                  <tr key={r.slug}>
                    <th scope="row" className="wr-td--name">
                      {r.tier ? <Link href={`/water-filtration/${r.tier}`}>{r.name}</Link> : r.name}
                    </th>
                    <Ticks treats={r.treats} />
                    <td className="wr-td--meta">
                      {r.location.map((l) => (l === "whole-house" ? "Whole house" : "Under sink")).join(" · ")}
                    </td>
                    <td className="wr-td--meta">
                      {r.source.map((x) => (x === "mains" ? "Mains" : "Rain")).join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="wr-source">
            Capability data from the BWT filtration matrix and the 2025 range brochure. Both BWT
            and Puretec come through Reece; we lead with Puretec on most residential work and
            quote BWT where it suits the water better.
          </p>
        </div>
      </section>

      {/* FAMILIES */}
      <section className="wr-families">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot" /> Family by family</span>
            <h2>What each one is for, and what it isn&rsquo;t.</h2>
          </div>
          <div className="wr-fam__list">
            {RANGE.map((r) => (
              <article className="wr-fam" key={r.slug} id={r.slug}>
                <div className="wr-fam__head">
                  <h3>{r.name}</h3>
                  <span className="wr-fam__warranty">{r.warranty}</span>
                </div>
                <p className="wr-fam__blurb">{r.blurb}</p>
                {r.note && <p className="wr-fam__note">{r.note}</p>}
                <details className="wr-fam__models">
                  <summary>{r.products.length} model{r.products.length === 1 ? "" : "s"} · Reece codes</summary>
                  <ul>
                    {r.products.map((pr) => (
                      <li key={pr.code}>
                        <code>{pr.code}</code>
                        <span>{pr.name}</span>
                      </li>
                    ))}
                  </ul>
                </details>
                {r.tier && (
                  <Link href={`/water-filtration/${r.tier}`} className="wr-fam__link">
                    More on {r.name.toLowerCase()} →
                  </Link>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* BACK TO CATEGORIES */}
      <section className="wf-others">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot" /> By what you noticed</span>
            <h2>Or start from the symptom instead.</h2>
          </div>
          <div className="wf-others__row">
            {TIERS.map((t) => (
              <Link key={t.slug} href={`/water-filtration/${t.slug}`} className="wf-other">
                <b>{t.label}</b>
                <span>{t.tagline}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="wf-faq">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--hl">
            <span className="ds-eyebrow"><span className="ds-dot" /> Straight answers</span>
            <h2>Comparing the range.</h2>
          </div>
          <div className="wf-faq__list">
            {FAQS.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
