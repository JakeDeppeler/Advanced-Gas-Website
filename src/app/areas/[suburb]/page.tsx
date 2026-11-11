import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { publishedSuburbs, suburbs } from "@/lib/suburbs";
import { breadcrumbSchema, suburbServiceSchema } from "@/lib/schema";
import { seoMeta } from "@/lib/seo";
import { suburbJobs, suburbReviews } from "@/lib/suburbJobs";
import Image from "next/image";
import { getReviews } from "@/lib/googleReviews";
import { faqSchema } from "@/lib/schema";
import { PHOTO } from "@/lib/homepage/data";
import { site, openingHours } from "@/lib/site";
import { serviceContent } from "@/lib/serviceContent";
import { resolveAsset } from "@/lib/publicAsset";
import { DIRECTORS, OFFICE, ACCREDITED } from "@/lib/company";
import { HeroQuote } from "@/components/homepage/HeroQuote";
import { ServiceArea } from "@/components/homepage/ServiceArea";
import { areaSuburbs } from "@/lib/homepage/areas";
import { HomeHeader, PhoneIcon } from "@/components/homepage/HomeHeader";
import { SiteModeStrip } from "@/components/Header";
import "@/components/homepage/homepage.css";
import "@/components/homepage/page/suburb.css";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
import "@/components/homepage/page/about.css";
import { JsonLd } from "@/components/JsonLd";

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

export function generateStaticParams() {
  return publishedSuburbs.map((s) => ({ suburb: s.slug }));
}

export function generateMetadata({ params }: { params: { suburb: string } }): Metadata {
  const sub = publishedSuburbs.find((s) => s.slug === params.suburb);
  // WEB-003. This used to `return {}` here, which does not mean "no
  // metadata" — it means "inherit the root layout's", i.e. serve the
  // homepage title on a suburb page. A suburb search landing on a
  // result headed "Pakenham" gets scrolled past. Fail loudly instead,
  // so the page 404s rather than impersonating the homepage.
  if (!sub) notFound();
  return seoMeta({
    // Hot water is in the title because it's a third of the work and a third
    // of the searches ("hot water Cranbourne", "heat pump Officer"), and the
    // old title left it out while the H1 said it. "Aircon" rather than
    // "Air Conditioning" buys the eleven characters it needs.
    title: `Aircon, Heating & Hot Water ${sub.name} ${sub.postcode}`,
    description: `Air conditioning, heating and hot water in ${sub.name} ${sub.postcode}. ${sub.commonInstall.charAt(0).toUpperCase()}${sub.commonInstall.slice(1)}. VEU rebates handled, written quotes, 6-year workmanship warranty.`,
    canonical: `/areas/${sub.slug}`,
    // Absolute so the suffix gives way, not the postcode. A long suburb
    // name (Beaconsfield Upper) pushed the title past 60 and the clamp
    // dropped "3808" — which is exactly the signal an "aircon officer
    // 3809" search wants in the title.
    absolute: true,
  });
}

/**
 * Every service a suburb page can show, each with a photo of that job.
 *
 * The photos are picked here rather than taken from the service page's
 * system tile: two of those share one photo of ductwork in a roof, so gas
 * ducted heating and ducted air conditioning came out looking like the same
 * job (Jake, Nov 2026: "make sure the photos are correct"). Real installs of
 * ours where we have one; a product shot on white where we don't.
 * The line under each is the service page's own, so the two always agree.
 */
type Svc = { href: string; label: string; photo: string; scene: boolean; blurb?: string };

const SVC_PHOTO: Record<string, [string, boolean]> = {
  "/services/heat-pump-installation": ["/ba-hw-after.webp", true],
  "/services/air-conditioning-installation/split": ["/kaden-indoor.webp", true],
  "/services/air-conditioning-installation/multi": ["/mitsubishi-mxz-multi-split-condenser-v2.webp", false],
  "/services/air-conditioning-installation/ducted": ["/ducted-condenser.webp", true],
  "/services/gas-plumbing/gas-ducted": ["/gas-ducted-install.webp", true],
  "/services/gas-plumbing/continuous-flow": ["/G-Series_Front_On_View_1200x900.jpg", false],
  "/services/air-conditioning-installation/evap": ["/classic_evap_product_image.jpg", false],
  "/services/aircon-servicing-repairs": ["/evap-cooler-service.webp", true],
  "/services/gas-plumbing": ["/gas-line.webp", true],
  "/services/gas-plumbing/temporary-hot-water": ["/gas-hot-water-changeover.webp", true],
  "/commercial": ["/comm/ceiling-unit.jpg", true],
};

/** The jobs every suburb page offers, in the order a page fills its top three when its record names fewer. */
const ALL_SVCS: { href: string; label: string }[] = [
  { href: "/services/heat-pump-installation", label: "Heat pump hot water" },
  { href: "/services/air-conditioning-installation/split", label: "Split systems" },
  { href: "/services/air-conditioning-installation/ducted", label: "Ducted air conditioning" },
  { href: "/services/gas-plumbing/gas-ducted", label: "Gas ducted heating" },
  { href: "/services/air-conditioning-installation/multi", label: "Multi-head splits" },
  { href: "/services/gas-plumbing/continuous-flow", label: "Continuous flow gas hot water" },
  { href: "/services/air-conditioning-installation/evap", label: "Evaporative cooling" },
  { href: "/services/aircon-servicing-repairs", label: "Aircon servicing & repairs" },
  { href: "/services/gas-plumbing", label: "Gas fitting & plumbing" },
  { href: "/services/gas-plumbing/temporary-hot-water", label: "Temporary hot water" },
  { href: "/commercial", label: "Commercial & strata" },
];

function svc(href: string, label: string): Svc {
  const [photo, scene] = SVC_PHOTO[href] ?? [PHOTO.vans, true];
  const [, , slug, sys] = href.split("/");
  const c = href.startsWith("/services/") ? serviceContent[slug] : undefined;
  const s = sys ? c?.systems?.find((x) => x.id === sys) : undefined;
  const blurb = href === "/commercial"
    ? "Offices, shops, rentals and strata blocks. Installs, servicing and planned maintenance."
    : s?.blurb ?? c?.metaDescription;
  return { href, label, photo: resolveAsset(photo) ?? photo, scene, blurb };
}

/** `rise`: fade up as it scrolls into view. Off for the cards under "Show all", which appear on a tap and shouldn't then wait for a scroll. */
function SvcCard({ v, tag, i, rise = true }: { v: Svc; tag?: string; i: number; rise?: boolean }) {
  return (
    <Link href={v.href} className={`sbx__job${rise ? " arv" : ""}`} style={rise ? { animationDelay: `${i * 0.07}s` } : undefined}>
      <span className={`sbx__jobimg${v.scene ? " sbx__jobimg--scene" : ""}`}>
        <Image src={v.photo} alt="" fill sizes="(max-width: 700px) 100vw, 420px" />
      </span>
      <span className="sbx__jobt">
        {tag && <small>{tag}</small>}
        <strong>{v.label}</strong>
        {v.blurb && <span>{v.blurb}</span>}
        <em>See how we do it →</em>
      </span>
    </Link>
  );
}

/**
 * A suburb page, built around the person who lands on it (Jake, Nov 2026:
 * "they are looking for that person in that area, not just another home
 * page"). Someone searching "aircon Berwick" wants four things answered,
 * in this order, and the page is laid out to answer them:
 *
 *   1. Do they come here, and how quickly?   the hero and the proof strip
 *   2. Do they do my job, and know my house? the jobs this suburb calls us
 *      for, then what we see in its homes
 *   3. Who are they?                          the people, the promises in
 *      writing and the licences, from lib/company (the About page's own)
 *   4. How do I reach them?                   every way in, laid out once,
 *      with the questions people from here ask
 *
 * It keeps the homepage's look (the photo hero with the quote form, the
 * scrolling reviews, the navy map) so it is plainly the same company.
 *
 * Nothing here is new about a suburb: every fact is a field of its record
 * in lib/suburbs.ts, and a field the record doesn't have hides its part
 * rather than being filled in. The outer ring keeps its honest wording.
 */
export default async function SuburbPage({ params }: { params: { suburb: string } }) {
  const sub = publishedSuburbs.find((s) => s.slug === params.suburb);
  if (!sub) notFound();

  // Nearby suburbs: linked where they have a page, plain text where not.
  const nearby = sub.nearby
    .map((slug) => suburbs.find((s) => s.slug === slug))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const drive = sub.driveMin
    ? sub.driveMin[0] === sub.driveMin[1] ? `${sub.driveMin[0]} min` : `${sub.driveMin[0]}–${sub.driveMin[1]} min`
    : sub.distanceKm === 0 ? "On site" : `${Math.max(10, Math.round(sub.distanceKm * 0.7))}–${Math.max(15, Math.round(sub.distanceKm * 1.1))} min`;

  // The suburb's own jobs first, from its record; a record naming fewer than
  // three is topped up from the general order, so every page shows three.
  const own = suburbJobs(sub);
  const ownHrefs = new Set(own.map((j) => j.href));
  const top = [...own, ...ALL_SVCS.filter((x) => !ownHrefs.has(x.href))].slice(0, 3);
  const topHrefs = new Set(top.map((j) => j.href));
  const rest = ALL_SVCS.filter((x) => !topHrefs.has(x.href));

  // This suburb's own reviews lead the scrolling columns, then everyone
  // else's, so a Berwick page opens on Berwick households where it has them.
  const local = suburbReviews(sub);
  const { reviews: all, summary } = await getReviews(12);
  const seen = new Set(local.map((r) => r.who + r.title));
  const reviews = [...local, ...all.filter((r) => !seen.has(r.who + r.title))].slice(0, 12);
  const cols = [0, 1, 2].map((c) => reviews.filter((_, i) => i % 3 === c));
  const rating = summary.value.toFixed(1);
  const home = sub.distanceKm === 0;
  const outer = !!sub.outerRing;
  const hours = openingHours();

  // The questions people from here actually ask, answered from the record.
  const faqs = [
    {
      q: `Do you come out to ${sub.name}?`,
      a: outer
        ? `Yes, for booked work. ${sub.name} is about ${sub.distanceKm} km from our Pakenham workshop, ${drive} each way, so we're the right call for a planned install or service and the wrong one for a 2 am emergency.`
        : home
          ? `It's where our workshop is: Sierra Circuit, Pakenham. Most ${sub.name} jobs are ${drive} from the van leaving the yard.`
          : `Every week. ${sub.name} is ${sub.distanceKm} km from our Pakenham workshop, usually ${drive} in the van.`,
    },
    { q: `What do you install most in ${sub.name}?`, a: `${cap(sub.commonInstall)}.` },
    { q: `What are the homes like in ${sub.name}?`, a: `${cap(sub.housingStock)}. That decides most of what goes where: roof space for ducted, wall space for a split, and where a hot water unit can stand.` },
    ...(sub.knownEstates ? [{ q: `Which ${sub.name} estates do you know?`, a: sub.knownEstates }] : []),
    { q: `Do you handle the ${sub.council} paperwork?`, a: `Yes. Compliance certificates and any permits for ${sub.name} jobs are handled in-house, and the certificate is emailed to you the day after the install.` },
    { q: "How fast can I get a price?", a: "A free, no-obligation written quote, usually back within 12 business hours, with any VEU rebate already taken off. The price only changes if the job does, and you approve it first." },
  ];

  const crumbs = breadcrumbSchema([
    { name: "Home", url: site.url },
    { name: "Service Areas", url: `${site.url}/service-areas` },
    { name: sub.name, url: `${site.url}/areas/${sub.slug}` },
  ]);

  return (
    <>
    {/* The homepage's chrome (Jake, Nov 2026: "the header in the same pill
        as the home screen"): the strip outside .ag, as on the homepage, and
        the pill floating over the photo. ChromeGate leaves the site header
        off /areas pages so there's only the one. */}
    <SiteModeStrip tabs={false} />
    <div className="ag sbx" data-no-reveal>
      <HomeHeader />

      {/* ===== 1. HERO: who we are to them, and the quote form ===== */}
      <section className="ahero">
        <Image src={PHOTO.team} alt="" aria-hidden="true" fill priority sizes="100vw" className="ahero__bg" />
        <div className="ahero__scrim" aria-hidden="true" />
        <div className="wrap ahero__in">
          <div className="ahero__copy anim">
            {/* The breadcrumb, in the hero: the pill sits where its bar was. */}
            <nav aria-label="Breadcrumb" className="sbx__crumbs">
              <ol>
                <li><Link href="/">Home</Link></li>
                <li><Link href="/service-areas">Service areas</Link></li>
                <li aria-current="page">{sub.name}</li>
              </ol>
            </nav>
            <span className="sbx__eye">{sub.name} · VIC {sub.postcode} · {sub.council}</span>
            <h1 className="ahero__h1 sbx__h1">Air con, heating &amp; hot water <span>in {sub.name}.</span></h1>
            <p className="ahero__p">
              {/* The outer ring gets the honest version: we travel there for
                  booked work, and say so rather than claim to be around the
                  corner. See `outerRing` in lib/suburbs.ts. */}
              {outer
                ? `We travel to ${sub.name} from Pakenham for booked work, about ${drive} each way. That makes us the right call for a planned install and the wrong one for a 2 am emergency, and we'd rather say so up front.`
                : `A licensed plumbing and refrigeration team working in ${sub.name} since 2014, out of our own workshop ${home ? "here in Pakenham" : `${drive} away in Pakenham`}. You'll usually find us ${sub.landmark}.`}
            </p>
            <div className="ahero__ctas">
              <a href="tel:+61359478000" data-call-from="suburb-hero" className="abtn abtn--or abtn--call"><PhoneIcon />Call (03) 5947 8000</a>
              <a href="#contact" className="abtn abtn--line">Other ways to reach us</a>
            </div>
            <div className="ahero__trust">
              <span className="ahero__stars">
                <span className="stars" aria-hidden="true">★★★★★</span>
                <span style={{ display: "flex", flexDirection: "column" }}><strong>{rating} / 5</strong><small>Google reviews</small></span>
              </span>
              <span className="ahero__sep" aria-hidden="true" />
              <span><strong>{hours}</strong><small>{outer ? "Booked work" : "24/7 for gas and no hot water"}</small></span>
              <span className="ahero__sep" aria-hidden="true" />
              <span><strong>12 hrs</strong><small>To a written quote</small></span>
            </div>
          </div>
          <HeroQuote />
        </div>
      </section>

      {/* ===== 2. YES, WE COME HERE: the four things that settle it ===== */}
      <section className="sbx__yes" aria-labelledby="sbx-yes">
        <div className="wrap sbx__yesin">
          <h2 id="sbx-yes" className="sbx__yesh">
            {outer ? <>Yes, we come to {sub.name} <span>for booked work.</span></> : home ? <>Your local team, <span>right here in {sub.name}.</span></> : <>Yes, we look after <span>{sub.name}.</span></>}
          </h2>
          <ul className="sbx__proof">
            <li><b>{drive}</b><span>{home ? "From our Sierra Circuit workshop" : `From our workshop to ${sub.name}, ${sub.distanceKm} km`}</span></li>
            <li><b>6 years</b><span>On our workmanship, on top of the maker&apos;s warranty</span></li>
            <li><b>{local.length ? `${local.length} ${sub.name} review${local.length === 1 ? "" : "s"}` : `${rating} ★`}</b><span>{local.length ? `On Google from ${sub.name} households, and ${rating} ★ across all ${summary.count}` : `From ${summary.count} Google reviews by local households`}</span></li>
            <li><b>{sub.council.replace(/ (Shire|City)? ?Council$/, "")}</b><span>{sub.council} paperwork and compliance handled in-house</span></li>
          </ul>
        </div>
      </section>

      {/* ===== 3. WHAT THIS SUBURB CALLS US FOR ===== */}
      <section id="services" className="sbx__jobsec">
        <div className="wrap sbx__col sbx__gap">
          <div className="svcs__head arv">
            <div className="sechead__t">
              <h2 className="h2">What {sub.name} homes <span style={{ color: "#C2521A" }}>call us for.</span></h2>
            </div>
            <p>{outer ? `The jobs ${sub.name} books us for most, from what we install there.` : `The jobs we do most in ${sub.name}, from what's in its homes. Each has its own page with the options and how we install it.`}</p>
          </div>
          <div className="sbx__jobgrid">
            {top.map((j, i) => (
              <SvcCard key={j.href} v={svc(j.href, j.label)} i={i}
                tag={ownHrefs.has(j.href) ? (i === 0 ? `Most asked for in ${sub.name}` : `Common in ${sub.name}`) : undefined} />
            ))}
          </div>
          {/* Everything else, behind one button (Jake, Nov 2026), so the
              suburb's own three lead and the rest is a tap away. A <details>,
              so it opens without script and reads properly to a screen reader. */}
          <details className="sbx__all">
            <summary><span className="sbx__allo">Show all services</span><span className="sbx__allc">Show fewer</span> <i aria-hidden="true">↓</i></summary>
            <div className="sbx__jobgrid sbx__jobgrid--more">
              {rest.map((j, i) => <SvcCard key={j.href} v={svc(j.href, j.label)} i={i} rise={false} />)}
            </div>
          </details>
          {!outer && (
            <p className="sbx__urgent">Something broken right now? <a href="tel:+61359478000" data-call-from="suburb-emergency">Call (03) 5947 8000</a>. Gas leaks and no hot water are answered 24/7.</p>
          )}
        </div>
      </section>

      {/* ===== 4. WE KNOW THESE HOMES ===== */}
      <section className="sbx__tools">
        <div className={`wrap sbx__two${sub.testimonial || sub.knownEstates ? "" : " sbx__two--one"}`}>
          <div className="sbx__toolst arv">
            <h2 className="h2">{outer ? "What we get called out for in " : "We know "}<span>{outer ? `${sub.name}.` : `${sub.name} homes.`}</span></h2>
            <p>{cap(sub.housingStock)}.</p>
            {sub.whyLocal && <p className="sbx__why">{sub.whyLocal}</p>}
            {sub.commonProblems?.length ? (
              <>
                <h3 className="sbx__sub">What we see on the tools here</h3>
                <ol className="sbx__list">
                  {sub.commonProblems.map((p, i) => <li key={p}><b aria-hidden="true">{String(i + 1).padStart(2, "0")}</b><span>{p}</span></li>)}
                </ol>
              </>
            ) : null}
          </div>
          {(sub.testimonial || sub.knownEstates) && (
            <div className="sbx__side">
              {sub.testimonial && (
                <figure className="sbx__quote">
                  <span className="stars stars--ink" aria-hidden="true">★★★★★</span>
                  <blockquote>&ldquo;{sub.testimonial.quote}&rdquo;</blockquote>
                  <figcaption><strong>{sub.testimonial.who}</strong> · {sub.testimonial.what}</figcaption>
                </figure>
              )}
              {sub.knownEstates && (
                <div className="sbx__estates">
                  <span>Estates we know in {sub.name}</span>
                  <p>{sub.knownEstates}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ===== 5. WHO YOU'LL BE DEALING WITH: the About page's people ===== */}
      <section id="team" className="sbx__team">
        <div className="wrap sbx__col sbx__gap">
          <div className="sechead arv">
            <div className="sechead__t">
              <h2 className="h2" style={{ color: "#fff" }}>Who you&apos;ll be <span style={{ color: "#FF7A36" }}>dealing with.</span></h2>
              <p className="sbx__lede">Not a call centre or a franchise. Two directors in the business every day, and a team driving out from Sierra Circuit{home ? "" : ` to ${sub.name}`}. If anything about your job isn&apos;t right, ask for either director by name.</p>
            </div>
            <div className="sechead__btns">
              <Link href="/about" className="abtn abtn--line">More about us</Link>
            </div>
          </div>
          <div className="sbx__people">
            {DIRECTORS.map((d) => (
              <article key={d.name} className="sbx__person arv">
                <span className="sbx__pphoto"><Image src={d.photo} alt={`${d.name}, ${d.role}`} fill sizes="(max-width: 700px) 100vw, 380px" /></span>
                <div><h3>{d.name}</h3><small>{d.role}</small><p>{d.about}</p></div>
              </article>
            ))}
            <article className="sbx__person sbx__person--office arv">
              <span className="sbx__pphoto"><Image src={OFFICE.photo} alt={`${OFFICE.name}, ${OFFICE.role}`} fill sizes="(max-width: 700px) 100vw, 380px" /></span>
              <div><h3>{OFFICE.name}</h3><small>{OFFICE.role}</small><p>{OFFICE.about}</p></div>
            </article>
          </div>
          <ul className="sbx__creds">
            {ACCREDITED.map(([k, v]) => <li key={v}><small>{k}</small><strong>{v}</strong></li>)}
            <li><small>Insured</small><strong>$20M public liability</strong></li>
            <li><small>Guaranteed</small><strong>6 years on our workmanship</strong></li>
          </ul>
        </div>
      </section>

      {/* ===== 6. REVIEWS: this suburb's first ===== */}
      <section id="reviews" className="revs">
        <div className="wrap revs__in">
          <div className="sechead arv" style={{ gap: 24 }}>
            <div className="sechead__t" style={{ gap: 14, maxWidth: 620 }}>
              <h2 className="h2">{local.length ? `What ${sub.name} households say.` : `What households around ${sub.name} say.`}</h2>
            </div>
            <div className="revs__score">
              <span className="stars stars--ink" style={{ letterSpacing: 4 }} aria-hidden="true">★★★★★</span>
              <span><strong>{rating} / 5</strong> from {summary.count} Google reviews</span>
              <Link href="/reviews">Read all reviews →</Link>
            </div>
          </div>
          <div className="revs__cols">
            {cols.map((list, c) => (
              <div key={c} className="arevcol">
                {/* Doubled so the upward scroll loops without a seam. The copy is hidden from screen readers. */}
                <div className={`revtrack revtrack--${c}`}>
                  {[...list, ...list].map((r, i) => (
                    <article key={i} className="rev" aria-hidden={i >= list.length ? true : undefined}>
                      <span className="stars stars--ink" aria-hidden="true">★★★★★</span>
                      <h3>{r.title}</h3>
                      <p>&ldquo;{r.txt}&rdquo;</p>
                      <div className="rev__who">
                        <span aria-hidden="true">{r.a}</span>
                        <span className="rev__whot"><strong>{r.who}</strong><small>{r.what}</small></span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
            <div className="revs__fade revs__fade--t" aria-hidden="true" />
            <div className="revs__fade revs__fade--b" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* ===== 7. THE MAP: the homepage's, opened on this suburb with the drive drawn ===== */}
      <ServiceArea
        suburbs={areaSuburbs()}
        focus={{
          slug: sub.slug,
          km: sub.distanceKm,
          title: home
            ? <>Where our workshop is: <span style={{ color: "#2CC5FF" }}>{sub.name}.</span></>
            : <>From our workshop to <span style={{ color: "#2CC5FF" }}>{sub.name}.</span></>,
          text: home
            ? `Sierra Circuit, Pakenham. Most ${sub.name} jobs are ${drive} from the van leaving the yard, and everywhere within 50 km is our area.`
            : outer
              ? `${sub.distanceKm} km from Sierra Circuit, about ${drive} each way. Inside our area, but far enough that we come to ${sub.name} for booked work rather than a 2 am emergency.`
              : `${sub.distanceKm} km from Sierra Circuit, usually ${drive} in the van, ${sub.distanceKm <= 30 ? "well inside" : "inside"} the 50 km we cover.`,
        }}
      />

      {/* ===== 8. EVERY WAY TO REACH US, and the questions people from here ask ===== */}
      <section id="contact" className="hfaq">
        <div className="wrap hfaq__in">
          <div className="hfaq__intro arv">
            <h2 className="h2">Talk to us about your <span style={{ color: "#C2521A" }}>{sub.name}</span> job.</h2>
            <p>Whichever suits you. You&apos;ll get someone who works here, not a call centre.</p>
            <ul className="sbx__ways">
              <li>
                <a href="tel:+61359478000" data-call-from="suburb-contact">
                  <small>Call</small><strong>(03) 5947 8000</strong><span>{hours}{outer ? "" : ". After hours for gas leaks and no hot water."}</span>
                </a>
              </li>
              <li>
                <a href="#quote">
                  <small>Free quote</small><strong>Tell us about the job</strong><span>A written price back within 12 business hours.</span>
                </a>
              </li>
              <li>
                <a href={`mailto:${site.email}?subject=${encodeURIComponent(`A job in ${sub.name}`)}`}>
                  <small>Email</small><strong>{site.email}</strong><span>Photos of the old unit and its label help us price it.</span>
                </a>
              </li>
              <li>
                <span className="sbx__waysp">
                  <small>Workshop</small><strong>1 Sierra Circuit, Pakenham</strong><span>{home ? "Right here in Pakenham." : `${drive} from ${sub.name}.`}</span>
                </span>
              </li>
            </ul>
            {nearby.length > 0 && (
              <div className="sbx__near">
                <span>Also nearby</span>
                <div className="hfaq__links">
                  {nearby.map((s) => s.published ? <Link key={s.slug} className="glink" href={`/areas/${s.slug}`}>{s.name}</Link> : <span key={s.slug} className="sbx__plain">{s.name}</span>)}
                </div>
              </div>
            )}
          </div>
          <div className="sbx__faqs">
            <h3 className="sbx__sub">{sub.name} questions, answered</h3>
            <div className="afaqs">
              {faqs.map((f, i) => (
                <details key={f.q} className="afaq" open={i === 0}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="wrap ctabox">
        <div className="ctabox__in arv">
          <Image src={PHOTO.vans} alt="" aria-hidden="true" fill sizes="(max-width: 1280px) 100vw, 1216px" />
          <div className="ctabox__tint" aria-hidden="true" />
          <div className="ctabox__body">
            <div className="ctabox__t">
              <h2>Let&apos;s get your {sub.name} job done properly.</h2>
              <p>A free written quote with the VEU rebate already applied, usually back to you within 12 business hours. The price only changes if the job does, and you approve it before we start.</p>
            </div>
            <div className="sechead__btns">
              <a href="#quote" className="abtn abtn--navy">Get a quote →</a>
              <a href="tel:+61359478000" data-call-from="suburb-cta-box" className="abtn abtn--white">Call (03) 5947 8000</a>
            </div>
          </div>
        </div>
      </section>

      <JsonLd data={crumbs} />
      <JsonLd data={suburbServiceSchema(sub)} />
      <JsonLd data={faqSchema(faqs)} />
    </div>
    </>
  );
}
