import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";
import "./about.css";

export const metadata: Metadata = {
  title: "About, Family-Owned Pakenham HVAC Specialists",
  description:
    "Pakenham-based and family-owned. HVAC, Type A gas, mechanical and refrigeration across Victoria. 20+ years' experience, $20M public liability.",
  alternates: { canonical: "/about" },
};

const team = [
  { name: "Dean Winbanks", role: "Director · Plumbing Lic. 46828", bio: "20+ years across industrial, commercial and domestic work. Sets the standard every job is measured against, and signs off the works.", photo: "/dean.webp" },
  { name: "Jake",           role: "Estimating & Quotes",           bio: "Your first point of contact for pricing, detailed quotes with any rebates worked in, and the numbers explained.", photo: "/Photo of jake.webp" },
  { name: "Kellie",         role: "Office & Scheduling",           bio: "Keeps jobs booked, compliance certificates issued and the paperwork moving, so nothing slips and you're never left chasing.", photo: "/kellie.webp" },
  { name: "Jye",            role: "Installer",                     bio: "Directly employed installer, same face on every job, same standard on every visit.", photo: "/jye.webp" },
];

const values = [
  { n: "01", h: "One accountable team", p: "Directly employed installers and apprentices, not a revolving door of subcontractors. The same trusted faces, holding the same standard, on every visit." },
  { n: "02", h: "Fully licensed & insured", p: "$20M public liability, workers' compensation and comprehensive motor cover. Certificates of currency provided on request." },
  { n: "03", h: "Compliance built in", p: "Type A gas, mechanical services and refrigerant handling (ARC AU59557). Compliance certificates issued on completion of every job." },
  { n: "04", h: "Backed by warranty", p: "12-month defects liability on our workmanship, plus the full manufacturer warranties on all equipment we supply and install." },
  { n: "05", h: "Commercial install & maintenance", p: "From new installs and tenancy fit-outs to scheduled preventative-maintenance contracts that keep sites compliant and running year-round." },
];

const clients = [
  { name: "Westpac",                 tag: "Commercial fit-out" },
  { name: "Commonwealth Bank",       tag: "Commercial fit-out" },
  { name: "Reece Group",             tag: "Multi-site service contract" },
  { name: "Petbarn",                 tag: "National retail" },
  { name: "KFC",                     tag: "Hospitality / QSR" },
  { name: "Kane Constructions",      tag: "Tier-one builder" },
  { name: "Reliance Worldwide",      tag: "Industrial service contract" },
  { name: "Pakenham Springs P.S.",   tag: "Education" },
  { name: "Retirement Villages Constructions", tag: "Aged care · heat-pump upgrades" },
];

export default function AboutPage() {
  return (
    <div className="page-about">
      <section className="ab-hero">
        <div className="wrap">
          <span className="ds-eyebrow"><span className="ds-dot" /> Family owned · Pakenham · Victoria</span>
          <h1>HVAC, gas &amp; mechanical services, <em>one licensed roof.</em></h1>
          <p>Advanced Gas &amp; Airconditioning Services is a family-owned business based in Pakenham, serving Melbourne&rsquo;s South-East and West Gippsland. Design, installation and maintenance across residential, commercial and industrial Victoria.</p>
        </div>
      </section>

      <section className="ab-frame">
        <div className="wrap">
          <div className="ab-frame__big" style={{ position: "relative", padding: 0, overflow: "hidden" }}>
            <Image
              src="/team-photo.webp"
              alt="Advanced Gas & Airconditioning team at the Pakenham workshop"
              fill
              sizes="(max-width: 1200px) 100vw, 1200px"
              style={{ objectFit: "cover" }}
              priority
            />
          </div>
        </div>
      </section>

      <section className="ab-stats">
        <div className="wrap ab-stats__grid">
          <div className="ab-stats__item"><strong>20+</strong><span>years&rsquo; director experience</span></div>
          <div className="ab-stats__item"><strong>$20M</strong><span>public liability cover</span></div>
          <div className="ab-stats__item"><strong>AU59557</strong><span>ARC authorisation</span></div>
          <div className="ab-stats__item"><strong>46828</strong><span>plumbing licence</span></div>
        </div>
      </section>

      <section className="ab-story">
        <div className="wrap ab-story__grid">
          <div className="ab-story__copy">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Our story</span>
            <h2>Family-owned. Traditional values. Compliance-first.</h2>
            <p>We&rsquo;re based in Pakenham and serve Melbourne&rsquo;s South-East and West Gippsland. Our team are like family to us, and our clients are an extension of that ethos.</p>
            <p>We value quality working relationships and build them on trust and experience over time. We genuinely care about our clients and their stakeholders, and we operate from traditional values: <strong>under-promise, over-deliver</strong>, and complete work on time, within schedule and within budget.</p>
            <p>We pride ourselves on top-notch installation, repair and maintenance. We&rsquo;re a leading provider of HVAC, heating, cooling, Type A gas, general and mechanical plumbing, and refrigeration services, across residential, commercial and industrial projects throughout Victoria, and open to projects across the region and interstate.</p>
            <p>Headed up by Director <strong>Dean Winbanks</strong>, with over 20 years&rsquo; industrial, commercial and domestic experience. Our staff are mentored individually and trained to uphold the same traditional values and quality of work, as though our director had completed your works personally.</p>
          </div>
          <div className="ab-story__side">
            <div className="ab-spec-card">
              <h3>Specialisations &amp; licensing</h3>
              <ul>
                <li><strong>Mechanical Services</strong>, HVAC, central heating &amp; packaged units, ducted split systems, evap and refrigerated cooling, heat pumps, design, installation and commissioning.</li>
                <li><strong>Type A Gas Services</strong>, installation, servicing and repair of Type A gas appliances (cooktops, heaters, hot water) with safety, compliance and reliability built in.</li>
                <li><strong>Air Balancing &amp; BMS Controls</strong>, airflow testing and balancing, BMS integration and full commissioning, measured, efficient performance across commercial sites.</li>
                <li><strong>Refrigeration &amp; Heat-Pump Hot Water</strong>, split and multi-head systems, high-efficiency heat-pump hot water, including rebate-eligible upgrades under Victorian energy programs.</li>
              </ul>
              <p className="ab-spec-card__arc">
                <span>ARC AU59557</span> Authorised ARC trading authority for the handling of refrigerant gases.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="ab-team">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> Leadership</span>
            <h2>A small, hands-on team, the people who quote it, run it and stand behind it.</h2>
            <p>Headed up by Director Dean Winbanks, with over 20 years&rsquo; experience across industrial, commercial and domestic work.</p>
          </div>
          <div className="team-grid">
            {team.map((m) => (
              <article key={m.name} className="team">
                <div className="team__photo" style={{ position: "relative", overflow: "hidden" }}>
                  <Image
                    src={m.photo}
                    alt={`${m.name}, ${m.role}`}
                    fill
                    sizes="(max-width: 900px) 50vw, 25vw"
                    style={{ objectFit: "cover", objectPosition: "top" }}
                  />
                </div>
                <div className="team__body">
                  <h3 className="team__name">{m.name}</h3>
                  <p className="team__role">{m.role}</p>
                  <p className="team__bio">{m.bio}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ab-values">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Why choose us</span>
            <h2>Five things you can count on.</h2>
          </div>
          <div className="values-grid">
            {values.map((v) => (
              <div key={v.n} className="val">
                <span className="val__n">/{v.n}</span>
                <h3>{v.h}</h3>
                <p>{v.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ab-clients">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> Track record</span>
            <h2>Trusted by national brands, tier-one builders and local institutions.</h2>
            <p>Our collaboration with these quality clients demonstrates our capability to handle large-scale, complex projects with professionalism and excellence.</p>
          </div>
          <div className="clients-grid">
            {clients.map((c) => (
              <div key={c.name} className="client">
                <span className="client__name">{c.name}</span>
                <span className="client__tag">{c.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ab-acc">
        <div className="wrap ab-acc__grid">
          <div>
            <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot ds-dot--orange" /> Accreditations &amp; licences</span>
            <h2>Backed, certified and accountable.</h2>
            <p>Every job carries our credentials, our compliance paperwork and our name.</p>
          </div>
          <div className="acc-list">
            <div className="acc"><span className="acc__name">Advanced Gas &amp; Airconditioning Services Pty Ltd</span><span className="acc__num">ACN 607 575 280</span></div>
            <div className="acc"><span className="acc__name">Plumbing Licence</span><span className="acc__num">46828</span></div>
            <div className="acc"><span className="acc__name">ARC Refrigeration Authorisation</span><span className="acc__num">AU59557</span></div>
            <div className="acc"><span className="acc__name">Public Liability</span><span className="acc__num">$20M</span></div>
            <div className="acc"><span className="acc__name">Workmanship warranty</span><span className="acc__num">12 months</span></div>
            <div className="acc"><span className="acc__name">Address</span><span className="acc__num">1 Sierra Circuit, Pakenham</span></div>
          </div>
        </div>
      </section>

      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>Want to talk to the family running this thing?</h2>
            <p>We&apos;re around Mon–Sat. After hours for emergencies.</p>
          </div>
          <div className="bigcta__btns">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--xl">Get a free quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
