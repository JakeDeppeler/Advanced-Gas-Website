import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { site } from "@/lib/site";
import { COMM_CLIENTS } from "@/lib/commercial";
import {
  CAPABILITY_STATEMENT,
  COMM_AREA_NEAR,
  COMM_COMMUNITY,
  COMM_DISCIPLINES,
  COMM_LEADERSHIP,
  COMM_LICENCE_CLASSES,
  COMM_REGISTRATION_CLASSES,
  COMM_TRADE_QUALIFICATIONS,
} from "@/lib/commercialSite";
import { CountUp } from "@/components/CountUp";
import { CxSubHero } from "@/components/commercial/CxSubHero";
import { CxClose } from "@/components/commercial/CxClose";
import { CapabilityDoc } from "@/components/commercial/CapabilityDoc";
import { CommReveal } from "@/components/commercial/CommReveal";
import "../cx.css";

export const metadata: Metadata = {
  title: "Capability Statement, Commercial Mechanical",
  description:
    "Licences, insurance, accreditation, clients and the people accountable. ABN 35 607 575 280, ARC AU59557, $20M public liability. Certificates the same day.",
  alternates: { canonical: "/commercial/capability" },
};

/**
 * The 2026 capability statement.
 *
 * Everything a prequal asks for, in the order it asks for it, on one page
 * that cannot go stale in somebody's downloads folder. The hero's document
 * card is the argument in miniature: the thing you are about to request is
 * already assembled.
 *
 * Every "Request certificates" on the page points at the contact form with
 * ?type=docs, which preselects the Documents tab — a procurement officer
 * should not have to work out which of four forms is theirs.
 */

const STATS: { v: string; k: string }[] = [
  { v: "20+", k: "Years' director experience" },
  { v: "$20M", k: "Public liability" },
  { v: "12 yrs", k: "Trading from Pakenham" },
  { v: "12 mo", k: "Workmanship warranty" },
];

const CREDS: { k: string; v: string }[] = [
  { k: "Public liability", v: "$20M" },
  { k: "Refrigerant", v: site.licences.refrigeration },
  { k: "Plumbing licence", v: "46828" },
  { k: "ABN", v: site.abn },
  { k: "ACN", v: site.acn },
  { k: "Base", v: `${site.address.suburb} VIC` },
];

export default function CapabilityPage() {
  return (
    <div className="page-cx" data-no-reveal>
      <CxSubHero
        eyebrow="2026 capability statement"
        title={<>Everything the prequal asks for. <em>On one page.</em></>}
        lede={
          <>
            Licences, insurance, accreditation, clients and the people accountable, for procurement teams, head
            contractors and facility managers. Certificates of currency go out the same day you ask.
          </>
        }
        crumb="Capability statement"
        over
        ctas={
          <>
            <Link className="ds-btn ds-btn--orange ds-btn--lg" href="/commercial/contact?type=docs">
              Request certificates →
            </Link>
            <a className="ds-btn ds-btn--ghost-on-dark ds-btn--lg" href="#statement">Read the statement</a>
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
        aside={<CapabilityDoc />}
      />

      <div className="cx-creds">
        <div className="wrap">
          <div className="cx-creds__card">
            <dl className="cx-creds__grid">
              {CREDS.map((c, i) => (
                <div className="cx-cred cx-rv" key={c.k} style={{ ["--i" as string]: String(i) }}>
                  <dt>{c.k}</dt>
                  <dd>{c.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* ======================== 01 · OVERVIEW ======================== */}
      <section className="cx-sec" id="overview">
        <div className="wrap">
          <header className="cx-sec__head cx-rv">
            <span className="cx-eye">01 · Who we are</span>
            <h2>Overview.</h2>
          </header>

          <div className="cx-ovw">
            <div className="cx-ovw__t cx-rv">
              <p>A family-owned business based in Pakenham, servicing Melbourne&rsquo;s south-east and West Gippsland.</p>
              <p>
                We are a provider of HVAC, heating, cooling, Type A gas, general and mechanical plumbing, and
                refrigeration services across residential, commercial and industrial projects throughout Victoria,
                and open to projects across the region and interstate.
              </p>
              <p>
                We operate from traditional values: we under-promise, over-deliver, and complete work on time,
                within schedule and budget.
              </p>
            </div>
            <div className="cx-ovw__side cx-rv" style={{ ["--i" as string]: "1" }}>
              <h4>From {site.address.street}, {site.address.suburb}</h4>
              <ul className="cx-chips">
                {COMM_AREA_NEAR.map((a) => <li key={a}>{a}</li>)}
              </ul>
              <p>
                Fully licensed and insured. Certificates of Electrical &amp; Gas Safety provided. Certificates of
                currency available on request.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== 02 · SPECIALISATIONS ===================== */}
      <section className="cx-sec cx-sec--navy" id="specialisations">
        <div className="wrap">
          <header className="cx-sec__head cx-sec__head--row cx-rv">
            <div>
              <span className="cx-eye cx-eye--sky">02 · What we do</span>
              <h2>Specialisations &amp; licensing.</h2>
            </div>
            <Link className="ds-btn ds-btn--ghost-on-dark" href="/commercial/what-we-do">What we do →</Link>
          </header>

          <ol className="cx-svc">
            {COMM_DISCIPLINES.map((d, i) => (
              <li
                className={`cx-svc__item cx-rv${d.n === "04" ? " cx-svc__item--wide" : ""}`}
                key={d.n}
                style={{ ["--i" as string]: String(i % 3) }}
              >
                <span className="cx-num">{d.n} · {d.kicker}</span>
                <h3>{d.h}</h3>
                <p>{d.p}</p>
              </li>
            ))}
            <li className="cx-svc__item cx-rv" style={{ ["--i" as string]: "1" }}>
              <span className="cx-num">ARC</span>
              <h3>{site.licences.refrigeration.replace(/^ARC\s*/, "")}</h3>
              <p>Authorised ARC trading authority for the handling of refrigerant gases.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* ==================== 03 · COMPANY DETAILS ==================== */}
      <section className="cx-sec cx-sec--cream2" id="statement">
        <div className="wrap">
          <div className="cx-spec">
            <div className="cx-spec__side cx-rv">
              <div className="cx-spec__doc" aria-hidden="true" />
              <span className="cx-eye">03 · Company details</span>
              <h2>Backed, credentialed and accountable.</h2>
              <p>Every job carries our credentials, our compliance paperwork and our name.</p>
              <Link className="ds-btn ds-btn--orange" href="/commercial/contact?type=docs">Request certificates →</Link>
            </div>

            <div className="cx-spec__tables">
              {CAPABILITY_STATEMENT.map((g, i) => (
                <section className="cx-tbl cx-rv" key={g.group} style={{ ["--i" as string]: String(i % 2) }}>
                  <h4>{g.group}</h4>
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
          </div>
        </div>
      </section>

      {/* ================= 04 · DIRECTOR ACCREDITATION ================= */}
      <section className="cx-sec" id="accreditation">
        <div className="wrap">
          <header className="cx-sec__head cx-rv">
            <span className="cx-eye">04 · Director accreditation</span>
            <h2>Dean Winbanks, licence 46828.</h2>
            <p className="cx-sec__lede">
              The classes held by the director who signs off the works, and the trade he is qualified in.
            </p>
          </header>

          <div className="cx-acc">
            <section className="cx-tbl cx-rv">
              <h4>Licence classes held</h4>
              <ul>{COMM_LICENCE_CLASSES.map((c) => <li key={c}>{c}</li>)}</ul>
            </section>
            <section className="cx-tbl cx-rv" style={{ ["--i" as string]: "1" }}>
              <h4>Registration classes held</h4>
              <ul>{COMM_REGISTRATION_CLASSES.map((c) => <li key={c}>{c}</li>)}</ul>
            </section>
          </div>

          {/* A trade, not a licence class — and the stronger credential of
              the two, so it gets its own line rather than a twelfth bullet
              in a list where it would read as more of the same. */}
          <div className="cx-arc cx-arc--said cx-rv">
            <b>{COMM_TRADE_QUALIFICATIONS.q}</b>
            <p>{COMM_TRADE_QUALIFICATIONS.p}</p>
          </div>
        </div>
      </section>

      {/* ======================== 05 · CLIENTS ======================== */}
      <section className="cx-sec cx-sec--cream2" id="clients">
        <div className="wrap">
          <header className="cx-sec__head cx-sec__head--row cx-rv">
            <div>
              <span className="cx-eye">05 · Track record</span>
              <h2>Key projects &amp; clients.</h2>
              <p className="cx-sec__lede">
                Trusted by national brands, tier-one builders and local institutions for installation, repair and
                maintenance of their heating, cooling and mechanical services.
              </p>
            </div>
            <Link className="ds-btn ds-btn--ghost" href="/commercial#jobs">See the jobs →</Link>
          </header>

          <ol className="cx-ctab cx-rv">
            {COMM_CLIENTS.map((c, i) => (
              <li key={c.name}>
                <span className="cx-num">{String(i + 1).padStart(2, "0")}</span>
                <b>{c.name}</b>
                <span>{c.what}</span>
                <span className={`cx-tag cx-tag--${c.tone}`}>{c.sector}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ======================= 06 · LEADERSHIP ======================= */}
      <section className="cx-sec" id="leadership">
        <div className="wrap">
          <header className="cx-sec__head cx-sec__head--row cx-rv">
            <div>
              <span className="cx-eye">06 · Leadership</span>
              <h2>The people who quote it, run it and stand behind it.</h2>
            </div>
            <Link className="ds-btn ds-btn--ghost" href="/commercial/about">About us →</Link>
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
        </div>
      </section>

      {/* ======================== 07 · COMMUNITY ======================== */}
      <section className="cx-sec cx-sec--navy" id="community">
        <div className="wrap">
          <div className="cx-comm">
            <div className="cx-rv">
              <span className="cx-eye cx-eye--sky">07 · Giving back</span>
              <h2>Community involvement.</h2>
              <p>
                We are proud supporters of and active contributors to local sporting groups in Pakenham, through
                financial contributions and through time and hands-on effort on a voluntary basis.
              </p>
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
        eyebrow="For your prequal"
        title="Need the certificates?"
        action={{ href: "/commercial/contact?type=docs", label: "Request certificates →" }}
        second={{ href: `tel:${site.phoneE164}`, label: site.phone, external: true }}
      >
        Certificates of currency, SWMS and licence copies go out the same day you ask. Everything on this page is
        current, which is the advantage of it not being a PDF in somebody&rsquo;s downloads folder.
      </CxClose>

      <CommReveal />
    </div>
  );
}
