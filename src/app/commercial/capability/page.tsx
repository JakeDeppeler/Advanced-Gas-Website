import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { CAPABILITY, COMM_CLIENTS, COMM_SCOPES, COMM_CAPABILITIES } from "@/lib/commercial";
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
      <section className="comm-hero comm-hero--sub">
        <div className="wrap comm-hero__inner">
          <Link href="/commercial" className="comm-back comm-back--print">← Commercial</Link>
          <span className="ds-eyebrow">Capability statement</span>
          <h1>{site.legalName}</h1>
          <p className="comm-hero__sub">
            Commercial mechanical services, Type A gas and hot water across Melbourne&rsquo;s south-east and Gippsland.
            Everything below is current and can be evidenced — certificates of currency and licence copies on request.
          </p>
          <div className="cap-contact">
            <div><dt>Phone</dt><dd><a href={`tel:${site.phoneE164}`}>{site.phone}</a></dd></div>
            <div><dt>Email</dt><dd><a href={`mailto:${site.email}`}>{site.email}</a></dd></div>
            <div><dt>Address</dt><dd>{site.address.street}, {site.address.suburb} {site.address.state} {site.address.postcode}</dd></div>
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
            <strong>{site.url.replace(/^https?:\/\//, "")}/commercial/capability</strong> — the version you are reading is the
            current one, which is the advantage of it not being a PDF in somebody&rsquo;s downloads folder.
          </p>
        </div>
      </section>

      <section className="comm-cta cap-hide-print">
        <div className="wrap comm-cta__inner">
          <h2>Need it on file?</h2>
          <p>Print this page to PDF and it comes out as a one-document statement. Or ask and we&rsquo;ll send the certificates through.</p>
          <div className="comm-cta__btns">
            <Link href="/contact?enquiry=commercial" className="ds-btn ds-btn--orange ds-btn--xl">Request the certificates →</Link>
            <a href={`tel:${site.phoneE164}`} className="comm-cta__phone">or call <strong>{site.phone}</strong></a>
          </div>
        </div>
      </section>
    </div>
  );
}
