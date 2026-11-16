import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Fragment } from "react";
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
import { HomeHeader } from "@/components/homepage/HomeHeader";
import { BkMotion } from "@/components/homepage/brand/BkMotion";
import { JsonLd } from "@/components/JsonLd";
import "@/components/homepage/homepage.css";
import "@/components/homepage/brand/blocks.css";
import "./cx.css";
import "./cxd.css";

export const metadata: Metadata = {
  title: "Commercial HVAC, Gas & Mechanical, Melbourne",
  description:
    "Commercial mechanical, Type A gas and hot water across Melbourne's south-east. Fit-outs, plant replacement, maintenance. $20M public liability, SWMS supplied.",
  alternates: { canonical: "/commercial" },
};

/**
 * The Business & commercial front page, drawn as a set of mechanical drawings
 * (Jake, Nov 2026: "I don't like the commercial page at all", then "start
 * again, new look").
 *
 * The version before this one was the household pages' kit (photo hero,
 * quote-card slot, white tiles, cream bands) with the crane dropped into the
 * card. It read as the household site with a different headline, and a
 * builder or a facility manager is not shopping the way a household is. So
 * this page takes its look from the documents that reader already works in:
 * blueprint sheets (navy, with a faint grid) and drafting paper (cream, with
 * a fainter one), each section labelled like a drawing (C-01, M-01 …).
 *
 *  · The hero is the crane, drawn large on the blueprint rather than boxed
 *    in a card, with the six numbers procurement asks for set underneath as
 *    a drawing's title block.
 *  · What we do is a mechanical schedule, a table with a tag per row, because
 *    that is how a package is listed on a set of drawings, and ten cards of
 *    the same size said nothing about which ones matter.
 *  · The named jobs are a register, the same way.
 *  · The duct runs (DuctDivider) carry supply and return air between sheets.
 *  · The two people are the drawing's approval block: who approves, who prices.
 *
 * Kept as they were: the crane, the ducts, the timeline and the gallery, all
 * styled in cx.css under :is(.page-cx, .cxh). The root carries .cxh for them;
 * this page's own styles are cxd.css. The pill header and the section bar
 * stay, so it is still plainly the same site.
 */

/** The numbers procurement asks for before site access, as the title block. */
const TITLE_BLOCK: { k: string; v: string }[] = [
  { k: "Contractor", v: site.name },
  { k: "Public liability", v: "$20M" },
  { k: "Refrigerant", v: site.licences.refrigeration },
  { k: "Plumbing", v: site.licences.plumbing.replace(/^plumbing licence\s*/i, "Lic. ") },
  { k: "ABN", v: site.abn },
  { k: "Trading since", v: "2014" },
  { k: "Base", v: `${site.address.suburb} VIC` },
];

const TABS: [string, string][] = [
  ["services", "What we do"],
  ["sites", "The sites"],
  ["process", "How it runs"],
  ["standard", "The standard"],
  ["details", "Our details"],
  ["faq", "Questions"],
  ["scope", "Submit a scope"],
];

/**
 * The approval block: who signs it off and who prices it. Written about, not
 * quoted, and each with the licence that lets them do it.
 */
const SIGNED = [
  {
    role: "Approved",
    name: "Dean Winbanks",
    title: "Director · Licensed Plumber",
    lic: site.licences.plumbing,
    photo: "/dean.webp",
    bio: "Over twenty years across industrial, commercial and domestic work. He sets the standard every job is measured against, and he signs off every compliance certificate we issue.",
  },
  {
    role: "Priced",
    name: "Jake Deppeler",
    title: "Estimating & install",
    lic: site.licences.refrigeration,
    photo: "/jake.webp",
    bio: "Reads every commercial enquiry himself and prices it off the drawings rather than off a square metre rate. If we have quoted it, he has been on the roof.",
  },
];

/** A section's sheet label, the way a drawing names itself. */
function Sheet({ no, name }: { no: string; name: string }) {
  return (
    <span className="cxd-sheet">
      <b>{no}</b>
      <span>{name}</span>
    </span>
  );
}

/** A heading with its coloured part in braces, as everywhere else on the site. */
function H2({ text, id }: { text: string; id?: string }) {
  const parts = text.split(/[{}]/);
  return <h2 className="cxd-h2" id={id}>{parts.map((p, i) => (i % 2 ? <span key={i}>{p}</span> : <Fragment key={i}>{p}</Fragment>))}</h2>;
}

export default function CommercialPage() {
  return (
    <>
      <SiteModeStrip tabs={false} />
      {/* data-no-reveal: the site-wide scroll reveal fades whole sections; BkMotion does this page's. */}
      <div className="ag ag--flat" data-no-reveal>
        <HomeHeader />

        <div className="bk cxh cxd">
          <BkMotion />

          {/* ---------- C-01: the crane on the blueprint ---------- */}
          <section className="cxd-hero cxd-blue" aria-labelledby="cxd-h1">
            <div className="wrap cxd-hero__in">
              <div className="cxd-hero__copy">
                <nav aria-label="Breadcrumb" className="cxd-crumbs">
                  <ol>
                    <li><Link href="/">Home</Link></li>
                    <li aria-current="page">Business &amp; commercial</li>
                  </ol>
                </nav>
                <span className="cxd-eye">Commercial HVAC · Type A gas · Hot water</span>
                <h1 id="cxd-h1" className="cxd-h1">Plant craned in. <span>Doors stayed open.</span></h1>
                <p className="cxd-lede">
                  Mechanical services, Type A gas and commercial hot water across Melbourne&apos;s south-east and Gippsland. Our own crew, a written standard, and one person accountable for the package.
                </p>
                <div className="cxd-ctas">
                  <a href="#scope" className="abtn abtn--or">Submit a scope →</a>
                  <Link href="/commercial/capability" className="abtn abtn--line">Capability statement</Link>
                </div>
                <p className="cxd-down">
                  <span className="cxd-down__dot" aria-hidden="true" />
                  Plant down on a contracted site?{" "}
                  <a href={`tel:${site.phoneE164}`} data-call-from="commercial-hero">Call {site.phone}</a>
                </p>
              </div>

              {/* The drawing itself, in a sheet frame with its corner marks
                  and its own label, rather than in a card. */}
              <div className="cxd-hero__dwg">
                <div className="cxd-frame">
                  <i className="cxd-frame__c cxd-frame__c--tl" aria-hidden="true" />
                  <i className="cxd-frame__c cxd-frame__c--tr" aria-hidden="true" />
                  <i className="cxd-frame__c cxd-frame__c--bl" aria-hidden="true" />
                  <i className="cxd-frame__c cxd-frame__c--br" aria-hidden="true" />
                  <span className="cxd-frame__tag" aria-hidden="true">DWG C-01 · Rooftop plant · NTS</span>
                  <CraneRig />
                </div>
              </div>
            </div>

            {/* The title block: the first thing asked for, so it sits on the
                first screen rather than three scrolls down. */}
            <div className="wrap">
              <dl className="cxd-tb" aria-label="Our details">
                {TITLE_BLOCK.map((c) => (
                  <div key={c.k} className="cxd-tb__c">
                    <dt>{c.k}</dt>
                    <dd>{c.v}</dd>
                  </div>
                ))}
                <div className="cxd-tb__c cxd-tb__c--rev">
                  <dt>Paperwork</dt>
                  <dd>SWMS &amp; certificates back the same day</dd>
                </div>
              </dl>
            </div>
          </section>

          <DuctDivider on="navy" label="supply air" />

          {/* After the duct, not before it: the bar floats over whatever
              follows until it sticks, and over the duct it hid the airflow. */}
          <nav className="pxt" aria-label="On this page">
            <div className="wrap pxt__in">
              {TABS.map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}
            </div>
          </nav>

          {/* ---------- M-01: what we do, as a mechanical schedule ---------- */}
          <section className="cxd-sec cxd-blue" id="services" aria-labelledby="cxd-svc">
            <div className="wrap">
              <header className="cxd-head">
                <Sheet no="M-01" name="Mechanical schedule" />
                <H2 id="cxd-svc" text="What we {take on}." />
                <p>Ten packages. A combination of them is normal, and it is still one price against one written scope.</p>
              </header>

              <div className="cxd-sched" role="table" aria-label="What we do">
                <div className="cxd-sched__hd" role="row">
                  <span role="columnheader">Tag</span>
                  <span role="columnheader">Package</span>
                  <span role="columnheader">Scope</span>
                  <span role="columnheader">Suits</span>
                  <span role="columnheader"><span className="sr-only">Link</span></span>
                </div>
                <div data-anim="stagger" className="cxd-sched__body" role="rowgroup">
                  {COMM_SCOPES.map((s) => {
                    const call = s.slug === "breakdowns";
                    return (
                      <div key={s.slug} role="row" className={`cxd-sched__r${call ? " cxd-sched__r--call" : ""}`}>
                        <span role="cell" className="cxd-tag">M-{s.n}</span>
                        <span role="cell" className="cxd-sched__t">
                          <Link href={`/commercial/what-we-do#${s.slug}`}>{s.title}</Link>
                        </span>
                        <span role="cell" className="cxd-sched__p">{s.lede}</span>
                        <span role="cell" className="cxd-sched__s"><b className="cxd-sched__lbl">Suits </b>{s.suits}</span>
                        <span role="cell" className="cxd-sched__go">
                          {call ? (
                            // The one package somebody rings rather than emails.
                            <a className="abtn abtn--or cxd-callbtn" href={`tel:${site.phoneE164}`} data-call-from="commercial-breakdowns">Call {site.phone}</a>
                          ) : (
                            <Link href={`/commercial/what-we-do#${s.slug}`} aria-label={`What's included: ${s.title}`} tabIndex={-1}>Included →</Link>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="cxd-equip">
                <span className="cxd-equip__k">Licensed and equipped for</span>
                <ul>{COMM_CAPABILITIES.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
            </div>
          </section>

          {/* ---------- A-01: the sites, as a register, and the photos ---------- */}
          <section className="cxd-sec cxd-paper" id="sites" aria-labelledby="cxd-sites">
            <div className="wrap">
              <div className="cxd-split">
                <header className="cxd-head cxd-head--side">
                  <Sheet no="A-01" name="Register of sites" />
                  <H2 id="cxd-sites" text="Named, {not logos}." />
                  <p>The job and the location against each. A reference you can ring is worth more than a logo you can&apos;t.</p>
                </header>
                <ol className="cxd-reg" data-anim="stagger">
                  {COMM_CLIENTS.map((c, i) => (
                    <li key={c.name} className="cxd-reg__r">
                      <span className="cxd-reg__n">{String(i + 1).padStart(2, "0")}</span>
                      <span className="cxd-reg__name">{c.name}</span>
                      <span className="cxd-reg__what">{c.what}</span>
                      {/* The sector is written out; its colour only groups the four kinds. */}
                      <span className={`cxd-reg__sec cxd-reg__sec--${c.tone}`}>{c.sector}</span>
                      <span className="cxd-reg__where">{c.where}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="cxd-galhead">
                <Sheet no="A-02" name="Site photos" />
                <h3 className="cxd-h3">From a recent commercial fit-out. <span>Our own crew, from the lift to the ceiling closing.</span></h3>
                <span className="cxd-hint">Tap a photo to enlarge</span>
              </div>
              <CommGallery />
            </div>
          </section>

          <DuctDivider on="cream" label="return air" />

          {/* ---------- P-01: how the job runs ---------- */}
          <section className="cxd-sec cxd-blue" id="process" aria-labelledby="cxd-proc">
            <div className="wrap">
              <header className="cxd-head">
                <Sheet no="P-01" name="Sequence of works" />
                <H2 id="cxd-proc" text="Start to finish, {in order}." />
              </header>
              <ProcessTimeline />
            </div>
          </section>

          {/* ---------- S-01: the standard, and who signs it ---------- */}
          <section className="cxd-sec cxd-paper" id="standard" aria-labelledby="cxd-std">
            <div className="wrap">
              <header className="cxd-head">
                <Sheet no="S-01" name="Specification" />
                <H2 id="cxd-std" text="The standard, {written down}." />
                <p>Nobody rings back about the ductwork. They ring back because the job never made work for them.</p>
              </header>
              <ol className="cxd-spec" data-anim="stagger">
                {COMM_STANDARD.map((s) => (
                  <li key={s.n}>
                    <span className="cxd-spec__n">1.{s.n}</span>
                    <div>
                      <h3>{s.h}</h3>
                      <p>{s.p}</p>
                    </div>
                  </li>
                ))}
              </ol>

              {/* The approval block on a drawing: who approves it, who prices it. */}
              <div className="cxd-sign" data-anim="stagger">
                {SIGNED.map((p) => (
                  <article key={p.name} className="cxd-sign__c">
                    <span className="cxd-sign__role">{p.role}</span>
                    <span className="cxd-sign__ph"><Image src={p.photo} alt={p.name} fill sizes="(max-width: 700px) 30vw, 180px" /></span>
                    <div className="cxd-sign__t">
                      <h3>{p.name}</h3>
                      <small>{p.title}</small>
                      <span className="cxd-sign__lic">{p.lic}</span>
                      <p>{p.bio}</p>
                    </div>
                  </article>
                ))}
              </div>
              <p className="cxd-behind">
                Behind us: our crew, in our own vans, with every part of the job run under us. No labour hire, and the same crew on your site from the first week to the last.
              </p>
            </div>
          </section>

          {/* ---------- D-01: our details, as a data sheet ---------- */}
          <section className="cxd-sec cxd-white" id="details" aria-labelledby="cxd-det">
            <div className="wrap">
              <div className="cxd-split cxd-split--det">
                <header className="cxd-head cxd-head--side">
                  <Sheet no="D-01" name="Data sheet" />
                  <H2 id="cxd-det" text="Our details, {before you ask}." />
                  <p>Certificates of currency and SWMS go out the same day you ask. The capability statement has the lot on one page.</p>
                  <Link className="abtn abtn--navy" href="/commercial/capability">Capability statement →</Link>
                </header>
                <div className="cxd-data" data-anim="stagger">
                  {CAPABILITY.map((g) => (
                    <section key={g.group} className="cxd-data__g">
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
                  <section className="cxd-data__g">
                    <h3>Equipment we&apos;re authorised for</h3>
                    <dl>
                      {COMM_BRANDS.map((b) => (
                        <div key={b.name}><dt>{b.name}</dt><dd>{b.what}</dd></div>
                      ))}
                    </dl>
                    <p className="cxd-data__note">Trade partner of Reece. Direct supply means real stock and real warranties, with no middlemen between you and the gear.</p>
                  </section>
                </div>
              </div>
            </div>
          </section>

          {/* ---------- Q-01: the questions ---------- */}
          <section className="cxd-sec cxd-paper" id="faq" aria-labelledby="cxd-faq">
            <div className="wrap cxd-split">
              <header className="cxd-head cxd-head--side">
                <Sheet no="Q-01" name="Requests for information" />
                <H2 id="cxd-faq" text="Asked before {a first job}." />
                <p>
                  Plant down on a contracted site?{" "}
                  <a href={`tel:${site.phoneE164}`} data-call-from="commercial-faq">Call {site.phone}</a>. After hours goes to someone on the tools.
                </p>
              </header>
              <div className="cxd-faqs">
                {COMM_FAQS.map((f, i) => (
                  <details key={f.q} className="cxd-faq" open={i === 0}>
                    <summary>
                      <span className="cxd-faq__n">RFI {String(i + 1).padStart(2, "0")}</span>
                      <span className="cxd-faq__q">{f.q}</span>
                      <i aria-hidden="true" />
                    </summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          <DuctDivider on="cream" label="supply air" />

          {/* ---------- T-01: submit a scope ---------- */}
          <section className="cxd-sec cxd-blue cxd-scope" id="scope" aria-labelledby="cxd-scope">
            <div className="wrap cxd-scope__in">
              <div className="cxd-scope__copy">
                <Sheet no="T-01" name="Transmittal" />
                <H2 id="cxd-scope" text="Tell us what you're {not being told}." />
                <p className="cxd-scope__p">
                  Every mechanical package has a gap in it somewhere. The plans say one thing, the site says another, and whoever notices last pays for it. We find the gap and put it in the scope, in writing, before anyone signs.
                </p>
                <ul className="cxd-checks">
                  <li>One price against one written scope</li>
                  <li>Exclusions stated, not buried</li>
                  <li>Variations approved before the work, not with the invoice</li>
                  <li>SWMS and certificates back before anyone turns up</li>
                </ul>
                <ol className="cxd-after">
                  <li><b>Today</b><span>Read by the person who will price it, not a queue.</span></li>
                  <li><b>Inside a day</b><span>Questions back if the scope has a gap in it.</span></li>
                  <li><b>Then</b><span>One price against one written scope, exclusions stated.</span></li>
                </ol>
              </div>
              <div className="cxd-scope__form">
                <CommercialScopeForm badge="Read by the person who prices it" />
              </div>
            </div>
          </section>
        </div>

        <JsonLd data={faqSchema(COMM_FAQS)} />
      </div>
    </>
  );
}
