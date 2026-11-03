import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { openingHours } from "@/lib/site";
import { RATING_TEXT, RATING_SUMMARY, REVIEWS } from "@/lib/reviews";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
import "@/components/homepage/page/about.css";

export const metadata: Metadata = {
  title: "About us, licensed heating, cooling and gas contractors",
  description:
    "Advanced Gas & Airconditioning Services: licensed and insured mechanical, gas and refrigeration contractors in Pakenham. Our own crew, a fixed price in writing and six years on our workmanship.",
  alternates: { canonical: "/about" },
};

/**
 * About us, at Jake's direction (Nov 2026): the page's one job is to make a
 * customer trust us enough to ask for a price. So no history; instead the
 * things that earn trust, in the order a wary customer looks for them:
 * what other customers say, who answers for the work, what we guarantee in
 * writing, the licences and cover behind it, and who else trusts us.
 *
 * Every claim is one the site already makes elsewhere. Everything about a
 * person is written about them, never as a quote.
 */
const STATS: { v: string; k: string }[] = [
  { v: `${RATING_TEXT} ★`, k: `From ${RATING_SUMMARY.count} Google reviews` },
  { v: "6 years", k: "Warranty on our workmanship" },
  { v: "$20M", k: "Public liability cover" },
  { v: "100%", k: "Our own crew, no subcontractors" },
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

const CLIENTS = ["Westpac", "Commonwealth Bank", "Reece Group", "Petbarn", "KFC", "Kane Constructions", "Reliance Worldwide", "Pakenham Springs P.S.", "Retirement Villages Constructions"];

const STANDARDS: [string, string][] = [
  ["A fixed price in writing", "A free site check, then one price with the model, the work and the warranty spelled out. It only changes if the job does, and we ask you first."],
  ["Our own crew in your home", "Every installer and apprentice works for us. We don't use labour hire or subcontractors, so you know who's turning up."],
  ["Compliance on every job", "A compliance certificate emailed within 24 hours, and every gas job tested for carbon monoxide before we leave."],
  ["Six years on our workmanship", "On top of the manufacturer's warranty. If something we did isn't right, we come back and fix it."],
  ["Rebates handled for you", "Where you're eligible, the VEU rebate comes off the price at the quote. No forms to chase afterwards."],
];

const ACCREDITED: [string, string][] = [
  ["Accredited", "VEU provider"], ["Authorised", "ARC refrigeration"], ["Licensed", "Victorian plumber"], ["Partner", "Reece Trade"],
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
            <h1 className="abx__h1">Licensed, insured and <em>accountable</em> for every job.</h1>
          </div>
          <div className="abx__side">
            <p className="abx__sub">Heating, cooling, gas and hot water for homes and businesses across Melbourne&apos;s south-east and West Gippsland. Our own crew, a fixed price in writing, and two directors who answer for the work.</p>
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

      <section className="pxs" id="reviews">
        <div className="wrap pp__col">
          <div className="pp__revhead">
            <div className="pp__lead">
              <span className="aeye"><i /> What customers say</span>
              <h2 className="h2 h2--sm">Rated {RATING_TEXT} out of 5 by {RATING_SUMMARY.count} customers on Google.</h2>
            </div>
            <Link href="/reviews">Read every review →</Link>
          </div>
          <div className="pp__revs">
            {REVIEWS.filter((r) => !/family/i.test(r.title + r.txt)).slice(0, 3).map((r) => (
              <article key={r.who + r.title} className="rev">
                <span className="stars stars--ink" aria-label="5 out of 5 stars">★★★★★</span>
                <h3>{r.title}</h3>
                <p>&ldquo;{r.txt}&rdquo;</p>
                <div className="rev__who">
                  <span aria-hidden="true">{r.a}</span>
                  <span className="rev__whot"><strong>{r.who}</strong><small>{r.what}</small></span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pxs pxs--cream">
        <div className="wrap abd">
          <div className="abd__head">
            <span className="aeye"><i /> Who answers for the work</span>
            <h2 className="h2 h2--sm">Two directors, in the business every day.</h2>
            <p>Not a call centre or a franchise. If anything about your job isn&apos;t right, you can ask for either director by name.</p>
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
            <span className="aeye"><i /> Our guarantees</span>
            <h2 className="h2 h2--sm">What we put in writing.</h2>
            <ul className="abr__list">
              {STANDARDS.map(([h, p]) => <li key={h}><strong>{h}</strong><span>{p}</span></li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="pxs pxs--sky">
        <div className="wrap kx2">
          <div className="pp__lead">
            <span className="aeye"><i /> Licences &amp; insurance</span>
            <h2 className="h2 h2--sm">Licensed, insured and on record.</h2>
            <p>Every number here can be checked. Certificates of currency are available on request.</p>
            <ul className="abq">{ACCREDITED.map(([k, v]) => <li key={v}><small>{k}</small><strong>{v}</strong></li>)}</ul>
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
          <h2 className="h2 h2--sm">Ready for a price you can trust?</h2>
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
