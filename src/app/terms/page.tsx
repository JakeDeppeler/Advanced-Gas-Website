import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import "../legal/legal.css";

/**
 * Terms of service.
 *
 * Same story as /privacy: linked from the footer on every page and
 * never built, so every crawl reports a 404.
 *
 * The substance matters more than the compliance. Quotes, prices,
 * rebates and warranties are the four things customers argue about, so
 * each gets a plain statement of what we're actually promising. The
 * consumer-guarantee paragraph is there because nothing on this page
 * can take those rights away and it is better to say so than to have
 * someone assume otherwise.
 */

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "How our quotes, prices, VEU rebates, deposits, access requirements and 6-year workmanship warranty work, in plain terms. Advanced Gas & Aircon, Pakenham.",
  alternates: { canonical: "/terms" },
};

const UPDATED = "12 August 2026";

export default function TermsPage() {
  return (
    <div className="legal">
      <div className="wrap legal__wrap">
        <span className="legal__eyebrow">Legal</span>
        <h1>Terms of service</h1>
        <p className="legal__updated">Last updated {UPDATED}</p>

        <p>
          These are the terms {site.legalName}, trading as {site.name}, works
          under. They apply when you accept a quote from us. They are written to
          be read, not to be survived.
        </p>

        <h2>Quotes</h2>
        <p>
          A written quote is fixed for 30 days and the number on it is the
          number on the invoice. If something on site turns out to be different
          from what we were told or could see, we stop, tell you what changed,
          and give you a revised price before we do the work. We do not
          discover extra cost halfway through and bill you for it afterwards.
        </p>
        <p>
          Prices on this website are indicative and are there so you know
          roughly where you stand. The quote is the price.
        </p>

        <h2>Rebates</h2>
        <p>
          Where a job is eligible under Victorian Energy Upgrades or Solar
          Homes, we apply the rebate at the quote and lodge the paperwork
          ourselves. You do not front the money and chase it back.
        </p>
        <p>
          Eligibility is decided by the scheme, not by us, and rebate values
          move with certificate prices. We confirm your eligibility before you
          commit. If a rebate is refused for a reason we got wrong, we wear it.
          If it is refused because the information you gave us was wrong, the
          difference is payable.
        </p>

        <h2>Deposits and payment</h2>
        <p>
          Most residential jobs are paid on completion. Where a job needs
          equipment ordered in specially, we ask for a deposit to cover the
          stock, and that is stated on the quote rather than sprung on you.
          Invoices are due within 7 days unless we have agreed otherwise in
          writing.
        </p>

        <h2>Access and site conditions</h2>
        <p>
          We need safe access to the work area, the switchboard and the meter on
          the day. If a roof is unsafe to walk, if the weather makes roof work
          dangerous, or if we can&rsquo;t get to the equipment, we will rebook
          rather than push on. We would rather move a job than have someone get
          hurt on it.
        </p>
        <p>
          If we arrive at an agreed time and can&rsquo;t get in, or the job is
          cancelled with less than 24 hours notice, a call-out fee may apply. We
          will tell you before charging it.
        </p>

        <h2>Warranty</h2>
        <ul>
          <li>
            <strong>Our workmanship: 6 years.</strong> If something we did
            fails, we come back and fix it. That covers the install, the
            brackets, the pipework, the wiring and the finish.
          </li>
          <li>
            <strong>The equipment: the manufacturer&rsquo;s own warranty,</strong>{" "}
            registered in your name at install. Lengths vary by product and are
            listed on each product page.
          </li>
          <li>
            <strong>Parts we supply on a repair: 12 months.</strong>
          </li>
        </ul>
        <p>
          Warranty does not cover damage from misuse, storms, pests, power
          surges, someone else&rsquo;s work on the system, or a manufacturer
          service schedule that was never followed. Where a manufacturer
          requires annual servicing to keep cover in force, we tell you at
          handover and the reminder is free.
        </p>

        <h2>Cancelling</h2>
        <p>
          You can cancel before we order equipment and we will refund any
          deposit in full. After stock is ordered specially for your job, we
          keep the cost of that stock and refund the rest.
        </p>

        <h2>Liability</h2>
        <p>
          We carry $20 million public liability insurance. We are responsible
          for the work we do and the damage we cause. We are not responsible for
          pre-existing faults in a property, or for consequential losses such as
          lost income, beyond what the law requires of us.
        </p>

        <div className="legal__box">
          <h2>Your consumer rights</h2>
          <p>
            Nothing on this page limits your rights under the Australian
            Consumer Law. Our goods and services come with guarantees that
            cannot be excluded. You are entitled to a replacement or refund for
            a major failure, and to compensation for other reasonably
            foreseeable loss or damage. Where a failure is not major, you are
            entitled to have it fixed in a reasonable time.
          </p>
        </div>

        <h2>Anything else</h2>
        <p>
          These terms are governed by the law of Victoria, Australia. If a
          dispute comes up, call us first, on{" "}
          <a href={`tel:${site.phoneE164}`}>{site.phone}</a>. In eleven years
          almost everything has been sorted out on the phone.
        </p>

        <p style={{ marginTop: "2rem" }}>
          {site.legalName} · ABN {site.abn} · Plumbing Licence 46828 ·{" "}
          <Link href="/contact">Contact us</Link> ·{" "}
          <Link href="/privacy">Privacy notice</Link>
        </p>
      </div>
    </div>
  );
}
