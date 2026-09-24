import type { Metadata } from "next";
import { site } from "@/lib/site";
import { CAPABILITY, COMM_CLIENTS, COMM_SCOPES, COMM_CAPABILITIES, COMM_FACTS } from "@/lib/commercial";
import { PrintButton } from "@/components/PrintButton";
import { CxSubHero } from "@/components/commercial/CxSubHero";
import { CxClose } from "@/components/commercial/CxClose";
import { CommReveal } from "@/components/commercial/CommReveal";
import "../cx.css";

export const metadata: Metadata = {
  title: "Capability Statement, Commercial Mechanical",
  description:
    "ABN, licences, insurances, safety systems, capacity and past projects, on one page. Commercial mechanical across Melbourne's south-east.",
  alternates: { canonical: "/commercial/capability" },
};

/**
 * The document procurement asks for, as a page.
 *
 * It is a page rather than a PDF because a PDF goes stale in somebody's
 * downloads folder and this doesn't — but it prints to one cleanly, which is
 * the format it usually gets filed in. On paper the hero, the shelf and the
 * figures drop out and the document opens at the first table, under a header
 * that only exists in print.
 */
export default function CapabilityPage() {
  return (
    <div className="page-cx page-cx--cap" data-no-reveal>
      <div className="cx-noprint">
        <CxSubHero
          eyebrow="Capability statement"
          title={site.legalName}
          lede={
            <>
              Commercial mechanical services, Type A gas and hot water across Melbourne&rsquo;s south-east and
              Gippsland. Everything below is current and can be evidenced. Certificates of currency and licence
              copies on request.
            </>
          }
          photo="/comm/rooftop-daikin-box.jpg"
        />

        <div className="cx-shelf">
          <div className="wrap">
            <div className="cx-shelf__card">
              <div className="cx-shelf__row">
                <dl className="cx-capcontact">
                  <div>
                    <dt>Phone</dt>
                    <dd><a href={`tel:${site.phoneE164}`}>{site.phone}</a></dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd><a href={`mailto:${site.email}`}>{site.email}</a></dd>
                  </div>
                  <div>
                    <dt>Address</dt>
                    <dd>
                      {site.address.street}, {site.address.suburb} {site.address.state} {site.address.postcode}
                    </dd>
                  </div>
                </dl>
                <PrintButton />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What a filed copy opens with instead of the hero. Deliberately not an
          h1: it is hidden on screen and only shown by the print rules, but a
          crawler reads the DOM rather than the stylesheet, and this page was
          once shipping two identical h1s because of it. */}
      <div className="cx-printhead">
        <div className="wrap">
          <p className="cx-printhead__name">{site.legalName}</p>
          <p>
            Capability statement. {site.phone} · {site.email} · {site.address.street}, {site.address.suburb}{" "}
            {site.address.state} {site.address.postcode}
          </p>
        </div>
      </div>

      <section className="cx-sec cx-noprint" style={{ paddingBottom: 0 }}>
        <div className="wrap">
          <ul className="cx-figs">
            {COMM_FACTS.map((f, i) => (
              <li className="cx-fig cx-rv" key={f.k} style={{ ["--i" as string]: String(i) }}>
                <strong>{f.n}</strong>
                <span className="cx-fig__k">{f.k}</span>
                <p>{f.p}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="cx-sec" id="statement">
        <div className="wrap">
          <div className="cx-capgrid">
            {CAPABILITY.map((g, i) => (
              <section
                className={`cx-tbl cx-rv${g.group === "Capacity" ? " cx-tbl--wide" : ""}`}
                key={g.group}
                style={{ ["--i" as string]: String(i % 2) }}
              >
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

            <section className="cx-tbl cx-tbl--wide cx-rv">
              <h4>Scopes undertaken</h4>
              <ul className="cx-caplist">
                {COMM_SCOPES.map((sc) => (
                  <li key={sc.slug}><strong>{sc.title}.</strong> {sc.lede}</li>
                ))}
              </ul>
            </section>

            {/* The confirmed list. It used to scroll across the top of the
                commercial front page; this is where procurement actually goes
                looking for it, and it prints. */}
            <section className="cx-tbl cx-tbl--wide cx-rv">
              <h4>Technical capabilities</h4>
              <ul className="cx-cappills">
                {COMM_CAPABILITIES.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </section>

            <section className="cx-tbl cx-tbl--wide cx-rv">
              <h4>Selected projects &amp; clients</h4>
              <dl>
                {COMM_CLIENTS.map((c) => (
                  <div key={c.name}>
                    <dt>{c.name}</dt>
                    <dd>{c.what} · {c.where}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>

          <p className="cx-capfoot">
            Prepared by {site.name}. ABN {site.abn}. This statement is maintained online at{" "}
            <strong>{site.url.replace(/^https?:\/\//, "")}/commercial/capability</strong>. The version you are reading
            is the current one, which is the advantage of it not being a PDF in somebody&rsquo;s downloads folder.
          </p>
        </div>
      </section>

      <CxClose
        title="Need it on file?"
        action={{ href: "/commercial/contact", label: "Request the certificates →" }}
        alt={{ href: `tel:${site.phoneE164}`, label: <>or call <strong>{site.phone}</strong></>, external: true }}
      >
        Print this page to PDF and it comes out as a one-document statement. Or ask, and the certificates of currency
        go through the same day.
      </CxClose>

      <CommReveal />
    </div>
  );
}
