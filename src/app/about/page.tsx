import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { openingHours } from "@/lib/site";
import { RATING_TEXT, RATING_SUMMARY, REVIEWS } from "@/lib/reviews";
import { DIRECTORS, CLIENTS, STANDARDS, ACCREDITED, LICENCES } from "@/lib/company";
import { BkMotion } from "@/components/homepage/brand/BkMotion";
import { Crumbs } from "@/components/homepage/page/kit";
import "@/components/homepage/homepage.css";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
import "@/components/homepage/brand/blocks.css";
import "@/components/homepage/page/category.css";
import "@/components/homepage/page/about.css";

export const metadata: Metadata = {
  // Both cut to what Google shows: this title ran 70 characters with the
  // suffix and the description 193, so the ends were never read.
  title: "About us, licensed gas & aircon contractors",
  description:
    "Licensed and insured gas, plumbing and refrigeration contractors in Pakenham. Our own crew, a fixed price in writing and six years on our workmanship.",
  alternates: { canonical: "/about" },
};

/**
 * About us, at Jake's direction (Nov 2026): the page's one job is to make a
 * customer trust us enough to ask for a price. So no history; instead the
 * things that earn trust, in the order a wary customer looks for them:
 * what other customers say, who answers for the work, what we guarantee in
 * writing, who else trusts us, and the licences and cover behind it.
 *
 * Laid out in the brand pages' blocks (full-width bands, white between navy,
 * cream and the page colour) so it reads as the same site.
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

export default function AboutPage() {
  // The "family business" reviews are left off at Jake's request.
  const reviews = REVIEWS.filter((r) => !/family/i.test(r.title + r.txt)).slice(0, 3);
  return (
    // data-no-reveal: the old site's scroll reveal hides sections until they animate in; the redesign pages opt out.
    // Two boxes: the blocks styles hang off .bk sitting inside .ag.
    <div className="ag ag--flat" data-no-reveal><div className="bx bk cx ab3" style={{ ["--acc" as string]: "#C2521A" }}>
      <BkMotion />
      <Crumbs trail={[{ name: "About us" }]} back={{ label: "Get a free quote →", href: "/quote" }} />

      <section className="bxh">
        <div className="wrap bxh__in">
          <div className="bxh__copy">
            <span className="lk2__eye cx__eye">About Advanced Gas &amp; Airconditioning</span>
            <h1 className="bxh__h1 cx__h1">Licensed, insured and <span>accountable</span> for every job.</h1>
            <p className="bxh__sub">Heating, cooling, gas and hot water for homes and businesses across Melbourne&apos;s south-east and West Gippsland. Our own crew, a fixed price in writing, and two directors who answer for the work.</p>
            <div className="bxh__ctas">
              <Link href="/quote" className="abtn abtn--or abtn--flat">Get a free quote →</Link>
              <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="about-hero">Call (03) 5947 8000</a>
            </div>
          </div>
          <div className="bxh__img bxh__img--scene">
            <Image src="/team-photo.webp" alt="The Advanced Gas & Airconditioning crew and vans outside the Pakenham workshop" fill priority sizes="(max-width: 900px) 100vw, 640px" />
          </div>
        </div>
        <div className="wrap">
          <dl className="bxh__facts">{STATS.map((s) => <div key={s.k}><dd>{s.v}</dd><dt>{s.k}</dt></div>)}</dl>
        </div>
      </section>

      <nav className="pxt" aria-label="On this page">
        <div className="wrap pxt__in">
          {[["reviews", "Reviews"], ["team", "The team"], ["guarantees", "Our guarantees"], ["clients", "Who we work for"], ["licences", "Licences"]].map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}
        </div>
      </nav>

      {/* 1. What customers say */}
      <section className="bk__sec bk__sec--white" id="reviews">
        <div className="wrap"><div className="bk__blk bk__col">
          <div className="pp__revhead">
            <header className="bk__head">
              <h2 className="h2">Rated {RATING_TEXT} by <span>{RATING_SUMMARY.count} customers</span>.</h2>
              <p>What local households say once the job&apos;s done and the crew has gone.</p>
            </header>
            <Link href="/reviews">Read every review →</Link>
          </div>
          <div className="pp__revs" data-anim="stagger">
            {reviews.map((r) => (
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
        </div></div>
      </section>

      {/* 2. Who answers for the work */}
      <section className="bk__sec bk__sec--cream" id="team">
        <div className="wrap"><div className="bk__blk bk__col">
          <header className="bk__head">
            <h2 className="h2">Two directors, <span>in the business every day</span>.</h2>
            <p>Not a call centre or a franchise. If anything about your job isn&apos;t right, you can ask for either director by name.</p>
          </header>
          <div className="abd__pair" data-anim="stagger">
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
        </div></div>
      </section>

      {/* 3. What we put in writing */}
      <section className="bk__sec bk__sec--navy" id="guarantees">
        <div className="wrap"><div className="bk__blk ab3__g">
          <div className="ab3__gpic">
            <Image src="/kaden-team-with-chaz.jpg" alt="One of our installers with a delivery of new units at the workshop" fill sizes="(max-width: 900px) 100vw, 480px" />
          </div>
          <div className="bk__col">
            <header className="bk__head">
              <h2 className="h2">What we put <span>in writing</span>.</h2>
              <p>Five things every customer gets, whatever the job and whoever&apos;s on it.</p>
            </header>
            <ol className="ab3__list" data-anim="stagger">
              {STANDARDS.map(([h, p], i) => (
                <li key={h}><b aria-hidden="true">{String(i + 1).padStart(2, "0")}</b><div><strong>{h}</strong><span>{p}</span></div></li>
              ))}
            </ol>
          </div>
        </div></div>
      </section>

      {/* 4. Who else trusts us */}
      <section className="bk__sec bk__sec--red" id="clients">
        <div className="wrap"><div className="bk__blk ab3__c">
          <div className="bk__head">
            <h2 className="h2">Homes, national brands <span>and builders</span>.</h2>
            <p>Most of our work is in people&apos;s homes. Alongside that, we install and maintain systems for commercial clients including:</p>
          </div>
          <ul className="ab3__clients" data-anim="stagger">{CLIENTS.map((c) => <li key={c}>{c}</li>)}</ul>
        </div></div>
      </section>

      {/* 5. Licences and cover */}
      <section className="bk__sec bk__sec--white" id="licences">
        <div className="wrap"><div className="bk__blk bk__boxed ab3__lic">
          <div className="bk__col">
            <header className="bk__head">
              <h2 className="h2">Licensed, insured <span>and on record</span>.</h2>
              <p>Every number here can be checked. Certificates of currency are available on request.</p>
            </header>
            <ul className="ab3__acc">{ACCREDITED.map(([k, v]) => <li key={v}><small>{k}</small><strong>{v}</strong></li>)}</ul>
          </div>
          <dl className="ab3__dl">{LICENCES.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        </div></div>
      </section>

      <section className="bk__sec bk__sec--white">
        <div className="wrap">
          <div className="bk__box bk__box--acc bk__cta">
            <div>
              <h2 className="bk__boxh">Ready for a price <span>you can trust</span>?</h2>
              <p>A free site check, then one fixed price in writing. {openingHours()}.</p>
            </div>
            <div className="bxh__ctas">
              <Link href="/quote" className="abtn abtn--or abtn--flat">Get a free quote →</Link>
              <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="about-cta">Call (03) 5947 8000</a>
            </div>
          </div>
        </div>
      </section>
    </div></div>
  );
}
