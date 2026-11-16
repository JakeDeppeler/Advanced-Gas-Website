import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
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
import { CraneRig } from "@/components/commercial/CraneRig";
import { DuctDivider } from "@/components/commercial/DuctDivider";
import { ProcessTimeline } from "@/components/commercial/ProcessTimeline";
import { CommGallery } from "@/components/commercial/CommGallery";
import { SiteModeStrip } from "@/components/Header";
import { BkMotion } from "@/components/homepage/brand/BkMotion";
import { PageHero } from "@/components/homepage/page/PageHero";
import { BkHead } from "@/components/homepage/page/bands";
import { JsonLd } from "@/components/JsonLd";
import "@/components/homepage/homepage.css";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/brand/blocks.css";
import "@/components/homepage/page/kit.css";
import "@/components/homepage/page/about.css";
import "./cx.css";
import "./cxh.css";

export const metadata: Metadata = {
  title: "Commercial HVAC, Gas & Mechanical, Melbourne",
  description:
    "Commercial mechanical, Type A gas and hot water across Melbourne's south-east. Fit-outs, plant replacement, maintenance. $20M public liability, SWMS supplied.",
  alternates: { canonical: "/commercial" },
};

/**
 * The Business & commercial front page, on the homepage's look (Jake, Nov
 * 2026: "update the commercial page but still keep the crane and the air flow
 * animation"). It was a separate design with its own type, colours and
 * header; now it opens on the same photo hero and pill header as every
 * inside page, and its sections are the homepage's bands, white tiles, navy
 * bands and closing box.
 *
 * Kept from the old page, because they are what made it the commercial side:
 *  · the crane (CraneRig), now the card in the hero where the quote form sits
 *    on the household pages. A builder submits a scope rather than a quick
 *    quote, and the form for that is at the foot of the page;
 *  · the duct runs between sections (DuctDivider), the airflow animation;
 *  · the job timeline and the fit-out gallery, which have no homepage
 *    equivalent and earn their place.
 * Their styles stay in cx.css, scoped to the old root or this one (.cxh), so
 * the four sub-pages still using the old root keep working.
 *
 * The reader is still a builder, a facility manager or a building owner
 * deciding whether to put us on a site, so the content and its order are as
 * they were: the numbers first, then named jobs, what we do, proof, the
 * people, the paperwork, and a scope form.
 */

/** The six rows procurement asks for before site access. */
const CREDS: { k: string; v: string }[] = [
  { k: "Public liability", v: "$20M" },
  { k: "Refrigerant", v: site.licences.refrigeration },
  { k: "Plumbing licence", v: site.licences.plumbing.replace(/^plumbing licence\s*/i, "") },
  { k: "ABN", v: site.abn },
  { k: "Trading since", v: "2014" },
  { k: "Base", v: `${site.address.suburb} VIC` },
];

const TABS: [string, string][] = [
  ["jobs", "The jobs"],
  ["services", "What we do"],
  ["gallery", "On the tools"],
  ["why", "Why us"],
  ["process", "How it runs"],
  ["team", "The people"],
  ["details", "Our details"],
  ["faq", "Questions"],
  ["scope", "Submit a scope"],
];

/** The two people a builder deals with, written about rather than quoted. */
const PEOPLE = [
  {
    name: "Dean Winbanks",
    role: "Director · Licensed Plumber",
    lic: site.licences.plumbing,
    photo: "/dean.webp",
    bio: "Over twenty years across industrial, commercial and domestic work. He sets the standard every job is measured against, and he signs off every compliance certificate we issue.",
  },
  {
    name: "Jake Deppeler",
    role: "Estimating & install",
    lic: site.licences.refrigeration,
    photo: "/jake.webp",
    bio: "Reads every commercial enquiry himself and prices it off the drawings rather than off a square metre rate. If we have quoted it, he has been on the roof.",
  },
];

export default function CommercialPage() {
  return (
    <>
      <SiteModeStrip tabs={false} />
      {/* data-no-reveal: the old site's scroll reveal fades whole sections; the redesign brings its own (BkMotion). */}
      <div className="ag ag--flat" data-no-reveal>
        <PageHero
          crumbs={[{ name: "Business & commercial" }]}
          eye="Commercial & industrial mechanical services"
          title="One standard. {Every site.}"
          sub="Mechanical services, Type A gas and commercial hot water across Melbourne's south-east and Gippsland. Directly employed crews, a written standard, and one person accountable for the package."
          photo="/comm/lift.jpg"
          pos="70% 30%"
          from="commercial-hero"
          ctas={
            <>
              <a href="#scope" className="abtn abtn--or">Submit a scope →</a>
              <Link href="/commercial/capability" className="abtn abtn--line">Capability statement</Link>
            </>
          }
          rating={false}
          trust={[
            { v: "$20M", k: "Public liability" },
            { v: "12 yrs", k: "Trading from Pakenham" },
            { v: "Same day", k: "SWMS & certificates" },
          ]}
          card={
            // The crane where the household pages put the quote form: the
            // whole argument of the page in one drawing, plant craned onto a
            // building that kept trading.
            <div className="cxh cxh__rig anim" style={{ animationDelay: ".12s" }}>
              <CraneRig />
            </div>
          }
        />

        <div className="bk cxh" style={{ ["--acc" as string]: "#C2521A" }}>
          <BkMotion />

          <nav className="pxt" aria-label="On this page">
            <div className="wrap pxt__in">
              {TABS.map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}
            </div>
          </nav>

          {/* The six numbers, straight under the hero in the homepage's
              brand-strip tiles: they are the first thing asked for, so the
              reader should not have to scroll for them. */}
          <section className="hbrands cxh__creds" aria-label="Our numbers">
            <div className="wrap hbrands__in">
              <div className="hbrands__top">
                <span>Before site access</span>
                <span className="hbrands__rule" aria-hidden="true" />
                <span className="hbrands__reece">SWMS &amp; certificates <strong>back the same day</strong></span>
              </div>
              <dl className="cxh__credgrid" data-anim="stagger">
                {CREDS.map((c) => (
                  <div key={c.k} className="cxh__cred">
                    <dt>{c.k}</dt>
                    <dd>{c.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          {/* The jobs */}
          <section className="bk__sec bk__sec--cream" id="jobs">
            <div className="wrap"><div className="bk__blk bk__col">
              <BkHead h="The jobs {we've done}.">
                Named, with the job and the location against each. A reference you can ring is worth more than a logo you can&apos;t.
              </BkHead>
              <ol className="cxh__jobs" data-anim="stagger">
                {COMM_CLIENTS.map((c, i) => (
                  <li key={c.name} className="cxh__job">
                    <span className="cxh__n">{String(i + 1).padStart(2, "0")}</span>
                    <h3>{c.name}</h3>
                    <p>{c.what}</p>
                    <div className="cxh__jobfoot">
                      {/* The sector is written on the pill, so its colour only groups them. */}
                      <span className={`cxh__tag cxh__tag--${c.tone}`}>{c.sector}</span>
                      <span className="cxh__loc">{c.where}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div></div>
          </section>

          <DuctDivider on="navy" label="supply air" />

          {/* What we can do */}
          <section className="bk__sec bk__sec--navy cxh__svcsec" id="services">
            <div className="wrap"><div className="bk__blk bk__col">
              <BkHead h="What {we can do}.">
                Ten packages. A combination of them is normal, and still one price against one written scope.
              </BkHead>
              <ol className="cxh__svc" data-anim="stagger">
                {COMM_SCOPES.map((s, i) => {
                  const call = s.slug === "breakdowns";
                  return (
                    <li
                      key={s.slug}
                      /* The fit-out and the breakdown line take two columns:
                         the fit-out because it is what most readers came for,
                         the breakdown line because it is the one somebody
                         rings instead of emailing. */
                      className={`cxh__svci${i === 0 ? " cxh__svci--lead" : ""}${call ? " cxh__svci--call" : ""}`}
                    >
                      <span className="cxh__n">{s.n}</span>
                      <h3><Link href={`/commercial/what-we-do#${s.slug}`}>{s.title}</Link></h3>
                      <p>{s.lede}</p>
                      <p className="cxh__suits"><b>Suits</b> {s.suits}</p>
                      {call ? (
                        <a className="abtn abtn--or cxh__callbtn" href={`tel:${site.phoneE164}`} data-call-from="commercial-breakdowns">Call {site.phone} →</a>
                      ) : (
                        <Link className="cxh__more" href={`/commercial/what-we-do#${s.slug}`}>What&apos;s included →</Link>
                      )}
                    </li>
                  );
                })}
              </ol>
              <div className="cxh__equip">
                <span>Licensed and equipped for</span>
                <ul>{COMM_CAPABILITIES.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
            </div></div>
          </section>

          {/* On the tools: the one proof here a reader can check for themselves. */}
          <section className="bk__sec bk__sec--white" id="gallery">
            <div className="wrap"><div className="bk__blk bk__col">
              <div className="cxh__galhead">
                <BkHead h="From a recent {commercial fit-out}.">Our own crew, from the lift to the ceiling closing.</BkHead>
                <span className="cxh__hint">Tap a photo to enlarge</span>
              </div>
              <CommGallery />
            </div></div>
          </section>

          {/* Brands, in the homepage's strip */}
          <section className="hbrands cxh__brands" aria-label="Brands we install">
            <div className="wrap hbrands__in">
              <div className="hbrands__top">
                <span>Authorised installer of</span>
                <span className="hbrands__rule" aria-hidden="true" />
                <span className="hbrands__reece">Trade partner of <strong>Reece</strong></span>
              </div>
              <div className="hbrands__grid cxh__brandgrid">
                {COMM_BRANDS.map((b) => <span key={b.name} className="chipb"><strong>{b.name}</strong><span>{b.what}</span></span>)}
              </div>
              <p className="cxh__brandnote">Direct supply means real stock, real warranties and no margin-stacking middlemen between you and the gear.</p>
            </div>
          </section>

          <DuctDivider on="cream" label="return air" />

          {/* Why people choose us */}
          <section className="bk__sec bk__sec--white" id="why">
            <div className="wrap"><div className="bk__blk bk__col">
              <BkHead h="Why people choose us, {and keep us on}.">
                Nobody rings back about the ductwork. They ring back because the job never made work for them.
              </BkHead>
              <ul className="cxh__why" data-anim="stagger">
                {COMM_STANDARD.map((s) => (
                  <li key={s.n}>
                    <b aria-hidden="true">{s.n}</b>
                    <h3>{s.h}</h3>
                    <p>{s.p}</p>
                  </li>
                ))}
              </ul>
            </div></div>
          </section>

          {/* How the job runs */}
          <section className="bk__sec bk__sec--navy" id="process">
            <div className="wrap"><div className="bk__blk bk__col">
              <BkHead h="What that looks like, {start to finish}." />
              <ProcessTimeline />
            </div></div>
          </section>

          {/* The people */}
          <section className="bk__sec bk__sec--cream" id="team">
            <div className="wrap"><div className="bk__blk bk__col">
              <BkHead h="Who you're {actually dealing with}.">
                A family business in Pakenham since 2014. Whoever prices your package is who you ring about it.
              </BkHead>
              <div className="abd__pair" data-anim="stagger">
                {PEOPLE.map((p) => (
                  <article key={p.name} className="abd__card">
                    <span className="abd__photo"><Image src={p.photo} alt={p.name} fill sizes="(max-width: 900px) 100vw, 600px" /></span>
                    <div className="abd__t">
                      <h3>{p.name}</h3>
                      <small>{p.role}</small>
                      <span className="cxh__lic">{p.lic}</span>
                      <p>{p.bio}</p>
                    </div>
                  </article>
                ))}
              </div>
              <p className="cxh__behind">
                Behind us: our crew, in our own vans, with every part of the job run under us. No labour hire, and the same crew on your site from the first week to the last.
              </p>
            </div></div>
          </section>

          {/* Our details */}
          <section className="bk__sec bk__sec--white" id="details">
            <div className="wrap"><div className="bk__blk cxh__spec">
              <div className="cxh__specside">
                <BkHead h="Our details, {before you ask for them}.">
                  Certificates of currency and SWMS go out the same day you ask. The capability statement has the lot on one page.
                </BkHead>
                <Link className="abtn abtn--or" href="/commercial/capability">Capability statement →</Link>
              </div>
              <div className="cxh__tables" data-anim="stagger">
                {CAPABILITY.map((g) => (
                  <section key={g.group} className={`cxh__tbl${g.group === "Capacity" ? " cxh__tbl--wide" : ""}`}>
                    <h3>{g.group}</h3>
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
            </div></div>
          </section>

          {/* The questions, in the homepage's FAQ */}
          <section id="faq" className="hfaq">
            <div className="wrap hfaq__in">
              <div className="hfaq__intro">
                <h2 className="h2">The questions that arrive before a first job.</h2>
                <p>
                  Plant down on a contracted site?{" "}
                  <a href={`tel:${site.phoneE164}`} data-call-from="commercial-faq" style={{ color: "#050A30", textUnderlineOffset: 2 }}>Call {site.phone}</a>. After hours goes to someone on the tools.
                </p>
                <div className="hfaq__links">
                  <Link className="glink" href="/commercial/capability">Capability statement</Link>
                  <Link className="glink" href="/commercial/what-we-do">What we do</Link>
                  <Link className="glink" href="/commercial/contact">Contact</Link>
                </div>
              </div>
              <div className="afaqs">
                {COMM_FAQS.map((f, i) => (
                  <details key={f.q} className="afaq" open={i === 0}>
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* Submit a scope: the homepage's closing box (the crew and the vans
              behind the orange) with the scope form in it, since a scope is
              what a commercial reader sends rather than a quick quote. */}
          <section className="bk__sec bk__sec--white bk__sec--end" id="scope">
            <div className="wrap">
              <div className="cxh__scope">
                <Image src="/comm/team-vans.webp" alt="" fill sizes="(max-width: 1480px) 100vw, 1416px" />
                <div className="cxh__scopecopy">
                  <span className="cxh__scopeeye">Priced against a written scope</span>
                  <h2 className="bk__boxh">Tell us what you&apos;re <span>not being told.</span></h2>
                  <p>
                    Every mechanical package has a gap in it somewhere. The plans say one thing, the site says another, and whoever notices last pays for it. We find the gap and put it in the scope, in writing, before anyone signs.
                  </p>
                  <ul className="cxh__checks">
                    <li>One price against one written scope</li>
                    <li>Exclusions stated, not buried</li>
                    <li>Variations approved before the work, not with the invoice</li>
                    <li>SWMS and certificates back before anyone turns up</li>
                    <li>Jake reads every commercial enquiry himself</li>
                  </ul>
                  <dl className="cxh__after">
                    <dt>Today</dt><dd>Read by the person who will price it, not a queue.</dd>
                    <dt>Inside a day</dt><dd>Questions back if the scope has a gap in it.</dd>
                    <dt>Then</dt><dd>One price against one written scope, exclusions stated.</dd>
                  </dl>
                </div>
                <div className="cxh__scopeform">
                  <CommercialScopeForm badge="Read by the person who prices it" />
                </div>
              </div>
            </div>
          </section>
        </div>

        <JsonLd data={faqSchema(COMM_FAQS)} />
      </div>
    </>
  );
}
