import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import ReactDOM from "react-dom";
import { site } from "@/lib/site";
import { faqSchema } from "@/lib/schema";
import { HeroQuoteForm } from "@/components/HeroQuoteForm";
import { ServiceAreaMap } from "@/components/ServiceAreaMap";
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
    a: "It depends on your existing hot water unit, your home and the new unit going in. Most Pakenham households we install for see between $2,400 and $3,200 off, and we apply it at the quote stage so you don't pay it then claim it back. We'll give you the exact number after a 20-minute site check.",
  },
  {
    q: "Am I eligible if I'm a renter or in a unit?",
    a: "Owner-occupiers and landlords are both eligible under VEU. Renters can ask their landlord to upgrade, we'll talk to them directly if that's easier. Some unit complexes need owners' corporation sign-off; we'll guide you through it.",
  },
  {
    q: "How long does an install actually take?",
    a: "A like-for-like heat pump swap is usually one day. A new split is half a day. Full ducted retrofit is 2–3 days. We give you a firm window when you accept the quote and we don't leave the job half done.",
  },
  {
    q: "What brands do you install, and why those?",
    a: "Heat pumps: Reclaim (CO₂, premium), iStore (best mid-range), Thermann (budget-friendly). Aircon: Mitsubishi Electric and Kaden. Gas: Rinnai, Brivis, Braemar. We've installed enough of each to know which model suits which house, we'll recommend, not upsell.",
  },
  {
    q: "Do you do emergencies on weekends?",
    a: "Yes. Gas leak, no hot water, smoking flue, call the main number any time. After hours goes to a real on-call tradie, not an overseas call centre.",
  },
  {
    q: "What's the warranty?",
    a: "Manufacturer warranty on the unit (typically 6–10 years on the tank). 6 years on our workmanship. Compliance certificate emailed within 24 hours of install, keep it for insurance.",
  },
];

const SUBURBS = [
  "Pakenham","Pakenham Upper","Officer","Beaconsfield","Berwick","Narre Warren",
  "Cranbourne","Cranbourne East","Clyde","Clyde North","Hampton Park","Hallam",
  "Endeavour Hills","Doveton","Dandenong","Keysborough","Lynbrook","Lyndhurst",
  "Bunyip","Garfield","Nar Nar Goon","Tynong","Drouin","Warragul",
  "Cockatoo","Emerald","Gembrook","Tooradin",
];

type Review = { title: string; txt: string; who: string; what: string; a: string };

const REVIEW_COLUMNS: Review[][] = [
  [
    { title: "Quoted Mon, installed Fri", txt: "Took the old gas Rinnai out, dropped in a Reclaim heat pump, sorted the VEU rebate so I paid less than $400 out of pocket. Bloke on the phone is the bloke on the tools, refreshing.", who: "Jess M.", what: "Pakenham · heat pump install", a: "JM" },
    { title: "Actually got up in the roof", txt: "Had three quotes for a ducted system. These guys were the only ones who actually crawled into the roof. Middle of the pack on price but installed cleaner than the others would have.", who: "Dean R.", what: "Officer · ducted retrofit", a: "DR" },
    { title: "Emergency sorted Sunday", txt: "Hot water died on a Sunday with three kids in the house. Answered the phone, had a temp loaner running by lunch, new iStore in on Tuesday. That's service.", who: "Sam K.", what: "Berwick · emergency hot water", a: "SK" },
    { title: "No surprises on the invoice", txt: "Quote number matched the invoice exactly. No 'we hit unexpected wiring' story at the end. Nice change.", who: "Priya S.", what: "Cranbourne · split install", a: "PS" },
    { title: "Explained everything", txt: "Walked me through the Milieu tablet, showed the wife how to use it, showed us the compliance cert. Ten minutes of teaching that other installers just skip.", who: "Marcus T.", what: "Officer · ducted aircon", a: "MT" },
  ],
  [
    { title: "Family business, feels it", txt: "Answered the phone myself, quoted the job, showed up to install the job. That trail of trust doesn't exist with most of the bigger mobs anymore.", who: "Tom H.", what: "Narre Warren · heat pump", a: "TH" },
    { title: "Rebate handled, didn't lift a finger", txt: "The VEU paperwork looked scary online. They filled it all in, I signed once at the quote and once on the day. Rebate was already in the price. Painless.", who: "Lauren M.", what: "Pakenham · heat pump swap", a: "LM" },
    { title: "Cleaned up like nothing happened", txt: "Full ducted retrofit over two days. When they left the roof cavity was tidier than they found it and the driveway had been swept. Small thing but it matters.", who: "Bianca R.", what: "Berwick · ducted install", a: "BR" },
    { title: "Follow-up call was a surprise", txt: "A week after install they rang to check the heat pump was running quiet and the app was set up. First tradie who's ever followed up after payment cleared.", who: "Nick D.", what: "Beaconsfield · heat pump", a: "ND" },
    { title: "Split install in half a day", txt: "Bedroom Mitsubishi went in before lunch. Neat pipework, brackets straight, temp checked before they left. Would use again for the lounge.", who: "Alex P.", what: "Cranbourne East · split", a: "AP" },
  ],
  [
    { title: "Talked me OUT of a big spend", txt: "I was ready to spend on a 22kW ducted system, they measured the house and said 14 would do it. Saved me $4k and it still cools like a dream.", who: "Dave K.", what: "Pakenham · ducted aircon", a: "DK" },
    { title: "Best price on the Reclaim", txt: "Rang three installers. These guys came in $600 cheaper on the same Reclaim heat pump AND handled the rebate. No brainer.", who: "Chelsea O.", what: "Officer · heat pump", a: "CO" },
    { title: "Fixed a botched install", txt: "Someone else had put in a ducted system that never really cooled the back rooms. They rebalanced the zones, sealed a duct, and now it's night and day.", who: "Ravi P.", what: "Berwick · ducted repair", a: "RP" },
    { title: "Service visit was thorough", txt: "Booked the annual gas heater service. Actual CO test, actual clean, actual report. Not the 10-minute rip-off I was expecting.", who: "Karen W.", what: "Hallam · gas heater service", a: "KW" },
    { title: "Straight-shooters", txt: "Told me the old Rinnai had two years left and to hold off replacing it. Didn't try to upsell. That's why I'll call them when the time comes.", who: "Ben S.", what: "Endeavour Hills · consult", a: "BS" },
  ],
];

export default function HomePage() {
  // Preload the LCP hero image so it starts downloading before the CSS
  // parser reaches .hero__bg. Uses the small mobile crop on phones and
  // the full one on desktop.
  ReactDOM.preload("/team-photo.webp", {
    as: "image",
    fetchPriority: "high",
    imageSrcSet: "/team-photo-mobile.webp 900w, /team-photo.webp 1800w",
    imageSizes: "100vw",
  });

  return (
    <div className="page-home">
      {/* HERO — full-bleed team photo, cinematic overlay */}
      <section className="hero hero--photo">
        <div className="hero__bg" aria-hidden="true" />
        <div className="hero__scrim" aria-hidden="true" />

        <div className="wrap hero__wrap">
          <div className="hero__meta">
            <span className="hero__badge">
              <span className="ds-dot" />
              Pakenham locals since 2014
            </span>
          </div>

          <div className="hero__copy">
            <h1 className="hero__h1">
              The team you&rsquo;d want in your house.
            </h1>
            <p className="hero__sub">
              Family owned. Same face on the quote as on the tools. Twelve years and 1,200+ installs across Pakenham, Berwick, Cranbourne &amp; Officer.
            </p>

            <div className="hero__ctas">
              <a href="#quote" className="ds-btn ds-btn--orange ds-btn--lg">Get a fixed quote →</a>
              <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost ds-btn--lg">
                Or call {site.phone}
              </a>
            </div>

            <div className="hero__trust">
              <div className="trust-rating">
                <div className="trust-stars" aria-label="Five star Google rating">★★★★★</div>
                <div className="trust-rating__txt">
                  <strong>4.9 / 5</strong>
                  <span>Google reviews · 280+ locals</span>
                </div>
              </div>
              <div className="trust-divider" />
              <div className="trust-stat"><strong>1,200+</strong><span>installs done</span></div>
              <div className="trust-divider" />
              <div className="trust-stat"><strong>12 yrs</strong><span>local trading</span></div>
            </div>
          </div>
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
              ["Milieu Lab", "smart controls"],
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

      {/* QUOTE FORM — dedicated section (moved out of hero for direction B) */}
      <section className="quotesec" id="quote">
        <div className="wrap quotesec__grid">
          <div className="quotesec__left">
            <span className="ds-eyebrow"><span className="ds-dot" /> 60-second quote</span>
            <h2>Fixed-price quote back within 12&nbsp;hours.</h2>
            <p className="quotesec__lede">
              Tell us what you need, we&rsquo;ll quote it straight. Rebates applied, GST included, no chasing.
            </p>
            <ul className="quotesec__points">
              <li><span className="tick tick--dark">✓</span> No obligation, no pushy call-back</li>
              <li><span className="tick tick--dark">✓</span> Same person quotes as installs</li>
              <li><span className="tick tick--dark">✓</span> VEU rebate handled in the quote</li>
              <li><span className="tick tick--dark">✓</span> Emergency? Call {site.phone} instead</li>
            </ul>
            <p className="quotesec__finep">
              Licensed gasfitter · ARC AU34567 · VEU-accredited provider · ABN 12&nbsp;345&nbsp;678&nbsp;910.
            </p>
          </div>
          <HeroQuoteForm />
        </div>
      </section>

      {/* REVIEWS, front-and-centre (moved up from lower on the page) */}
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

          <div className="reviews__marquee" aria-label="Recent Google reviews">
            {REVIEW_COLUMNS.map((col, ci) => (
              <div key={ci} className={`revcol revcol--${ci + 1}`}>
                <div className="revcol__track">
                  {[...col, ...col].map((r, ri) => (
                    <article key={`${ci}-${ri}`} className="revcard">
                      <div className="revcard__stars">★★★★★</div>
                      <h3 className="revcard__title">{r.title}</h3>
                      <p className="revcard__txt">&ldquo;{r.txt}&rdquo;</p>
                      <div className="revcard__by">
                        <span className="revcard__avatar">{r.a}</span>
                        <div>
                          <strong>{r.who}</strong>
                          <span>{r.what}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
            <div className="reviews__fade reviews__fade--top" aria-hidden="true" />
            <div className="reviews__fade reviews__fade--bot" aria-hidden="true" />
          </div>

          {/* Mobile-only horizontal rail (mock B) */}
          <div className="reviews__rail" aria-hidden="true">
            {REVIEW_COLUMNS[0].slice(0, 4).map((r, i) => (
              <article key={`m-${i}`} className="revcard revcard--mobile">
                <div className="revcard__stars">★★★★★</div>
                <h3 className="revcard__title">{r.title}</h3>
                <p className="revcard__txt">&ldquo;{r.txt}&rdquo;</p>
                <div className="revcard__by">
                  <span className="revcard__avatar">{r.a}</span>
                  <div>
                    <strong>{r.who}</strong>
                    <span>{r.what}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FIXED-PRICE INSTALLS */}
      <section className="veu" id="rebates">
        <div className="wrap">
          <div className="ds-section-head ds-section-head--center">
            <span className="ds-eyebrow ds-eyebrow--on-dark">
              <span className="ds-dot ds-dot--orange" />
              Fixed-price installs
            </span>
            <h2 className="ds-h--on-dark">Three of our most popular jobs, locked-in prices.</h2>
            <p className="veu__sub veu__sub--center">
              What you see is what you pay. VEU rebate already applied, GST included, compliance certificate and warranty pack emailed within 24&nbsp;hrs of install.
            </p>
          </div>

          <div className="fixprice__grid fixprice__grid--3">
            <article className="fixprice">
              <div className="fixprice__badges">
                <span className="fixprice__badge fixprice__badge--value">Best value</span>
                <span className="fixprice__badge fixprice__badge--aus">Australian made</span>
              </div>
              <div className="fixprice__photo fixprice__photo--aio" />
              <div className="fixprice__body">
                <span className="fixprice__eyebrow">Heat pump hot water · All-in-one</span>
                <h3>Reclaim R290 all-in-one, fully installed</h3>
                <ul className="fixprice__feat">
                  <li>Plug-in: tank &amp; compressor in one unit</li>
                  <li>R290 refrigerant, low GWP, efficient in cold</li>
                  <li>Old gas / electric unit removed &amp; disposed</li>
                  <li>VEU rebate applied, compliance cert included</li>
                </ul>
                <div className="fixprice__price">
                  <span className="fixprice__price-num">$2,610</span>
                  <span className="fixprice__price-lbl">fully installed, inc GST</span>
                </div>
                <p className="fixprice__note">Price assumes a power point within 50&nbsp;cm of the current hot water system. New power point quoted separately.</p>
                <a href="#quote" className="ds-btn ds-btn--orange">Enquire about the R290 &rarr;</a>
              </div>
            </article>

            <article className="fixprice fixprice--feature">
              <div className="fixprice__badges">
                <span className="fixprice__badge fixprice__badge--top">Highest quality</span>
                <span className="fixprice__badge fixprice__badge--aus">Australian made</span>
              </div>
              <div className="fixprice__photo fixprice__photo--split" />
              <div className="fixprice__body">
                <span className="fixprice__eyebrow">Heat pump hot water · Split</span>
                <h3>Reclaim CO&#8322; split heat pump, fully installed</h3>
                <ul className="fixprice__feat">
                  <li>Compressor split from tank, quieter, longer life</li>
                  <li>315&nbsp;L or 400&nbsp;L, glass-lined or stainless steel</li>
                  <li>Wi-Fi smart control, schedule off-peak / solar hours</li>
                  <li>15-year warranty on stainless tank option</li>
                </ul>
                <div className="fixprice__price">
                  <span className="fixprice__price-num">from&nbsp;$5,340</span>
                  <span className="fixprice__price-lbl">fully installed, inc GST</span>
                </div>
                <p className="fixprice__note">315&nbsp;L glass-lined Wi-Fi from $5,340. 400&nbsp;L stainless steel Wi-Fi $6,745 inc GST.</p>
                <a href="#quote" className="ds-btn ds-btn--orange">Enquire about the split &rarr;</a>
              </div>
            </article>

            <article className="fixprice">
              <div className="fixprice__badges">
                <span className="fixprice__badge fixprice__badge--quality">High quality</span>
                <span className="fixprice__badge fixprice__badge--best">Best product</span>
              </div>
              <div className="fixprice__photo fixprice__photo--ducted" />
              <div className="fixprice__body">
                <span className="fixprice__eyebrow">Ducted aircon</span>
                <h3>18&nbsp;kW Mitsubishi Electric ducted system</h3>
                <ul className="fixprice__feat">
                  <li>18&nbsp;kW inverter head unit, whole-home cooling &amp; heating</li>
                  <li>Milieu Lab zone controller</li>
                  <li>Up to <strong>12 zones</strong> with individual control</li>
                  <li>Design, ducting, install, commission &amp; certify</li>
                </ul>
                <div className="fixprice__price">
                  <span className="fixprice__price-num">from&nbsp;$11,000</span>
                  <span className="fixprice__price-lbl">fully installed, inc GST</span>
                </div>
                <a href="#quote" className="ds-btn ds-btn--orange">Enquire about the ducted &rarr;</a>
              </div>
            </article>
          </div>

          <p className="fixprice__foot">
            After something different? We install every major brand, <a href="#quote">tell us what you&rsquo;re after</a> and we&rsquo;ll quote it fixed.
          </p>
        </div>
      </section>

      {/* SERVICES BENTO */}
      <section className="services" id="services">
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> What we do</span>
            <h2>Everything gas, hot water &amp; air, under one local team.</h2>
            <p>From a new split system in the bedroom to a full ducted retrofit and emergency gas leak callouts, same crew, same paperwork, same warranty.</p>
          </div>

          <div className="bento">
            <Link href="/services#heatpump" className="bcard bcard--xl bcard--feature">
              <div className="bcard__photo bcard__photo--heatpump" />
              <div className="bcard__body">
                <span className="bcard__num">01</span>
                <h3>Heat pump hot water</h3>
                <p>Reclaim, iStore, Thermann. VEU rebate handled. Most homes installed for under $500 out of pocket.</p>
                <span className="bcard__cta">See heat pump options →</span>
              </div>
            </Link>

            <Link href="/services#split" className="bcard">
              <div className="bcard__photo bcard__photo--split" />
              <div className="bcard__body">
                <span className="bcard__num">02</span>
                <h3>Split systems</h3>
                <p>Bedroom, living, granny flat. Mitsubishi Electric &amp; Kaden, supplied &amp; installed.</p>
              </div>
            </Link>

            <Link href="/services#ducted" className="bcard">
              <div className="bcard__photo bcard__photo--ducted" />
              <div className="bcard__body">
                <span className="bcard__num">03</span>
                <h3>Ducted aircon</h3>
                <p>Zoned, whole-home cooling. New build or retrofit, design and install.</p>
              </div>
            </Link>

            <Link href="/services#gas-heating" className="bcard">
              <div className="bcard__photo bcard__photo--gas" />
              <div className="bcard__body">
                <span className="bcard__num">04</span>
                <h3>Gas &amp; ducted gas heating</h3>
                <p>Install, replace, service. Brivis, Braemar, Rinnai. Carbon monoxide tested.</p>
              </div>
            </Link>

            <Link href="/services#service" className="bcard bcard--accent">
              <div className="bcard__photo bcard__photo--service" />
              <div className="bcard__body">
                <span className="bcard__num">05</span>
                <h3>Service &amp; safety check</h3>
                <p>Annual gas appliance servicing &amp; CO testing. Stay safe, stay covered.</p>
                <span className="bcard__pill">$280 + GST</span>
              </div>
            </Link>

            <Link href="/services#hotwater" className="bcard">
              <div className="bcard__photo bcard__photo--hotwater" />
              <div className="bcard__body">
                <span className="bcard__num">06</span>
                <h3>Hot water, gas &amp; electric</h3>
                <p>Tank or continuous. Same-day swaps on most common models.</p>
              </div>
            </Link>

            <Link href="/services#commercial" className="bcard bcard--dark">
              <div className="bcard__photo bcard__photo--commercial" />
              <div className="bcard__body">
                <span className="bcard__num">07</span>
                <h3>Commercial fit-out</h3>
                <p>Cafés, offices, gyms. Aircon, hot water and gas, one PM, one invoice.</p>
              </div>
            </Link>

            <Link href="/contact#emergency" className="bcard bcard--emergency" id="emergency">
              <div className="bcard__photo bcard__photo--emergency" />
              <div className="bcard__body">
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
              ["03", "Rebate paperwork, sorted", "We're VEU accredited. Eligibility, certificates, STCs, all handled inside the quote. You sign once and it's done."],
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
            <h2 className="ds-h--on-dark">Simple, honest, no runaround.</h2>
          </div>
          <ol className="steps">
            {[
              [1, "You get in touch", "Fill out the quote form or give us a call, tell us what you’re after.", "~ 5 min"],
              [2, "Quote back within 12 hrs", "We send a fixed-price quote back within 12 hours. Straight to your inbox.", "within 12 hrs"],
              [3, "Site visit if needed", "For bigger jobs (ducted, tricky retrofits) we’ll pop out for a proper look.", "when required"],
              [4, "Any questions? Ask away", "We’ll walk you through the gear, timing and paperwork before you commit.", "before install"],
              [5, "We install & show you how", "Clean install, old unit gone, and we walk you through operating your new system.", "install day"],
              [6, "Follow-up next week", "Quick call the following week to make sure everything’s running the way it should.", "week after"],
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
            <p className="area__finep">Outside this list? Give us a call, we sometimes travel further for bigger jobs and commercial work.</p>
          </div>
          <div className="area__right">
            <div className="map map--live" aria-label="Service area map, 50 km radius from Pakenham 3810">
              <ServiceAreaMap />
              <div className="map__badge">
                <span className="map__badge-eye">Service radius</span>
                <span className="map__badge-num">50&nbsp;km</span>
                <span className="map__badge-note">Melbourne&rsquo;s south-east from Pakenham 3810</span>
              </div>
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
