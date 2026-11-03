import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { openingHours } from "@/lib/site";
import { RATING_TEXT } from "@/lib/reviews";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
import "@/components/homepage/page/about.css";

export const metadata: Metadata = {
  title: "About us, heating, cooling and gas specialists since 2014",
  description:
    "Advanced Gas & Airconditioning Services: licensed mechanical, gas and refrigeration contractors based in Pakenham since 2014, working for homes, businesses and builders across Melbourne's south-east and West Gippsland.",
  alternates: { canonical: "/about" },
};

/**
 * About us, at Jake's direction (Nov 2026): a professional company page,
 * not the "family business" angle, with more of the history. Photo-led and
 * in plain words.
 *
 * Every date here is one the business already states: 2014 is the founding
 * year the site and portal give. The history rows in between carry no year
 * until Jake supplies the real ones, because a guessed year is one a
 * customer repeats back to us. Everything about a person is written about
 * them, never as a quote.
 */
const STATS: { v: string; k: string }[] = [
  { v: "2014", k: "Founded in Pakenham" },
  { v: "20+ yrs", k: "Director experience in the trade" },
  { v: "100%", k: "Directly employed crew" },
  { v: "$20M", k: "Public liability cover" },
];

const HISTORY: { when: string; t: string; d: string }[] = [
  { when: "2014", t: "Dean on his own", d: "Dean Winbanks starts Advanced Gas & Airconditioning Services in Pakenham, working on his own: quoting the jobs, doing the work and signing it off himself." },
  { when: "Growing", t: "Building our own crew", d: "The work outgrows one person. Instead of handing jobs to subcontractors, Dean takes on his own installers and apprentices and trains them himself, so every job is still done to his standard." },
  { when: "Growing", t: "Heat pumps and rebates", d: "Heat pump hot water becomes a big part of the work, with the Victorian Energy Upgrades rebate applied at the quote so customers never have to claim it back." },
  { when: "Growing", t: "Commercial work", d: "Fit-outs, multi-site service contracts and planned maintenance for national brands, builders and local schools, run to the same standard as a home install." },
  { when: "Today", t: "Two directors, one standard", d: "Jake Deppeler joins Dean as a director. From the workshop at 1 Sierra Circuit, Pakenham, our vans cover Melbourne's south-east and West Gippsland, with a written procedure for every kind of job." },
];

const DIRECTORS = [
  {
    name: "Dean Winbanks", role: "Director · Plumbing Lic. 46828", photo: "/dean.webp",
    about: "Dean has more than 20 years in the trade across industrial, commercial and domestic work. He holds the company's plumbing licence, sets the technical standard every job is measured against, trains the crew to it, and signs off the work.",
  },
  {
    name: "Jake Deppeler", role: "Director", photo: "/jake.webp",
    about: "Jake looks after estimating, quoting and the running of the business. He makes sure every customer gets one clear price in writing, with any rebate worked in, and that the price quoted is the price paid.",
  },
];

const SERVICES: [string, string][] = [
  ["Heating & cooling", "Split, multi-head, ducted and evaporative systems, gas ducted heating and zoning. Designed, installed and serviced."],
  ["Hot water", "Heat pumps with the VEU rebate applied, gas continuous flow and gas storage. Same-day swaps on common units."],
  ["Gas & plumbing", "Type A gas appliances, gas lines and leak checks, with a carbon monoxide safety test on every gas job."],
  ["Commercial & strata", "Installs, tenancy fit-outs, air balancing and BMS commissioning, and planned maintenance contracts."],
];

const CLIENTS = ["Westpac", "Commonwealth Bank", "Reece Group", "Petbarn", "KFC", "Kane Constructions", "Reliance Worldwide", "Pakenham Springs P.S.", "Retirement Villages Constructions"];

const STANDARDS: [string, string][] = [
  ["Our own crew", "Every installer and apprentice works for us. We don't use labour hire or subcontractors."],
  ["One price in writing", "A free site check, then a fixed price. It only changes if the job does, and we ask first."],
  ["Compliance on every job", "Compliance certificate emailed within 24 hours, and every gas job tested for carbon monoxide."],
  ["Six years on our workmanship", "On top of the manufacturer's warranty on everything we supply and install."],
];

export default function AboutPage() {
  return (
    // data-no-reveal: the old site's scroll reveal hides sections until they animate in; the redesign pages opt out.
    <div className="ag ag--flat" data-no-reveal>
      {/* The crew photo on its own, then the words under it: over the photo they covered the people. */}
      <section className="abx">
        <div className="abx__pic">
          <Image src="/team-photo.webp" alt="The Advanced Gas & Airconditioning crew and vans outside the Pakenham workshop" fill priority sizes="100vw" className="abx__bg" />
        </div>
        <div className="wrap abx__in">
          <div>
            <span className="lk2__eye">About Advanced Gas &amp; Airconditioning</span>
            <h1 className="abx__h1">Heating, cooling and gas specialists <em>since 2014.</em></h1>
          </div>
          <div className="abx__side">
            <p className="abx__sub">Licensed mechanical, gas and refrigeration contractors, based in Pakenham and working for homes, businesses and builders across Melbourne&apos;s south-east and West Gippsland.</p>
            <div className="bxh__ctas">
              <Link href="/#quote" className="abtn abtn--or abtn--flat">Get a free quote →</Link>
              <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="about-hero">Call (03) 5947 8000</a>
            </div>
          </div>
        </div>
        <div className="wrap">
          <dl className="abx__stats">{STATS.map((s) => <div key={s.k}><dd>{s.v}</dd><dt>{s.k}</dt></div>)}</dl>
        </div>
      </section>

      <section className="pxs" id="history">
        <div className="wrap abh">
          <div className="abh__head">
            <span className="aeye"><i /> Our history</span>
            <h2 className="h2 h2--sm">It started with one plumber in 2014.</h2>
            <p>Advanced Gas &amp; Airconditioning began in 2014 with Dean Winbanks on his own. He&apos;d already spent years on industrial, commercial and domestic sites, and he set the business up around the way he worked: under-promise, over-deliver, and finish on time and on budget.</p>
            <p>As more people heard about the work, it grew past what one person could do. Rather than hand jobs to subcontractors, Dean hired his own installers and apprentices and trained each of them himself, so the standard didn&apos;t change as the team grew.</p>
            <p>That&apos;s still how we work. The business now has two directors, an office and a crew of its own, but every job is still measured against the standard Dean started with.</p>
            <span className="abh__photo"><Image src="/reclaim-and-mitsubishi.jpg" alt="A heat pump and split system outdoor unit we installed" fill sizes="(max-width: 1000px) 100vw, 480px" /></span>
          </div>
          <ol className="abh__line">
            {HISTORY.map((h) => (
              <li key={h.t}>
                <span className="abh__when">{h.when}</span>
                <h3>{h.t}</h3>
                <p>{h.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="pxs pxs--cream">
        <div className="wrap abd">
          <div className="abd__head">
            <span className="aeye"><i /> Leadership</span>
            <h2 className="h2 h2--sm">The directors.</h2>
            <p>Both directors work in the business every day, and either can be reached through the office.</p>
          </div>
          <div className="abd__pair">
            {DIRECTORS.map((d) => (
              <article key={d.name} className="abd__card">
                <span className="abd__photo"><Image src={d.photo} alt={`${d.name}, ${d.role}`} fill sizes="(max-width: 900px) 100vw, 600px" /></span>
                <div className="abd__t">
                  <h3>{d.name}</h3>
                  <small>{d.role}</small>
                  <p>{d.about}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="abk">
            <span className="abk__photo"><Image src="/kellie.webp" alt="Kellie, office and scheduling" fill sizes="160px" /></span>
            <div className="abk__t">
              <h3>Kellie <small>Office &amp; scheduling</small></h3>
              <p>Runs bookings, compliance certificates and the paperwork, so every job is scheduled, documented and closed out properly. Behind the office is the crew: our own installers and apprentices, trained to the same written standard.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="pxs">
        <div className="wrap abs">
          <div className="abs__head">
            <span className="aeye"><i /> What we do</span>
            <h2 className="h2 h2--sm">Four trades, one licensed business.</h2>
          </div>
          <ul className="abs__grid">
            {SERVICES.map(([h, p]) => <li key={h}><strong>{h}</strong><span>{p}</span></li>)}
          </ul>
        </div>
      </section>

      <section className="pxs pxs--navy">
        <div className="wrap abw2">
          <div className="abw2__head">
            <span className="aeye aeye--dark"><i /> Who we work for</span>
            <h2 className="h2 h2--sm">Homes, national brands and builders.</h2>
            <p className="bx__lede">Most of our work is in people&apos;s homes. Alongside that, we install and maintain systems for commercial clients including:</p>
          </div>
          <ul className="abw2__list">{CLIENTS.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
      </section>

      <section className="pxs abr">
        <div className="wrap abr__in">
          <div className="abr__photo">
            <Image src="/kaden-team-with-chaz.jpg" alt="One of our installers with a delivery of new units at the workshop" fill sizes="(max-width: 900px) 100vw, 520px" />
          </div>
          <div className="abr__t">
            <span className="aeye"><i /> How we operate</span>
            <h2 className="h2 h2--sm">The standard on every job.</h2>
            <ul className="abr__list">
              {STANDARDS.map(([h, p]) => <li key={h}><strong>{h}</strong><span>{p}</span></li>)}
            </ul>
            <p className="abr__fine">Rated {RATING_TEXT} out of 5 on Google. <Link href="/reviews">Read the reviews →</Link></p>
          </div>
        </div>
      </section>

      <section className="pxs pxs--sky">
        <div className="wrap kx2">
          <div className="pp__lead">
            <span className="aeye"><i /> Licences &amp; insurance</span>
            <h2 className="h2 h2--sm">Licensed, insured and on record.</h2>
            <p>Certificates of currency are available on request.</p>
          </div>
          <dl className="kxl">
            <div><dt>Advanced Gas &amp; Airconditioning Services Pty Ltd</dt><dd>ACN 607 575 280</dd></div>
            <div><dt>Plumbing licence</dt><dd>46828</dd></div>
            <div><dt>ARC refrigeration authorisation</dt><dd>AU59557</dd></div>
            <div><dt>Public liability</dt><dd>$20M</dd></div>
            <div><dt>Workmanship warranty</dt><dd>6 years</dd></div>
            <div><dt>Workshop</dt><dd>1 Sierra Circuit, Pakenham</dd></div>
          </dl>
        </div>
      </section>

      <section className="abc">
        <div className="wrap abc__in">
          <h2 className="h2 h2--sm">Talk to us about your project.</h2>
          <p>A free site check, then one fixed price in writing. {openingHours()}.</p>
          <div className="bxh__ctas">
            <Link href="/#quote" className="abtn abtn--or abtn--flat">Get a free quote →</Link>
            <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="about-cta">Call (03) 5947 8000</a>
          </div>
        </div>
      </section>
    </div>
  );
}
