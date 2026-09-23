import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import dynamic from "next/dynamic";
import { site } from "@/lib/site";
import { faqSchema } from "@/lib/schema";
import {
  CAPABILITY,
  COMM_CAPABILITIES,
  COMM_CLIENTS,
  COMM_FAQS,
  COMM_PROCESS,
  COMM_SCOPES,
  COMM_STANDARD,
} from "@/lib/commercial";
import { CommercialScopeForm } from "@/components/CommercialScopeForm";
import { CountUp } from "@/components/CountUp";
import { PageMotion } from "@/components/PageMotion";
import { CommercialMark } from "@/components/CommercialMarks";
import "../home.css";
import "./commercial.css";

// Same treatment as the homepage: the map is below several full sections on
// every viewport, so its Leaflet chunk and 15KB of CSS stay off the first paint.
const ServiceAreaMap = dynamic(
  () => import("@/components/ServiceAreaMap").then((m) => m.ServiceAreaMap),
  { ssr: false, loading: () => <div className="map__leaflet" aria-hidden="true" /> }
);

export const metadata: Metadata = {
  title: "Commercial HVAC, Gas & Mechanical, Melbourne",
  description:
    "Commercial mechanical, Type A gas and hot water across Melbourne's south-east. Fit-outs, plant replacement, maintenance. $20M public liability, SWMS supplied.",
  alternates: { canonical: "/commercial" },
};

/**
 * The commercial front page, rebuilt.
 *
 * What was here before was a marketing page wearing a hard hat: a hero, a
 * fork, a twelve-beat illustrated scroll, and the proof parked in boxes
 * underneath. It was better than the brochure it replaced and it was still
 * the wrong shape, because it asked to be *watched*. A head contractor does
 * not watch a page. They check it, the way they check a submission — and
 * then they either put you on the tender list or they don't.
 *
 * So this is built in the language of the documents they already work from:
 *
 *   · a TITLE BLOCK, not a hero card. The entity, the licences, the cover and
 *     the base, set out the way the corner of a drawing sets them out.
 *   · a REFERENCE SCHEDULE, not a wall of logos. Who, what, where — three
 *     columns, ten rows, checkable. Logos say "we know these names"; a
 *     schedule says "ring them".
 *   · a SCHEDULE OF WORKS, not a grid of service cards. Numbered, ruled,
 *     with the scope under each item and who it suits beside it.
 *   · a PROGRAM, not a story. Six stages on one rule, which is how a job is
 *     drawn on every site any of these people have stood on.
 *   · a COMPLIANCE TABLE, printed on the page. This is the part nobody else
 *     publishes: the actual rows a procurement team would otherwise have to
 *     email for. Putting them here is the whole argument.
 *
 * The one loud thing on the page is the ask, and it is loud on purpose: a
 * full-bleed orange band, the same move the residential side makes at the
 * same moment — the point where the page stops explaining and starts asking.
 *
 * Colour carries the structure rather than decorating it. Navy is us, paper
 * is the facts you can check, orange is the ask. Nothing else changes ground.
 */

export default function CommercialPage() {
  const scopePairs = COMM_SCOPES.map((s) => s);

  return (
    // page-home is the marketing-page layout scope; page-comm the commercial
    // one; page-framed opts into the rails down both edges of the window.
    <div className="page-home page-comm page-framed">
      {/* ================= TITLE BLOCK =================
          The statement, and then the entity set out the way a drawing sets
          it out. Everything in the block is a thing somebody would otherwise
          have to ask for by email. */}
      <section className="cx-top" data-stop="hero">
        <div className="cx-top__bg" aria-hidden="true" data-m="exit">
          <Image
            src="/commercial-v3.webp"
            alt=""
            fill
            sizes="100vw"
            priority
            style={{ objectFit: "cover" }}
          />
        </div>

        <div className="wrap cx-top__inner">
          <p className="cx-tag" data-m="exit">
            <span className="cx-tag__dot" aria-hidden="true" />
            Commercial &amp; industrial mechanical services
          </p>

          <h1 className="cx-h1" data-m="exit">
            One standard.
            <br />
            Every site.
          </h1>

          <p className="cx-lede" data-m="exit">
            Mechanical services, Type A gas and commercial hot water across Melbourne&rsquo;s south-east and
            Gippsland. Directly employed crews, a written standard, and one person accountable for the package.
          </p>

          <div className="cx-top__ctas" data-hide-sticky-cta>
            <a href="#scope" className="ds-btn ds-btn--orange ds-btn--lg">Submit a scope →</a>
            <Link href="/commercial/capability" className="ds-btn ds-btn--ghost-on-dark ds-btn--lg">
              Capability statement
            </Link>
          </div>

          {/* The title block proper. Labels above values, mono, ruled — the
              corner of a drawing sheet, because that is where a builder
              expects to find exactly these fields. */}
          <dl className="cx-block">
            <div className="cx-block__cell">
              <dt>Public liability</dt>
              <dd><CountUp value="$20M" /></dd>
            </div>
            <div className="cx-block__cell">
              <dt>Refrigerant</dt>
              <dd>{site.licences.refrigeration}</dd>
            </div>
            <div className="cx-block__cell">
              <dt>Plumbing licence</dt>
              {/* The stored value reads "Plumbing Licence 46828"; printing it
                  under a label that already says Plumbing wrapped the cell
                  onto two lines and said the word twice. */}
              <dd>{site.licences.plumbing.replace(/^plumbing licence\s*/i, "")}</dd>
            </div>
            <div className="cx-block__cell">
              <dt>ABN</dt>
              <dd>{site.abn.replace(/ /g, " ")}</dd>
            </div>
            <div className="cx-block__cell">
              <dt>Trading since</dt>
              <dd>2014</dd>
            </div>
            <div className="cx-block__cell">
              <dt>Base</dt>
              <dd>{site.address.suburb} VIC</dd>
            </div>
          </dl>

          <p className="cx-top__note">
            SWMS, certificates of currency and inductions supplied before site access, usually back the same day.
          </p>
        </div>
      </section>

      {/* ================= CAPABILITY RUN =================
          Sixteen terms, no explanation. They are either in your vocabulary
          or they are not, and a mechanical consultant scanning this decides
          more from these than from any paragraph on the page. */}
      <section className="cx-run" aria-label="Technical capabilities" data-stop="run">
        <div className="wrap">
          <h2 className="cx-run__lbl">Licensed and equipped for</h2>
          <ul className="cx-run__list">
            {COMM_CAPABILITIES.map((c) => (
              <li key={c} data-m="arrive">{c}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ================= REFERENCE SCHEDULE =================
          A wall of logos says "we have heard of these companies". A schedule
          with the work and the location against each name says "ring them
          and ask". It is also the only section order that makes sense first:
          it is the question every one of these readers has. */}
      <section className="cx-sec cx-refs" data-stop="refs">
        <div className="wrap">
          <header className="cx-head">
            <span className="cx-head__n" data-m="arrive">01</span>
            <div>
              <h2 data-m="arrive">Who already lets us on site.</h2>
              <p data-m="arrive:1">
                Tier-one builders, national retail, banking, aged care and education. Named, with the package and
                the location against each one, because a reference you can check is worth more than a logo you
                can&rsquo;t.
              </p>
            </div>
                      <div className="cx-mark" data-m="arrive"><CommercialMark kind="refs" /></div>
          </header>

          <div className="cx-table" role="table" aria-label="Client reference schedule">
            <div className="cx-table__head" role="row">
              <span role="columnheader">Client</span>
              <span role="columnheader">Sector</span>
              <span role="columnheader">Package</span>
              <span role="columnheader">Where</span>
            </div>
            {COMM_CLIENTS.map((c) => (
              <div className="cx-table__row" role="row" key={c.name} data-m="arrive">
                <span role="cell" className="cx-table__key">{c.name}</span>
                <span role="cell">
                  <span className={`cx-chip cx-chip--${c.tone}`}>{c.sector}</span>
                </span>
                <span role="cell">{c.what}</span>
                <span role="cell" className="cx-table__where">{c.where}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= SCHEDULE OF WORKS =================
          Eight scopes as a numbered schedule rather than eight cards. A card
          grid makes eight equal things you skim; a schedule makes eight
          items you read down until you find yours. */}
      <section className="cx-sec cx-works" data-stop="works">
        <div className="wrap">
          <header className="cx-head">
            <span className="cx-head__n" data-m="arrive">02</span>
            <div>
              <h2 data-m="arrive">What we take on.</h2>
              <p data-m="arrive:1">
                Eight packages. If yours is a combination of them, that is normal and it is still one price against
                one written scope.
              </p>
            </div>
                      <div className="cx-mark" data-m="arrive"><CommercialMark kind="works" /></div>
          </header>

          <ol className="cx-works__list">
            {scopePairs.map((s) => (
              <li key={s.slug} data-m="arrive">
                <div className="cx-works__n">{s.n}</div>
                <div className="cx-works__body">
                  <h3>
                    <Link href={`/commercial/services#${s.slug}`}>{s.title}</Link>
                  </h3>
                  <p className="cx-works__lede">{s.lede}</p>
                  {/* The three detail lines that were here are on
                      /commercial/services under this exact anchor. A front
                      page is for finding your job, not for reading its
                      specification — carrying both made this section 1,100px
                      of scrolling to get past. */}
                  <Link className="cx-works__more" href={`/commercial/services#${s.slug}`}>
                    What&rsquo;s included →
                  </Link>
                </div>
                <div className="cx-works__suits">
                  <span>Suits</span>
                  {s.suits}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ================= THE PROGRAM =================
          Six stages on one rule. Every person reading this has stood in front
          of a program drawn exactly this way, which is the point: it is not a
          story about us, it is the shape of the job. */}
      <section className="cx-sec cx-prog" data-stop="program">
        <div className="wrap">
          <header className="cx-head cx-head--dark">
            <span className="cx-head__n" data-m="arrive">03</span>
            <div>
              <h2 data-m="arrive">How a job runs.</h2>
              <p data-m="arrive:1">
                From the drawings landing in the inbox to the maintenance contract. Six stages, and what we hold
                ourselves to at each of them.
              </p>
            </div>
                      <div className="cx-mark" data-m="arrive"><CommercialMark kind="program" /></div>
          </header>

          {/* No stagger on these. A row-position stagger describes the
              3-wide grid and stops describing anything the moment it
              collapses to one column, where a late index leaves a stage on
              screen and invisible. Each stage arrives on its own instead. */}
          <ol className="cx-prog__list">
            {COMM_PROCESS.map((s) => (
              <li key={s.n} data-m="arrive">
                <div className="cx-prog__mark" aria-hidden="true" data-m="arrive">
                  <span className="cx-prog__dot" />
                </div>
                <span className="cx-prog__n">{s.n}</span>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </li>
            ))}
          </ol>

          {/* The standard sits under the program rather than in its own band:
              these are the six things that are true at every stage above, so
              they read as terms on the program, not as another feature grid. */}
          <div className="cx-terms">
            <h3 className="cx-terms__lbl">And at every stage of it</h3>
            <ul>
              {COMM_STANDARD.map((s) => (
                <li key={s.n}>
                  <b>{s.h}</b>
                  <span>{s.p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ================= COMPLIANCE =================
          The part nobody publishes. These are the rows a procurement team
          would otherwise have to email for, printed on the page — which is
          both the fastest possible answer and the whole argument. */}
      <section className="cx-sec cx-comp" data-stop="compliance">
        <div className="wrap">
          <header className="cx-head">
            <span className="cx-head__n" data-m="arrive">04</span>
            <div>
              <h2 data-m="arrive">Everything procurement asks for, already answered.</h2>
              <p data-m="arrive:1">
                The entity, the licences, the cover, the safety documentation and the capacity. Certificates of
                currency and SWMS go out the same day you ask.{" "}
                <Link href="/commercial/capability">The capability statement</Link> has the lot on one page you can
                file.
              </p>
            </div>
                      <div className="cx-mark" data-m="arrive"><CommercialMark kind="compliance" /></div>
          </header>

          <div className="cx-comp__grid">
            {CAPABILITY.map((g) => (
              <section className="cx-comp__group" key={g.group} data-m="arrive">
                <h3>{g.group}</h3>
                <dl>
                  {g.rows.map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </div>
      </section>

      {/* ================= COVERAGE ================= */}
      <section className="cx-sec cx-area" id="area" data-stop="area">
        <div className="wrap cx-area__grid">
          <div className="cx-area__left" data-m="arrive">
            <header className="cx-head">
              <span className="cx-head__n" data-m="arrive">05</span>
              <div>
                <h2>Based in Pakenham. On site anywhere in Victoria.</h2>
              </div>
            </header>
            <p>
              <strong>For the right job we travel.</strong> Rollouts, multi-site contracts and packages worth putting
              a crew on the road for &mdash; the Westpac branch was in Sale, and the contract work runs the width of
              the state. If your sites are spread, ask. The answer is usually yes.
            </p>
            <p className="cx-area__note">
              The circle is where the vans are every day: Melbourne&rsquo;s south-east and most of West Gippsland, no
              travel loading, same-week response. It is where we are cheapest to have on site, not the edge of where
              we&rsquo;ll go.
            </p>
            <a href="#scope" className="ds-btn ds-btn--primary">Submit a scope →</a>
          </div>
          <div className="cx-area__right" data-m="arrive:1">
            <div className="map map--live" aria-label="Map of Victoria, with the 75 km daily service radius marked around Pakenham 3810">
              <ServiceAreaMap view="victoria" />
              <div className="map__badge">
                <span className="map__badge-eye">Vans here daily</span>
                <span className="map__badge-num">75&nbsp;km</span>
                <span className="map__badge-note">Anywhere in Victoria for the right job</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= THE ASK =================
          The one loud band on the page, and loud on purpose. It is the same
          move the residential side makes at the same moment: the page stops
          explaining and starts asking, and it changes colour to say so. */}
      <section className="cx-ask" id="scope" data-stop="ask">
        <div className="wrap cx-ask__grid">
          <div className="cx-ask__left">
            <span className="cx-ask__eye">Priced against a written scope</span>
            <h2>Tell us what you&rsquo;re not being told.</h2>
            <p className="cx-ask__lede">
              Every mechanical package has a gap in it somewhere. The plans say one thing, the site says another, and
              whoever notices last pays for it. We find the gap and put it in the scope, in writing, before anyone
              signs.
            </p>
            <ul className="cx-ask__points">
              <li>One price against one written scope</li>
              <li>Exclusions stated, not buried</li>
              <li>Variations approved before the work, not with the invoice</li>
              <li>SWMS and certificates back before anyone turns up</li>
              <li>Jake reads every commercial enquiry himself</li>
            </ul>
            <div className="cx-ask__next">
              <span>After you send it</span>
              <ol>
                <li><b>Today</b> Read by the person who will price it, not a queue.</li>
                <li><b>Inside a day</b> Questions back if the scope has a gap in it.</li>
                <li><b>Then</b> One price against one written scope, exclusions stated.</li>
              </ol>
            </div>
          </div>
          <div className="cx-ask__right">
            <CommercialScopeForm />
          </div>
        </div>
      </section>

      {/* ================= QUESTIONS ================= */}
      <section className="cx-sec cx-faq" data-stop="faq">
        <div className="wrap cx-faq__grid">
          <div className="cx-faq__left" data-m="arrive">
            <header className="cx-head">
              <span className="cx-head__n" data-m="arrive">06</span>
              <div>
                <h2>Before you put us on a site.</h2>
              </div>
            </header>
            <p>
              The questions that actually arrive before a first job. Want the lot on one page?{" "}
              <Link href="/commercial/capability">Read the capability statement</Link>.
            </p>
            <p className="cx-faq__call">
              Plant down on a contracted site? <a href={`tel:${site.phoneE164}`}>Call {site.phone}</a>. After hours
              goes to someone on the tools.
            </p>
            <div className="cx-mark cx-mark--inline" data-m="arrive"><CommercialMark kind="faq" /></div>
          </div>
          <div className="cx-faq__right">
            {COMM_FAQS.map((f, i) => (
              <details key={f.q} name="commfaq" {...(i === 0 ? { open: true } : {})}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CLOSE ================= */}
      <section className="cx-close" data-stop="close" data-hide-sticky-cta>
        <div className="wrap cx-close__row">
          <div data-m="arrive">
            <h2>Submit a scope for pricing.</h2>
            <p>
              Drawings, a mechanical schedule or a site address is sufficient to begin. Certificates of currency,
              SWMS and induction documentation are available on request and returned the same day.
            </p>
          </div>
          <div className="cx-close__btns" data-m="arrive:1">
            <a href="#scope" className="ds-btn ds-btn--orange ds-btn--xl">Submit a scope →</a>
            <a href={`tel:${site.phoneE164}`} className="cx-close__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>

      {/* Drives the band moves and the frame in browsers without CSS
          scroll-driven animations. No-ops where the browser has them. */}
      <PageMotion />

      <Script
        id="ld-commercial-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(COMM_FAQS)) }}
      />
    </div>
  );
}
