import type { Metadata } from "next";
import Image from "next/image";
import { openingHours } from "@/lib/site";
import { Crumbs, Hero, Head, Tiles, Next, Cta } from "@/components/homepage/page/kit";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
import { RATING_TEXT } from "@/lib/reviews";

export const metadata: Metadata = {
  title: "About, Family-Owned Pakenham HVAC Specialists",
  description:
    "Pakenham-based and family-owned. HVAC, Type A gas, mechanical and refrigeration across Victoria. 20+ years' experience, $20M public liability.",
  alternates: { canonical: "/about" },
};

const team = [
  { name: "Dean Winbanks", role: "Director · Plumbing Lic. 46828", bio: "20+ years across industrial, commercial and domestic work. Sets the standard every job is measured against, and signs off the works.", photo: "/dean.webp" },
  { name: "Jake",           role: "Estimating & Quotes",           bio: "Your first point of contact for pricing, detailed quotes with any rebates worked in, and the numbers explained.", photo: "/jake.webp" },
  { name: "Kellie",         role: "Office & Scheduling",           bio: "Keeps jobs booked, compliance certificates issued and the paperwork moving, so nothing slips and you're never left chasing.", photo: "/kellie.webp" },
  { name: "Jye",            role: "Installer",                     bio: "Directly employed installer, same face on every job, same standard on every visit.", photo: "/jye.webp" },
];

const values = [
  { n: "01", h: "One accountable team", p: "Directly employed installers and apprentices, not a revolving door of subcontractors. The same trusted faces, holding the same standard, on every visit." },
  { n: "02", h: "Fully licensed & insured", p: "$20M public liability, workers' compensation and comprehensive motor cover. Certificates of currency provided on request." },
  { n: "03", h: "Compliance built in", p: "Type A gas, mechanical services and refrigerant handling (ARC AU59557). Compliance certificates issued on completion of every job." },
  { n: "04", h: "Backed by warranty", p: "Six years on our workmanship, plus the full manufacturer warranties on all equipment we supply and install. The same figure you will find on the terms page and in the FAQs." },
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
    // data-no-reveal: the old site's scroll reveal hides sections until they animate in; the redesign pages opt out.
    <div className="ag ag--flat" data-no-reveal>
      <Crumbs trail={[{ name: "About" }]} />
      <Hero
        eye="Family owned · Pakenham"
        title={<>HVAC, gas &amp; mechanical services, <em>one licensed roof.</em></>}
        sub={<>A family-owned business with directly employed crews. The person who quotes your job is the person who stands behind it.</>}
        img="/team-photo.webp" imgAlt="The Advanced Gas & Airconditioning team at the Pakenham workshop"
        facts={[{ v: "20+", k: "years' director experience" }, { v: "$20M", k: "public liability cover" }, { v: "AU59557", k: "ARC authorisation" }, { v: "46828", k: "plumbing licence" }]}
      />

      <section className="pxs">
        <div className="wrap kx2">
          <div className="kx__prose">
            <Head eye="Our story" h="Family-owned. Traditional values. Compliance-first." />
            <p>Our team are like family to us, and our clients are an extension of that. We build working relationships on trust and experience over time, and we work to traditional values: <strong>under-promise, over-deliver</strong>, and finish on time, on schedule and on budget.</p>
            <p>We install, repair and maintain heating, cooling, Type A gas, general and mechanical plumbing, and refrigeration, across homes, commercial sites and industrial projects throughout Victoria.</p>
            <p>The business is headed by Director <strong>Dean Winbanks</strong>, with over 20 years&apos; industrial, commercial and domestic experience. Every member of the team is mentored to the same standard, as though the director had done your job himself.</p>
          </div>
          <div className="kx__card">
            <h3>Specialisations &amp; licensing</h3>
            <ul className="pp__hl">
              <li><span aria-hidden="true">✓</span><p className="kx__li"><strong>Mechanical services:</strong> HVAC, central heating, ducted and evaporative cooling, heat pumps; design, install and commissioning.</p></li>
              <li><span aria-hidden="true">✓</span><p className="kx__li"><strong>Type A gas:</strong> installing, servicing and repairing gas cooktops, heaters and hot water.</p></li>
              <li><span aria-hidden="true">✓</span><p className="kx__li"><strong>Air balancing &amp; BMS controls:</strong> airflow testing, balancing and full commissioning on commercial sites.</p></li>
              <li><span aria-hidden="true">✓</span><p className="kx__li"><strong>Refrigeration &amp; heat pump hot water:</strong> splits, multi-heads and rebate-eligible heat pump upgrades.</p></li>
            </ul>
            <p><strong>ARC AU59557</strong>: authorised to handle refrigerant gases.</p>
          </div>
        </div>
      </section>

      <section className="pxs pxs--cream">
        <div className="wrap pp__col">
          <Head eye="The team" h="The people who quote it, run it and stand behind it." />
          <div className="kxp">
            {team.map((m) => (
              <article key={m.name} className="kxp__card">
                <span className="kxp__img"><Image src={m.photo} alt={`${m.name}, ${m.role}`} fill sizes="(max-width: 1000px) 50vw, 25vw" /></span>
                <div className="kxp__t"><small>{m.role}</small><h3>{m.name}</h3><p>{m.bio}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="kxb">
        <Image src="/kaden-team-with-chaz.jpg" alt="An Advanced Gas installer unboxing a new Kaden system before fitting" fill sizes="100vw" />
        <div className="kxb__cap"><div className="wrap"><b>Genuine gear, fitted by the people who quoted it.</b><span>Manufacturer warranties on everything we supply</span></div></div>
      </div>

      <section className="pxs">
        <div className="wrap pp__col">
          <Head eye="Why choose us" h="Five things you can count on." />
          <Tiles items={values.map((v) => ({ t: v.h, d: v.p }))} />
        </div>
      </section>

      <section className="pxs pxs--navy">
        <div className="wrap pp__col">
          <Head dark eye="Track record" h="Trusted by national brands, builders and local institutions." lede="Large, complex jobs, run with the same standard as a bedroom split." />
          <div className="kxc">{clients.map((c) => <div key={c.name}><strong>{c.name}</strong><small>{c.tag}</small></div>)}</div>
        </div>
      </section>

      <section className="pxs">
        <div className="wrap kx2">
          <Head eye="Accreditations & licences" h="Backed, certified and accountable." lede="Every job carries our credentials, our compliance paperwork and our name." />
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

      <section className="pxs pxs--sky">
        <div className="wrap pp__col">
          <Head eye="Where next" h="See for yourself." />
          <Next items={[
            { t: "What customers say", s: `${RATING_TEXT} out of 5 on Google`, href: "/reviews" },
            { t: "Work we've done", s: "Real installs, before and after", href: "/gallery" },
            { t: "Find your system", s: "Options, prices and how each one works", href: "/#find" },
            { t: "Where we work", s: "Pakenham and 75 km around", href: "/service-areas" },
          ]} />
        </div>
      </section>

      <Cta title="Talk to the people who set the standard." text={<>The person who quotes your job is the person who stands behind it. {openingHours()}, and after hours for emergencies.</>} />
    </div>
  );
}
