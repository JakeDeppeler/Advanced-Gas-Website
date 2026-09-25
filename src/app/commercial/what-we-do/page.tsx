import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { site } from "@/lib/site";
import { COMM_SCOPES } from "@/lib/commercial";
import {
  COMM_BRANDS_ALL,
  COMM_DISCIPLINES,
  COMM_PACKAGE_LINES,
  COMM_SCOPE_ITEMS,
  COMM_SECTORS,
} from "@/lib/commercialSite";
import { CxSubHero } from "@/components/commercial/CxSubHero";
import { CxClose } from "@/components/commercial/CxClose";
import { BuildingSchematic } from "@/components/commercial/BuildingSchematic";
import { DimcBand } from "@/components/commercial/DimcBand";
import { CommReveal } from "@/components/commercial/CommReveal";
import "../cx.css";

export const metadata: Metadata = {
  title: "What We Do: HVAC, Type A Gas & Mechanical",
  description:
    "HVAC, Type A gas, mechanical services and refrigeration under one licensed team. Design, install, maintain and certify across Victoria. ARC AU59557.",
  alternates: { canonical: "/commercial/what-we-do" },
};

/**
 * What we do.
 *
 * The front page sells the company; this answers the question a consultant
 * or a builder actually opens with, which is "which trades do you hold, and
 * do I need anyone else". So it leads with the four disciplines rather than
 * the ten packages — a package is a way of buying work, a discipline is the
 * licence that does it — and shows them inside one building, because the
 * argument is that they are all under one roof.
 *
 * The packages are still here, as a two-column index that links through to
 * the detail on the front page, so nobody who came for one has to hunt.
 */

/**
 * Column-major order, so the two-column index reads 01–05 down the left and
 * 06–10 down the right rather than snaking across.
 */
const PACKAGE_ORDER = (() => {
  const half = Math.ceil(COMM_SCOPES.length / 2);
  const out: typeof COMM_SCOPES = [];
  for (let i = 0; i < half; i++) {
    out.push(COMM_SCOPES[i]);
    if (COMM_SCOPES[i + half]) out.push(COMM_SCOPES[i + half]);
  }
  return out;
})();

export default function WhatWeDoPage() {
  return (
    <div className="page-cx" data-no-reveal>
      <CxSubHero
        eyebrow="Specialisations & licensing"
        title={<>Design. Install.<br />Maintain. <em>Certify.</em></>}
        lede={
          <>
            HVAC, Type A gas, mechanical services and refrigeration under one licensed team. Residential, commercial
            and industrial projects across Victoria, with compliance certificates issued on handover.
          </>
        }
        photo="/comm/ductwork.jpg"
        crumb="What we do"
        ctas={
          <>
            <a className="ds-btn ds-btn--orange ds-btn--lg" href="/commercial#scope">Submit a scope →</a>
            <a className="ds-btn ds-btn--ghost-on-dark ds-btn--lg" href="#packages">The ten packages</a>
          </>
        }
        aside={<BuildingSchematic />}
      />

      {/* ==================== 01 · SPECIALISATIONS ==================== */}
      <section className="cx-sec" id="disciplines">
        <div className="wrap">
          <header className="cx-sec__head cx-rv">
            <span className="cx-eye">01 · Specialisations</span>
            <h2>Four disciplines. One licensed team.</h2>
            <p className="cx-sec__lede">
              With this breadth of specialisation we take a holistic approach to HVAC, Type A gas and mechanical
              services: design, installation and maintenance, on residential, commercial and industrial projects
              across Victoria.
            </p>
          </header>

          <ul className="cx-disc">
            {COMM_DISCIPLINES.map((d, i) => (
              <li className="cx-disc__c cx-rv" key={d.n} style={{ ["--i" as string]: String(i % 2) }}>
                <span className="cx-mono">{d.n} · {d.kicker}</span>
                <h3>{d.h}</h3>
                <p>{d.p}</p>
                <ul>
                  {d.tags.map((t) => <li key={t}>{t}</li>)}
                </ul>
              </li>
            ))}
          </ul>

          <div className="cx-arc cx-rv">
            <b>{site.licences.refrigeration}</b>
            <p>
              Advanced Gas &amp; Air Conditioning is an authorised ARC trading authority for the handling of
              refrigerant gases.
            </p>
          </div>
        </div>
      </section>

      <DimcBand />

      {/* ====================== 02 · THE PACKAGES ====================== */}
      <section className="cx-sec" id="packages">
        <div className="wrap">
          <header className="cx-sec__head cx-sec__head--row cx-rv">
            <div>
              <span className="cx-eye">02 · Commercial packages</span>
              <h2>Ten packages, one written scope.</h2>
              <p className="cx-sec__lede">
                A combination of them is normal, and still one price against one written scope.
              </p>
            </div>
            <Link className="ds-btn ds-btn--ghost" href="/commercial#services">Commercial overview →</Link>
          </header>

          <ul className="cx-pk cx-rv">
            {PACKAGE_ORDER.map((s) => (
              <li key={s.slug}>
                {s.slug === "breakdowns" ? (
                  <a href={`tel:${site.phoneE164}`}>
                    <span className="cx-num">{s.n}</span>
                    <div>
                      <b>{s.title}</b>
                      <small>{COMM_PACKAGE_LINES[s.slug]}</small>
                    </div>
                    <em>Call →</em>
                  </a>
                ) : (
                  <Link href={`/commercial#services`}>
                    <span className="cx-num">{s.n}</span>
                    <div>
                      <b>{s.title}</b>
                      <small>{COMM_PACKAGE_LINES[s.slug]}</small>
                    </div>
                    <em>→</em>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ======================== 03 · SECTORS ======================== */}
      <section className="cx-sec cx-sec--cream2" id="sectors">
        <div className="wrap">
          <header className="cx-sec__head cx-rv">
            <span className="cx-eye">03 · Sectors we serve</span>
            <h2>From a single service call to a multi-site contract.</h2>
          </header>

          <ul className="cx-sect">
            {COMM_SECTORS.map((s, i) => (
              <li className="cx-sect__c cx-rv" key={s.kicker} style={{ ["--i" as string]: String(i) }}>
                <div className="cx-sect__imgw">
                  <Image src={s.img} alt="" fill sizes="(max-width: 900px) 100vw, 380px" style={{ objectFit: "cover" }} />
                </div>
                <div className="cx-sect__b">
                  <span className="cx-mono" style={{ color: "var(--cx-ink-3)" }}>{s.kicker}</span>
                  <h3>{s.h}</h3>
                  <p>{s.p}</p>
                  <Link href={s.cta.href}>{s.cta.label}</Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* =================== 04 · SCOPE OF SERVICES =================== */}
      <section className="cx-sec" id="scope-of-services">
        <div className="wrap">
          <header className="cx-sec__head cx-rv">
            <span className="cx-eye">04 · Scope of services</span>
            <h2>Capability at a glance.</h2>
            <p className="cx-sec__lede">
              We design, install, maintain and certify across every major heating, cooling and gas discipline, under
              one licensed roof.
            </p>
          </header>
          <ul className="cx-cg">
            {COMM_SCOPE_ITEMS.map((c, i) => (
              <li className="cx-rv" key={c} style={{ ["--i" as string]: String(i % 3) }}>{c}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ========================== BRANDS ========================== */}
      <section className="cx-sec" id="brands" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="cx-brands__bar cx-rv">
            <span className="cx-mono">Authorised brands &amp; trade partners</span>
            <i aria-hidden="true" />
            <span className="cx-mono">Supplied through <b>Reece</b></span>
          </div>
          <ul className="cx-brands cx-brands--auto">
            {COMM_BRANDS_ALL.map((b, i) => (
              <li className="cx-brand cx-rv" key={b.name} style={{ ["--i" as string]: String(i % 6) }}>
                <b>{b.name}</b>
                <span>{b.what}</span>
              </li>
            ))}
          </ul>
          <p className="cx-brands__note cx-rv">
            Genuine parts and manufacturer-backed warranties on all equipment supplied and installed.
          </p>
        </div>
      </section>

      <CxClose
        eyebrow="Priced against a written scope"
        title="Got drawings? Send them."
        action={{ href: "/commercial#scope", label: "Submit a scope →" }}
        second={{ href: `tel:${site.phoneE164}`, label: site.phone, external: true }}
      >
        Drawings, a mechanical schedule or a site address is enough to begin. Jake reads every commercial enquiry
        himself.
      </CxClose>

      <CommReveal />
    </div>
  );
}
