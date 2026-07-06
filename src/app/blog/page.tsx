import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";
import { NewsletterForm } from "@/components/NewsletterForm";
import "./blog.css";

export const metadata: Metadata = {
  title: "Guides & Articles — VEU rebates, heat pumps & aircon",
  description:
    "Plain-English guides on VEU rebates, heat pump sizing, aircon selection, gas safety and saving on energy bills. Written by Pakenham tradies, not marketers.",
  alternates: { canonical: "/blog" },
};

const cats = ["All", "VEU rebates", "Heat pumps", "Aircon", "Gas safety", "Hot water", "Costs & savings"];

const posts = [
  {
    cat: "VEU rebates",
    photo: "/thermann-heat-pump.jpg",
    photoAlt: "Thermann heat pump install",
    meta: "10 min · 4 May 2026",
    title: "Reclaim vs iStore vs Thermann: which heat pump is right for your house?",
    blurb: "Honest comparison of the three brands we actually install, with sizing advice for 2 / 3 / 5-person households.",
    foot: "Heat pumps",
  },
  {
    cat: "Costs",
    photo: "/reclaim-split-back.jpg",
    photoAlt: "Reclaim heat pump split install",
    meta: "7 min · 28 Apr 2026",
    title: "What does a heat pump actually cost after the VEU rebate in 2026?",
    blurb: "Real numbers — not \"from $XXX\" marketing — for a 270L Reclaim install in Pakenham, with the rebate applied.",
    foot: "Costs",
    alt: true,
  },
  {
    cat: "Aircon",
    photo: "/kaden-indoor.jpg",
    photoAlt: "Kaden split system indoor head",
    meta: "9 min · 19 Apr 2026",
    title: "How to size a split system for your bedroom (and not get oversold)",
    blurb: "The 2.5kW vs 3.5kW vs 5kW question, demystified. Includes a quick room-size table for SE Melbourne homes.",
    foot: "Aircon",
  },
  {
    cat: "Gas safety",
    photo: "/evap-cooler-service.jpg",
    photoAlt: "Gas safety and CO testing service",
    meta: "6 min · 11 Apr 2026",
    title: "Carbon monoxide testing on ducted heaters: why every 2 years matters",
    blurb: "What CO is, how it builds up in old units, what we test for on a service, and why this isn't a corner you can cut.",
    foot: "Gas",
    alt: true,
  },
  {
    cat: "Solar pairing",
    photo: "/reclaim-mitsubishi.jpg",
    photoAlt: "Reclaim heat pump and Mitsubishi outdoor units",
    meta: "11 min · 2 Apr 2026",
    title: "Heat pumps + solar PV: the daytime-charge trick that drops bills to zero",
    blurb: "How to schedule a Reclaim or iStore unit to run during the day on excess solar — the cheapest hot water in the country.",
    foot: "Heat pumps",
  },
  {
    cat: "Hot water",
    photo: "/gas-hot-water-changeover.png",
    photoAlt: "Gas hot water changeover install",
    meta: "5 min · 25 Mar 2026",
    title: "Hot water tank failed? Replace like-for-like, or upgrade to heat pump?",
    blurb: "When the gas tank goes you've got 48 hours to decide. Here's the maths — including the $2,600 rebate question.",
    foot: "Hot water",
    alt: true,
  },
  {
    cat: "Aircon",
    photo: "/duct-work.jpg",
    photoAlt: "Ducted aircon ductwork install",
    meta: "12 min · 18 Mar 2026",
    title: "Replacing ducted gas heating with reverse-cycle: the honest cost-benefit",
    blurb: "Most homes save $1,400+ a year. But not all of them. Here's how to work out if your house is one of the winners.",
    foot: "Aircon",
  },
  {
    cat: "VEU rebates",
    photo: "/team-photo.png",
    photoAlt: "Advanced Gas team",
    meta: "8 min · 10 Mar 2026",
    title: "VEU eligibility for rentals: a checklist landlords can hand to their PM",
    blurb: "Landlords ask us this every week. Here's a one-page checklist your property manager can use to confirm eligibility in 5 minutes.",
    foot: "Rebates",
    alt: true,
  },
  {
    cat: "Maintenance",
    photo: "/ducted-condenser.jpg",
    photoAlt: "Ducted aircon condenser maintenance",
    meta: "4 min · 2 Mar 2026",
    title: "5 things you should clean on your split system every quarter",
    blurb: "The DIY maintenance that doubles the life of your aircon and keeps your warranty intact. Five minutes of work.",
    foot: "Maintenance",
  },
];

export default function BlogPage() {
  return (
    <div className="page-blog">
      <section className="bl-hero">
        <div className="wrap">
          <span className="ds-eyebrow"><span className="ds-dot" /> Guides &amp; articles</span>
          <h1>Plain-English answers, <em>written by tradies.</em></h1>
          <p>Real questions we get on jobs, written up properly. No fluff, no SEO slop — actual answers from people who&apos;ve fitted the unit on your neighbour&apos;s roof.</p>
          <div className="bl-cats">
            {cats.map((c, i) => (
              <span key={c} className={`bl-cat${i === 0 ? " is-active" : ""}`}>{c}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="bl-feat">
        <div className="wrap">
          <article className="bl-feat__card">
            <div className="bl-feat__photo" style={{ position: "relative", overflow: "hidden" }}>
              <Image
                src="/reclaim-split-back.jpg"
                alt="Reclaim heat pump install — featured VEU 2026 guide"
                fill
                sizes="(max-width: 900px) 100vw, 60vw"
                style={{ objectFit: "cover" }}
              />
            </div>
            <div className="bl-feat__copy">
              <span className="bl-feat__tag">Featured · VEU 2026 update</span>
              <h2>The complete Pakenham guide to the VEU rebate in 2026</h2>
              <p>What it is, what&apos;s actually changed in 2026, the real maximum you can claim on a heat pump or aircon, and the 3 mistakes most homeowners make on the application.</p>
              <span className="bl-feat__meta">14 min read · Updated this week · By the team</span>
              <div style={{ marginTop: 22 }}>
                <Link href="/rebates" className="ds-btn ds-btn--orange">Read the guide →</Link>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="bl-grid-wrap">
        <div className="wrap">
          <div className="bl-grid">
            {posts.map((p) => (
              <article key={p.title} className={`bl-card${p.alt ? " bl-card--alt" : ""}`}>
                <div className="bl-card__photo" style={{ position: "relative", overflow: "hidden" }}>
                  <Image
                    src={p.photo}
                    alt={p.photoAlt}
                    fill
                    sizes="(max-width: 900px) 100vw, 33vw"
                    style={{ objectFit: "cover" }}
                  />
                  <span className="bl-card__photo-tag" style={{ zIndex: 1 }}>{p.cat}</span>
                </div>
                <div className="bl-card__body">
                  <span className="bl-card__meta">{p.meta}</span>
                  <h3>{p.title}</h3>
                  <p>{p.blurb}</p>
                  <div className="bl-card__foot">
                    <span className="bl-card__read">Read article →</span>
                    <span>{p.foot}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bl-news">
        <div className="wrap bl-news__grid">
          <div>
            <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot ds-dot--orange" /> Get the heads-up</span>
            <h2>Be the first to know when the VEU rules change.</h2>
            <p>The government tweaks rebate values every year. We send a short email when it happens — plus seasonal tips for keeping your gear running.</p>
            <p style={{ marginTop: 0, fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
              One email a month, max. Local stuff only. Unsubscribe anytime.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </section>

      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>Ready when you are.</h2>
            <p>Free quote with the rebate already applied. Usually back within 2 hours.</p>
          </div>
          <div className="bigcta__btns">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--xl">Start my free quote →</Link>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
