import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import "./membership.css";

export const metadata: Metadata = {
  title: "Membership — discounted servicing & priority response",
  description:
    "Become a member for discounted annual servicing, priority same-week response, and waived call-out fees across Pakenham and within 75 km.",
  alternates: { canonical: "/membership" },
};

type Tier = {
  id: string;
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  highlight?: boolean;
  features: { label: string; detail?: string }[];
  cta: { label: string; href: string };
};

// TODO: replace placeholder tiers with real pricing + entitlements
const tiers: Tier[] = [
  {
    id: "bronze",
    name: "Bronze",
    price: "$TBC",
    cadence: "/ year",
    blurb: "The basics, sorted. Annual service done on time, no chasing.",
    features: [
      { label: "1 annual gas appliance service", detail: "incl. CO testing + written report" },
      { label: "$30 off standard service rate" },
      { label: "Reminder before your service is due" },
      { label: "Same-week response on faults" },
    ],
    cta: { label: "Get started", href: "/contact" },
  },
  {
    id: "silver",
    name: "Silver",
    price: "$TBC",
    cadence: "/ year",
    highlight: true,
    blurb: "Most households pick this one — better discounts and priority callbacks.",
    features: [
      { label: "Annual gas service at member rate $250 + GST" },
      { label: "Annual aircon filter clean / inspection" },
      { label: "Priority booking — front of the queue" },
      { label: "10% off parts on any repair" },
      { label: "Same-day callback on emergencies" },
    ],
    cta: { label: "Become a member", href: "/contact" },
  },
  {
    id: "gold",
    name: "Gold",
    price: "$TBC",
    cadence: "/ year",
    blurb: "Multi-system households and landlords — total cover.",
    features: [
      { label: "Up to 3 annual services (gas, aircon, hot water)" },
      { label: "Member service rates on every job" },
      { label: "Waived after-hours make-safe fee", detail: "(normally $500 + GST)" },
      { label: "15% off parts on repairs" },
      { label: "Annual heat pump efficiency check" },
      { label: "Dedicated tradie on your account" },
    ],
    cta: { label: "Talk about Gold", href: "/contact" },
  },
];

const faqs = [
  {
    q: "What does the membership cover?",
    a: "Discounted annual servicing across the gear we install — gas appliances, aircon, hot water and heat pumps. Each tier sets the discount on call-outs, the number of services included per year, and how quickly you jump the queue.",
  },
  {
    q: "Is there a contract?",
    a: "12 months at a time, paid up-front or monthly. Cancel at the end of the term — no auto-rollover surprises.",
  },
  {
    q: "Can I switch tiers mid-year?",
    a: "Yes — pay the pro-rata difference and we upgrade you immediately. Downgrades apply at renewal.",
  },
  {
    q: "Does it cover parts and repairs?",
    a: "Membership covers labour discounts and priority response. Parts are charged at cost with the member discount applied (see your tier).",
  },
];

export default function MembershipPage() {
  return (
    <div className="page-membership">
      <section className="mb-hero">
        <div className="wrap">
          <span className="ds-eyebrow ds-eyebrow--on-dark">
            <span className="ds-dot ds-dot--orange" /> Membership
          </span>
          <h1>
            Servicing done <em>before</em> it becomes a problem.
          </h1>
          <p>
            Three tiers, one promise: your gear keeps working, your callouts get answered first, and the price you see is the price you pay. Members get priority booking, discounted service rates and waived after-hours fees.
          </p>
        </div>
      </section>

      <section className="mb-tiers">
        <div className="wrap">
          <div className="mb-grid">
            {tiers.map((t) => (
              <article key={t.id} className={`mb-tier${t.highlight ? " mb-tier--feature" : ""}`}>
                {t.highlight && <span className="mb-tier__flag">Most popular</span>}
                <h2 className="mb-tier__name">{t.name}</h2>
                <div className="mb-tier__price">
                  <strong>{t.price}</strong>
                  <span>{t.cadence}</span>
                </div>
                <p className="mb-tier__blurb">{t.blurb}</p>
                <ul className="mb-tier__features">
                  {t.features.map((f) => (
                    <li key={f.label}>
                      <span className="mb-tier__tick">✓</span>
                      <span>
                        {f.label}
                        {f.detail && (
                          <span className="mb-tier__detail"> {f.detail}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link href={t.cta.href} className="ds-btn ds-btn--orange ds-btn--lg mb-tier__cta">
                  {t.cta.label} →
                </Link>
              </article>
            ))}
          </div>
          <p className="mb-finep">
            Pricing on this page is illustrative while we finalise tier costs. Call <a href={`tel:${site.phoneE164}`}>{site.phone}</a> for the current rate sheet.
          </p>
        </div>
      </section>

      <section className="mb-faq">
        <div className="wrap mb-faq__grid">
          <div className="mb-faq__left">
            <span className="ds-eyebrow"><span className="ds-dot" /> Membership FAQ</span>
            <h2>How it works.</h2>
            <p>Short answers to the questions we get most often.</p>
          </div>
          <div className="mb-faq__right">
            {faqs.map((f, i) => (
              <details key={f.q} name="membership-faq" {...(i === 0 ? { open: true } : {})}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>Want to join? It&apos;s a 5-minute call.</h2>
            <p>We&apos;ll size the right tier for your gear and lock in your first service date.</p>
          </div>
          <div className="bigcta__btns">
            <Link href="/contact" className="ds-btn ds-btn--orange ds-btn--xl">Become a member →</Link>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
