import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  findHref, productHref, money, weekly, PRODUCT_FAQS, SHOW_FINANCE, FINANCE_MONTHS, TONES, reviewTitle, modelForAnswer,
  type Category, type System, type Tier, type Answers, type Opt, type GalItem, type Hero,
} from "@/lib/homepage/data";
import type { HowStep, Learn } from "@/lib/homepage/learn";
import type { Review } from "@/lib/reviews";
import type { Badge } from "@/lib/homepage/badges";
import type { PModel, PBrand } from "../ProductView";

/**
 * The pieces a product page is built from. Each reads its figures from the
 * one PV object, so no two parts of the page can disagree about a number.
 */
export type PV = {
  cat: Category; sys: System; t: Tier; ti: number;
  models: PModel[]; model: PModel | null; mi: number; size: Opt | null; ans: Answers;
  known: boolean; hp: boolean; newBuildHp: boolean;
  badges: Badge[]; modelKeys: { label: string; value: string }[];
  gal: GalItem[];
  /** The header photo for the size showing, and which of the system's sizes that is. */
  room: Hero; roomIdx: number | null;
  book: string; others: (readonly [Tier, number])[];
  learn: Learn | undefined; steps: HowStep[];
  /** The option's own feature lines, minus any the model's record contradicts. */
  optionLines: string[];
  whyTitle: string; whyLines: string[]; take: string; glance: { label: string; value: string }[];
  sizeOn: (i: number) => boolean; pickSize: (i: number) => void; pickModel: (slug: string) => void; setSize: (i: number) => void;
  sizeNote: string; specRows: { k: string; v: string }[]; specNote: string;
  reviews: Review[]; rating: string; count: number; brand: PBrand | null;
  heroRef: React.RefObject<HTMLElement>; pastHero: boolean;
};

export function Crumbs({ v }: { v: PV }) {
  const { cat, sys, t, ans } = v;
  return (
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
  );
}

export function Badges({ v, cls = "" }: { v: PV; cls?: string }) {
  if (!v.badges.length) return null;
  return (
    <ul className={`bdg ${cls}`} aria-label="At a glance">
      {v.badges.map((b) => <li key={b.kind} className={`bdg__i bdg__i--${b.kind}`}><strong>{b.big}</strong> <span>{b.small}</span></li>)}
    </ul>
  );
}

/** Size buttons, then the figures for the size picked. */
export function SizePicker({ v, uid = "pm-size" }: { v: PV; uid?: string }) {
  const { models, mi, sys, ans } = v;
  return (
    <div className="pk">
      <span className="pk__lbl" id={uid}>{models.length ? "Choose a size" : sys.q}</span>
      <div className="ppx__tabs" role="group" aria-labelledby={uid}>
        {models.length > 0
          ? models.map((m, i) => (
            <button key={m.slug} type="button" className={`ppx__tab${i === mi ? " ppx__tab--on" : ""}`} onClick={() => v.pickModel(m.slug)} aria-pressed={i === mi}>{m.chip}</button>
          ))
          : sys.sizes.map((z, i) => (
            <button key={z.label} type="button" className={`ppx__tab${i === ans.size ? " ppx__tab--on" : ""}`} onClick={() => v.setSize(i)} aria-pressed={i === ans.size}>{z.label}</button>
          ))}
      </div>
      {v.modelKeys.length > 0 && (
        <dl className="pk__keys" aria-live="polite">
          {v.modelKeys.map((k) => <div key={k.label}><dt>{k.label}</dt><dd>{k.value}</dd></div>)}
        </dl>
      )}
    </div>
  );
}

export function Price({ v }: { v: PV }) {
  const { known, t, hp } = v;
  return (
    <div className="pr">
      <strong>{known ? `From ${money(t.price!)}` : "Priced at your site check"}</strong>
      <span>{known ? `installed, includes GST${hp ? " and the VEU rebate" : ""}` : "Free site check, then a fixed price in writing"}</span>
    </div>
  );
}

export function BuyButtons({ v, dark = false }: { v: PV; dark?: boolean }) {
  return (
    <>
      <div className="by">
        <Link href={v.book} className="abtn abtn--or abtn--flat">Book this install →</Link>
        <a href="tel:+61359478000" data-call-from="product-hero" className={`abtn ${dark ? "abtn--line" : "abtn--ghost"}`}>Call (03) 5947 8000</a>
      </div>
      {v.newBuildHp && (
        <p className="find__veu" style={{ margin: 0 }}>The VEU rebate is for replacing an existing gas or electric system, so it usually won&apos;t apply to a new build. We&apos;ll confirm at the site check.</p>
      )}
    </>
  );
}

export function Promise() {
  return <ul className="pmz"><li>Free site check</li><li>Fixed price in writing</li><li>6-yr workmanship warranty</li></ul>;
}

export function WhyList({ v, title = true }: { v: PV; title?: boolean }) {
  return (
    <>
      {title && <h2 className="wl__h">{v.whyTitle}</h2>}
      <ul className="pp__hl">{v.whyLines.map((f) => <li key={f}><span aria-hidden="true">✓</span>{f}</li>)}</ul>
    </>
  );
}

/** The model's headline figures. Only what its catalogue record states. */
export function Glance({ v, cls = "pxg" }: { v: PV; cls?: string }) {
  if (!v.glance.length) return null;
  return (
    <dl className={cls} aria-label={`${v.model!.code} at a glance`} key={v.model!.slug}>
      {v.glance.map((x) => <div key={x.label}><dd>{x.value}</dd><dt>{x.label}</dt></div>)}
    </dl>
  );
}

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

/**
 * "Which one suits me?" in two taps: which line sounds like their home, then
 * the size question from the finder. It ends on the button to press, or on
 * the other kind of system that fits better, and never on a size the page
 * can't select.
 */
export function FitFinder({ v }: { v: PV }) {
  const { learn, sys, models } = v;
  const [path, setPath] = useState<number | null>(null);
  const [sz, setSz] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  if (!learn) return null;
  const choices = [{ label: cap(learn.good[0]), alt: null }, ...learn.alt.map((a) => ({ label: cap(a.if), alt: a }))];
  const alt = path != null ? choices[path].alt : null;
  const button = sz == null ? null : models.length ? models[modelForAnswer(models, sys.sizes[sz].spec)].chip : sys.sizes[sz].label;
  const restart = () => { setPath(null); setSz(null); setDone(false); };

  return (
    <div className="ff" aria-live="polite">
      {path == null && (
        <>
          <span className="ff__q">Which sounds most like your home?</span>
          <div className="ff__opts">
            {choices.map((c, i) => <button key={c.label} type="button" className="ff__opt" onClick={() => setPath(i)}>{c.label}<i aria-hidden="true">→</i></button>)}
          </div>
        </>
      )}
      {path === 0 && sz == null && (
        <>
          <span className="ff__q">{sys.q}</span>
          <div className="ff__opts">
            {sys.sizes.map((z, i) => (
              <button key={z.label} type="button" className="ff__opt" onClick={() => setSz(i)}>
                <span><strong>{z.label}</strong>{z.sub && <small>{z.sub}</small>}</span><i aria-hidden="true">→</i>
              </button>
            ))}
          </div>
        </>
      )}
      {path === 0 && sz != null && (
        <div className="ff__res">
          <span className="ff__tag">Your best fit</span>
          <p>Press <b className="ff__btn">{button}</b> in the size buttons{done ? ". Done, it's selected." : ", or let us do it."}</p>
          <div className="ff__acts">
            {done
              ? <Link href={v.book} className="abtn abtn--or abtn--flat">Book this install →</Link>
              : <button type="button" className="abtn abtn--or abtn--flat" onClick={() => { v.pickSize(sz); setDone(true); }}>Select {button}</button>}
            <button type="button" className="ff__again" onClick={restart}>Start again</button>
          </div>
        </div>
      )}
      {alt && (
        <div className="ff__res">
          <span className="ff__tag">A better fit</span>
          <p>For that, a <b>{alt.label.toLowerCase()}</b> usually suits better than this one.</p>
          <div className="ff__acts">
            <Link href={`/?find=${alt.go}#find`} className="abtn abtn--or abtn--flat">See {alt.label} options →</Link>
            <button type="button" className="ff__again" onClick={restart}>Start again</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function FitCards({ v }: { v: PV }) {
  if (!v.learn) return null;
  return (
    <div className="pxf">
      <div className="pxf__card pxf__card--yes">
        <h3><span aria-hidden="true">✓</span> A good fit if</h3>
        <ul>{v.learn.good.map((x) => <li key={x}>{x}</li>)}</ul>
      </div>
      <div className="pxf__card pxf__card--alt">
        <h3><span aria-hidden="true">↔</span> Look at another option if</h3>
        <ul>
          {v.learn.alt.map((x) => (
            <li key={x.if}><span>…{x.if}</span><Link href={`/?find=${x.go}#find`}>{x.label} →</Link></li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function SizeGuide({ v }: { v: PV }) {
  const { sys } = v;
  return (
    <div className="pxz" role="group" aria-label={sys.q}>
      {sys.sizes.map((z, i) => (
        <button key={z.label} type="button" className={`pxz__row${v.sizeOn(i) ? " pxz__row--on" : ""}`} onClick={() => v.pickSize(i)} aria-pressed={v.sizeOn(i)}>
          {z.n ? <span className="qf__bars" aria-hidden="true">{[1, 2, 3].map((b) => <i key={b} className={b <= Math.min(z.n ?? 0, 3) ? "on" : ""} />)}</span> : null}
          <span className="pxz__t"><strong>{z.label}</strong>{z.sub && <small>{z.sub}</small>}</span>
          {z.spec && <span className="pxz__spec">{z.spec}</span>}
          {v.sizeOn(i) && <span className="pxz__on">Showing</span>}
        </button>
      ))}
    </div>
  );
}

export function SpecTable({ v }: { v: PV }) {
  return (
    <dl className="pp__specs" key={v.model?.slug ?? "range"}>
      {v.specRows.map((r) => <div key={r.k} className="pp__row"><dt>{r.k}</dt><dd>{r.v}</dd></div>)}
    </dl>
  );
}

export function SpecLinks({ v }: { v: PV }) {
  const { model, brand } = v;
  return (
    <div className="pxr">
      {model && <Link href={model.href}>Full {model.code} page →</Link>}
      {brand?.page && <Link href={brand.page}>Why we fit {brand.name} →</Link>}
      {brand?.site && <a href={brand.site.href} target="_blank" rel="noopener noreferrer">{brand.name} brochures and manuals ↗</a>}
    </div>
  );
}

export function BookingSteps({ v, cls = "pxb" }: { v: PV; cls?: string }) {
  return (
    <ol className={cls}>
      {v.steps.map((x, i) => <li key={x.t}><span className="pxb__n" aria-hidden="true">{i + 1}</span><h3>{x.t}</h3><p>{x.d}</p></li>)}
    </ol>
  );
}

export function Faqs({ v }: { v: PV }) {
  return (
    <div className="afaqs">
      {PRODUCT_FAQS[v.sys.faq].map((f) => <details key={f.q} className="afaq"><summary>{f.q}</summary><p>{f.a}</p></details>)}
    </div>
  );
}

export function Reviews({ v, head = true }: { v: PV; head?: boolean }) {
  return (
    <>
      {head && (
        <div className="pp__revhead">
          <div className="pp__lead">
            <span className="aeye"><i /> Reviews</span>
            <h2 className="h2 h2--sm">{reviewTitle(v.sys.faq)}</h2>
          </div>
          <Link href="/reviews">{v.rating} / 5 from {v.count} Google reviews · Read all →</Link>
        </div>
      )}
      <div className="pp__revs">
        {v.reviews.map((r) => (
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
    </>
  );
}

export const otherPrice = (o: Tier) => (typeof o.price === "number" ? `${SHOW_FINANCE ? `From $${weekly(o.price, FINANCE_MONTHS)}/wk · ` : "From "}${money(o.price)}` : "Priced at your site check");

export function Others({ v }: { v: PV }) {
  const { sys, ans } = v;
  return (
    <div className="pxc__grid">
      {v.others.map(([o, i]) => (
        <Link key={o.slug} href={productHref(sys, o, ans)} className="pxc__card">
          <span className="pxc__img"><Image src={o.img} alt="" fill sizes="(max-width: 600px) 90vw, 320px" /></span>
          <span className="pxc__t">
            <span style={{ color: TONES[i] }}>{o.tier}</span>
            <strong>{o.brand} {o.model}</strong>
            <em>{otherPrice(o)}</em>
          </span>
          <i aria-hidden="true">→</i>
        </Link>
      ))}
    </div>
  );
}

export function Sticky({ v }: { v: PV }) {
  const { t, known, model, size, book, pastHero } = v;
  return (
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
  );
}

/** A section with the eyebrow and heading every layout uses. */
export function Lead({ eye, h, children, dark = false }: { eye: string; h: ReactNode; children?: ReactNode; dark?: boolean }) {
  return (
    <div className="pp__lead">
      <span className={`aeye${dark ? " aeye--dark" : ""}`}><i /> {eye}</span>
      <h2 className="h2 h2--sm">{h}</h2>
      {children}
    </div>
  );
}
