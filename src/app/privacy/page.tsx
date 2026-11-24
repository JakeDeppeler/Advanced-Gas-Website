import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { PHOTO } from "@/lib/homepage/data";
import { LegalPage, LegalLead, LegalSection } from "../legal/LegalPage";

/**
 * Privacy notice.
 *
 * The footer has linked here since the site launched and the page has
 * never existed, so every crawl reports a 404 on it. It also isn't
 * optional: we collect names, addresses and phone numbers through the
 * quote form and lodge identifying details to claim a VEU rebate, which is
 * exactly the sort of disclosure a privacy notice is for. We are a
 * VEU-accredited installer ourselves, so the notice says that rather than
 * naming a third-party "provider" the rest of the site contradicts.
 *
 * Written plainly on purpose. A page nobody can read protects nobody.
 */

const DESCRIPTION =
  "What Advanced Gas & Aircon collects when you ask for a quote, who we hand it to for VEU rebate lodgement, how long we keep it and how to ask for it back.";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
};

const UPDATED = "24 November 2026";

const TOC: [string, string][] = [
  ["collect", "What we collect"],
  ["who", "Who else sees it"],
  ["keep", "How long we keep it"],
  ["cookies", "Cookies"],
  ["access", "Getting it, correcting it, or having it deleted"],
  ["complaints", "Complaints"],
];

export default function PrivacyPage() {
  return (
    <LegalPage
      crumb="Privacy notice"
      title="Privacy {notice}."
      // The meta description doubles as the hero's line, so the hero adds nothing the notice doesn't say.
      sub={DESCRIPTION}
      // The crew in front of the vans, as the homepage opens: "a family HVAC business in Pakenham, not a data company".
      photo={PHOTO.team} pos="center 40%"
      updated={UPDATED}
      toc={TOC}
      end={{ title: <>Rather <span>talk it through</span>?</>, from: "privacy-cta" }}
    >
        <LegalLead><p>
          This explains what {site.legalName}, trading as {site.name}, does with
          your information. We are a family HVAC business in Pakenham, not a
          data company, and the short version is that we collect what we need to
          quote and complete a job, we hand a small part of it to the people who
          process your rebate, and we don&rsquo;t sell any of it to anyone.
        </p></LegalLead>

        <LegalSection id="collect" title="What we collect" icon="list">
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
              <strong>When you use the site:</strong> which pages are viewed and
              which site sent you to us, counted by Vercel Analytics, plus
              anonymous page-speed measurements. We do not run advertising
              trackers and we do not build a profile of you.
            </li>
          </ul>
        </LegalSection>

        <LegalSection id="who" title="Who else sees it" icon="people">
          <p>
            Only where the job requires it, and only the part they need:
          </p>
          <ul>
            <li>
              <strong>Victorian Energy Upgrades.</strong> We are a VEU-accredited
              installer. To claim a VEU rebate on your behalf we have to lodge
              your name, the property address, and evidence of the old and new
              systems under the scheme. That is a requirement of the scheme, not
              a choice we make.
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
              website hosting. They store the data; they don&rsquo;t use it. Our
              database and the servers behind the website are in Tokyo, Japan, so
              the details you send us through the site are stored there.
            </li>
          </ul>
          <p>
            We do not sell your information, we do not trade it, and we do not
            hand it to anyone for marketing.
          </p>
        </LegalSection>

        <LegalSection id="keep" title="How long we keep it" icon="clock">
          <p>
            Quotes that don&rsquo;t become jobs are kept for two years, because
            people come back. Job records, compliance certificates and warranty
            registrations are kept for at least seven years, which is what the
            gas, plumbing and electrical rules require and what you would want us
            to have if you ever needed to make a claim.
          </p>
        </LegalSection>

        <LegalSection id="cookies" title="Cookies" icon="cookie">
          <p>
            The site sets no advertising or profiling cookies. Vercel Analytics
            counts page views and referring sites without cookies, so we can see
            which pages people actually use. The site also records anonymous
            page-speed measurements so we can tell whether a page is loading
            slowly on a phone in a bad reception area.
          </p>
        </LegalSection>

        <LegalSection id="access" title="Getting it, correcting it, or having it deleted" icon="file">
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
        </LegalSection>

        <LegalSection id="complaints" title="Complaints" icon="flag" boxed>
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
        </LegalSection>

        <p className="lg__foot">
          {site.legalName} · ABN {site.abn} · Plumbing Licence 46828 ·{" "}
          <Link href="/contact">Contact us</Link> ·{" "}
          <Link href="/terms">Terms of service</Link>
        </p>
    </LegalPage>
  );
}
