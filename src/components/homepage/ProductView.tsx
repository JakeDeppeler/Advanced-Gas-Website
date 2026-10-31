"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  findSystem, galleryFor, specRows, answersFrom, answersQuery, findHref, bookHref, productHref, money, weekly,
  isHeatPump, isNewBuildHeatPump, PRODUCT_FAQS, SPEC_NOTE, SIZE_NOTE, SHOW_FINANCE, FINANCE_MONTHS, TONES, WORKMANSHIP,
  reviewTitle, modelForAnswer, installTime as installTimeOf, type Answers,
} from "@/lib/homepage/data";
import { LEARN, BOOKING_STEPS } from "@/lib/homepage/learn";
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
  /** The catalogue's own feature and "why we install" lists, where it has them. */
  features?: string[];
  why?: string[];
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

  const learn = LEARN[sys.slug];
  const steps = BOOKING_STEPS(installTimeOf(sys));
  // A model's own record beats the option's feature list: where the model
  // states its noise, an option line quoting a different dBA figure goes, so
  // the page never shows two numbers for the same thing.
  const statesSound = !!model?.specs.some((x) => /sound/i.test(x.label));
  const optionLines = feats.filter((f) => !(statesSound && /dBA/.test(f)));
  const included = [...optionLines, "Free site check and a fixed price in writing", "Installed by our own crew", "Compliance certificate emailed within 24 hours", "6 years on our workmanship"];
  const whyLines = model?.why?.length ? model.why : model?.features?.length ? model.features : included;
  // How it works shows one of our installs where there is one; the product shot is already the hero.
  const howImg = gal.find((x) => x.kind === "c") ?? gal[0];
  const glance = model ? model.specs.filter((x) => !/warranty|refrigerant/i.test(x.label)).slice(0, 4) : [];
  const sizeOn = (i: number) => (models.length ? modelForAnswer(models, sys.sizes[i].spec) === mi && !!sys.sizes[i].spec : ans.size === i);
  const tabs = [
    ["overview", "Overview"], ...(learn ? [["how", "How it works"], ["fit", "Is it right for you?"]] : []),
    ["sizes", "Sizes"], ["specs", "Specs"], ["booking", "Booking"], ["faqs", "FAQs"], ["reviews", "Reviews"],
  ] as const;

  function pickSize(i: number) {
    // A row in the size guide picks the model that fits it, the same way the finder's answer does.
    setSize(i);
    if (models.length) { setPicked(null); syncUrl({ ...ans, size: i }, null); }
  }

  return (
    <div className="pp px" id="product">
      <Suspense fallback={null}><AnswersFromUrl system={system} onAnswers={(a, m) => { setAns(a); if (m && models.some((x) => x.slug === m)) setPicked(m); }} /></Suspense>
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

      {/* Product on the right, everything needed to choose it on the left:
          the gallery lives in the hero, so there's no separate photo section. */}
      <section className="pxh" ref={heroRef}>
        <div className="wrap pxh__in">
          <div className="pxh__copy">
            <span className="pxh__eye"><i style={{ background: TONES[ti] }} />{t.tier} option · {sys.label}</span>
            <span className="pxh__brand">{t.brand}</span>
            <h1 className="pxh__h1">{t.model}</h1>
            <p className="pxh__best">{model?.bestFor ?? sys.sub}</p>
            {badges.length > 0 && (
              <ul className="pxh__badges" aria-label="At a glance">
                {badges.map((b) => <li key={b.kind} className={`pxh__badge pxh__badge--${b.kind}`}><strong>{b.big}</strong> {b.small}</li>)}
              </ul>
            )}

            <div className="pxh__pick">
              <span className="pxh__picklbl" id="pm-size">{models.length ? "Choose a size" : sys.q}</span>
              <div className="ppx__tabs" role="group" aria-labelledby="pm-size">
                {models.length > 0
                  ? models.map((m, i) => (
                    <button key={m.slug} type="button" className={`ppx__tab${i === mi ? " ppx__tab--on" : ""}`} onClick={() => pickModel(m.slug)} aria-pressed={i === mi}>{m.chip}</button>
                  ))
                  : sys.sizes.map((z, i) => (
                    <button key={z.label} type="button" className={`ppx__tab${i === ans.size ? " ppx__tab--on" : ""}`} onClick={() => setSize(i)} aria-pressed={i === ans.size}>{z.label}</button>
                  ))}
              </div>
              {modelKeys.length > 0 && (
                <dl className="pxh__keys" aria-live="polite">
                  {modelKeys.map((k) => <div key={k.label}><dt>{k.label}</dt><dd>{k.value}</dd></div>)}
                </dl>
              )}
            </div>

            <div className="pxh__buy">
              <div className="pxh__price">
                <strong>{known ? `From ${money(t.price!)}` : "Priced at your site check"}</strong>
                <span>{known ? `installed, includes GST${hp ? " and the VEU rebate" : ""}` : "Free site check, then a fixed price in writing"}</span>
              </div>
              <div className="pxh__btns">
                <Link href={book} className="abtn abtn--or abtn--flat">Book this install →</Link>
                <a href="tel:+61359478000" data-call-from="product-hero" className="abtn abtn--ghost">Call (03) 5947 8000</a>
              </div>
              {isNewBuildHeatPump(sys, ans) && (
                <p className="find__veu" style={{ margin: 0 }}>The VEU rebate is for replacing an existing gas or electric system, so it usually won&apos;t apply to a new build. We&apos;ll confirm at the site check.</p>
              )}
              <ul className="pxh__promise">
                <li>Free site check</li><li>Fixed price in writing</li><li>6-yr workmanship warranty</li>
              </ul>
            </div>
          </div>

          <div className="pxh__stage">
            <div className={`pxh__main${cur.kind === "p" ? " pxh__main--prod" : ""}`}>
              <Image key={cur.src} src={cur.src} alt={cur.alt} fill priority={g === 0} sizes="(max-width: 900px) 100vw, 760px" />
              {cur.kind === "c" && <span className="pm__cap">One of our installs</span>}
              {gal.length > 1 && (
                <>
                  <span className="pm__count">{g + 1} / {gal.length}</span>
                  <button type="button" className="pm__nav pm__nav--l" onClick={() => setGi((g - 1 + gal.length) % gal.length)} aria-label="Previous photo">←</button>
                  <button type="button" className="pm__nav pm__nav--r" onClick={() => setGi((g + 1) % gal.length)} aria-label="Next photo">→</button>
                </>
              )}
            </div>
            {gal.length > 1 && (
              <div className="pxh__thumbs">
                {gal.map((x, i) => (
                  <button key={x.src} type="button" className={`pxh__th${x.kind === "p" ? " pxh__th--prod" : ""}${i === g ? " pxh__th--on" : ""}`} onClick={() => setGi(i)} aria-label={`Photo ${i + 1}: ${x.alt}`} aria-pressed={i === g}>
                    <Image src={x.src} alt="" fill sizes="110px" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <nav className="pxt" aria-label="On this page">
        <div className="wrap pxt__in">
          {tabs.map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}
        </div>
      </nav>

      {/* Overview: our take in our own words, then the numbers behind it. */}
      <section className="pxs pxo" id="overview">
        <div className="wrap pxo__in">
          <div className="pxo__take">
            <span className="aeye"><i /> Our take</span>
            <p className="pxo__quote">{model?.take ?? `${sys.sub}. ${optionLines.join(". ")}.`}</p>
            <span className="pxo__by">The Advanced Gas &amp; Aircon team</span>
          </div>
          <div className="pxo__why">
            <h2 className="pxo__h">{model?.why?.length ? "Why we install it" : model?.features?.length ? "Features" : "What's included"}</h2>
            <ul className="pp__hl">
              {whyLines.map((f) => <li key={f}><span aria-hidden="true">✓</span>{f}</li>)}
            </ul>
          </div>
        </div>
        {glance.length > 0 && (
          <div className="wrap">
            <dl className="pxg" aria-label={`${model!.code} at a glance`} key={model!.slug}>
              {glance.map((x) => <div key={x.label}><dd>{x.value}</dd><dt>{x.label}</dt></div>)}
            </dl>
          </div>
        )}
      </section>

      {learn && (
        <section className="pxs pxs--cream" id="how">
          <div className="wrap pxw">
            <div className="pxw__lead">
              <span className="aeye"><i /> How it works</span>
              <h2 className="h2 h2--sm">How a {sys.label.toLowerCase()} works.</h2>
              <div className={`pxw__img${howImg.kind === "c" ? " pxw__img--photo" : ""}`}>
                <Image src={howImg.src} alt={howImg.alt} fill sizes="(max-width: 900px) 90vw, 560px" />
                {howImg.kind === "c" && <span className="pm__cap">One of our installs</span>}
              </div>
            </div>
            <ol className="pxw__steps">
              {learn.how.map((x, i) => (
                <li key={x.t}>
                  <span className="pxw__n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <div><h3>{x.t}</h3><p>{x.d}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {learn && (
        <section className="pxs" id="fit">
          <div className="wrap pp__col">
            <div className="pp__lead">
              <span className="aeye"><i /> Is it right for you?</span>
              <h2 className="h2 h2--sm">Who this suits.</h2>
            </div>
            <div className="pxf">
              <div className="pxf__card pxf__card--yes">
                <h3><span aria-hidden="true">✓</span> A good fit if</h3>
                <ul>{learn.good.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
              <div className="pxf__card pxf__card--alt">
                <h3><span aria-hidden="true">↔</span> Look at another option if</h3>
                <ul>
                  {learn.alt.map((x) => (
                    <li key={x.if}>
                      <span>…{x.if}</span>
                      <Link href={`/?find=${x.go}#find`}>{x.label} →</Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="pxs pxs--sky" id="sizes">
        <div className="wrap pp__two">
          <div className="pp__lead">
            <span className="aeye"><i /> Sizes</span>
            <h2 className="h2 h2--sm">Which size do you need?</h2>
            {/* A heat-load check is an aircon and heating thing; hot water is sized off the household. */}
            <p>{cat.id === "hw" ? "A rough guide only. We confirm the right size at the free site check." : SIZE_NOTE}</p>
          </div>
          <div className="pxz" role="group" aria-label={sys.q}>
            {sys.sizes.map((z, i) => (
              <button key={z.label} type="button" className={`pxz__row${sizeOn(i) ? " pxz__row--on" : ""}`} onClick={() => pickSize(i)} aria-pressed={sizeOn(i)}>
                {z.n ? (
                  <span className="qf__bars" aria-hidden="true">{[1, 2, 3].map((b) => <i key={b} className={b <= Math.min(z.n ?? 0, 3) ? "on" : ""} />)}</span>
                ) : null}
                <span className="pxz__t"><strong>{z.label}</strong>{z.sub && <small>{z.sub}</small>}</span>
                {z.spec && <span className="pxz__spec">{z.spec}</span>}
                {sizeOn(i) && <span className="pxz__on">Showing</span>}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="pxs" id="specs">
        <div className="wrap pp__two">
          <div className="pp__lead">
            <span className="aeye"><i /> Specifications</span>
            <h2 className="h2 h2--sm">{model ? model.name : `${t.brand} ${t.model}`}</h2>
            <p>{model ? `${t.brand}'s published figures for the ${model.code}. The full spec sheet and manuals come with your written quote.` : SPEC_NOTE}</p>
            <div className="pxr">
              {model && <Link href={model.href}>Full {model.code} page →</Link>}
              {brand?.page && <Link href={brand.page}>Why we fit {brand.name} →</Link>}
              {brand?.site && <a href={brand.site.href} target="_blank" rel="noopener noreferrer">{brand.name} brochures and manuals ↗</a>}
            </div>
          </div>
          <dl className="pp__specs" key={model?.slug ?? "range"}>
            {(model ? modelRows(model, cat.label, sys.label, installTimeOf(sys), size ? size.label + (size.spec ? ` (${size.spec})` : "") : null) : specRows(cat, sys, t, ans))
              .map((r) => <div key={r.k} className="pp__row"><dt>{r.k}</dt><dd>{r.v}</dd></div>)}
          </dl>
        </div>
      </section>

      <section className="pxs pxs--navy" id="booking">
        <div className="wrap pp__col">
          <div className="pxb__head">
            <div className="pp__lead">
              <span className="aeye aeye--dark"><i /> What happens next</span>
              <h2 className="h2 h2--sm">From booking to running.</h2>
            </div>
            <Link href={book} className="abtn abtn--or abtn--flat">Book this install →</Link>
          </div>
          <ol className="pxb">
            {steps.map((x, i) => (
              <li key={x.t}><span className="pxb__n" aria-hidden="true">{i + 1}</span><h3>{x.t}</h3><p>{x.d}</p></li>
            ))}
          </ol>
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

      <section className="pxs pxs--sky" id="faqs">
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

      <section className="pxs" id="reviews">
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

      <section className="pxs pxs--cream pxc">
        <div className="wrap pp__col">
          <div className="pxb__head">
            <h2 className="h2 h2--sm">The other {sys.label.toLowerCase()} options</h2>
            <Link href={findHref(sys, ans)} className="ppx__back">← Back to your options</Link>
          </div>
          <div className="pxc__grid">
            {others.map(([o, i]) => (
              <Link key={o.slug} href={productHref(sys, o, ans)} className="pxc__card">
                <span className="pxc__img"><Image src={o.img} alt="" fill sizes="(max-width: 600px) 90vw, 320px" /></span>
                <span className="pxc__t">
                  <span style={{ color: TONES[i] }}>{o.tier}</span>
                  <strong>{o.brand} {o.model}</strong>
                  <em>{typeof o.price === "number" ? `${SHOW_FINANCE ? `From $${weekly(o.price, FINANCE_MONTHS)}/wk · ` : "From "}${money(o.price)}` : "Priced at your site check"}</em>
                </span>
                <i aria-hidden="true">→</i>
              </Link>
            ))}
          </div>
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
