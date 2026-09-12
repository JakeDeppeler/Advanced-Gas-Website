import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { CAPABILITY, COMM_CLIENTS, COMM_SCOPES, COMM_CAPABILITIES, COMM_FACTS } from "@/lib/commercial";
import { PrintButton } from "@/components/PrintButton";
import "../commercial.css";

export const metadata: Metadata = {
  title: "Capability Statement — Advanced Gas & Air Conditioning Services",
  description:
    "Capability statement: ABN, licences, insurances, safety systems, capacity and past projects. Commercial mechanical services across Melbourne's south-east and Gippsland.",
  alternates: { canonical: "/commercial/capability" },
};

/**
 * The document procurement asks for, as a page.
 *
 * It's a page rather than a PDF because a PDF goes stale in someone's downloads
 * folder and this doesn't — but it prints to one, cleanly, which is the format
 * it usually gets filed in.
 */
export default function CapabilityPage() {
  return (
    <div className="page-comm page-cap">
      {/* On screen this opens like every other commercial page. In print the
          hero and the panel drop out (see the print rules) and the document
          starts at the first table, which is where a filed copy should start. */}
      <section className="comm-sub comm-sub--photo cap-hide-print">
        <div className="wrap comm-sub__inner">
          <Link href="/commercial" className="comm-back">← Commercial</Link>
          <span className="ds-eyebrow">Capability statement</span>
          <h1>{site.legalName}</h1>
          <p className="comm-sub__lede">
            Commercial mechanical services, Type A gas and hot water across Melbourne&rsquo;s south-east and Gippsland.
            Everything below is current and can be evidenced. Certificates of currency and licence copies on request.
          </p>
        </div>
      </section>

      <section className="comm-panelsec cap-hide-print">
        <div className="wrap">
          <div className="comm-panel">
            <div className="comm-panel__row">
              <dl className="cap-contact" style={{ margin: 0, padding: 0, border: 0, flex: "1 1 auto" }}>
                <div><dt>Phone</dt><dd><a href={`tel:${site.phoneE164}`}>{site.phone}</a></dd></div>
                <div><dt>Email</dt><dd><a href={`mailto:${site.email}`}>{site.email}</a></dd></div>
                <div><dt>Address</dt><dd>{site.address.street}, {site.address.suburb} {site.address.state} {site.address.postcode}</dd></div>
              </dl>
              <PrintButton />
            </div>
          </div>
        </div>
      </section>

      {/* The print header: what a filed copy opens with instead of the hero. */}
      <section className="cap-printhead">
        <div className="wrap">
          <h1>{site.legalName}</h1>
          <p>Capability statement. {site.phone} · {site.email} · {site.address.street}, {site.address.suburb} {site.address.state} {site.address.postcode}</p>
        </div>
      </section>

      <section className="cap-figures cap-hide-print">
        <div className="wrap">
          <div className="comm-facts">
            {COMM_FACTS.map((f) => (
              <div key={f.k} className="commfact">
                <strong>{f.n}</strong>
                <span>{f.k}</span>
                <p>{f.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cap-body">
        <div className="wrap">
          {CAPABILITY.map((g) => (
            <div key={g.group} className="capblock">
              <h2>{g.group}</h2>
              <dl className="captable">
                {g.rows.map(([k, v]) => (
                  <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                ))}
              </dl>
            </div>
          ))}

          <div className="capblock">
            <h2>Scopes undertaken</h2>
            <ul className="cap-scopes">
              {COMM_SCOPES.map((sc) => (
                <li key={sc.slug}><strong>{sc.title}.</strong> {sc.lede}</li>
              ))}
            </ul>
          </div>

          {/* The confirmed list. It used to scroll across the top of the
              commercial front page; this is where procurement actually goes
              looking for it, and it prints. */}
          <div className="capblock">
            <h2>Technical capabilities</h2>
            <ul className="cap-caps">
              {COMM_CAPABILITIES.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </div>

          <div className="capblock">
            <h2>Selected projects &amp; clients</h2>
            <dl className="captable">
              {COMM_CLIENTS.map((c) => (
                <div key={c.name}><dt>{c.name}</dt><dd>{c.what} · {c.where}</dd></div>
              ))}
            </dl>
          </div>

          <p className="cap-foot">
            Prepared by {site.name}. ABN {site.abn}. This statement is maintained online at{" "}
            <strong>{site.url.replace(/^https?:\/\//, "")}/commercial/capability</strong>. The version you are reading is the
            current one, which is the advantage of it not being a PDF in somebody&rsquo;s downloads folder.
          </p>
        </div>
      </section>

      <section className="comm-cta cap-hide-print">
        <div className="wrap comm-cta__inner">
          <h2>Need it on file?</h2>
          <p>Print this page to PDF and it comes out as a one-document statement. Or ask and we&rsquo;ll send the certificates through.</p>
          <div className="comm-cta__btns">
            <Link href="/commercial/contact" className="ds-btn ds-btn--orange ds-btn--xl">Request the certificates →</Link>
            <a href={`tel:${site.phoneE164}`} className="comm-cta__phone">or call <strong>{site.phone}</strong></a>
          </div>
        </div>
      </section>
    </div>
  );
}
