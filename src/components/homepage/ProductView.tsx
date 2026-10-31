"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  findSystem, galleryFor, specRows, answersFrom, answersQuery, findHref, bookHref, productHref, money, weekly,
  isHeatPump, isNewBuildHeatPump, PRODUCT_FAQS, SPEC_NOTE, SHOW_FINANCE, FINANCE_MONTHS, TONES, WORKMANSHIP,
  reviewTitle, modelForAnswer, installTime as installTimeOf, type Answers,
} from "@/lib/homepage/data";
import type { Review } from "@/lib/reviews";
import type { Badge } from "@/lib/homepage/badges";

/** A catalogue model behind this option, resolved on the server from lib/brands.ts. */
export type PModel = {
  slug: string; chip: string; name: string; code: string; bestFor?: string; room?: string; href: string;
  specs: { label: string; value: string }[];
  /** Our own two lines on this size, from the catalogue's ourTake. */
  take?: string;
  /** Only the badges this model's record actually states. */
  badges: Badge[];
  /** The figures that change between sizes, for the Model card. */
  keys: { label: string; value: string }[];
};
export type PBrand = { name: string; page?: string; site?: { label: string; href: string } };

const FINS = [{ t: "Pay upfront", m: 0 }, { t: "24 months", m: 24 }, { t: "36 months", m: 36 }, { t: "60 months", m: 60 }];

/**
 * One option from the finder, as a page of its own so it can be shared and
 * indexed. The answers ride along in the query string (?size=1&floor=0…);
 * the page renders without them too, for anyone who lands here from search.
 */
export function ProductView({ system, tier: tierSlug, reviews, rating, count, models, brand, hero, tierBadges }: {
  system: string; tier: string; reviews: Review[]; rating: string; count: number; models: PModel[]; brand: PBrand | null;
  hero: { src: string; alt: string; pos: string; ours: boolean };
  /** Badges the option states itself (Wi-Fi in its feature list), for options with no catalogue model. */
  tierBadges: Badge[];
}) {
  const ref = findSystem(system)!;
  const { cat, sys } = ref;
  const ti = sys.tiers.findIndex((t) => t.slug === tierSlug);
  const t = sys.tiers[ti];

  const [ans, setAns] = useState<Answers>({});
  const [gi, setGi] = useState(0);
  const [fin, setFin] = useState(2);
  // The model they picked here, or arrived with in ?model=. Until then the
  // size they gave in the finder chooses one.
  const [picked, setPicked] = useState<string | null>(null);
  // The bottom "Book this install" bar waits until the hero, which has its
  // own book card, is off the screen; on top of the hero it covered it.
  const heroRef = useRef<HTMLElement>(null);
  const [pastHero, setPastHero] = useState(false);
  useEffect(() => {
    const el = heroRef.current;
    if (!el || typeof IntersectionObserver === "undefined") { setPastHero(true); return; }
    const io = new IntersectionObserver(([e]) => setPastHero(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Changing the size keeps the URL in step, so a shared link shows what they saw.
  function syncUrl(a: Answers, model: string | null) {
    const qs = answersQuery(sys, a);
    const q = [qs, model ? `model=${model}` : ""].filter(Boolean).join("&");
    window.history.replaceState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}`);
  }
  function setSize(i: number) {
    const next = { ...ans, size: i };
    setAns(next);
    syncUrl(next, picked);
  }
  function pickModel(slug: string) {
    setPicked(slug);
    syncUrl(ans, slug);
  }

  const gal = galleryFor(sys, t);
  const g = Math.min(gi, gal.length - 1);
  const cur = gal[g];
  const known = typeof t.price === "number";
  const size = ans.size != null ? sys.sizes[ans.size] : null;
  const feats = t.feats.filter((f) => f !== WORKMANSHIP);
  const hp = isHeatPump(sys);
  const others = sys.tiers.map((x, i) => [x, i] as const).filter(([, i]) => i !== ti);

  const mi = Math.max(0, picked ? models.findIndex((m) => m.slug === picked) : modelForAnswer(models, size?.spec));
  const model = models[mi] ?? null;
  const book = bookHref(sys, t, ans, model?.slug);
  const badges = model ? model.badges : tierBadges;
  // The figures beside "Model": the model's own, or the size they picked.
  const modelKeys = model
    ? model.keys
    : size ? [{ label: "Typical size", value: size.spec ?? size.label }] : [];

  function showPhoto(i: number) {
    setGi(i);
    document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="pp" id="product">
      <Suspense fallback={null}><AnswersFromUrl system={system} onAnswers={(a, m) => { setAns(a); if (m && models.some((x) => x.slug === m)) setPicked(m); }} /></Suspense>
      {/* Breadcrumbs on a light grey bar under the header, as a manufacturer's page has them. */}
      <nav className="ppx__crumbbar" aria-label="Breadcrumb">
        <div className="wrap ppx__crumbin">
          <ol className="pp__crumbs">
            <li><Link href="/">Home</Link></li>
            <li><Link href={`/?find=${cat.id}#find`}>{cat.label}</Link></li>
            <li><Link href={`/?find=${sys.slug}#find`}>{sys.label}</Link></li>
            <li aria-current="page">{t.brand} {t.model}</li>
          </ol>
          <Link href={findHref(sys, ans)} className="ppx__back">← Back to your options</Link>
        </div>
      </nav>

      <section className="ppx__hero" ref={heroRef}>
        <div className="ppx__photo">
          <Image src={hero.src} alt={hero.alt} fill priority sizes="100vw" style={{ objectPosition: hero.pos }} />
          <span className="ppx__scrim" aria-hidden="true" />
          {hero.ours && <span className="ppx__cap">One of our installs</span>}
          <div className="wrap ppx__title">
            <span className="ppx__brand">{t.brand} · {t.tier} option</span>
            <h1 className="ppx__h1">{t.model}</h1>
          </div>
        </div>

        <div className="wrap ppx__low">
          <div className="ppx__left">
            {badges.length > 0 && (
              <ul className="ppx__badges" aria-label="At a glance">
                {badges.map((b) => (
                  <li key={b.kind} className={`ppx__badge ppx__badge--${b.kind}`}><strong>{b.big}</strong><span>{b.small}</span></li>
                ))}
              </ul>
            )}

            <div className="ppx__card">
              {/* The size's own "ideal for" line, so it changes with the tab and
                  can't contradict the figures in the Model card below. */}
              <h2 className="ppx__head">{model?.bestFor ?? feats[0] ?? sys.sub}</h2>
              <p className="ppx__desc">{model?.take ? firstLines(model.take) : `${sys.sub}. ${feats.slice(1).join(". ")}`}</p>
              <div className="ppx__thumbs">
                {gal.map((x, i) => (
                  <button key={x.src} type="button" className={`ppx__thumb${x.kind === "p" ? " ppx__thumb--prod" : ""}`} onClick={() => showPhoto(i)} aria-label={`See photo ${i + 1}: ${x.alt}`}>
                    <Image src={x.src} alt="" fill sizes="64px" />
                  </button>
                ))}
              </div>
              <div className="ppx__price">
                <strong>{known ? `From ${money(t.price!)}` : "Priced at your site check"}</strong>
                <span>{known ? `installed, includes GST${hp ? " and the VEU rebate" : ""}` : "Free site check, then a fixed price in writing"}</span>
              </div>
              {isNewBuildHeatPump(sys, ans) && (
                <p className="find__veu" style={{ margin: 0 }}>The VEU rebate is for replacing an existing gas or electric system, so it usually won&apos;t apply to a new build. We&apos;ll confirm at the site check.</p>
              )}
            </div>

            <div className="ppx__model">
              <div className="ppx__modelhead">
                <span className="ppx__modellbl" id="pm-size">{models.length ? "Model" : sys.q.replace("?", "")}</span>
                <dl className="ppx__keys" aria-live="polite">
                  {modelKeys.map((k) => <div key={k.label}><dt>{k.label}</dt><dd>{k.value}</dd></div>)}
                </dl>
              </div>
              <div className="ppx__tabs" role="group" aria-labelledby="pm-size">
                {models.length > 0
                  ? models.map((m, i) => (
                    <button key={m.slug} type="button" className={`ppx__tab${i === mi ? " ppx__tab--on" : ""}`} onClick={() => pickModel(m.slug)} aria-pressed={i === mi}>{m.chip}</button>
                  ))
                  : sys.sizes.map((z, i) => (
                    <button key={z.label} type="button" className={`ppx__tab${i === ans.size ? " ppx__tab--on" : ""}`} onClick={() => setSize(i)} aria-pressed={i === ans.size}>{z.label}</button>
                  ))}
              </div>
              {model && (
                <div className="ppx__modelfoot">
                  <span>{model.code}</span>
                  <Link href={model.href}>Full {model.code} details →</Link>
                </div>
              )}
            </div>
          </div>

          <div className="ppx__acts">
            <Link href={book} className="ppx__act ppx__act--book">
              <span className="ppx__actt"><small>Free site check, price in writing</small><strong>Book this install</strong></span>
              <i aria-hidden="true">→</i>
            </Link>
            <a href="tel:+61359478000" data-call-from="product-hero" className="ppx__act">
              <span className="ppx__actt"><small>Talk to our team</small><strong>Call (03) 5947 8000</strong></span>
              <i aria-hidden="true">→</i>
            </a>
          </div>
        </div>
      </section>

      {/* What the option includes, and the pay options when finance is on. */}
      <section className="ppx__inc">
        <div className="wrap ppx__incin">
          <ul className="pp__hl">
            {[...feats, "Free site check and a fixed price in writing"].map((f) => <li key={f}><span aria-hidden="true">✓</span>{f}</li>)}
          </ul>
          <div className="pp__trust">
            <span><b>6 yrs</b>workmanship warranty</span>
            <span><b>24 hrs</b>compliance certificate</span>
            <span><b>Fixed</b>price in writing</span>
          </div>
          {SHOW_FINANCE && (
            <div className="pm__fins">
              {FINS.map((f, i) => (
                <button key={f.t} type="button" className={`pm__fin${i === fin ? " pm__fin--on" : ""}`} onClick={() => setFin(i)} aria-pressed={i === fin}>
                  <span className="pm__radio" aria-hidden="true" />
                  <span className="pm__fint">{f.t}</span>
                  <strong>{known ? (f.m ? `$${weekly(t.price!, f.m)}/wk` : money(t.price!)) : f.m ? "Weekly on quote" : "At quote"}</strong>
                  <span className="pm__fins-s">{f.m ? "Brighte, subject to approval" : "Card, transfer or cash"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="pp__sec" id="gallery">
        <div className="wrap pp__two">
          <div className="pp__lead">
            <h2 className="h2 h2--sm">Photos</h2>
            <p>The {t.brand} {t.model}, and some of the installs we&apos;ve done.</p>
          </div>
          <div className="pp__gal">
            <div className={`pm__main${cur.kind === "p" ? " pm__main--prod" : ""}`}>
              <Image key={cur.src} src={cur.src} alt={cur.alt} fill sizes="(max-width: 900px) 100vw, 720px" />
              <span className="pm__count">{g + 1} / {gal.length}</span>
              {cur.kind === "c" && <span className="pm__cap">One of our installs</span>}
              {gal.length > 1 && (
                <>
                  <button type="button" className="pm__nav pm__nav--l" onClick={() => setGi((g - 1 + gal.length) % gal.length)} aria-label="Previous photo">←</button>
                  <button type="button" className="pm__nav pm__nav--r" onClick={() => setGi((g + 1) % gal.length)} aria-label="Next photo">→</button>
                </>
              )}
            </div>
            <div className="pm__thumbs">
              {gal.map((x, i) => (
                <button key={x.src} type="button" className={`pm__th${x.kind === "p" ? " pm__th--prod" : ""}${i === g ? " pm__th--on" : ""}`} onClick={() => setGi(i)} aria-label={`Photo ${i + 1}: ${x.alt}`} aria-pressed={i === g}>
                  <Image src={x.src} alt="" fill sizes="96px" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pp__sec">
        <div className="wrap pp__two">
          <div className="pp__lead">
            <span className="aeye"><i /> Specifications</span>
            <h2 className="h2 h2--sm">{model ? model.name : `${t.brand} ${t.model}`}</h2>
            <p>{model ? `${t.brand}'s published figures for the ${model.code}. The full spec sheet and manuals come with your written quote.` : SPEC_NOTE}</p>
          </div>
          <dl className="pp__specs" key={model?.slug ?? "range"}>
            {(model ? modelRows(model, cat.label, sys.label, installTimeOf(sys), size ? size.label + (size.spec ? ` (${size.spec})` : "") : null) : specRows(cat, sys, t, ans))
              .map((r) => <div key={r.k} className="pp__row"><dt>{r.k}</dt><dd>{r.v}</dd></div>)}
          </dl>
        </div>
      </section>

      <section className="pp__sec pp__sec--grey">
        <div className="wrap pp__col">
          <div className="pp__lead">
            <span className="aeye"><i /> Resources</span>
            <h2 className="h2 h2--sm">Everything about this one.</h2>
          </div>
          <div className="pres">
            {model && (
              <Link href={model.href} className="pres__card">
                <span className="pres__tag">Model page</span>
                <strong>{model.name}</strong>
                <span className="pres__go">Full details and specs <i aria-hidden="true">→</i></span>
              </Link>
            )}
            {brand?.page && (
              <Link href={brand.page} className="pres__card">
                <span className="pres__tag">Brand</span>
                <strong>Why we fit {brand.name}</strong>
                <span className="pres__go">Our honest take <i aria-hidden="true">→</i></span>
              </Link>
            )}
            {brand?.site && (
              <a href={brand.site.href} target="_blank" rel="noopener noreferrer" className="pres__card">
                <span className="pres__tag">Manufacturer</span>
                <strong>{brand.name} website</strong>
                <span className="pres__go">Brochures and manuals <i aria-hidden="true">↗</i></span>
              </a>
            )}
            <Link href={book} className="pres__card">
              <span className="pres__tag">Spec sheet</span>
              <strong>Spec sheet &amp; manuals</strong>
              <span className="pres__go">Sent with your written quote <i aria-hidden="true">→</i></span>
            </Link>
            <div className="pres__card pres__card--plain">
              <span className="pres__tag">Warranty</span>
              <strong>Manufacturer warranty + 6 years on our work</strong>
              <span className="pres__go">Compliance certificate within 24 hours</span>
            </div>
          </div>
        </div>
      </section>

      <section className="pp__sec pp__sec--sky">
        <div className="wrap pp__two">
          <div className="pp__lead">
            <span className="aeye"><i /> Questions about this one</span>
            <h2 className="h2 h2--sm">Before you book.</h2>
            <p>Still want a human? <a href="tel:+61359478000" data-call-from="product-faq" style={{ color: "#050A30" }}>Call (03) 5947 8000</a>.</p>
          </div>
          <div className="afaqs">
            {PRODUCT_FAQS[sys.faq].map((f) => <details key={f.q} className="afaq"><summary>{f.q}</summary><p>{f.a}</p></details>)}
          </div>
        </div>
      </section>

      <section className="pp__sec">
        <div className="wrap pp__col">
          <div className="pp__revhead">
            <div className="pp__lead">
              <span className="aeye"><i /> Reviews</span>
              <h2 className="h2 h2--sm">{reviewTitle(sys.faq)}</h2>
            </div>
            <Link href="/reviews">{rating} / 5 from {count} Google reviews · Read all →</Link>
          </div>
          <div className="pp__revs">
            {reviews.map((r) => (
              <article key={r.who + r.title} className="rev">
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
      </section>

      <section className="pp__sec pp__sec--cream">
        <div className="wrap pp__col" style={{ gap: 18 }}>
          <h2 className="h2" style={{ fontSize: "clamp(26px, 2.6vw, 34px)" }}>Compare the other options</h2>
          <div className="pm__othergrid">
            {others.map(([o, i]) => (
              <Link key={o.slug} href={productHref(sys, o, ans)} className="pm__other">
                <span className="pm__otherimg"><Image src={o.img} alt="" fill sizes="72px" /></span>
                <span className="pm__othert">
                  <span style={{ color: TONES[i] }}>{o.tier}</span>
                  <strong>{o.brand} {o.model}</strong>
                  <em>{typeof o.price === "number" ? `${SHOW_FINANCE ? `From $${weekly(o.price, FINANCE_MONTHS)}/wk · ` : "From "}${money(o.price)}` : "At quote"}</em>
                </span>
                <i aria-hidden="true">→</i>
              </Link>
            ))}
          </div>
          <Link href={findHref(sys, ans)} className="pp__back" style={{ alignSelf: "flex-start" }}>← Back to your options</Link>
        </div>
      </section>

      <div className={`pp__sticky${pastHero ? "" : " pp__sticky--away"}`} aria-hidden={!pastHero}>
        <div className="wrap pp__stickyin">
          <span className="pp__stickyimg"><Image src={t.img} alt="" fill sizes="48px" /></span>
          <span className="pp__stickyt">
            <strong>{t.brand} {t.model}</strong>
            <span>{known ? `From ${money(t.price!)} installed` : "Priced after a free site check"}{model ? ` · ${model.chip}` : size ? ` · ${size.label}` : ""}</span>
          </span>
          <Link href={book} className="abtn abtn--or">Book this install</Link>
        </div>
      </div>
    </div>
  );
}

function AnswersFromUrl({ system, onAnswers }: { system: string; onAnswers: (a: Answers, model: string | null) => void }) {
  const params = useSearchParams();
  const key = params.toString();
  useEffect(() => {
    const ref = findSystem(system);
    if (ref) onAnswers(answersFrom(ref.sys, (k) => params.get(k)), params.get("model"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, system]);
  return null;
}

/** The model's own published specs, then the rows that are about the install rather than the box. */
function modelRows(m: PModel, catLabel: string, sysLabel: string, install: string, yourSize: string | null) {
  const rows = [{ k: "Model", v: m.code }, ...m.specs.map((x) => ({ k: x.label, v: x.value }))];
  const has = (re: RegExp) => rows.some((r) => re.test(r.k));
  rows.push({ k: "System", v: `${catLabel} · ${sysLabel}` });
  if (yourSize) rows.push({ k: "Your answer", v: yourSize });
  rows.push({ k: "Install time", v: install });
  if (!has(/warranty/i)) rows.push({ k: "Warranty", v: "Manufacturer warranty on your quote + 6 years on our workmanship" });
  rows.push({ k: "Compliance certificate", v: "Emailed within 24 hours of install" });
  return rows;
}

/** The first two sentences of our take on a model: the card under the photo has room for two lines. */
function firstLines(text: string) {
  // A stop only ends a sentence before a space and a capital, so "2.5 kW" stays whole.
  const parts = text.match(/[\s\S]*?[.!?](?=\s+[A-Z(]|\s*$)/g) ?? [text];
  return parts.slice(0, 2).join("").trim();
}
