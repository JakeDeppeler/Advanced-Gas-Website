import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { site } from "@/lib/site";
import { faqSchema } from "@/lib/schema";
import { HeroQuoteForm } from "@/components/HeroQuoteForm";
import "./home.css";

export const metadata: Metadata = {
  title: "Heat Pumps, Split Systems & Ducted in Pakenham VIC",
  description:
    "Family-owned Pakenham specialists in heat pump hot water, split system & ducted aircon, gas heating and servicing. VEU rebates handled for you. Free quote in 60 seconds.",
  alternates: { canonical: "/" },
};

const faqs = [
  {
    q: "How much is the VEU rebate, really?",
    a: "It depends on your existing hot water unit, your home and the new unit going in. Most Pakenham households we install for see between $2,400 and $3,200 off — and we apply it at the quote stage so you don't pay it then claim it back. We'll give you the exact number after a 20-minute site check.",
  },
  {
    q: "Am I eligible if I'm a renter or in a unit?",
    a: "Owner-occupiers and landlords are both eligible under VEU. Renters can ask their landlord to upgrade — we'll talk to them directly if that's easier. Some unit complexes need owners' corporation sign-off; we'll guide you through it.",
  },
  {
    q: "How long does an install actually take?",
    a: "A like-for-like heat pump swap is usually one day. A new split is half a day. Full ducted retrofit is 2–3 days. We give you a firm window when you accept the quote and we don't leave the job half done.",
  },
  {
    q: "What brands do you install — and why those?",
    a: "Heat pumps: Reclaim (CO₂, premium), iStore (best mid-range), Thermann (budget-friendly). Aircon: Mitsubishi Electric and Kaden. Gas: Rinnai, Brivis, Braemar. We've installed enough of each to know which model suits which house — we'll recommend, not upsell.",
  },
  {
    q: "Do you do emergencies on weekends?",
    a: "Yes. Gas leak, no hot water, smoking flue — call the main number any time. After hours goes to a real on-call tradie, not an overseas call centre.",
  },
  {
    q: "What's the warranty?",
    a: "Manufacturer warranty on the unit (typically 6–10 years on the tank). 6 years on our workmanship. Compliance certificate emailed within 24 hours of install — keep it for insurance.",
  },
];

const SUBURBS = [
  "Pakenham","Pakenham Upper","Officer","Beaconsfield","Berwick","Narre Warren",
  "Cranbourne","Cranbourne East","Clyde","Clyde North","Hampton Park","Hallam",
  "Endeavour Hills","Doveton","Dandenong","Keysborough","Lynbrook","Lyndhurst",
  "Bunyip","Garfield","Nar Nar Goon","Tynong","Drouin","Warragul",
  "Cockatoo","Emerald","Gembrook","Tooradin",
];

export default function HomePage() {
  return (
    <div className="page-home">
      {/* HERO */}
      <section className="hero">
        <div className="hero__bg" aria-hidden="true" />
        <div className="wrap hero__grid">
          <div className="hero__left">
            <div className="hero__eyebrow">
              <span className="ds-dot" />
              VEU-accredited installer · Pakenham &amp; surrounds
            </div>

            <h1 className="hero__h1">
              Up to <span className="hero__h1-accent">$2,600 off</span> heat pumps,<br />
              <span className="hero__h1-accent">$5,000 off</span> aircon — rebates done <em>for</em>{" "}you.
            </h1>

            <p className="hero__sub">
              Family-run, Reece-partnered tradies covering Pakenham, Berwick, Cranbourne, Officer and everywhere within 50&nbsp;km. We&apos;re VEU accredited — you get the rebate at quote, no chase, no paperwork.
            </p>

            <ul className="hero__bullets">
              <li><span className="tick">✓</span> VEU rebate applied at quote — no upfront chase</li>
              <li><span className="tick">✓</span> Reclaim · iStore · Thermann · Mitsubishi · Rinnai · Kaden</li>
              <li><span className="tick">✓</span> Licensed gas fitter + ARC refrigeration ticket</li>
              <li><span className="tick">✓</span> Free, no-obligation on-site quote in 24–48&nbsp;hrs</li>
            </ul>

            <div className="hero__ctas">
              <a href="#quote" className="ds-btn ds-btn--orange ds-btn--lg">Check my rebate →</a>
              <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost ds-btn--lg">
                Or call {site.phone}
              </a>
            </div>

            <div className="hero__trust">
              <div className="trust-rating">
                <div className="trust-stars" aria-label="Five star Google rating">★★★★★</div>
                <div className="trust-rating__txt">
                  <strong>4.9 / 5</strong>
                  <span>Google reviews · Pakenham locals</span>
                </div>
              </div>
              <div className="trust-divider" />
              <div className="trust-stat"><strong>1,200+</strong><span>installs done</span></div>
              <div className="trust-divider" />
              <div className="trust-stat"><strong>12 yrs</strong><span>local trading</span></div>
            </div>

            <p className="hero__finep">
              *Indicative example: 270L heat pump installed for an eligible VEU household after rebate application. Final price subject to site assessment.
            </p>
          </div>

          <HeroQuoteForm />
        </div>

        <svg className="hero__divider" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 80 L1440 0 L1440 80 Z" fill="#faf8f3" />
        </svg>
      </section>

      {/* BRAND TRUST STRIP */}
      <section className="brands">
        <div className="wrap">
          <div className="brands__lead">
            <span className="brands__label">Authorised installer of</span>
            <span className="brands__rule" />
            <span className="brands__partner">Trade partner of <strong>Reece</strong></span>
          </div>
          <div className="brands__grid">
            {[
              ["RECLAIM", "heat pumps"],
              ["iStore", "heat pumps"],
              ["Thermann", "hot water"],
              ["Mitsubishi", "electric aircon"],
              ["Kaden", "aircon"],
              ["Rinnai", "gas & hw"],
            ].map(([name, type]) => (
              <div key={name} className="brand-chip">
                <span className="brand-chip__name">{name}</span>
                <span className="brand-chip__type">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VEU REBATE FEATURE */}
      <section className="veu" id="rebates">
        <div className="wrap veu__grid">
          <div className="veu__left">
            <div className="ds-eyebrow ds-eyebrow--on-dark">
              <span className="ds-dot ds-dot--orange" />
              Victorian Energy Upgrades program
            </div>
            <h2 className="veu__h">
              The VEU rebate is real,<br />
              and we apply it <em>for</em>{" "}you.
            </h2>
            <p className="veu__sub">
              If your home runs on a gas or electric storage hot water system, the Victorian Government will pay you to upgrade to a heat pump — and there are aircon rebates too. We handle the paperwork; you enjoy the savings.
            </p>

            <div className="veu__numbers">
              <div className="veu-num">
                <span className="veu-num__big">up to $2,600</span>
                <span className="veu-num__lbl">heat pump hot water rebate</span>
              </div>
              <div className="veu-num">
                <span className="veu-num__big">up to $5,000</span>
                <span className="veu-num__lbl">aircon rebate (eligible homes)</span>
              </div>
              <div className="veu-num">
                <span className="veu-num__big">~73%</span>
                <span className="veu-num__lbl">cut to hot water running cost</span>
              </div>
            </div>

            <ul className="veu__check">
              <li>Eligibility check &amp; rebate paperwork done by us</li>
              <li>Old gas / electric tank removed &amp; disposed</li>
              <li>10-year tank warranty, 6-year workmanship on labour</li>
              <li>Same-week install slots most weeks</li>
            </ul>

            <div className="veu__ctas">
              <a href="#quote" className="ds-btn ds-btn--orange ds-btn--lg">Check eligibility →</a>
              <Link href="/rebates" className="ds-btn ds-btn--ghost-on-dark ds-btn--lg">How VEU works</Link>
            </div>
          </div>

          <div className="veu__right">
            <div className="veu-card">
              <div className="veu-card__head">
                <span>Sample VEU quote — Thermann 270L · Pakenham 3810</span>
                <span className="veu-card__badge">VEU certified</span>
              </div>
              <table className="veu-card__table">
                <tbody>
                  <tr><td>Thermann 270L heat pump</td><td className="num">$2,200</td></tr>
                  <tr><td>Installation &amp; commissioning</td><td className="num">$700</td></tr>
                  <tr><td>Electrical</td><td className="num">$350</td></tr>
                  <tr><td>Parts &amp; fittings</td><td className="num">$350</td></tr>
                  <tr><td>Compliance certificate &amp; VEU paperwork</td><td className="num">incl.</td></tr>
                  <tr className="row-sub"><td><strong>Sub-total</strong></td><td className="num"><strong>$3,600</strong></td></tr>
                  <tr className="row-rebate"><td>VEU rebate (applied at quote)</td><td className="num">−$1,820</td></tr>
                  <tr className="row-total"><td><strong>You pay (ex&nbsp;GST)</strong></td><td className="num"><strong>$1,780</strong></td></tr>
                  <tr className="row-finance"><td colSpan={2}>or <strong>$17/week</strong> via interest-free finance — 24 months</td></tr>
                </tbody>
              </table>
              <p className="veu-card__fp">Illustrative only — every home is different. Real quote after a free 20-minute site visit.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES BENTO */}
      <section className="services" id="services">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> What we do</span>
            <h2>Everything gas, hot water &amp; air, under one local team.</h2>
            <p>From a new split system in the bedroom to a full ducted retrofit and emergency gas leak callouts — same crew, same paperwork, same warranty.</p>
          </div>

          <div className="bento">
            <Link href="/services#heatpump" className="bcard bcard--xl bcard--feature">
              <div className="bcard__photo bcard__photo--heatpump">
                <span className="ph-tag">photo: Reclaim heat pump install · Officer</span>
              </div>
              <div className="bcard__body">
                <span className="bcard__num">01</span>
                <h3>Heat pump hot water</h3>
                <p>Reclaim, iStore, Thermann. VEU rebate handled. Most homes installed for under $500 out of pocket.</p>
                <span className="bcard__cta">See heat pump options →</span>
              </div>
            </Link>

            <Link href="/services#split" className="bcard">
              <div className="bcard__photo bcard__photo--split">
                <span className="ph-tag">photo: Mitsubishi split install · Berwick</span>
              </div>
              <div className="bcard__body">
                <span className="bcard__num">02</span>
                <h3>Split systems</h3>
                <p>Bedroom, living, granny flat. Mitsubishi Electric &amp; Kaden — supplied &amp; installed.</p>
              </div>
            </Link>

            <Link href="/services#ducted" className="bcard">
              <div className="bcard__photo bcard__photo--ducted">
                <span className="ph-tag">photo: ducted vent · Pakenham</span>
              </div>
              <div className="bcard__body">
                <span className="bcard__num">03</span>
                <h3>Ducted aircon</h3>
                <p>Zoned, whole-home cooling. New build or retrofit, design and install.</p>
              </div>
            </Link>

            <Link href="/services#gas-heating" className="bcard">
              <div className="bcard__body bcard__body--bare">
                <span className="bcard__num">04</span>
                <h3>Gas &amp; ducted gas heating</h3>
                <p>Install, replace, service. Brivis, Braemar, Rinnai. Carbon monoxide tested.</p>
              </div>
            </Link>

            <Link href="/services#service" className="bcard bcard--accent">
              <div className="bcard__body bcard__body--bare">
                <span className="bcard__num">05</span>
                <h3>Service &amp; safety check</h3>
                <p>Annual gas appliance servicing &amp; CO testing. Stay safe, stay covered.</p>
                <span className="bcard__pill">$169 flat</span>
              </div>
            </Link>

            <Link href="/services#hotwater" className="bcard">
              <div className="bcard__body bcard__body--bare">
                <span className="bcard__num">06</span>
                <h3>Hot water — gas &amp; electric</h3>
                <p>Tank or continuous. Same-day swaps on most common models.</p>
              </div>
            </Link>

            <Link href="/services#commercial" className="bcard bcard--dark">
              <div className="bcard__body bcard__body--bare">
                <span className="bcard__num">07</span>
                <h3>Commercial fit-out</h3>
                <p>Cafés, offices, gyms. Aircon, hot water and gas — one PM, one invoice.</p>
              </div>
            </Link>

            <Link href="/contact#emergency" className="bcard bcard--emergency" id="emergency">
              <div className="bcard__body bcard__body--bare">
                <span className="bcard__num">08</span>
                <h3>Emergency call-outs</h3>
                <p>Gas leak, no hot water, smoking flue. Phones answered after hours.</p>
                <span className="bcard__pill bcard__pill--red">24 / 7</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section className="whyus">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--center">
            <span className="ds-eyebrow"><span className="ds-dot" /> Why Pakenham locals call us first</span>
            <h2>The boring stuff done properly. The friendly stuff done genuinely.</h2>
          </div>
          <div className="why-grid">
            {[
              ["01", "Family-owned, locally run", "Started in a Pakenham garage in 2014. Same family answering the phone, doing the quote and standing behind the work today."],
              ["02", "Reece trade partner", "Direct supply means real stock, real warranties and no margin-stacking middlemen between you and the gear."],
              ["03", "Rebate paperwork — sorted", "We're VEU accredited. Eligibility, certificates, STCs — all handled inside the quote. You sign once and it's done."],
              ["04", "Tickets & licences current", "Licensed gasfitter + ARC refrigeration handling licence. Every install gets a compliance certificate emailed within 24 hrs."],
              ["05", "Fixed quotes, no surprises", "What we quote on day one is what you pay on install day. Variations only with your written OK first."],
              ["06", "Same-week install slots", "Most heat pump and split jobs go in within 5–7 days of accepting the quote. Emergencies same day."],
            ].map(([n, t, d]) => (
              <div key={n} className="why">
                <div className="why__num">/{n}</div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="process">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot ds-dot--orange" /> How it works</span>
            <h2 className="ds-h--on-dark">From &ldquo;thinking about it&rdquo; to hot showers in about a week.</h2>
          </div>
          <ol className="steps">
            {[
              [1, "You ask for a quote", "3-question form (60 seconds) or a phone call. Tell us what you've got and what you want.", "~ 60 sec"],
              [2, "We do a site check", "Free 20-minute visit. Measure, photograph, check rebate eligibility, confirm exact gear.", "within 48 hrs"],
              [3, "Fixed quote + rebate maths", "Emailed PDF with the rebate already deducted. Optional 24-month interest-free finance.", "same day"],
              [4, "We install & certify", "Usually 1 day on site. Old unit removed, area cleaned, compliance cert + warranty pack emailed.", "day of install"],
            ].map(([n, t, d, time]) => (
              <li key={n as number} className="step">
                <span className="step__num">{n}</span>
                <h3>{t}</h3>
                <p>{d}</p>
                <span className="step__time">{time}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="reviews">
        <div className="wrap">
          <div className="reviews__head">
            <div>
              <span className="ds-eyebrow"><span className="ds-dot" /> What locals say</span>
              <h2>Reviews from real Pakenham, Berwick &amp; Officer households.</h2>
            </div>
            <div className="reviews__badge">
              <div className="reviews__badge-stars" aria-hidden="true">★ ★ ★ ★ ★</div>
              <div><strong>4.9 / 5</strong> on Google · 280+ reviews</div>
            </div>
          </div>

          <div className="reviews__grid">
            {[
              { txt: "Quoted Monday, installed Friday. Took the old gas Rinnai out, dropped in a Reclaim heat pump, sorted the VEU rebate so I paid less than $400 out of pocket. Bloke on the phone is the bloke on the tools — refreshing.", who: "Jess M.", what: "Pakenham · heat pump install", a: "JM" },
              { txt: "Had three quotes for a ducted system. These guys were the only ones who actually crawled into the roof. Came in middle of the pack on price but installed cleaner than the others would have. Worth the call.", who: "Dean R.", what: "Officer · ducted retrofit", a: "DR" },
              { txt: "Hot water died on a Sunday with three kids in the house. Answered the phone, had a temp loaner running by lunch, new iStore in on Tuesday. That's service. Will be calling them for the split next summer.", who: "Sam K.", what: "Berwick · emergency hot water", a: "SK" },
            ].map((r) => (
              <article key={r.who} className="review">
                <div className="review__stars">★★★★★</div>
                <p>&ldquo;{r.txt}&rdquo;</p>
                <div className="review__by">
                  <span className="review__avatar">{r.a}</span>
                  <div><strong>{r.who}</strong><span>{r.what}</span></div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICE AREA */}
      <section className="area" id="area">
        <div className="wrap area__grid">
          <div className="area__left">
            <span className="ds-eyebrow"><span className="ds-dot" /> Where we work</span>
            <h2>Based in Pakenham. On-site within 50 km.</h2>
            <p>If you&apos;re south-east of Melbourne and your suburb&apos;s on this list, we cover you with no travel surcharge.</p>
            <div className="suburbs">
              {SUBURBS.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
            <p className="area__finep">Outside this list? Give us a call — we sometimes travel further for bigger jobs and commercial work.</p>
          </div>
          <div className="area__right">
            <div className="map">
              <span className="ph-tag ph-tag--dark">map placeholder · 50km radius around Pakenham 3810</span>
              <svg className="map__svg" viewBox="0 0 400 400" aria-hidden="true">
                <defs>
                  <pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M0 20 L20 0" stroke="#0b1450" strokeOpacity="0.07" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="400" height="400" fill="url(#g)" />
                <circle cx="200" cy="200" r="150" fill="#00b0ed" fillOpacity="0.10" stroke="#00b0ed" strokeWidth="1.5" strokeDasharray="4 6" />
                <circle cx="200" cy="200" r="90" fill="#f36722" fillOpacity="0.10" stroke="#f36722" strokeWidth="1.5" />
                <circle cx="200" cy="200" r="6" fill="#f36722" />
                <text x="208" y="195" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#0b1450" fontWeight="600">PAKENHAM</text>
                <text x="208" y="208" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#0b1450" opacity="0.6">3810 · HQ</text>
                <text x="120" y="80" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#0b1450" opacity="0.7">Dandenong</text>
                <text x="240" y="320" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#0b1450" opacity="0.7">Warragul</text>
                <text x="60" y="220" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#0b1450" opacity="0.7">Cranbourne</text>
                <text x="290" y="160" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#0b1450" opacity="0.7">Emerald</text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq">
        <div className="wrap faq__grid">
          <div className="faq__left">
            <span className="ds-eyebrow"><span className="ds-dot" /> Questions we get a lot</span>
            <h2>Heat pumps, rebates &amp; the fine print.</h2>
            <p>Quick honest answers. Still want a human? <a href={`tel:${site.phoneE164}`} style={{ color: "var(--navy)", textUnderlineOffset: 2 }}>Call {site.phone}</a>.</p>
          </div>
          <div className="faq__right">
            {faqs.map((f, i) => (
              <details key={f.q} {...(i === 0 ? { open: true } : {})}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* BIG CTA */}
      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>Get a fixed quote with the VEU rebate already applied.</h2>
            <p>Free, no-obligation, usually back to you within 2 hours during business hours.</p>
          </div>
          <div className="bigcta__btns">
            <a href="#quote" className="ds-btn ds-btn--orange ds-btn--xl">Start my free quote →</a>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>

      <Script
        id="ld-home-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(faqs)) }}
      />
    </div>
  );
}
