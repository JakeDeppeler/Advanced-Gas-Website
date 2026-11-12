import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { Crumbs, Hero } from "@/components/homepage/page/kit";
import { BkHead, Bands, BandPage, type Band } from "@/components/homepage/page/bands";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
import "@/components/homepage/page/membership.css";

export const metadata: Metadata = {
  title: "Membership, discounted servicing & priority response",
  description:
    "Become a member for discounted annual servicing, priority same-week response, and waived call-out fees across Pakenham and within 75 km.",
  alternates: { canonical: "/membership" },
  // Placeholder pricing ($TBC on all three tiers). Take this out with the
  // real numbers — and add the page to sitemap.ts at the same time.
  robots: { index: false, follow: false },
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
    blurb: "The basics, done properly. Annual service done on time, no chasing.",
    features: [
      { label: "1 annual gas appliance service", detail: "incl. CO testing + written report" },
      { label: "Member discount on the standard service rate" },
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
    blurb: "Most households pick this one, better discounts and priority callbacks.",
    features: [
      { label: "Annual gas service at the member rate" },
      { label: "Annual aircon filter clean / inspection" },
      { label: "Priority booking, front of the queue" },
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
    blurb: "Multi-system households and landlords, total cover.",
    features: [
      { label: "Up to 3 annual services (gas, aircon, hot water)" },
      { label: "Member service rates on every job" },
      { label: "Waived after-hours make-safe fee" },
      { label: "15% off parts on repairs" },
      { label: "Annual heat pump efficiency check" },
      { label: "A dedicated technician on your account" },
    ],
    cta: { label: "Talk about Gold", href: "/contact" },
  },
];

const faqs = [
  {
    q: "What does the membership cover?",
    a: "Discounted annual servicing across the gear we install: gas appliances, aircon, hot water and heat pumps. Each tier sets the discount on call-outs, the number of services included per year, and how quickly you jump the queue.",
  },
  {
    q: "Is there a contract?",
    a: "12 months at a time, paid up-front or monthly. Cancel at the end of the term, no auto-rollover surprises.",
  },
  {
    q: "Can I switch tiers mid-year?",
    a: "Yes, pay the pro-rata difference and we upgrade you immediately. Downgrades apply at renewal.",
  },
  {
    q: "Does it cover parts and repairs?",
    a: "Membership covers labour discounts and priority response. Parts are charged at cost with the member discount applied (see your tier).",
  },
];

export default function MembershipPage() {
  const bands: Band[] = [
    {
      id: "tiers",
      body: (
        <>
          <BkHead h="Pick your {tier}." />
          <div className="mbx__grid" data-anim="stagger">
            {tiers.map((t) => (
              <article key={t.id} className={`mbx__tier${t.highlight ? " mbx__tier--feature" : ""}`}>
                {t.highlight && <span className="mbx__flag">Most popular</span>}
                <h3 className="mbx__name">{t.name}</h3>
                <p className="mbx__price"><strong>{t.price}</strong><span>{t.cadence}</span></p>
                <p className="mbx__blurb">{t.blurb}</p>
                <ul className="mbx__list">
                  {t.features.map((f) => (
                    <li key={f.label}>
                      <span className="mbx__tick" aria-hidden="true">✓</span>
                      <span>{f.label}{f.detail && <span className="mbx__detail"> {f.detail}</span>}</span>
                    </li>
                  ))}
                </ul>
                <Link href={t.cta.href} className={`abtn ${t.highlight ? "abtn--or" : "abtn--navy"} abtn--flat mbx__cta`}>{t.cta.label} →</Link>
              </article>
            ))}
          </div>
          <p className="mbx__fine">
            Pricing on this page is illustrative while we finalise tier costs. Call <a href={`tel:${site.phoneE164}`}>{site.phone}</a> for the current rate sheet.
          </p>
        </>
      ),
    },
    {
      id: "faqs", cls: "pp__two",
      body: (
        <>
          <BkHead h="How it {works}.">Short answers to the questions we get most often.</BkHead>
          <div className="afaqs">
            {faqs.map((f, i) => (
              <details key={f.q} className="afaq" name="membership-faq" {...(i === 0 ? { open: true } : {})}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </>
      ),
    },
  ];

  return (
    <BandPage>
      <Crumbs trail={[{ name: "Membership" }]} />
      <Hero
        eye="Membership"
        title={<>Servicing done <em>before</em> it becomes a problem.</>}
        sub={<>Three tiers, one promise: your gear keeps working, your callouts get answered first, and the price you see is the price you pay.</>}
        ctas={false}
      >
        {/* Joining is a conversation, not a quote, so the buttons go to contact. */}
        <div className="bxh__ctas">
          <Link href="/contact" className="abtn abtn--or abtn--flat">Become a member →</Link>
          <a href={`tel:${site.phoneE164}`} className="abtn abtn--line" data-call-from="membership-hero">Call {site.phone}</a>
        </div>
      </Hero>
      <Bands list={bands} />
      <section className="bk__sec bk__sec--white bk__sec--end">
        <div className="wrap">
          <div className="bk__box bk__box--acc bk__cta">
            <div>
              <h2 className="bk__boxh">Want to join? It&apos;s a <span>5-minute call</span>.</h2>
              <p>We&apos;ll size the right tier for your gear and lock in your first service date.</p>
            </div>
            <div className="bxh__ctas">
              <Link href="/contact" className="abtn abtn--or abtn--flat">Become a member →</Link>
              <a href={`tel:${site.phoneE164}`} className="abtn abtn--line" data-call-from="membership-cta">Call {site.phone}</a>
            </div>
          </div>
        </div>
      </section>
    </BandPage>
  );
}
