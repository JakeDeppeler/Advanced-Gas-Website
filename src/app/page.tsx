import { TITLE_SUFFIX } from "@/lib/seo";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { Suspense } from "react";
import { getReviews } from "@/lib/googleReviews";
import { faqSchema } from "@/lib/schema";
import { HOME_FAQS, PHOTO, SERVICES, SHOW_FINANCE } from "@/lib/homepage/data";
import { areaSuburbs } from "@/lib/homepage/areas";
import { HomeHeader, PhoneIcon } from "@/components/homepage/HomeHeader";
import { HeroQuote, Svg } from "@/components/homepage/HeroQuote";
import { Finder } from "@/components/homepage/Finder";
import { ServiceArea } from "@/components/homepage/ServiceArea";
import { HomeFooter } from "@/components/homepage/HomeFooter";
import { IntentFromUrl } from "@/components/homepage/IntentFromUrl";
import "@/components/homepage/homepage.css";

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

const BRANDS: [string, string, string][] = [
  ["Reclaim", "Heat pumps", "/brands/reclaim"],
  ["iStore", "Heat pumps", "/brands/istore"],
  ["Thermann", "Hot water", "/brands/thermann"],
  ["Mitsubishi", "Electric aircon", "/brands/mitsubishi-electric"],
  ["Kaden", "Aircon", "/brands/kaden"],
  ["Zonemate", "Zoning", "/brands/zonemate"],
  ["Brivis", "Gas ducted", "/brands/brivis"],
];

const faqs = HOME_FAQS.filter((f) => SHOW_FINANCE || !f.finance);

const col = { display: "flex", flexDirection: "column", gap: 4 } as const;

export default async function HomePage() {
  // Live 4★+ Google reviews, falling back to the curated list in
  // lib/reviews.ts when the Places API isn't configured.
  const { reviews, summary } = await getReviews(12);
  const cols = [0, 1, 2].map((r) => reviews.filter((_, i) => i % 3 === r));
  const rating = summary.value.toFixed(1);
  const suburbs = areaSuburbs();

  return (
    <div className="ag" id="top" data-no-reveal>
      {/* ===== HERO ===== */}
      <section className="ahero">
        {/* A real <img> with priority rather than a CSS background: it is the LCP element. */}
        <Image src={PHOTO.team} alt="" aria-hidden="true" fill priority sizes="100vw" className="ahero__bg" />
        <div className="ahero__scrim" aria-hidden="true" />
        <HomeHeader />
        <div className="wrap ahero__in">
          <div className="ahero__copy anim">
            <h1 className="ahero__h1">One standard.<br /><span>Every job.</span></h1>
            <p className="ahero__p">
              A local Pakenham team looking after heating, cooling, gas and hot water across Melbourne&apos;s south-east and Gippsland. Our own crews, twelve years on the tools, and the same high standard every time.
            </p>
            <div className="ahero__ctas">
              <a href="#find" className="abtn abtn--or">Find your system →</a>
              <a href="tel:+61359478000" data-call-from="hero" className="abtn abtn--line abtn--call"><PhoneIcon />Call (03) 5947 8000</a>
            </div>
            <div className="ahero__trust">
              <span className="ahero__stars">
                <span className="stars" aria-hidden="true">★★★★★</span>
                <span style={{ display: "flex", flexDirection: "column" }}><strong>{rating} / 5</strong><small>Google reviews</small></span>
              </span>
              <span className="ahero__sep" aria-hidden="true" />
              <span><strong>1,200+</strong><small>installs done</small></span>
              <span className="ahero__sep" aria-hidden="true" />
              <Link href="/rebates"><strong>Up to $2,700 →</strong><small>See if you qualify</small></Link>
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
            {BRANDS.map(([n, s, h]) => (
              <Link key={n} className="chipb" href={h}><strong>{n}</strong><span>{s}</span></Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FIND YOUR SYSTEM ===== */}
      <Finder />

      {/* ===== WHY CHOOSE US ===== */}
      <section id="why" className="awhy">
        <span className="glow awhy__glow1" aria-hidden="true" />
        <span className="glow awhy__glow2" aria-hidden="true" />
        <div className="wrap awhy__in">
          <div className="sechead arv">
            <div className="sechead__t">
              <h2 className="h2" style={{ color: "#fff" }}>The same crew, the same standard, <span style={{ color: "#FF7A36" }}>every job.</span></h2>
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
                <span className="whycard__lbl" style={{ color: "#FF7A36" }}>Directly employed</span>
                <strong className="disp" style={{ fontSize: "clamp(26px, 2.6vw, 36px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-.02em" }}>Our own crews. Never subbies.</strong>
                <span style={{ fontSize: 15, lineHeight: 1.55, color: "rgba(255,255,255,.85)", maxWidth: "30rem" }}>The person who quotes your job is on the same team as the person who installs it.</span>
              </div>
            </div>
            <div className="whycard whycard--or arv">
              <strong className="whycard__big">12 yrs</strong>
              <span style={{ fontSize: 15, lineHeight: 1.45 }}>On the tools across Pakenham and the south-east.</span>
            </div>
            <div className="whycard whycard--sky arv">
              <strong className="whycard__big">6 yrs</strong>
              <span style={{ fontSize: 15, lineHeight: 1.45, fontWeight: 600 }}>Workmanship warranty on every install.</span>
            </div>
            <div className="whycard whycard--white arv">
              <span className="whycard__ico" style={{ background: "#FDEEE6", color: "#B04711" }}>
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
              </span>
              <div style={col}><strong className="whycard__t">Price in writing</strong><span className="whycard__s">It only changes if the job does, and you approve it first.</span></div>
            </div>
            <div className="whycard whycard--white arv">
              <span className="stars stars--ink" style={{ letterSpacing: 3, fontSize: 18 }} aria-hidden="true">★★★★★</span>
              <div style={col}><strong className="whycard__t">{rating} on Google</strong><span className="whycard__s">From {summary.count} reviews by local households.</span></div>
            </div>
            <div className="whycard whycard--wide arv">
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <span className="whycard__lbl" style={{ color: "#B04711" }}>VEU accredited</span>
                <strong className="disp" style={{ fontSize: 22, fontWeight: 800, color: "#050A30", lineHeight: 1.15 }}>Rebate taken off at the quote, not claimed back later.</strong>
                <Link href="/tools/veu-rebate-estimator" style={{ fontSize: 14, fontWeight: 700, color: "#B04711", textUnderlineOffset: 3 }}>Estimate your rebate →</Link>
              </div>
              <strong className="disp" style={{ fontSize: "clamp(34px, 3.4vw, 48px)", fontWeight: 900, color: "#C2521A", letterSpacing: "-.03em", whiteSpace: "nowrap" }}>$2,700</strong>
            </div>
            <div className="whycard whycard--white arv">
              <span className="whycard__ico" style={{ background: "#E6F5FC", color: "#0C6F96" }}><Svg d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 12l2 2 4-4" size={22} width={1.8} /></span>
              <div style={col}><strong className="whycard__t">Certified in 24 hrs</strong><span className="whycard__s">Compliance certificate emailed the day after install.</span></div>
            </div>
            <div className="whycard whycard--white arv">
              <span className="whycard__ico" style={{ background: "#050A30", color: "#fff" }}>
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              </span>
              <div style={col}><strong className="whycard__t">24/7 emergencies</strong><span className="whycard__s">After hours goes to someone on the tools.</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SERVICES ===== */}
      <section id="services" className="svcs">
        <div className="wrap svcs__in">
          <div className="svcs__head arv">
            <div className="sechead__t">
              <h2 className="h2">Everything we do, <span style={{ color: "#C2521A" }}>under one roof.</span></h2>
            </div>
            <p>Installs, servicing and repairs for homes and businesses across the south-east. Same crew and the same standard, whichever job it is.</p>
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
              return v.href.startsWith("tel:") ? (
                <a key={v.t} href={v.href} data-call-from="services-card" className="sg__card arv" style={style}>{body}</a>
              ) : (
                <Link key={v.t} href={v.href} className="sg__card arv" style={style}>{body}</Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== SERVICE AREA ===== */}
      <ServiceArea suburbs={suburbs} />

      {/* ===== REVIEWS ===== */}
      <section id="reviews" className="revs">
        <div className="wrap revs__in">
          <div className="sechead arv" style={{ gap: 24 }}>
            <div className="sechead__t" style={{ gap: 14, maxWidth: 620 }}>
              <h2 className="h2">Reviews from real Pakenham, Berwick &amp; Officer households.</h2>
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

      {/* ===== FAQ ===== */}
      <section id="faq" className="hfaq">
        <div className="wrap hfaq__in">
          <div className="hfaq__intro arv">
            <h2 className="h2">Heat pumps, rebates &amp; the fine print.</h2>
            <p>Quick honest answers. Still want a human? <a href="tel:+61359478000" data-call-from="faq" style={{ color: "#050A30", textUnderlineOffset: 2 }}>Call (03) 5947 8000</a>.</p>
            <div className="hfaq__links">
              <Link className="glink" href="/rebates">VEU rebate explained</Link>
              <Link className="glink" href="/upgrade-or-repair">Repair or replace?</Link>
              <Link className="glink" href="/blog">Blog &amp; guides</Link>
            </div>
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
              <h2>Let&apos;s get your job done properly.</h2>
              <p>A free written quote with the VEU rebate already applied, usually back to you within 12 business hours. The price only changes if the job does, and you approve it before we start.</p>
            </div>
            <div className="sechead__btns">
              <a href="#quote" className="abtn abtn--navy">Get a quote →</a>
              <a href="tel:+61359478000" data-call-from="cta-box" className="abtn abtn--white">Call (03) 5947 8000</a>
            </div>
          </div>
        </div>
      </section>

      <HomeFooter />

      <Suspense fallback={null}>
        <IntentFromUrl />
      </Suspense>

      <Script id="ld-home-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(faqs)) }} />
    </div>
  );
}
