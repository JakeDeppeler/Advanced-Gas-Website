import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { site } from "@/lib/site";
import { COMM_COMMUNITY, COMM_HOW_WE_WORK, COMM_LEADERSHIP } from "@/lib/commercialSite";
import { CountUp } from "@/components/CountUp";
import { CxSubHero } from "@/components/commercial/CxSubHero";
import { CxClose } from "@/components/commercial/CxClose";
import { ParallaxBand } from "@/components/commercial/ParallaxBand";
import { CommReveal } from "@/components/commercial/CommReveal";
import "../cx.css";

export const metadata: Metadata = {
  title: "About Our Commercial Division",
  description:
    "A family-owned business in Pakenham since 2014. Directly employed crews, a written standard and one line of accountability across Melbourne's south-east.",
  alternates: { canonical: "/commercial/about" },
};

/**
 * Who you would be dealing with.
 *
 * The capability statement proves the company can be let on site. This page
 * answers the other half of the question, which is whether you want them
 * there — so it leads with the crew and the vans rather than a licence
 * number, and the photograph is the biggest thing on it.
 */

const STATS: { v: string; k: string }[] = [
  { v: "12 yrs", k: "Trading from Pakenham" },
  { v: "20+", k: "Years' director experience" },
  { v: "20", k: "Written procedures" },
  { v: "$20M", k: "Public liability" },
];

export default function CommercialAboutPage() {
  return (
    <div className="page-cx" data-no-reveal>
      <CxSubHero
        eyebrow="Family owned · Pakenham, Victoria"
        title={<>Our team are like family.<br />Our clients, <em>an extension of it.</em></>}
        lede={
          <>
            A family-owned business in Pakenham since 2014, servicing Melbourne&rsquo;s south-east and West
            Gippsland. We build working relationships on trust and experience over time.
          </>
        }
        crumb="About us"
        photo="/comm/team-vans.webp"
        lit
        ctas={
          <>
            <Link className="ds-btn ds-btn--orange ds-btn--lg" href="/commercial/contact">Get in touch →</Link>
            <a className="ds-btn ds-btn--ghost-on-dark ds-btn--lg" href="#people">Meet the team</a>
          </>
        }
        stats={
          <div className="cx-stats">
            {STATS.map((s) => (
              <div key={s.k}>
                <b><CountUp value={s.v} ms={1600} /></b>
                <span>{s.k}</span>
              </div>
            ))}
          </div>
        }
      />

      {/* ======================= 01 · WHO WE ARE ======================= */}
      <section className="cx-sec" id="story">
        <div className="wrap">
          <div className="cx-ovw">
            <div className="cx-rv">
              <span className="cx-eye">01 · Who we are</span>
              <blockquote className="cx-quote">
                We under-promise, <em>over-deliver,</em> and finish on time, within schedule and budget.
              </blockquote>
            </div>
            <div className="cx-ovw__t cx-rv" style={{ ["--i" as string]: "1", paddingTop: 8 }}>
              <p>We genuinely care about our clients and their stakeholders, and we operate from traditional values.</p>
              <p>
                We pride ourselves on top-notch installation, repair and maintenance across HVAC, heating, cooling,
                Type A gas, general and mechanical plumbing, and refrigeration. Residential, commercial and
                industrial projects throughout Victoria, and open to projects across the region and interstate.
              </p>
              <p>
                Directly employed installers and apprentices, in our own vans. No labour hire, no rotating
                subcontractors on your site.
              </p>
            </div>
          </div>
        </div>
      </section>

      <ParallaxBand
        src="/comm/team-vans.webp"
        alt="The Advanced Gas &amp; Aircon team with the fleet"
        title="Our own crews. Our own vans."
        note={`${site.address.street}, ${site.address.suburb}`}
      />

      {/* ====================== 02 · HOW WE WORK ====================== */}
      <section className="cx-sec" id="how">
        <div className="wrap">
          <header className="cx-sec__head cx-rv">
            <span className="cx-eye">02 · How we work</span>
            <h2>Why it&rsquo;s easy to work with us.</h2>
          </header>
          <ul className="cx-why" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {COMM_HOW_WE_WORK.map((w, i) => (
              <li className="cx-why__item cx-rv" key={w.n} style={{ ["--i" as string]: String(i) }}>
                <span className="cx-why__n">{w.n}</span>
                <h3>{w.h}</h3>
                <p>{w.p}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ======================== 03 · THE PEOPLE ======================== */}
      <section className="cx-sec cx-sec--cream2" id="people">
        <div className="wrap">
          <header className="cx-sec__head cx-rv">
            <span className="cx-eye">03 · The people</span>
            <h2>Who you&rsquo;re actually dealing with.</h2>
            <p className="cx-sec__lede">
              A small, hands-on leadership team: the people who quote your job, run it and stand behind it.
            </p>
          </header>

          <ul className="cx-lead">
            {COMM_LEADERSHIP.map((p, i) => (
              <li className="cx-lp cx-rv" key={p.name} style={{ ["--i" as string]: String(i) }}>
                {p.photo ? (
                  <Image src={p.photo} alt={p.name} width={420} height={357} sizes="(max-width: 900px) 100vw, 360px" />
                ) : (
                  <div className="cx-lp__ph" aria-hidden="true">{p.initial}</div>
                )}
                <h3>{p.name}</h3>
                <p className="cx-lp__role">{p.role}</p>
                <p className="cx-lp__cred">{p.cred}</p>
                <p className="cx-lp__bio">{p.bio}</p>
              </li>
            ))}
          </ul>

          <div className="cx-mentor cx-rv">
            <Image src="/dean.webp" alt="" width={128} height={128} />
            <p>
              <b>Mentored individually.</b> Our staff are trained to uphold the same traditional values and quality
              of work, as though our director had completed your works personally.
            </p>
          </div>
        </div>
      </section>

      {/* ======================== 04 · COMMUNITY ======================== */}
      <section className="cx-sec cx-sec--navy" id="community">
        <div className="wrap">
          <div className="cx-comm">
            <div className="cx-rv">
              <span className="cx-eye cx-eye--sky">04 · Giving back</span>
              <h2>Community involvement.</h2>
              <p>
                We are proud supporters of and active contributors to local sporting groups in Pakenham. Not only
                through financial contributions, but through time and hands-on effort on a voluntary basis, the
                lifeblood of community clubs.
              </p>
              <p>It forms a large part of our down-time, and we hope it sets a strong example for the generations to come.</p>
            </div>
            <ul className="cx-comm__g">
              {COMM_COMMUNITY.map((c, i) => (
                <li key={c.cap}>
                  <figure className="cx-rv" style={{ ["--i" as string]: String(i) }}>
                    <div className="cx-comm__slot">Photo to come</div>
                    <figcaption>{c.cap}</figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <CxClose
        eyebrow="Let's talk"
        title="Talk to the family running it."
        action={{ href: "/commercial/contact", label: "Get in touch →" }}
        second={{ href: `tel:${site.phoneE164}`, label: site.phone, external: true }}
      >
        We&rsquo;ll talk through your site, scope and timing, and put together a clear, itemised quote.
      </CxClose>

      <CommReveal />
    </div>
  );
}
