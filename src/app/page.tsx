import { TITLE_SUFFIX } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { CountUp } from "@/components/CountUp";
import { HOME_JOURNEY } from "@/lib/homeJourney";
import Script from "next/script";
import ReactDOM from "react-dom";
import dynamic from "next/dynamic";
import { RATING_SUMMARY, RATING_TEXT } from "@/lib/reviews";
import { getReviews } from "@/lib/googleReviews";
import { site } from "@/lib/site";
import { faqSchema } from "@/lib/schema";
import { publishedPosts } from "@/lib/blogLive";
import { homePosts } from "@/lib/blogMerge";
import { publishedSuburbs } from "@/lib/suburbs";
import { SuburbSearch } from "@/components/SuburbSearch";
import { DoorIcon, type DoorIconKey } from "@/components/DoorIcon";
import { TEAM } from "@/lib/team";
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
      <div className="qcard__ribbon"><span className="qcard__ribbon-dot" /> Free quote · usually replied within 12 hrs</div>
      <h3 className="qcard__h">Get a written quote</h3>
      <p className="qcard__sub">Loading the quote form…</p>
      <div className="qcard__progress" aria-hidden="true">
        <i className="is-on" /><i /><i />
      </div>
      {/* Six, matching the real first step, so nothing jumps when it loads. */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} style={{ height: 66, borderRadius: 12, background: "var(--line-2)" }} />
        ))}
      </div>
    </div>
  );
}

export const metadata: Metadata = {
  // The root page sits beside the layout, so the layout's title
  // template never applies to it; the suffix has to be written here.
  title: { absolute: `Heating & Cooling Pakenham & SE Melbourne${TITLE_SUFFIX}` },
  description:
    "Heat pump hot water, split and ducted aircon, gas heating and servicing across Melbourne's south-east. Own crews, VEU rebate handled, free written quote.",
  alternates: { canonical: "/" },
  // Explicit, now the root no longer carries a homepage title for
  // everything to inherit. The homepage owns its own share card.
  openGraph: {
    title: "Heat Pumps, Split Systems & Ducted in Pakenham VIC | Advanced Gas",
    description:
      "Heat pump hot water, split and ducted aircon, gas heating and servicing across Melbourne's south-east and Gippsland. Directly employed crews, VEU rebates handled at the quote.",
    url: "/",
  },
  twitter: {
    title: "Heat Pumps, Split Systems & Ducted in Pakenham VIC | Advanced Gas",
    description:
      "One standard, every job. Heating, cooling, gas and hot water across Melbourne's south-east and Gippsland. Directly employed crews, VEU rebates handled at the quote, 6-year workmanship warranty.",
  },
};

const faqs = [
  {
    q: "How much is the VEU rebate, really?",
    a: "It depends on your existing hot water unit, your home and the new unit going in. Most Pakenham households we install for see between $2,400 and $3,200 off, and we apply it at the quote stage so you don't pay it then claim it back. We'll give you the exact number after a 20-minute site check.",
  },
  {
    q: "Is the quote fixed?",
    a: "It's in writing, and it only changes if the job does. If we open a wall or a roof space and find something the site check couldn't show, we stop, price the difference and get your approval before going on. You won't see a number on the invoice that you didn't see first.",
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
    a: "Yes. Gas leak, no hot water, smoking flue, call the main number any time. After hours goes to someone on the tools, not an overseas call centre.",
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

// Every town we publish a service-area page for — the whole 75 km radius,
// not a hand-kept subset. Sourced straight from the suburb dataset so the
// "Where we work" list can never drift out of sync with the pages that
// actually exist. Nearest-first, so our home patch reads down and out.
/**
 * The four doors off the top of the page.
 *
 * This was four intent cards — "something's stopped working", "I need something
 * replaced" and so on. Reading the intent back to someone only helps if they
 * are still working out what they want; most people arrive already knowing the
 * name of the thing, and having to read four paragraphs to find it is friction,
 * not empathy. Four buttons, named for the four things we actually sell.
 *
 * The urgent path used to be one of the cards. It is the line underneath now,
 * plus the header phone number and the sticky bar — a phone number wants to be
 * a phone number, not a card competing with a category.
 */
const ROUTE_BUTTONS: { href: string; label: string; sub: string; icon: DoorIconKey; tone: string }[] = [
  { href: "/heat-pumps", label: "Heat pumps", sub: "Rebate applied at the quote", icon: "heatpump", tone: "navy" },
  { href: "/services/air-conditioning-installation", label: "Heating & cooling", sub: "Split, ducted and gas", icon: "climate", tone: "sky" },
  // Orange on this one only, to match the "$$$" chip the rebate carries in the
  // nav. Spending the loudest colour on the thing worth the most money is the
  // whole reason to have a loud colour.
  { href: "/rebates", label: "Rebates", sub: "Up to $2,700 off", icon: "rebate", tone: "orange" },
  { href: "/services/aircon-servicing-repairs", label: "Servicing", sub: "Annual service & CO test", icon: "service", tone: "ink" },
];

const SUBURBS: { name: string; slug: string }[] = [...publishedSuburbs]
  .sort((a, b) => a.distanceKm - b.distanceKm || a.name.localeCompare(b.name))
  .map((s) => ({ name: s.name, slug: s.slug }));


export default async function HomePage() {
  // The three latest guides, including any written in the portal.
  const posts = await publishedPosts();
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
          heavily deprioritises CSS backgrounds for LCP scoring, the
          image was landing well after FCP on mobile. Rendering it as an
          <img> with fetchpriority=high plus a responsive srcset lets
          the browser hint discover it during initial HTML scan, and
          the LCP candidate becomes the image itself with a clear
          measurement. */}
      {/* The hero and the fork are one screen. The fork's job is to be the
          last thing on it, sitting on the bottom edge, so the wrapper is the
          height of the window and the hero takes whatever the fork does not.
          Sizing the hero off a guess at the fork's height, which is what this
          did before, lands differently on every window. */}
      <div className="firstscreen">
      <section className="hero hero--split">
        <div className="wrap hero__grid">
          <div className="hero__copy">

            {/* The slogan is the line people see; the kicker is what Google
                reads as the page's subject. A slogan-only H1 told search
                nothing about what we do or where. */}
            <h1 className="hero__h1">
              <span className="hero__h1-kicker">Heating, cooling &amp; hot water in Pakenham &amp; SE Melbourne</span>{" "}
              One standard. Every job.
            </h1>
            <p className="hero__sub">
              We&rsquo;re a local Pakenham team looking after heating, cooling, gas and hot water across
              Melbourne&rsquo;s south-east and Gippsland. Our own crews, twelve years on the tools, and the same high
              standard every time.
            </p>

            {/* A phone number beside the button for the people who'd rather
                talk to someone, and one line on what happens after you ask, so
                asking doesn't feel like signing up for something. */}
            <div className="hero__ctas" data-hide-sticky-cta>
              <a href="#quote" className="ds-btn ds-btn--orange ds-btn--lg">Get a free quote →</a>
              <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost ds-btn--lg">Call {site.phone}</a>
            </div>
            <p className="hero__reassure">
              No obligation, no hard sell. A real person gets back to you within 12 business hours.
            </p>

            {/* The rebate used to be a third button here, animated, sending
                people to another page at the very moment they were closest to
                enquiring. It is a reason to get a quote, not an alternative to
                one, so it sits under the buttons as a line, the hook survives,
                the competing ask does not. */}
            <p className="hero__rebate">
              Up to <strong>$2,700</strong> off a heat pump with the VEU rebate, applied to your quote.{" "}
              <Link href="/rebates">See if you qualify</Link>
            </p>

            <div className="hero__trust">
              <div className="trust-rating">
                <div className="trust-stars" aria-label="Five star Google rating">★★★★★</div>
                <div className="trust-rating__txt">
                  <strong><CountUp value={`${RATING_TEXT} / 5`} /></strong>
                  <span>Google reviews</span>
                </div>
              </div>
              <div className="trust-divider" />
              <div className="trust-stat"><strong><CountUp value="1,200+" /></strong><span>installs done</span></div>
              <div className="trust-divider" />
              <div className="trust-stat"><strong><CountUp value="12 yrs" /></strong><span>local trading</span></div>
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

      {/* START HERE — four doors, see ROUTE_BUTTONS.

          The card is two sections rather than one so the fold can fall inside
          it. The heading half is the last thing in the first screen and lands
          on the bottom edge of the window; the doors begin immediately under
          it, off-screen until you scroll. They read as one card because they
          share the ground and the border, and the join carries neither. */}
      <section className="route route--head" data-no-reveal>
        <div className="wrap">
          <div className="route__panel route__panel--head">
            <div className="ds-section-head ds-section-head--center">
              <span className="ds-eyebrow">Start here</span>
              <h2>What&rsquo;s brought you here?</h2>
            </div>
          </div>
        </div>
      </section>
      </div>

      <section className="route route--body" data-no-reveal>
        <div className="wrap">
          <div className="route__panel route__panel--body">
            <div className="routebtns">
              {ROUTE_BUTTONS.map((b) => (
                <Link key={b.href} href={b.href} className={`routebtn routebtn--${b.tone}`}>
                  <span className="routebtn__ico"><DoorIcon name={b.icon} /></span>
                  <span className="routebtn__txt">
                    <strong>{b.label}</strong>
                    <em>{b.sub}</em>
                  </span>
                  <span className="routebtn__go" aria-hidden="true">&rarr;</span>
                </Link>
              ))}
            </div>
            <p className="route__urgent">
              Something stopped working? <a href={`tel:${site.phoneE164}`}>Call {site.phone}</a>. Answered after hours,
              by someone on the tools.
            </p>
          </div>
        </div>
      </section>

      {/* THE CREW — faces and names near the top. Every competitor in
          Pakenham leads with its people; this page had one small group photo
          and nobody named. */}
      <section className="crew">
        <MockFlag>New section · real team from the About page</MockFlag>
        <div className="wrap crew__grid">
          <div className="crew__head ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> Who you&rsquo;ll deal with</span>
            <h2>Real people, from the first call to the clean-up.</h2>
            <p>
              Family-owned and based in Pakenham. The person who quotes your job is on site when it goes in, and the
              office that books it is down the road.
            </p>
            <Link href="/about" className="crew__more">Meet the whole team &rarr;</Link>
          </div>
          <ul className="crew__list">
            {TEAM.map((m) => (
              <li key={m.name} className="crewcard">
                <div className="crewcard__photo">
                  <Image src={m.photo} alt={`${m.name}, ${m.role}`} fill sizes="(max-width: 760px) 45vw, 200px" />
                </div>
                <strong className="crewcard__name">{m.name}</strong>
                <span className="crewcard__role">{m.roleShort}</span>
                <span className="crewcard__line">{m.short}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

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
                <div key={`${name}-${i}`} className="brand-chip" style={{ ["--i" as string]: i }} aria-hidden={i >= BRANDS_STRIP.length}>
                  <span className="brand-chip__name">{name}</span>
                  <span className="brand-chip__type">{type}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      </section>

      {/* QUOTE FORM — dedicated section, wrapped in an orange callout box
          so the whole 60-second quote reads as one branded panel. The sticky
          bar steps aside while it's on screen: a "Get a quote" button over
          the quote form only covers the boxes being filled in. */}
      <section className="quotesec" id="quote">
        <div className="wrap">
          <div className="quotesec__box" data-hide-sticky-cta>
            <div className="quotesec__grid">
              <div className="quotesec__left">
                <span className="ds-eyebrow ds-eyebrow--on-orange"><span className="ds-dot ds-dot--on-orange" /> 60-second quote</span>
                <h2>Written quote back within 12&nbsp;hours.</h2>
                <p className="quotesec__lede">
                  Tell us what you need, or tell us you&rsquo;re not sure, and we&rsquo;ll price it properly. Rebate
                  applied, GST included, nothing to chase.
                </p>
                <ul className="quotesec__points">
                  <li><span className="tick tick--on-orange">✓</span> No obligation, and no sales call afterwards</li>
                  <li><span className="tick tick--on-orange">✓</span> Same person quotes as installs</li>
                  <li><span className="tick tick--on-orange">✓</span> VEU rebate handled in the quote</li>
                  <li><span className="tick tick--on-orange">✓</span> The price only changes if the job does, and you approve it first</li>
                  <li><span className="tick tick--on-orange">✓</span> Emergency? Call {site.phone} instead</li>
                </ul>
                <p className="quotesec__finep">
                  {/* Never literals again. These were dummy values from the
                      build, a false ARC number is a regulatory problem,
                      not a typo, and the real ones were already sitting
                      in lib/site.ts unused. */}
                  Licensed gasfitter · {site.licences.refrigeration} · VEU-accredited provider ·
                  ABN {site.abn.replace(/ /g, "\u00a0")}.
                </p>
              </div>
              <HeroQuoteForm />
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS — straight after the quote form. They sat two-thirds of the
          way down, under ten thousand pixels; every competitor puts theirs at
          the top, and someone deciding whether to ask for a quote is the one
          who needs them. */}
      <section className="reviews" style={{ position: "relative" }}>
        <MockFlag>Moved up · was near the bottom</MockFlag>
        <div className="wrap">
          <div className="reviews__head">
            <div>
              <span className="ds-eyebrow"><span className="ds-dot" /> Reviews</span>
              <h2>What our customers say</h2>
              <p className="reviews__sub">Real Pakenham, Berwick &amp; Officer households, straight from Google.</p>
            </div>
            <div className="reviews__badge">
              <div className="reviews__badge-stars" aria-hidden="true">★ ★ ★ ★ ★</div>
              <div><strong>{RATING_TEXT} / 5</strong> from {RATING_SUMMARY.count} Google reviews</div>
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
              What a proper install costs
            </span>
            <h2 className="ds-h--on-dark">What an install costs</h2>
            <p className="veu__sub veu__sub--center">
              The standard doesn&rsquo;t change with the price. These are the three jobs we do most, with the VEU rebate already off and GST in. The number changes.
              The day doesn&rsquo;t: the same crew, the same procedures, the old unit taken away, and the compliance
              certificate and warranty pack emailed within 24&nbsp;hours, whichever one you pick.
            </p>
          </div>

          <div className="fixprice__grid fixprice__grid--3">
            <article className="fixprice">
              <div className="fixprice__badges">
                <span className="fixprice__badge fixprice__badge--value">Most installed</span>
                <span className="fixprice__badge fixprice__badge--aus">Australian made</span>
              </div>
              <div className="fixprice__photo fixprice__photo--aio">
                <Image src="/Reclaim-EcoAIO-Products-NewLogo-600PX-400x631-1.webp" alt="Reclaim ECO R290 all-in-one heat pump hot water units, 200 L and 300 L" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 45vw, 390px" />
              </div>
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
                <p className="fixprice__note">Price assumes a power point within 2&nbsp;metres of the current system. A new circuit is $350, quoted on the site visit.</p>
                <a href="#quote" className="ds-btn ds-btn--orange">Get a quote &rarr;</a>
              </div>
            </article>

            <article className="fixprice fixprice--feature">
              <div className="fixprice__badges">
                <span className="fixprice__badge fixprice__badge--top">Highest quality</span>
                <span className="fixprice__badge fixprice__badge--aus">Australian made</span>
              </div>
              <div className="fixprice__photo fixprice__photo--split">
                <Image src="/reclaim-split-back.webp" alt="Reclaim CO&#8322; split heat pump tank and outdoor unit installed beside a brick wall" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 45vw, 390px" />
              </div>
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
                  <span className="fixprice__price-lbl">written quote back in 12 hrs</span>
                </div>
                <p className="fixprice__note">Reclaim CO₂ Split, glass-lined or stainless, tall or squat, in 160 / 250 / 315 / 400 L. We&rsquo;ll spec the model and confirm the price with the VEU rebate applied.</p>
                <a href="#quote" className="ds-btn ds-btn--orange">Get a quote &rarr;</a>
              </div>
            </article>

            <article className="fixprice">
              <div className="fixprice__badges">
                <span className="fixprice__badge fixprice__badge--quality">High quality</span>
                <span className="fixprice__badge fixprice__badge--best">Best product</span>
              </div>
              <div className="fixprice__photo fixprice__photo--ducted">
                <Image src="/reclaim-mitsubishi.webp" alt="Mitsubishi Electric ducted condenser installed beside a Reclaim heat pump" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 45vw, 390px" />
              </div>
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
                  <span className="fixprice__price-lbl">written quote back in 12 hrs</span>
                </div>
                <a href="#quote" className="ds-btn ds-btn--orange">Get a quote &rarr;</a>
              </div>
            </article>
          </div>

          <p className="fixprice__foot">
            After something different? We install every major brand, <a href="#quote">tell us what you&rsquo;re after</a> and we&rsquo;ll quote it in writing.
          </p>
        </div>
      </section>

      {/* INTEREST-FREE PAYMENTS — mock. No provider is set up, so every term
          a provider would set is a highlighted placeholder. */}
      <section className="finance">
        <MockFlag>Mock · no finance provider set up yet</MockFlag>
        <div className="wrap finance__grid">
          <div className="finance__copy ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> Interest-free payments</span>
            <h2>Get it in now. Pay it off over time.</h2>
            <p>
              Spread the cost of a heat pump, split or ducted system over <Ph>up to 24 months</Ph>, interest free,
              through <Ph>finance partner</Ph>. Ask for it on the quote and we set it up alongside the install.
            </p>
            <ul className="finance__points">
              <li><span className="tick">✓</span> <span>No interest over the term <Ph>fees and terms from provider</Ph></span></li>
              <li><span className="tick">✓</span> Works alongside the VEU rebate, which still comes off first</li>
              <li><span className="tick">✓</span> One tick on the quote form, no separate application to chase</li>
            </ul>
            <a href="#quote" className="ds-btn ds-btn--orange">Ask about payments in your quote &rarr;</a>
          </div>
          <div className="finance__eg" aria-label="Example repayment">
            <span className="finance__eg-lbl">Example</span>
            <div className="finance__eg-item">Reclaim R290 all-in-one, fully installed</div>
            <div className="finance__eg-big">$50.46<small> a fortnight</small></div>
            <div className="finance__eg-calc">$2,624 over 52 fortnights (24 months)</div>
            <p className="finance__eg-note">
              Arithmetic only. <Ph>Provider establishment and account fees not included</Ph>
            </p>
          </div>
        </div>
      </section>

      {/* SERVICES BENTO */}
      <section className="services" id="services" style={{ position: "relative" }}>
        <MockFlag>Merged · services and why-us in one</MockFlag>
        <div className="wrap">
          <div className="ds-section-head">
            <span className="ds-eyebrow"><span className="ds-dot" /> What we do</span>
            <h2>Our services</h2>
            <p>Everything gas, hot water and air, under one local team. From a new split system in the bedroom to a full ducted retrofit and emergency gas leak callouts, same crew, same paperwork, same warranty.</p>
          </div>

          <div className="bento">
            <Link href="/services#heatpump" className="bcard bcard--xl bcard--feature">
              <div className="bcard__photo bcard__photo--heatpump">
                <Image src="/thermann-heat-pump.webp" alt="Thermann heat pump hot water system installed on a paved area" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 90vw, 600px" />
              </div>
              <div className="bcard__body">
                <span className="bcard__num">01</span>
                <h3>Heat pump hot water</h3>
                <p>Reclaim, iStore, Thermann. VEU rebate applied at the quote, so it&rsquo;s already off the price.</p>
                <span className="bcard__cta">See heat pump options →</span>
              </div>
            </Link>

            <Link href="/services#split" className="bcard">
              <div className="bcard__photo bcard__photo--split">
                <Image src="/kaden-indoor.webp" alt="Kaden wall split indoor head installed in a living room" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 45vw, 300px" />
              </div>
              <div className="bcard__body">
                <span className="bcard__num">02</span>
                <h3>Split systems</h3>
                <p>Bedroom, living, granny flat. Mitsubishi Electric &amp; Kaden, supplied &amp; installed.</p>
              </div>
            </Link>

            <Link href="/services#ducted" className="bcard">
              <div className="bcard__photo bcard__photo--ducted">
                <Image src="/ducted-condenser.webp" alt="Ducted system outdoor condenser installed beside a house" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 45vw, 300px" />
              </div>
              <div className="bcard__body">
                <span className="bcard__num">03</span>
                <h3>Ducted aircon</h3>
                <p>Zoned, whole-home cooling. New build or retrofit, design and install.</p>
              </div>
            </Link>

            <Link href="/services#gas-heating" className="bcard">
              <div className="bcard__photo bcard__photo--gas">
                <Image src="/gas-ducted-install.webp" alt="Gas ducted heater in a roof space, where the service and CO test happen" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 45vw, 300px" />
              </div>
              <div className="bcard__body">
                <span className="bcard__num">04</span>
                <h3>Gas &amp; ducted gas heating</h3>
                <p>Install, replace, service. Brivis, Kaden, Rinnai. Carbon monoxide tested.</p>
              </div>
            </Link>

            <Link href="/services#service" className="bcard bcard--accent">
              <div className="bcard__photo bcard__photo--service">
                <Image src="/evap-cooler-service.webp" alt="Evaporative cooler mounted on a tiled roof" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 45vw, 300px" />
              </div>
              <div className="bcard__body">
                <span className="bcard__num">05</span>
                <h3>Service &amp; safety check</h3>
                <p>Annual gas appliance servicing &amp; CO testing. Stay safe, stay covered.</p>
                <span className="bcard__pill">$280 + GST</span>
              </div>
            </Link>

            <Link href="/services#hotwater" className="bcard">
              <div className="bcard__photo bcard__photo--hotwater">
                <Image src="/gas-hot-water-changeover.webp" alt="Gas hot water changeover in progress on an external wall" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 45vw, 300px" />
              </div>
              <div className="bcard__body">
                <span className="bcard__num">06</span>
                <h3>Hot water, gas &amp; electric</h3>
                <p>Tank or continuous. Same-day swaps on most common models.</p>
              </div>
            </Link>

            <Link href="/commercial" className="bcard bcard--dark">
              <div className="bcard__photo bcard__photo--commercial">
                <Image src="/duct-work.webp" alt="Insulated flex ductwork run through a roof space" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 45vw, 300px" />
              </div>
              <div className="bcard__body">
                <span className="bcard__num">07</span>
                <h3>Commercial fit-out</h3>
                <p>Bank branches, national retail, tier-one builders. One PM, one invoice, all the paperwork.</p>
              </div>
            </Link>

            <Link href="/contact#emergency" className="bcard bcard--emergency" id="emergency">
              <div className="bcard__photo bcard__photo--emergency">
                <Image src="/gas-line-safe.webp" alt="Excavator trenching for a new gas line" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 45vw, 300px" />
              </div>
              <div className="bcard__body">
                <span className="bcard__num">08</span>
                <h3>Emergency call-outs</h3>
                <p>Gas leak, no hot water, smoking flue. Phones answered after hours.</p>
                <span className="bcard__pill bcard__pill--red">24 / 7</span>
              </div>
            </Link>
          </div>

          {/* WHY US — folded in under the services. It was its own 1,100px
              section straight after this one, making the same case twice. */}
          <div className="whyrow">
            <h3 className="whyrow__h">Why choose us</h3>
            <ul className="whyrow__list">
              {[
                ["Brands we'd put in our own homes", "Chosen because they last, with parts in every Reece store."],
                ["Our own crew, every job", "Directly employed. The person who quotes it is on site when it goes in."],
                ["The install is the product", "Bracket, drain fall, pipe runs and commissioning, done properly."],
                ["The standard is written down", "Twenty procedures, so the job never depends on who turned up."],
                ["Certified and documented", "Photos on the day, compliance certificate within 24 hours."],
                ["Still here after", "Six years on our workmanship, and a call the week after."],
              ].map(([t, d]) => (
                <li key={t}><span className="tick">✓</span><div><strong>{t}</strong><span>{d}</span></div></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — six steps in a row. It was a scroll-driven story
          2,900px tall, nearly a fifth of the page, for six sentences. */}
      <section className="howto">
        <MockFlag>Shortened · was 2,900px tall</MockFlag>
        <div className="wrap">
          <div className="ds-section-head ds-section-head--center">
            <span className="ds-eyebrow ds-eyebrow--on-dark"><span className="ds-dot ds-dot--orange" /> The process</span>
            <h2>How it works</h2>
            <p>Simple, honest, no runaround. Six steps from the photo you send us to the week after it&rsquo;s in.</p>
          </div>
          <ol className="howto__list">
            {HOME_JOURNEY.map((b) => (
              <li key={b.n} className="howto__step">
                <span className="howto__n">{b.n}</span>
                <strong className="howto__t">{b.kicker}</strong>
                <span className="howto__h">{b.h}</span>
                <span className="howto__why">{b.why}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="area" id="area">
        <div className="wrap area__grid">
          <div className="area__left">
            <span className="ds-eyebrow"><span className="ds-dot" /> Where we work</span>
            <h2>Based in Pakenham. On-site within 75 km.</h2>
            <p>If you&apos;re south-east of Melbourne and your suburb&apos;s on this list, we cover you with no travel surcharge.</p>
            <SuburbSearch suburbs={SUBURBS} />
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
            <span className="ds-eyebrow"><span className="ds-dot" /> FAQ</span>
            <h2>Common questions</h2>
            <p>Quick honest answers. Still want a human? <a href={`tel:${site.phoneE164}`} style={{ color: "var(--navy)", textUnderlineOffset: 2 }}>Call {site.phone}</a>.</p>
          </div>
          <div className="faq__right">
            {faqs.map((f, i) => (
              <details key={f.q} name="faq" style={{ ["--i" as string]: i }} {...(i === 0 ? { open: true } : {})}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* EXPERT TIPS — the latest guides from the blog, so the home page
          has a door into them and picks up the internal linking. */}
      <section className="tips">
        <div className="wrap">
          <div className="tips__head">
            <div>
              <span className="ds-eyebrow"><span className="ds-dot" /> Expert tips</span>
              <h2>Guides &amp; tips</h2>
            </div>
            <Link href="/blog" className="tips__all">Read the blog →</Link>
          </div>
          <div className="tips__grid">
            {homePosts(posts).map((p, i) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="tipcard" style={{ ["--i" as string]: i }}>
                <div className="tipcard__photo">
                  <Image
                    src={encodeURI(p.photo)}
                    alt={p.photoAlt}
                    fill
                    sizes="(max-width: 620px) 100vw, (max-width: 900px) 50vw, 400px"
                    style={{ objectFit: "cover" }}
                  />
                  <span className="tipcard__tag">{p.cat}</span>
                </div>
                <div className="tipcard__body">
                  <h3>{p.title}</h3>
                  <p>{p.blurb}</p>
                  <span className="tipcard__more">Read it →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* BIG CTA — the closing "job sorted" panel, with the crew photo so
          it ends on a face rather than a flat colour band. */}
      {/* The closing panel, as it was before it was turned into a navy card:
          a full-bleed orange band with the crew framed on it. The three
          terms and the credentials that came in with the card go back out —
          the terms are the paragraph again, and every identifier is in the
          footer immediately below this. */}
      <section className="bigcta bigcta--photo bigcta--warm" data-hide-sticky-cta>
        <div className="wrap bigcta__row">
          <figure className="bigcta__photo">
            <Image
              src="/team-photo.webp"
              alt="The Advanced Gas &amp; Aircon crew on site in Pakenham"
              width={900}
              height={675}
              sizes="(max-width: 860px) 100vw, 40vw"
            />
          </figure>
          <div className="bigcta__copy">
            <h2>Let&rsquo;s get your job done properly.</h2>
            <p>
              A free written quote with the VEU rebate already applied, usually back to you within 12 business hours.
              The price only changes if the job does, and you approve the new number before we start. Prefer to talk?
              Give us a call.
            </p>
            <div className="bigcta__btns">
              <a href="#quote" className="ds-btn ds-btn--orange ds-btn--xl">Get a quote →</a>
              <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
                or call <strong>{site.phone}</strong>
              </a>
            </div>
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

/* Mock-only markers. They label what the preview adds so it can be told
   apart from the live page; both come out before anything ships. */
function MockFlag({ children }: { children: React.ReactNode }) {
  return <div className="mockflag">{children}</div>;
}
function Ph({ children }: { children: React.ReactNode }) {
  return <mark className="mockph">[{children}]</mark>;
}
