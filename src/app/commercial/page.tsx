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
 * The commercial front page.
 *
 * Two things shape it.
 *
 * ONE PAGE, NOT EIGHT. It used to alternate full-bleed grounds — cream,
 * white, navy, a sky wash, cream, orange — and every one of those joins
 * read as the end of a page and the start of another. Now the whole run
 * from the first section to the last sits on ONE ground with a long
 * gradient drifting through it, and a single spine down the left margin
 * that never breaks. Colour still moves; it just never draws a line
 * across the page to do it. Only the two ends change ground: the
 * title block at the top and the enquiry near the bottom.
 *
 * AND IT RUNS IN THE ORDER SOMEBODY ASKS THINGS IN:
 *
 *   01  the jobs we have done      — not "who lets us on site", the work
 *   02  what we can do             — not "what we take on", which sounds
 *                                    like a limit rather than a capability
 *   03  why people choose us       — the standard first, and then the
 *                                    program as the evidence for it: the
 *                                    argument is that it runs smoothly,
 *                                    and the six stages show it
 *   04  who you are dealing with   — Dean and Jake, by name and face
 *   05  our details                — the compliance rows and the
 *                                    questions that arrive before a job
 *   06  where we are based         — and that we travel from it
 *   →   the enquiry
 *
 * The old order opened with a client schedule and closed the argument
 * with a compliance table. That is the order a submission is assessed
 * in, which is not the order a person reads in.
 */

export default function CommercialPage() {
  return (
    // page-home is the marketing-page layout scope; page-comm the commercial
    // one; page-framed opts into the rails down both edges of the window.
    <div className="page-home page-comm page-framed">
      {/* ================= TITLE BLOCK =================
          The statement, and the entity set out the way the corner of a
          drawing sets it out — every field here is one somebody would
          otherwise have to ask for by email. */}
      <section className="cx-top" data-stop="hero">
        <div className="cx-top__bg" aria-hidden="true" data-m="exit">
          <Image src="/commercial-v3.webp" alt="" fill sizes="100vw" priority style={{ objectFit: "cover" }} />
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

          <dl className="cx-block">
            <div className="cx-block__cell"><dt>Public liability</dt><dd><CountUp value="$20M" /></dd></div>
            <div className="cx-block__cell"><dt>Refrigerant</dt><dd>{site.licences.refrigeration}</dd></div>
            <div className="cx-block__cell">
              <dt>Plumbing licence</dt>
              <dd>{site.licences.plumbing.replace(/^plumbing licence\s*/i, "")}</dd>
            </div>
            <div className="cx-block__cell"><dt>ABN</dt><dd>{site.abn.replace(/ /g, " ")}</dd></div>
            <div className="cx-block__cell"><dt>Trading since</dt><dd>2014</dd></div>
            <div className="cx-block__cell"><dt>Base</dt><dd>{site.address.suburb} VIC</dd></div>
          </dl>

          <p className="cx-top__note">
            SWMS, certificates of currency and inductions supplied before site access, usually back the same day.
          </p>
        </div>
      </section>

      {/* =====================================================================
          ONE RUN. Everything from here to the enquiry is a single ground with
          one gradient moving through it and one spine down the side. No band
          inside it paints its own colour, which is what stops the joins
          reading as page breaks.
          ===================================================================== */}
      <div className="cx-run-all">
        {/* The spine fills behind you as you go. It is the one element on the
            page whose only job is to say how far through you are, which is
            the difference between a list and a journey. */}
        <div className="cx-spine" aria-hidden="true" data-m="pass" />

        {/* ---- 01 · THE JOBS WE HAVE DONE ---- */}
        <section className="cx-sec cx-jobs" data-stop="jobs">
          <div className="wrap">
            <header className="cx-head">
              <span className="cx-head__n" data-m="arrive">01</span>
              <div>
                <h2 data-m="arrive">The jobs we&rsquo;ve done.</h2>
                <p data-m="arrive:1">
                  Named, with the package and the location against each one, because a job you can ring up and check
                  is worth more than a logo you can&rsquo;t. Tier-one builders, national retail, banking, aged care
                  and education.
                </p>
              </div>
              <div className="cx-mark" data-m="arrive"><CommercialMark kind="refs" /></div>
            </header>

            <div className="cx-table" role="table" aria-label="Completed commercial work">
              <div className="cx-table__head" role="row">
                <span role="columnheader">Client</span>
                <span role="columnheader">Sector</span>
                <span role="columnheader">The job</span>
                <span role="columnheader">Where</span>
              </div>
              {COMM_CLIENTS.map((c) => (
                <div className="cx-table__row" role="row" key={c.name} data-m="arrive">
                  <span role="cell" className="cx-table__key">{c.name}</span>
                  <span role="cell"><span className={`cx-chip cx-chip--${c.tone}`}>{c.sector}</span></span>
                  <span role="cell">{c.what}</span>
                  <span role="cell" className="cx-table__where">{c.where}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- 02 · WHAT WE CAN DO ----
             The technical vocabulary used to be its own black strip between
             the hero and this. It belongs here: it is the same answer at a
             different resolution, and folding it in removes a join. */}
        <section className="cx-sec cx-works" data-stop="works">
          <div className="wrap">
            <header className="cx-head">
              <span className="cx-head__n" data-m="arrive">02</span>
              <div>
                <h2 data-m="arrive">What we can do.</h2>
                <p data-m="arrive:1">
                  Eight packages. If yours is a combination of them, that is normal, and it is still one price
                  against one written scope.
                </p>
              </div>
              <div className="cx-mark" data-m="arrive"><CommercialMark kind="works" /></div>
            </header>

            <ol className="cx-works__list">
              {COMM_SCOPES.map((s) => (
                <li key={s.slug} data-m="arrive">
                  <div className="cx-works__n">{s.n}</div>
                  <div className="cx-works__body">
                    <h3><Link href={`/commercial/services#${s.slug}`}>{s.title}</Link></h3>
                    <p className="cx-works__lede">{s.lede}</p>
                    <Link className="cx-works__more" href={`/commercial/services#${s.slug}`}>
                      What&rsquo;s included →
                    </Link>
                  </div>
                  <div className="cx-works__suits"><span>Suits</span>{s.suits}</div>
                </li>
              ))}
            </ol>

            <div className="cx-run" data-m="arrive">
              <h3 className="cx-run__lbl">Licensed and equipped for</h3>
              <ul className="cx-run__list">
                {COMM_CAPABILITIES.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </div>
          </div>
        </section>

        {/* ---- 03 · WHY PEOPLE CHOOSE US ----
             The standard is the argument; the program is the evidence for
             it. Six reasons, and then the six stages that show what those
             reasons look like on a live site. */}
        <section className="cx-sec cx-why" data-stop="why">
          <div className="wrap">
            <header className="cx-head">
              <span className="cx-head__n" data-m="arrive">03</span>
              <div>
                <h2 data-m="arrive">Why people choose us, and keep us on.</h2>
                <p data-m="arrive:1">
                  Almost nobody rings back about the ductwork. They ring back because the job ran without creating
                  work for them &mdash; the paperwork landed, the program held, and nothing arrived attached to the
                  invoice.
                </p>
              </div>
              <div className="cx-mark" data-m="arrive"><CommercialMark kind="program" /></div>
            </header>

            <ul className="cx-terms">
              {COMM_STANDARD.map((s) => (
                <li key={s.n} data-m="arrive">
                  <span className="cx-terms__n">{s.n}</span>
                  <b>{s.h}</b>
                  <span className="cx-terms__p">{s.p}</span>
                </li>
              ))}
            </ul>

            <div className="cx-smooth">
              <h3 className="cx-smooth__lbl" data-m="arrive">What that looks like, start to finish</h3>
              <ol className="cx-prog__list">
                {COMM_PROCESS.map((s) => (
                  <li key={s.n} data-m="arrive">
                    <div className="cx-prog__mark" aria-hidden="true" data-m="arrive"><span className="cx-prog__dot" /></div>
                    <span className="cx-prog__n">{s.n}</span>
                    <h4>{s.h}</h4>
                    <p>{s.p}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ---- a moment on the way ----
            Six sections of schedules and tables is a list however well it is
            set. This is the pivot from how the job runs to who runs it, and
            it is a real one of ours: plant craned onto a roof that kept
            trading underneath it. */}
        <figure className="cx-shot" data-stop="shot">
          <div className="cx-shot__img" data-m="pass">
            <Image
              src="/commercial.webp"
              alt="A packaged rooftop unit being craned into position over new ductwork"
              fill
              sizes="100vw"
              style={{ objectFit: "cover" }}
            />
          </div>
          <figcaption>
            <div className="cx-shot__cap">
              <span className="cx-shot__eye">On the roof, Pakenham</span>
              <p>
                Plant craned in over new ductwork, commissioned and handed over &mdash; on a building that kept
                trading underneath it the whole time.
              </p>
            </div>
          </figcaption>
        </figure>

        {/* ---- 04 · WHO YOU ARE DEALING WITH ----
             Two names and two faces. On a commercial package the question
             "who actually turns up" is asked about the crew, but the one
             underneath it is "who do I ring when it goes wrong", and that
             has an answer with a face on it. */}
        <section className="cx-sec cx-team" data-stop="team">
          <div className="wrap">
            <header className="cx-head">
              <span className="cx-head__n" data-m="arrive">04</span>
              <div>
                <h2 data-m="arrive">Who you&rsquo;re actually dealing with.</h2>
                <p data-m="arrive:1">
                  A family business in Pakenham since 2014, not a brand with a call centre behind it. Whoever prices
                  your package is who you ring about it.
                </p>
              </div>
            </header>

            <div className="cx-team__grid">
              <article className="cx-person" data-m="arrive">
                <div className="cx-person__photo">
                  <Image src="/dean.webp" alt="Dean Winbanks, Director" width={420} height={420} sizes="(max-width: 760px) 100vw, 320px" />
                </div>
                <div className="cx-person__body">
                  <h3>Dean Winbanks</h3>
                  <p className="cx-person__role">Director &middot; Licensed Plumber</p>
                  <p className="cx-person__cred">{site.licences.plumbing}</p>
                  <p>
                    Over twenty years across industrial, commercial and domestic work. He sets the standard every job
                    is measured against, and he signs off every compliance certificate we issue.
                  </p>
                </div>
              </article>

              <article className="cx-person" data-m="arrive">
                <div className="cx-person__photo">
                  <Image src="/jake.webp" alt="Jake Deppeler, estimating and install" width={420} height={420} sizes="(max-width: 760px) 100vw, 320px" />
                </div>
                <div className="cx-person__body">
                  <h3>Jake Deppeler</h3>
                  <p className="cx-person__role">Estimating &amp; install</p>
                  <p className="cx-person__cred">{site.licences.refrigeration}</p>
                  <p>
                    Reads every commercial enquiry himself and prices it off the drawings rather than off a square
                    metre rate. If we have quoted it, he has been on the roof.
                  </p>
                </div>
              </article>
            </div>

            <p className="cx-team__note" data-m="arrive">
              Behind the two of us: directly employed installers and apprentices, in our own vans and our own
              uniform. No labour hire, and no rotating subcontractors on your site.
            </p>
          </div>
        </section>

        {/* ---- 05 · OUR DETAILS ----
             The rows a procurement team would otherwise email for, and
             under them the questions that actually arrive before a first
             job. Both are "the detail", so they are one section now. */}
        <section className="cx-sec cx-comp" data-stop="details">
          <div className="wrap">
            <header className="cx-head">
              <span className="cx-head__n" data-m="arrive">05</span>
              <div>
                <h2 data-m="arrive">Our details, before you ask for them.</h2>
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
                      <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>

            <div className="cx-qs">
              <h3 className="cx-qs__lbl" data-m="arrive">And the questions that arrive before a first job</h3>
              <div className="cx-faq__right">
                {COMM_FAQS.map((f, i) => (
                  <details key={f.q} name="commfaq" {...(i === 0 ? { open: true } : {})}>
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
              <p className="cx-qs__call">
                Plant down on a contracted site? <a href={`tel:${site.phoneE164}`}>Call {site.phone}</a>. After hours
                goes to someone on the tools.
              </p>
            </div>
          </div>
        </section>

        {/* ---- 06 · WHERE WE ARE BASED ---- */}
        <section className="cx-sec cx-area" id="area" data-stop="area">
          <div className="wrap cx-area__grid">
            <div className="cx-area__left" data-m="arrive">
              <header className="cx-head">
                <span className="cx-head__n">06</span>
                <div><h2>Based in Pakenham. On site anywhere in Victoria.</h2></div>
              </header>
              <p>
                <strong>For the right job we travel.</strong> Rollouts, multi-site contracts and packages worth
                putting a crew on the road for &mdash; the Westpac branch was in Sale, and the contract work runs the
                width of the state. If your sites are spread, ask. The answer is usually yes.
              </p>
              <p className="cx-area__note">
                The circle is where the vans are every day: Melbourne&rsquo;s south-east and most of West Gippsland,
                no travel loading, same-week response. It is where we are cheapest to have on site, not the edge of
                where we&rsquo;ll go.
              </p>
              <a href="#scope" className="ds-btn ds-btn--primary">Submit a scope →</a>
            </div>
            <div className="cx-area__right" data-m="arrive">
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
      </div>

      {/* ================= THE ENQUIRY =================
          The one band on the page that changes ground, because it is the
          one place the page stops explaining and starts asking. */}
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
          <div className="cx-close__btns" data-m="arrive">
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
