import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { site } from "@/lib/site";
import { faqSchema } from "@/lib/schema";
import {
  CAPABILITY,
  COMM_BRANDS,
  COMM_CAPABILITIES,
  COMM_CLIENTS,
  COMM_FAQS,
  COMM_SCOPES,
  COMM_STANDARD,
} from "@/lib/commercial";
import { CommercialScopeForm } from "@/components/CommercialScopeForm";
import { CountUp } from "@/components/CountUp";
import { CraneRig } from "@/components/commercial/CraneRig";
import { DuctDivider } from "@/components/commercial/DuctDivider";
import { ProcessTimeline } from "@/components/commercial/ProcessTimeline";
import { CommGallery } from "@/components/commercial/CommGallery";
import { CommReveal } from "@/components/commercial/CommReveal";
import "./cx.css";

export const metadata: Metadata = {
  title: "Commercial HVAC, Gas & Mechanical, Melbourne",
  description:
    "Commercial mechanical, Type A gas and hot water across Melbourne's south-east. Fit-outs, plant replacement, maintenance. $20M public liability, SWMS supplied.",
  alternates: { canonical: "/commercial" },
};

/**
 * The Business & commercial front page, built to the design handoff.
 *
 * It is aimed at one reader: a builder, a facility manager or a building
 * owner deciding whether to put us on a site. Everything on it is either
 * something that reader asks for before site access, or evidence they can
 * check themselves. It runs:
 *
 *   hero + the crane        what we do, and a picture of us doing it
 *   the credentials card    the six numbers, before anything else
 *   01  the jobs            named clients, sector and location
 *   02  what we can do      ten packages
 *       on the tools        our own photographs of one fit-out
 *       brands              what we are authorised for
 *   03  why people choose us
 *       how the job runs    six steps, against a card that keeps count
 *   04  the people          Dean and Jake, by name and face
 *   05  our details         the rows procurement emails for
 *       the questions       what arrives before a first job
 *   →   submit a scope
 *
 * The chrome is the site's: the header, the footer, the sticky phone bar and
 * the scope form are all the existing components, so this page cannot drift
 * away from the rest of the site the next time one of them changes.
 *
 * Every class here carries a `cx-` prefix. The design's own names — hero,
 * step, brand, faq — are all names the site-wide design system already uses
 * for something else.
 *
 * Two departures from the design, both explained where they happen: every
 * white-on-orange ground was darkened until it cleared AA, and nothing is
 * hidden waiting for a scroll observer — see `front.css` and `CommReveal`.
 *
 * Deliberately NOT here: the Victoria service-area map the previous version
 * of this page carried. The handoff has no map, the Capacity table states
 * the service area in words and the footer already lists the suburbs — so
 * the page drops a lazy Leaflet bundle for nothing lost.
 */

/** The four figures, in the order a procurement team writes them down. */
const STATS: { v: string; k: string }[] = [
  { v: "$20M", k: "Public liability" },
  { v: "12 yrs", k: "Trading from Pakenham" },
  { v: "20", k: "Written procedures" },
  { v: "Same day", k: "SWMS & certificates" },
];

/** The six rows on the card that overlaps the hero. */
const CREDS: { k: string; v: string }[] = [
  { k: "Public liability", v: "$20M" },
  { k: "Refrigerant", v: site.licences.refrigeration },
  { k: "Plumbing licence", v: site.licences.plumbing.replace(/^plumbing licence\s*/i, "") },
  { k: "ABN", v: site.abn },
  { k: "Trading since", v: "2014" },
  { k: "Base", v: `${site.address.suburb} VIC` },
];

export default function CommercialPage() {
  return (
    // data-no-reveal: this page brings its own reveals (see CommReveal), and
    // the site-wide one would fade whole navy bands, background and all.
    <div className="page-cx" data-no-reveal>
      {/* =========================== HERO =========================== */}
      <section className="cx-hero">
        <div className="cx-hero__bg" aria-hidden="true">
          <Image src="/comm/lift.jpg" alt="" fill sizes="100vw" priority />
        </div>

        <div className="wrap">
          <p className="cx-crumbs">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <b>Business &amp; commercial</b>
          </p>

          <div className="cx-hero__grid">
            <div>
              <span className="cx-eye cx-eye--sky">Commercial &amp; industrial mechanical services</span>
              <h1>
                One standard.
                <br />
                Every <em>site.</em>
              </h1>
              <p className="cx-hero__lede">
                Mechanical services, Type A gas and commercial hot water across Melbourne&rsquo;s south-east and
                Gippsland. Directly employed crews, a written standard, and one person accountable for the package.
              </p>
              <div className="cx-hero__cta" data-hide-sticky-cta>
                <a className="ds-btn ds-btn--orange ds-btn--lg" href="#scope">Submit a scope →</a>
                <Link className="ds-btn ds-btn--ghost-on-dark ds-btn--lg" href="/commercial/capability">
                  Capability statement
                </Link>
              </div>

              <div className="cx-stats">
                {STATS.map((s) => (
                  <div key={s.k}>
                    <b><CountUp value={s.v} ms={1600} /></b>
                    <span>{s.k}</span>
                  </div>
                ))}
              </div>
            </div>

            <CraneRig />
          </div>
        </div>
      </section>

      {/* ====================== THE CREDENTIALS ======================
          Six numbers, overlapping the hero, because they are the first thing
          asked for and the reader should not have to scroll for them. */}
      <div className="cx-creds">
        <div className="wrap">
          <div className="cx-creds__card">
            <div className="cx-creds__top">
              <span className="cx-eye" style={{ justifyContent: "center" }}>Before site access</span>
              <h2>Our numbers, up front.</h2>
            </div>
            <dl className="cx-creds__grid">
              {CREDS.map((c, i) => (
                <div className="cx-cred cx-rv" key={c.k} style={{ ["--i" as string]: String(i) }}>
                  <dt>{c.k}</dt>
                  <dd>{c.v}</dd>
                </div>
              ))}
            </dl>
            <p className="cx-creds__note">
              SWMS, certificates of currency and inductions supplied before site access, usually back the same day.
            </p>
          </div>
        </div>
      </div>

      {/* ========================= 01 · THE JOBS ========================= */}
      <section className="cx-sec" id="jobs">
        <div className="wrap">
          <header className="cx-sec__head cx-rv">
            <span className="cx-eye">01 · The jobs we&rsquo;ve done</span>
            <h2>The jobs we&rsquo;ve done.</h2>
            <p className="cx-sec__lede">
              Named, with the job and the location against each. A reference you can ring is worth more than a logo
              you can&rsquo;t.
            </p>
          </header>

          <ol className="cx-clients">
            {COMM_CLIENTS.map((c, i) => (
              <li className="cx-client cx-rv" key={c.name} style={{ ["--i" as string]: String(i % 5) }}>
                <span className="cx-num">{String(i + 1).padStart(2, "0")}</span>
                <h3>{c.name}</h3>
                <p>{c.what}</p>
                <div className="cx-client__foot">
                  <span className={`cx-tag cx-tag--${c.tone}`}>{c.sector}</span>
                  <span className="cx-client__loc">{c.where}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <DuctDivider on="navy" label="supply air" />

      {/* ======================= 02 · WHAT WE CAN DO ======================= */}
      <section className="cx-sec cx-sec--navy" id="services" style={{ paddingTop: "clamp(48px, 6vw, 80px)" }}>
        <div className="wrap">
          <header className="cx-sec__head cx-rv">
            <span className="cx-eye cx-eye--sky">02 · What we can do</span>
            <h2>What we can do.</h2>
            <p className="cx-sec__lede">
              Ten packages. A combination of them is normal, and still one price against one written scope.
            </p>
          </header>

          <ol className="cx-svc">
            {COMM_SCOPES.map((s, i) => (
              <li
                key={s.slug}
                /* The first card and the last are twice the width and carry
                   their own colour: the fit-out because it is what most of
                   this page's readers came for, the breakdown line because
                   it is the only one somebody rings instead of emailing. */
                className={`cx-svc__item cx-rv${i === 0 ? " cx-svc__item--wide" : ""}${
                  s.slug === "breakdowns" ? " cx-svc__item--red" : ""
                }`}
                style={{ ["--i" as string]: String(i % 3) }}
              >
                <span className="cx-num">{s.n}</span>
                <h3>
                  <Link href={`/commercial/what-we-do#${s.slug}`}>{s.title}</Link>
                </h3>
                <p>{s.lede}</p>
                <div className="cx-svc__suits">
                  <b>Suits</b>
                  {s.suits}
                </div>
                {s.slug === "breakdowns" ? (
                  <a className="cx-svc__link" href={`tel:${site.phoneE164}`}>Call {site.phone} →</a>
                ) : (
                  <Link className="cx-svc__link" href={`/commercial/what-we-do#${s.slug}`}>
                    What&rsquo;s included →
                  </Link>
                )}
              </li>
            ))}
          </ol>

          <div className="cx-equip cx-rv">
            <span className="cx-eye">Licensed and equipped for</span>
            <ul>
              {COMM_CAPABILITIES.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* ========================= ON THE TOOLS =========================
          The only proof on this page a reader can check for themselves. */}
      <section className="cx-sec cx-sec--navy" id="gallery" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <header className="cx-sec__head cx-sec__head--row cx-rv">
            <div>
              <span className="cx-eye cx-eye--sky">On the tools</span>
              <h2>From a recent commercial fit-out.</h2>
              <p className="cx-sec__lede">Our own crew, from the lift to the ceiling closing.</p>
            </div>
            <span className="cx-mono" style={{ color: "rgba(255,255,255,0.55)" }}>Tap a photo to enlarge</span>
          </header>

          <CommGallery />
        </div>
      </section>

      {/* ============================ BRANDS ============================ */}
      <section className="cx-sec" id="brands" style={{ paddingBottom: 0 }}>
        <div className="wrap">
          <div className="cx-brands__bar cx-rv">
            <span className="cx-mono">Authorised installer of</span>
            <i aria-hidden="true" />
            <span className="cx-mono">Trade partner of <b>Reece</b></span>
          </div>
          <ul className="cx-brands">
            {COMM_BRANDS.map((b, i) => (
              <li className="cx-brand cx-rv" key={b.name} style={{ ["--i" as string]: String(i) }}>
                <b>{b.name}</b>
                <span>{b.what}</span>
              </li>
            ))}
          </ul>
          <p className="cx-brands__note cx-rv">
            Direct supply means real stock, real warranties and no margin-stacking middlemen between you and the gear.
          </p>
        </div>
      </section>

      <DuctDivider on="cream" label="return air" />

      {/* ====================== 03 · WHY PEOPLE CHOOSE US ====================== */}
      <section className="cx-sec" id="why" style={{ paddingTop: "clamp(48px, 6vw, 80px)" }}>
        <div className="wrap">
          <header className="cx-sec__head cx-rv">
            <span className="cx-eye">03 · Why people choose us</span>
            <h2>Why people choose us, and keep us on.</h2>
            <p className="cx-sec__lede">
              Nobody rings back about the ductwork. They ring back because the job never made work for them.
            </p>
          </header>

          <ul className="cx-why">
            {COMM_STANDARD.map((s, i) => (
              <li className="cx-why__item cx-rv" key={s.n} style={{ ["--i" as string]: String(i % 3) }}>
                <span className="cx-why__n">{s.n}</span>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ======================= HOW THE JOB RUNS ======================= */}
      <section className="cx-sec cx-sec--navy" id="process">
        <div className="wrap">
          <header className="cx-sec__head cx-rv">
            <span className="cx-eye">How the job runs</span>
            <h2>What that looks like, start to finish.</h2>
          </header>
          <ProcessTimeline />
        </div>
      </section>

      {/* =========================== 04 · THE PEOPLE =========================== */}
      <section className="cx-sec" id="team">
        <div className="wrap">
          <header className="cx-sec__head cx-rv">
            <span className="cx-eye">04 · The people</span>
            <h2>Who you&rsquo;re actually dealing with.</h2>
            <p className="cx-sec__lede">
              A family business in Pakenham since 2014. Whoever prices your package is who you ring about it.
            </p>
          </header>

          <div className="cx-team">
            <article className="cx-person cx-rv" style={{ ["--i" as string]: "0" }}>
              <Image src="/dean.webp" alt="Dean Winbanks" width={340} height={340} sizes="170px" />
              <div>
                <h3>Dean Winbanks</h3>
                <p className="cx-person__role">Director &middot; Licensed Plumber</p>
                <p className="cx-person__lic">{site.licences.plumbing}</p>
                <p className="cx-person__bio">
                  Over twenty years across industrial, commercial and domestic work. He sets the standard every job is
                  measured against, and he signs off every compliance certificate we issue.
                </p>
              </div>
            </article>

            <article className="cx-person cx-rv" style={{ ["--i" as string]: "1" }}>
              <Image src="/jake.webp" alt="Jake Deppeler" width={340} height={340} sizes="170px" />
              <div>
                <h3>Jake Deppeler</h3>
                <p className="cx-person__role">Estimating &amp; install</p>
                <p className="cx-person__lic">{site.licences.refrigeration}</p>
                <p className="cx-person__bio">
                  Reads every commercial enquiry himself and prices it off the drawings rather than off a square metre
                  rate. If we have quoted it, he has been on the roof.
                </p>
              </div>
            </article>
          </div>

          <p className="cx-behind cx-rv">
            Behind us: directly employed installers and apprentices, in our own vans. No labour hire, no rotating
            subcontractors on your site.
          </p>
        </div>
      </section>

      {/* ========================== 05 · OUR DETAILS ========================== */}
      <section className="cx-sec cx-sec--cream2" id="details">
        <div className="wrap">
          <div className="cx-spec">
            <div className="cx-spec__side cx-rv">
              <div className="cx-spec__doc" aria-hidden="true" />
              <span className="cx-eye">05 · Our details</span>
              <h2>Our details, before you ask for them.</h2>
              <p>
                Certificates of currency and SWMS go out the same day you ask.{" "}
                <Link href="/commercial/capability"><b>The capability statement</b></Link> has the lot on one page.
              </p>
              <Link className="ds-btn ds-btn--orange" href="/commercial/capability">Capability statement →</Link>
            </div>

            <div className="cx-spec__tables">
              {CAPABILITY.map((g, i) => (
                <section
                  className={`cx-tbl cx-rv${g.group === "Capacity" ? " cx-tbl--wide" : ""}`}
                  key={g.group}
                  style={{ ["--i" as string]: String(i % 2) }}
                >
                  <h4>{g.group}</h4>
                  <dl>
                    {g.rows.map(([k, v, mono]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd className={mono ? "is-mono" : undefined}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================== THE QUESTIONS ============================== */}
      <section className="cx-sec" id="faq">
        <div className="wrap" style={{ maxWidth: "calc(920px + 64px)" }}>
          <header className="cx-sec__head cx-sec__head--c cx-rv">
            <span className="cx-eye">Before a first job</span>
            <h2>The questions that arrive before a first job.</h2>
          </header>

          <div className="cx-faq cx-rv">
            {COMM_FAQS.map((f, i) => (
              <details key={f.q} {...(i === 0 ? { open: true } : {})}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>

          <p className="cx-faq__foot">
            Plant down on a contracted site? <a href={`tel:${site.phoneE164}`}>Call {site.phone}</a>. After hours goes
            to someone on the tools.
          </p>
        </div>
      </section>

      {/* ============================= SUBMIT A SCOPE ============================= */}
      <section className="cx-scopesec" id="scope" data-hide-sticky-cta>
        <div className="wrap">
          <div className="cx-scope cx-rv">
            <div>
              <span className="cx-eye">Priced against a written scope</span>
              <h2>Tell us what you&rsquo;re not being told.</h2>
              <p className="cx-scope__lede">
                Every mechanical package has a gap in it somewhere. The plans say one thing, the site says another, and
                whoever notices last pays for it. We find the gap and put it in the scope, in writing, before anyone
                signs.
              </p>
              <ul className="cx-checks">
                <li>One price against one written scope</li>
                <li>Exclusions stated, not buried</li>
                <li>Variations approved before the work, not with the invoice</li>
                <li>SWMS and certificates back before anyone turns up</li>
                <li>Jake reads every commercial enquiry himself</li>
              </ul>
              <dl className="cx-after">
                <span className="cx-mono cx-after__lbl">After you send it</span>
                <div>
                  <dt>Today</dt>
                  <dd>Read by the person who will price it, not a queue.</dd>
                </div>
                <div>
                  <dt>Inside a day</dt>
                  <dd>Questions back if the scope has a gap in it.</dd>
                </div>
                <div>
                  <dt>Then</dt>
                  <dd>One price against one written scope, exclusions stated.</dd>
                </div>
              </dl>
            </div>

            <div className="cx-scope__form">
              <CommercialScopeForm badge="Read by the person who prices it" />
            </div>
          </div>
        </div>
      </section>

      {/* Arms and runs the reveals. A no-op under reduced motion, and a no-op
          if it never runs at all — nothing on the page is hidden until this
          has decided to hide it. */}
      <CommReveal />

      <Script
        id="ld-commercial-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(COMM_FAQS)) }}
      />
    </div>
  );
}
