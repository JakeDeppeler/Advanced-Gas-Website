import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import ReactDOM from "react-dom";
import dynamic from "next/dynamic";
import { RATING_SUMMARY } from "@/lib/reviews";
import { getReviews } from "@/lib/googleReviews";
import { site } from "@/lib/site";
import { faqSchema } from "@/lib/schema";
import "./home.css";

// Defer Leaflet + its 15KB CSS off the initial paint. The map is below the
// fold on every viewport and only meaningful after the user scrolls past
// several hero sections.
const ServiceAreaMap = dynamic(
  () => import("@/components/ServiceAreaMap").then((m) => m.ServiceAreaMap),
  { ssr: false, loading: () => <div className="map__leaflet" aria-hidden="true" /> }
);

// Defer the 900-line multi-step HeroQuoteForm off the initial hydration
// critical path. It has 35+ useState/useMemo/useEffect calls — on a
// throttled mobile CPU that's ~400ms of TBT during initial hydration.
// Loading it as a client-only lazy chunk drops it off the main-thread
// blocking budget entirely; the skeleton keeps the layout stable so
// there's no visible CLS when the real form swaps in.
const HeroQuoteForm = dynamic(
  () => import("@/components/HeroQuoteForm").then((m) => m.HeroQuoteForm),
  { ssr: false, loading: () => <HeroQuoteFormSkeleton /> }
);

function HeroQuoteFormSkeleton() {
  return (
    <div className="qcard" aria-hidden="true">
      <div className="qcard__ribbon"><span className="qcard__ribbon-dot" /> 60-second quote</div>
      <h3 className="qcard__h">Get a fixed quote in 60&nbsp;seconds.</h3>
      <p className="qcard__sub">Loading the quote form…</p>
      <div className="qcard__progress" aria-hidden="true">
        <i className="is-on" /><i /><i /><i />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ height: 78, borderRadius: 12, background: "var(--line-2)" }} />
        <div style={{ height: 78, borderRadius: 12, background: "var(--line-2)" }} />
        <div style={{ height: 78, borderRadius: 12, background: "var(--line-2)" }} />
        <div style={{ height: 78, borderRadius: 12, background: "var(--line-2)" }} />
      </div>
      <p className="qcard__finep">60s. No obligation. No spam. Response in 2 business hours.</p>
    </div>
  );
}

export const metadata: Metadata = {
  title: "Heat Pumps, Split Systems & Ducted in Pakenham VIC",
  description:
    "Family-owned Pakenham specialists in heat pump hot water, split and ducted aircon, gas heating and servicing. VEU rebates handled. Free 60-second quote.",
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
    a: "Heat pumps: Reclaim when you're staying in the house, iStore when the rebate is what decides it, Thermann when you want parts in every Reece store. Aircon: Mitsubishi Electric and Kaden. Gas ducted: Brivis, because it's what most of these homes were built with, and Kaden. Each one is the right answer to a different question, and we've installed enough of all of them to tell you which question yours is.",
  },
  {
    q: "Do you do emergencies on weekends?",
    a: "Yes. Gas leak, no hot water, smoking flue, call the main number any time. After hours goes to a real on-call tradie, not an overseas call centre.",
  },
  {
    q: "What's the warranty?",
    a: "Manufacturer warranty on the unit (typically 6–10 years on the tank). 6 years on our workmanship. Compliance certificate emailed within 24 hours of install, keep it for insurance.",
  },
  {
    q: "Do you take developer new-build work?",
    a: "Not the volume developer stuff. Every job we take is for a real homeowner, an owner-occupier retrofit, a landlord upgrade, a custom-build owner who wants the same person on the tools as on the quote. If you're a custom builder wanting a single-project pairing (not a 40-home estate rollout), have a chat with us. Otherwise our diary is booked with existing-home work and it's better for both of us if we say so upfront.",
  },
];

const SUBURBS: { name: string; slug: string }[] = [
  { name: "Pakenham",         slug: "pakenham" },
  { name: "Pakenham Upper",   slug: "pakenham-upper" },
  { name: "Officer",          slug: "officer" },
  { name: "Beaconsfield",     slug: "beaconsfield" },
  { name: "Berwick",          slug: "berwick" },
  { name: "Narre Warren",     slug: "narre-warren" },
  { name: "Cranbourne",       slug: "cranbourne" },
  { name: "Cranbourne East",  slug: "cranbourne-east" },
  { name: "Clyde",            slug: "clyde" },
  { name: "Clyde North",      slug: "clyde-north" },
  { name: "Hampton Park",     slug: "hampton-park" },
  { name: "Hallam",           slug: "hallam" },
  { name: "Endeavour Hills",  slug: "endeavour-hills" },
  { name: "Doveton",          slug: "doveton" },
  { name: "Dandenong",        slug: "dandenong" },
  { name: "Keysborough",      slug: "keysborough" },
  { name: "Lynbrook",         slug: "lynbrook" },
  { name: "Lyndhurst",        slug: "lyndhurst" },
  { name: "Bunyip",           slug: "bunyip" },
  { name: "Garfield",         slug: "garfield" },
  { name: "Nar Nar Goon",     slug: "nar-nar-goon" },
  { name: "Tynong",           slug: "tynong" },
  { name: "Drouin",           slug: "drouin" },
  { name: "Warragul",         slug: "warragul" },
  { name: "Belgrave",         slug: "belgrave" },
  { name: "Emerald",          slug: "emerald" },
  { name: "Cockatoo",         slug: "cockatoo" },
  { name: "Gembrook",         slug: "gembrook" },
  { name: "Ferntree Gully",   slug: "ferntree-gully" },
  { name: "Rowville",         slug: "rowville" },
  { name: "Tooradin",         slug: "tooradin" },
];


export default async function HomePage() {
  // Live 4★+ Google reviews (falls back to the curated list when the
  // Places API isn't configured — see lib/googleReviews.ts).
  const { reviews: liveReviews } = await getReviews(12);
  // THREE columns — .reviews__marquee is a three-column grid, so a
  // two-way split left the right-hand third of the section empty on
  // desktop. Pull 12 so each column gets a fair share.
  const REVIEW_COLUMNS = [
    liveReviews.filter((_, i) => i % 3 === 0),
    liveReviews.filter((_, i) => i % 3 === 1),
    liveReviews.filter((_, i) => i % 3 === 2),
  ];

  // Warm up DNS for the OSM tile CDN so the below-the-fold service map's
  // tiles resolve faster the moment its lazy chunk mounts. prefetchDNS is
  // idle-friendly — a preconnect would open TCP+TLS speculatively and add
  // overhead for a resource we don't need until the user scrolls.
  ReactDOM.prefetchDNS("https://tile.openstreetmap.org");

  return (
    <div className="page-home">
      {/* HERO — full-bleed team photo, cinematic overlay.
          The hero photo is a real <img> (not a CSS background). Chrome
          heavily deprioritises CSS backgrounds for LCP scoring — the
          image was landing well after FCP on mobile. Rendering it as an
          <img> with fetchpriority=high plus a responsive srcset lets
          the browser hint discover it during initial HTML scan, and
          the LCP candidate becomes the image itself with a clear
          measurement. */}
      <section className="hero hero--split">
        <div className="wrap hero__grid">
          <div className="hero__copy">
            <span className="hero__badge">
              <span className="ds-dot" />
              Pakenham locals since 2014
            </span>

            <h1 className="hero__h1">
              The team you&rsquo;d want in your house.
            </h1>
            <p className="hero__sub">
              Family owned. Same face on the quote as on the tools. Twelve years and 1,200+ installs across Pakenham, Berwick, Cranbourne &amp; Officer.
            </p>

            <div className="hero__ctas" data-hide-sticky-cta>
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
                  <span>Google reviews</span>
                </div>
              </div>
              <div className="trust-divider" />
              <div className="trust-stat"><strong>1,200+</strong><span>installs done</span></div>
              <div className="trust-divider" />
              <div className="trust-stat"><strong>12 yrs</strong><span>local trading</span></div>
            </div>
          </div>

          {/* Team photo · right column of the hero grid, rounded card so
              it reads as a portrait alongside the copy rather than a
              background layer. */}
          <div className="hero__photo" aria-hidden="true">
            <picture>
              <source media="(max-width: 760px)" srcSet="/team-photo-mobile.webp" />
              <img
                src="/team-photo.webp"
                alt="Jake and the Advanced Gas & Aircon crew on site in Pakenham"
                width={1200}
                height={1400}
                fetchPriority="high"
                decoding="async"
              />
            </picture>
          </div>
        </div>
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
            {(() => {
              const BRANDS_STRIP: [string, string][] = [
                ["Reclaim", "heat pumps"],
                ["iStore", "heat pumps"],
                ["Thermann", "hot water"],
                ["Mitsubishi", "electric aircon"],
                ["Kaden", "aircon"],
                ["Zonemate", "zoning"],
                ["Brivis", "gas ducted"],
              ];
              // Duplicated so the MOBILE marquee (CSS translateX(-50%)) loops
              // seamlessly. On desktop the grid is static, so the second copy
              // is hidden in CSS — otherwise seven chips in a seven-column
              // grid render as two identical rows.
              return [...BRANDS_STRIP, ...BRANDS_STRIP].map(([name, type], i) => (
                <div key={`${name}-${i}`} className="brand-chip" aria-hidden={i >= BRANDS_STRIP.length}>
                  <span className="brand-chip__name">{name}</span>
                  <span className="brand-chip__type">{type}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      </section>

      {/* QUOTE FORM — dedicated section, wrapped in an orange callout box
          so the whole 60-second quote reads as one branded panel. */}
      <section className="quotesec" id="quote">
        <div className="wrap">
          <div className="quotesec__box">
            <div className="quotesec__grid">
              <div className="quotesec__left">
                <span className="ds-eyebrow ds-eyebrow--on-orange"><span className="ds-dot ds-dot--on-orange" /> 60-second quote</span>
                <h2>Fixed-price quote back within 12&nbsp;hours.</h2>
                <p className="quotesec__lede">
                  Tell us what you need, we&rsquo;ll quote it straight. Rebates applied, GST included, no chasing.
                </p>
                <ul className="quotesec__points">
                  <li><span className="tick tick--on-orange">✓</span> No obligation, no pushy call-back</li>
                  <li><span className="tick tick--on-orange">✓</span> Same person quotes as installs</li>
                  <li><span className="tick tick--on-orange">✓</span> VEU rebate handled in the quote</li>
                  <li><span className="tick tick--on-orange">✓</span> Emergency? Call {site.phone} instead</li>
                </ul>
                <p className="quotesec__finep">
                  Licensed gasfitter · ARC AU34567 · VEU-accredited provider · ABN 12&nbsp;345&nbsp;678&nbsp;910.
                </p>
              </div>
              <HeroQuoteForm />
            </div>
          </div>
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
              <div><strong>4.9 / 5</strong> on Google</div>
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

          {/* Mobile-only auto-scrolling review marquee. Cards duplicated
              so the CSS translateX(-50%) loop reads seamless. */}
          <div className="reviews__rail" aria-hidden="true">
            <div className="reviews__rail-track">
              {[...liveReviews.slice(0, 8), ...liveReviews.slice(0, 8)].map((r, i) => (
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
                <span className="fixprice__badge fixprice__badge--value">Most installed</span>
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
                  <span className="fixprice__price-num">$2,624</span>
                  <span className="fixprice__price-lbl">fully installed, inc GST</span>
                </div>
                <p className="fixprice__note">Price assumes a power point within 75&nbsp;cm of the current hot water system. New power point quoted separately.</p>
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
                  <span className="fixprice__price-num">Message for quote</span>
                  <span className="fixprice__price-lbl">fixed price back in 2 hrs</span>
                </div>
                <p className="fixprice__note">Reclaim CO₂ Split, glass-lined or stainless, tall or squat, in 160 / 250 / 315 / 400 L. We&rsquo;ll spec the model and confirm the price with the VEU rebate applied.</p>
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
                  <span className="fixprice__price-num">Message for quote</span>
                  <span className="fixprice__price-lbl">fixed price back in 2 hrs</span>
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
                <p>Reclaim, iStore, Thermann. VEU rebate applied at the quote, so it&rsquo;s already off the price.</p>
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
                <p>Install, replace, service. Brivis, Kaden, Rinnai. Carbon monoxide tested.</p>
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
            <h2>Based in Pakenham. On-site within 75 km.</h2>
            <p>If you&apos;re south-east of Melbourne and your suburb&apos;s on this list, we cover you with no travel surcharge.</p>
            <div className="suburbs">
              {SUBURBS.map((s) => (
                <Link key={s.slug} href={`/areas/${s.slug}`} className="suburbs__chip">
                  {s.name}
                </Link>
              ))}
            </div>
            <p className="area__finep">Outside this list? Give us a call, we sometimes travel further for bigger jobs and commercial work.</p>
          </div>
          <div className="area__right">
            <div className="map map--live" aria-label="Service area map, 75 km radius from Pakenham 3810">
              <ServiceAreaMap />
              <div className="map__badge">
                <span className="map__badge-eye">Service radius</span>
                <span className="map__badge-num">75&nbsp;km</span>
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
              <details key={f.q} name="faq" {...(i === 0 ? { open: true } : {})}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* BIG CTA */}
      <section className="bigcta" data-hide-sticky-cta>
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
