import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { openingHours } from "@/lib/site";
import { Crumbs, Hero, Head, Tiles, Next, Cta } from "@/components/homepage/page/kit";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
import "@/components/homepage/page/about.css";
import { RATING_TEXT } from "@/lib/reviews";

export const metadata: Metadata = {
  title: "About, Family-Owned Pakenham HVAC Specialists",
  description:
    "Pakenham-based and family-owned. HVAC, Type A gas, mechanical and refrigeration across Victoria. 20+ years' experience, $20M public liability.",
  alternates: { canonical: "/about" },
};

/**
 * The team first, at Jake's request (Nov 2026): who quotes it, who books
 * it, who fits it and who signs it off. Then how a job runs, step by step,
 * with the person you'll deal with at each one, so the page answers "who am
 * I letting into my house" before "how big is the business".
 *
 * Bios are written about each person, never as a quote from them: nothing
 * here is put in someone's mouth. Real lines from each can replace `call`.
 */
type Person = { name: string; role: string; bio: string; photo: string; call: string; tone: string };
const DEAN: Person = {
  name: "Dean Winbanks", role: "Director · Plumbing Lic. 46828", photo: "/dean.webp", tone: "sky",
  bio: "20+ years across industrial, commercial and domestic work. Dean sets the standard every job is measured against, mentors every member of the team to it, and signs off the works.",
  call: "The name on the licence and the warranty",
};
const TEAM: Person[] = [
  { name: "Jake", role: "Estimating & quotes", photo: "/jake.webp", tone: "navy", bio: "Your first point of contact for pricing. Jake does the site checks and writes the quotes, with any rebates worked in and the numbers explained.", call: "Ask Jake about a price, a quote or the VEU rebate" },
  { name: "Kellie", role: "Office & scheduling", photo: "/kellie.webp", tone: "cream", bio: "Keeps jobs booked, compliance certificates issued and the paperwork moving, so nothing slips and you're never left chasing.", call: "Ask Kellie about a booking, a certificate or an invoice" },
  { name: "Jye", role: "Installer", photo: "/jye.webp", tone: "sky", bio: "Directly employed, like every installer on our crew. The same face on every job, holding the same standard on every visit.", call: "The one at your door on install day" },
];

/** How a job runs, and who you deal with at each step. Every line is something the site already promises. */
const STEPS: { t: string; d: string; who: Person[] }[] = [
  { t: "You get in touch", d: "Call, or send the quote form. We reply within 12 business hours, and after hours an emergency goes to someone on the tools, not a call centre.", who: [TEAM[0], TEAM[1]] },
  { t: "A free site check", d: "We look at the space, confirm the size the house really needs and check for anything that would change the price, before you're asked to sign anything.", who: [TEAM[0]] },
  { t: "One fixed price, in writing", d: "The model, the work and the warranty spelled out, with the VEU rebate applied at the quote where you're eligible. It only changes if the job does, and then we stop and ask first.", who: [TEAM[0]] },
  { t: "Booked in", d: "A time that suits you. Most jobs are scheduled within 5–7 days of approval, and you'll know who's coming.", who: [TEAM[1]] },
  { t: "Install day", d: "Our own crew, never subcontractors. Drop sheets down, the old unit taken away, and every gas job carbon-monoxide tested before we leave.", who: [TEAM[2]] },
  { t: "Handover, and the years after", d: "The compliance certificate is emailed within 24 hours. Six years on our workmanship, on top of the manufacturer's warranty, and Dean's name behind the works.", who: [DEAN, TEAM[1]] },
];

const values = [
  { h: "One accountable team", p: "Directly employed installers and apprentices, not a revolving door of subcontractors. The same trusted faces, holding the same standard, on every visit." },
  { h: "Fully licensed & insured", p: "$20M public liability, workers' compensation and comprehensive motor cover. Certificates of currency provided on request." },
  { h: "Compliance built in", p: "Type A gas, mechanical services and refrigerant handling (ARC AU59557). Compliance certificates issued on completion of every job." },
  { h: "Backed by warranty", p: "Six years on our workmanship, plus the full manufacturer warranties on all equipment we supply and install." },
  { h: "Under-promise, over-deliver", p: "On time, on schedule and on budget. If something we couldn't see at the site check changes the job, you hear it from us before the work goes on." },
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
        eye="About us · Family owned, Pakenham"
        title={<>The people who&apos;ll be <em>in your home.</em></>}
        sub={<>A family-owned business with directly employed crews. The person who quotes your job is the person who stands behind it.</>}
        img="/team-photo.webp" imgAlt="The Advanced Gas & Airconditioning team with their vans at the Pakenham workshop"
        ctas={false}
        facts={[{ v: "20+", k: "years' director experience" }, { v: "Own crew", k: "directly employed, never subcontracted" }, { v: "6 years", k: "on our workmanship" }, { v: "46828", k: "plumbing licence" }]}
      >
        <div className="bxh__ctas">
          <a href="#team" className="abtn abtn--or abtn--flat">Meet the team ↓</a>
          <a href="#how" className="abtn abtn--line">How we work</a>
        </div>
      </Hero>

      <section className="pxs" id="team">
        <div className="wrap pp__col">
          <Head eye="The team" h="Who quotes it, books it, fits it and signs it off." lede="Not a call centre and not subcontractors. These are the people you'll deal with, start to finish." />
          <article className="abt__lead">
            <span className={`abt__photo abt__photo--${DEAN.tone}`}><Image src={DEAN.photo} alt={`${DEAN.name}, ${DEAN.role}`} fill sizes="(max-width: 900px) 100vw, 560px" /></span>
            <div className="abt__leadt">
              <small>{DEAN.role}</small>
              <h3>{DEAN.name}</h3>
              <p>{DEAN.bio}</p>
              <ul className="abt__chips"><li>20+ years in the trade</li><li>Plumbing Lic. 46828</li><li>Type A gas</li><li>ARC AU59557</li></ul>
              <span className="abt__call">{DEAN.call}</span>
            </div>
          </article>
          <div className="abt__grid">
            {TEAM.map((m) => (
              <article key={m.name} className="abt__card">
                <span className={`abt__photo abt__photo--${m.tone}`}><Image src={m.photo} alt={`${m.name}, ${m.role}`} fill sizes="(max-width: 900px) 100vw, 420px" /></span>
                <div className="abt__t">
                  <small>{m.role}</small>
                  <h3>{m.name}</h3>
                  <p>{m.bio}</p>
                  <span className="abt__call">{m.call}</span>
                </div>
              </article>
            ))}
          </div>
          <p className="abt__more">Plus the rest of the crew: directly employed installers and apprentices, mentored to the same standard as though Dean had done your job himself.</p>
        </div>
      </section>

      <section className="pxs pxs--navy" id="how">
        <div className="wrap abw">
          <div className="abw__head">
            <span className="aeye aeye--dark"><i /> How we work</span>
            <h2 className="h2 h2--sm">What you can expect, from the first call to years after.</h2>
            <p className="bx__lede">Six steps, the same on every job, and the person you&apos;ll deal with at each one.</p>
            <Link href="/#quote" className="abtn abtn--or abtn--flat">Start with a free quote →</Link>
          </div>
          <ol className="abw__steps">
            {STEPS.map((x, i) => (
              <li key={x.t} className="abw__step">
                <span className="abw__n" aria-hidden="true">{i + 1}</span>
                <div className="abw__t">
                  <h3>{x.t}</h3>
                  <p>{x.d}</p>
                  <span className="abw__who">
                    {x.who.map((w) => <span key={w.name} className="abw__face"><Image src={w.photo} alt="" width={108} height={72} /></span>)}
                    <span>{x.who.map((w) => w.name.split(" ")[0]).join(" & ")}</span>
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="pxs pxs--cream">
        <div className="wrap pp__col">
          <Head eye="What we hold ourselves to" h="Five things you can count on." />
          <Tiles items={values.map((v) => ({ t: v.h, d: v.p }))} />
        </div>
      </section>

      <section className="pxs">
        <div className="wrap kx2">
          <div className="kx__prose">
            <Head eye="Our story" h="Family-owned. Traditional values. Compliance-first." />
            <p>Our team are like family to us, and our clients are an extension of that. We build working relationships on trust and experience over time, and we work to traditional values: <strong>under-promise, over-deliver</strong>, and finish on time, on schedule and on budget.</p>
            <p>We install, repair and maintain heating, cooling, Type A gas, general and mechanical plumbing, and refrigeration, across homes, commercial sites and industrial projects throughout Victoria.</p>
          </div>
          <div className="kx__card">
            <h3>Specialisations &amp; licensing</h3>
            <ul className="pp__hl">
              <li><span aria-hidden="true">✓</span><p className="kx__li"><strong>Mechanical services:</strong> HVAC, central heating, ducted and evaporative cooling, heat pumps; design, install and commissioning.</p></li>
              <li><span aria-hidden="true">✓</span><p className="kx__li"><strong>Type A gas:</strong> installing, servicing and repairing gas cooktops, heaters and hot water.</p></li>
              <li><span aria-hidden="true">✓</span><p className="kx__li"><strong>Air balancing &amp; BMS controls:</strong> airflow testing, balancing and full commissioning on commercial sites.</p></li>
              <li><span aria-hidden="true">✓</span><p className="kx__li"><strong>Refrigeration &amp; heat pump hot water:</strong> splits, multi-heads and rebate-eligible heat pump upgrades.</p></li>
            </ul>
          </div>
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
