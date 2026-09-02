import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import "../legal/legal.css";

/**
 * Privacy notice.
 *
 * The footer has linked here since the site launched and the page has
 * never existed, so every crawl reports a 404 on it. It also isn't
 * optional: we collect names, addresses and phone numbers through the
 * quote form and hand identifying details to an accredited provider to
 * lodge a VEU rebate, which is exactly the sort of disclosure a privacy
 * notice is for.
 *
 * Written plainly on purpose. A page nobody can read protects nobody.
 */

export const metadata: Metadata = {
  title: "Privacy Notice",
  description:
    "What Advanced Gas & Aircon collects when you ask for a quote, who we hand it to for VEU rebate lodgement, how long we keep it and how to ask for it back.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "12 August 2026";

export default function PrivacyPage() {
  return (
    <div className="legal">
      <div className="wrap legal__wrap">
        <span className="legal__eyebrow">Legal</span>
        <h1>Privacy notice</h1>
        <p className="legal__updated">Last updated {UPDATED}</p>

        <p>
          This explains what {site.legalName}, trading as {site.name}, does with
          your information. We are a family HVAC business in Pakenham, not a
          data company, and the short version is that we collect what we need to
          quote and complete a job, we hand a small part of it to the people who
          process your rebate, and we don&rsquo;t sell any of it to anyone.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>When you ask for a quote:</strong> your name, phone number,
            email, the address of the property, and what you told us about the
            job. If you send photos of an existing unit, we keep those with the
            quote.
          </li>
          <li>
            <strong>When we attend:</strong> notes on the property and the
            system, model and serial numbers, photos of the work, and the
            compliance certificates we are legally required to issue and retain.
          </li>
          <li>
            <strong>When you subscribe to the seasonal reminder email:</strong>{" "}
            your email address, and nothing else.
          </li>
          <li>
            <strong>When you use the site:</strong> anonymous page-performance
            measurements. We do not run advertising trackers and we do not build
            a profile of you.
          </li>
        </ul>

        <h2>Who else sees it</h2>
        <p>
          Only where the job requires it, and only the part they need:
        </p>
        <ul>
          <li>
            <strong>VEU accredited providers.</strong> To claim a Victorian
            Energy Upgrades rebate on your behalf we have to lodge your name,
            the property address, and evidence of the old and new systems. That
            is a requirement of the scheme, not a choice we make.
          </li>
          <li>
            <strong>Manufacturers.</strong> We register your warranty in your
            name, which means giving them your name, the address and the model
            and serial numbers.
          </li>
          <li>
            <strong>Regulators.</strong> Gas, plumbing and electrical compliance
            certificates are lodged with the relevant Victorian authority. This
            is not optional and it protects you.
          </li>
          <li>
            <strong>The people who run our software.</strong> Email, quoting and
            website hosting. They store the data; they don&rsquo;t use it.
          </li>
        </ul>
        <p>
          We do not sell your information, we do not trade it, and we do not
          hand it to anyone for marketing.
        </p>

        <h2>How long we keep it</h2>
        <p>
          Quotes that don&rsquo;t become jobs are kept for two years, because
          people come back. Job records, compliance certificates and warranty
          registrations are kept for at least seven years, which is what the
          gas, plumbing and electrical rules require and what you would want us
          to have if you ever needed to make a claim.
        </p>

        <h2>Cookies</h2>
        <p>
          The site sets no advertising or profiling cookies. It records
          anonymous page-speed measurements so we can tell whether a page is
          loading slowly on a phone in a bad reception area, which is the only
          reason we look at it.
        </p>

        <h2>Getting it, correcting it, or having it deleted</h2>
        <p>
          Email{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a> or call{" "}
          <a href={`tel:${site.phoneE164}`}>{site.phone}</a> and ask. We will
          confirm who you are, then send you what we hold, correct anything
          wrong, or delete it, within 30 days.
        </p>
        <p>
          The exception is the records we are legally required to keep:
          compliance certificates and the evidence behind a lodged VEU rebate.
          We can&rsquo;t delete those, and we will tell you plainly which ones
          they are.
        </p>

        <div className="legal__box">
          <h2>Complaints</h2>
          <p>
            If you think we have mishandled your information, tell us first,
            at <a href={`mailto:${site.email}`}>{site.email}</a>. We will look
            into it and come back to you within 30 days.
          </p>
          <p>
            If you are not satisfied with how we handle it, you can take it to
            the Office of the Australian Information Commissioner at{" "}
            <a href="https://www.oaic.gov.au/privacy/privacy-complaints" target="_blank" rel="noopener noreferrer">
              oaic.gov.au
            </a>
            .
          </p>
        </div>

        <p style={{ marginTop: "2rem" }}>
          {site.legalName} · ABN {site.abn} · Plumbing Licence 46828 ·{" "}
          <Link href="/contact">Contact us</Link> ·{" "}
          <Link href="/terms">Terms of service</Link>
        </p>
      </div>
    </div>
  );
}
