import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { site } from "@/lib/site";
import { publishedSuburbs, suburbs } from "@/lib/suburbs";
import { breadcrumbSchema, suburbServiceSchema } from "@/lib/schema";
import { seoMeta } from "@/lib/seo";
import { suburbJobs, suburbReviews } from "@/lib/suburbJobs";
import Image from "next/image";
import { getReviews } from "@/lib/googleReviews";
import { faqSchema } from "@/lib/schema";
import { HOME_BRANDS, PHOTO, SERVICES } from "@/lib/homepage/data";
import { HeroQuote } from "@/components/homepage/HeroQuote";
import { ServiceArea } from "@/components/homepage/ServiceArea";
import { areaSuburbs } from "@/lib/homepage/areas";
import { PhoneIcon } from "@/components/homepage/HomeHeader";
import { Crumbs } from "@/components/homepage/page/kit";
import "@/components/homepage/homepage.css";
import "@/components/homepage/page/suburb.css";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
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
 * A suburb page, built like the homepage (Jake, Nov 2026: "more personal
 * and more like the home page"): the photo hero with the quote form beside
 * it, the brands strip, the navy "why us" grid, the service photo cards,
 * the scrolling reviews, FAQs and the photo quote box, each one filled from
 * this suburb's record in lib/suburbs.ts rather than the homepage's
 * whole-region lines.
 *
 * Nothing here is new about a suburb: every fact is a field of its record
 * (drive time, council, what we install there, the estates, the problems),
 * and a field the record doesn't have hides its card or question rather
 * than being filled in. The outer ring keeps its honest wording throughout.
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

  const jobs = suburbJobs(sub);
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

  // The questions people from here actually ask, answered from the record.
  const faqs = [
    {
      q: `Do you come out to ${sub.name}?`,
      a: outer
        ? `Yes, for booked work. ${sub.name} is about ${sub.distanceKm} km from our Pakenham workshop, ${drive} each way, so we're the right call for a planned install or service and the wrong one for a 2 am emergency.`
        : home
          ? `It's where our workshop is: Sierra Circuit, Pakenham. Most ${sub.name} jobs are ${drive} from the van leaving the yard.`
          : `Every week. ${sub.name} is ${sub.distanceKm} km from our Pakenham workshop, usually ${drive} in the van, and the crew that comes out is our own, never a subcontractor.`,
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
    <div className="ag sbx" data-no-reveal>
      <Crumbs trail={[{ name: "Service areas", href: "/service-areas" }, { name: sub.name }]} />

      {/* ===== HERO: the homepage's, with this suburb in it ===== */}
      <section className="ahero">
        <Image src={PHOTO.team} alt="" aria-hidden="true" fill priority sizes="100vw" className="ahero__bg" />
        <div className="ahero__scrim" aria-hidden="true" />
        <div className="wrap ahero__in">
          <div className="ahero__copy anim">
            <span className="sbx__eye">{sub.name} · VIC {sub.postcode} · {sub.council}</span>
            <h1 className="ahero__h1 sbx__h1">Air con, heating &amp; hot water <span>in {sub.name}.</span></h1>
            <p className="ahero__p">
              {/* The outer ring gets the honest version: we travel there for
                  booked work, and say so rather than claim to be around the
                  corner. See `outerRing` in lib/suburbs.ts. */}
              {outer
                ? `We travel to ${sub.name} from Pakenham for booked work, about ${drive} each way. That makes us the right call for a planned install and the wrong one for a 2 am emergency, and we'd rather say so up front.`
                : `Licensed plumbing and refrigeration team working in ${sub.name} since 2014. You'll usually find us ${sub.landmark}.`}
            </p>
            <div className="ahero__ctas">
              <a href="#local" className="abtn abtn--or">What we do in {sub.name} →</a>
              <a href="tel:+61359478000" data-call-from="suburb-hero" className="abtn abtn--line abtn--call"><PhoneIcon />Call (03) 5947 8000</a>
            </div>
            <div className="ahero__trust">
              <span className="ahero__stars">
                <span className="stars" aria-hidden="true">★★★★★</span>
                <span style={{ display: "flex", flexDirection: "column" }}><strong>{rating} / 5</strong><small>Google reviews</small></span>
              </span>
              <span className="ahero__sep" aria-hidden="true" />
              <span><strong>{drive}</strong><small>{home ? "from our workshop" : `from our workshop to ${sub.name}`}</small></span>
              <span className="ahero__sep" aria-hidden="true" />
              <Link href="/rebates"><strong>Up to $6,000 →</strong><small>See if you qualify</small></Link>
            </div>
          </div>
          <HeroQuote />
        </div>
      </section>

      {/* ===== AUTHORISED INSTALLER ===== */}
      <section className="hbrands">
        <div className="wrap hbrands__in arv">
          <div className="hbrands__top">
            <span>Authorised installer of</span>
            <span className="hbrands__rule" aria-hidden="true" />
            <span className="hbrands__reece">Trade partner of <strong>Reece</strong></span>
            <Link href="/brands" className="hbrands__all">All brands →</Link>
          </div>
          <div className="hbrands__grid">
            {HOME_BRANDS.map(([n, s, h]) => <Link key={n} className="chipb" href={h}><strong>{n}</strong><span>{s}</span></Link>)}
          </div>
        </div>
      </section>

      {/* ===== YOUR LOCAL CREW: the homepage's "why us" grid, about here ===== */}
      <section id="local" className="awhy">
        <div className="wrap awhy__in">
          <div className="sechead arv">
            <div className="sechead__t">
              <h2 className="h2" style={{ color: "#fff" }}>
                {outer ? <>Booked work in {sub.name}, <span style={{ color: "#FF7A36" }}>done properly.</span></> : <>Your local crew in <span style={{ color: "#FF7A36" }}>{sub.name}.</span></>}
              </h2>
            </div>
            <div className="sechead__btns">
              <Link href="/about" className="abtn abtn--line">Meet the team</Link>
              <a href="#quote" className="abtn abtn--or">Get a free quote →</a>
            </div>
          </div>
          <div className="whygrid">
            <div className="whycard whycard--big arv">
              <Image src={PHOTO.whyBig} alt="" aria-hidden="true" fill sizes="(max-width: 960px) 100vw, 640px" />
              <div className="shade" aria-hidden="true" />
              <div className="body">
                <span className="whycard__lbl" style={{ color: "#FF7A36" }}>{outer ? "Planned installs" : home ? "Home ground" : `Working in ${sub.name} since 2014`}</span>
                <strong className="disp sbx__bigt">{outer ? "The same crew, wherever the job is." : home ? "Our workshop is here." : `We know ${sub.name}.`}</strong>
                <span className="sbx__bigp">{sub.whyLocal ?? `You'll usually find us ${sub.landmark}. The person who quotes your job is on the same team as the person who installs it.`}</span>
              </div>
            </div>
            <div className="whycard whycard--or arv">
              <strong className="whycard__big sbx__fit">{drive}</strong>
              <span style={{ fontSize: 15, lineHeight: 1.45 }}>{home ? "From our Sierra Circuit workshop to the job." : `From our Pakenham workshop to ${sub.name}, ${sub.distanceKm} km.`}</span>
            </div>
            <div className="whycard whycard--sky arv">
              <strong className="whycard__big">12 hrs</strong>
              <span style={{ fontSize: 15, lineHeight: 1.45, fontWeight: 600 }}>To a written quote for your {sub.name} job.</span>
            </div>
            <div className="whycard whycard--white arv">
              <span className="whycard__ico"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" /></svg></span>
              <div className="sbx__col"><strong className="whycard__t">{sub.council}</strong><span className="whycard__s">Permits and compliance certificates handled in-house.</span></div>
            </div>
            <div className="whycard whycard--white arv">
              <span className="stars stars--ink" style={{ letterSpacing: 3, fontSize: 18 }} aria-hidden="true">★★★★★</span>
              <div className="sbx__col"><strong className="whycard__t">{rating} on Google</strong><span className="whycard__s">{local.length ? `Including ${sub.name} households, from ${summary.count} reviews.` : `From ${summary.count} reviews by local households.`}</span></div>
            </div>
            <div className="whycard whycard--wide arv">
              <div className="sbx__col" style={{ gap: 6, flex: 1 }}>
                <span className="whycard__lbl" style={{ color: "#B04711" }}>{outer ? `Usual jobs in ${sub.name}` : `Most common in ${sub.name}`}</span>
                <strong className="disp sbx__widet">{cap(sub.commonInstall)}.</strong>
                {jobs.length > 0 && (
                  <span className="sbx__jobs">{jobs.map((j) => <Link key={j.href} href={j.href}>{j.label}</Link>)}</span>
                )}
              </div>
            </div>
            <div className="whycard whycard--white arv">
              <span className="whycard__ico"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg></span>
              <div className="sbx__col"><strong className="whycard__t">Price in writing</strong><span className="whycard__s">It only changes if the job does, and you approve it first.</span></div>
            </div>
            <div className="whycard whycard--white arv">
              <span className="whycard__ico"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 12l2 2 4-4" /></svg></span>
              <div className="sbx__col"><strong className="whycard__t">6-year workmanship</strong><span className="whycard__s">On every install, on top of the maker&apos;s warranty.</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ON THE TOOLS HERE, with the map ===== */}
      <section className="sbx__tools">
        <div className={`wrap sbx__two${sub.testimonial || sub.knownEstates ? "" : " sbx__two--one"}`}>
          <div className="sbx__toolst arv">
            <h2 className="h2">{outer ? "What we get called out for in " : "What we see on the tools in "}<span>{sub.name}.</span></h2>
            <p>{cap(sub.housingStock)}.</p>
            {sub.commonProblems?.length ? (
              <ol className="sbx__list">
                {sub.commonProblems.map((p, i) => <li key={p}><b aria-hidden="true">{String(i + 1).padStart(2, "0")}</b><span>{p}</span></li>)}
              </ol>
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

      {/* ===== SERVICES: the homepage's photo cards ===== */}
      <section id="services" className="svcs">
        <div className="wrap svcs__in">
          <div className="svcs__head arv">
            <div className="sechead__t">
              <h2 className="h2">Everything we do in {sub.name}, <span style={{ color: "#C2521A" }}>under one roof.</span></h2>
            </div>
            <p>Installs, servicing and repairs. The same crew and the same standard, whichever job it is.</p>
          </div>
          <div className="sg">
            {SERVICES.map((v, i) => {
              const body = (
                <>
                  <Image src={v.photo} alt={v.alt} fill sizes="(max-width: 600px) 100vw, (max-width: 960px) 50vw, 420px" style={{ objectPosition: v.pos }} />
                  <span className="sg__shade" aria-hidden="true" />
                  <span className="sg__body">
                    <strong>{v.t}</strong>
                    <span className="sg__more"><span>{v.s}</span><em>{v.cta} →</em></span>
                  </span>
                </>
              );
              const style = { animationDelay: `${i * 0.07}s` };
              return v.href.startsWith("tel:")
                ? <a key={v.t} href={v.href} data-call-from="suburb-services-card" className="sg__card arv" style={style}>{body}</a>
                : <Link key={v.t} href={v.href} className="sg__card arv" style={style}>{body}</Link>;
            })}
          </div>
        </div>
      </section>

      {/* ===== THE MAP: the homepage's, opened on this suburb with the drive drawn ===== */}
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

      {/* ===== REVIEWS: this suburb's first ===== */}
      <section id="reviews" className="revs">
        <div className="wrap revs__in">
          <div className="sechead arv" style={{ gap: 24 }}>
            <div className="sechead__t" style={{ gap: 14, maxWidth: 620 }}>
              <h2 className="h2">{local.length ? `Reviews from ${sub.name} and around it.` : `Reviews from households around ${sub.name}.`}</h2>
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

      {/* ===== FAQ: about here ===== */}
      <section id="faq" className="hfaq">
        <div className="wrap hfaq__in">
          <div className="hfaq__intro arv">
            <h2 className="h2">{sub.name} questions, answered.</h2>
            <p>Still want a human? <a href="tel:+61359478000" data-call-from="suburb-faq" style={{ color: "#050A30", textUnderlineOffset: 2 }}>Call (03) 5947 8000</a>.</p>
            {nearby.length > 0 && (
              <div className="sbx__near">
                <span>Also nearby</span>
                <div className="hfaq__links">
                  {nearby.map((s) => s.published ? <Link key={s.slug} className="glink" href={`/areas/${s.slug}`}>{s.name}</Link> : <span key={s.slug} className="sbx__plain">{s.name}</span>)}
                </div>
                <Link className="glink" href="/service-areas">Every suburb we cover</Link>
              </div>
            )}
          </div>
          <div className="afaqs">
            {faqs.map((f, i) => (
              <details key={f.q} className="afaq" open={i === 0}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
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
  );
}
