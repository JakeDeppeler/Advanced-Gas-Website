import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  findHref, productHref, money, weekly, PRODUCT_FAQS, SHOW_FINANCE, FINANCE_MONTHS, FINANCE_TERMS, FINANCE_NOTE, TONES, reviewTitle, modelForAnswer,
  type Category, type System, type Tier, type Answers, type Opt, type GalItem, type Hero,
} from "@/lib/homepage/data";
import type { Alt, HowStep, Learn } from "@/lib/homepage/learn";
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
  /** The room a model size is for ("Main bedroom or small lounge"), from the size it sits nearest. */
  roomOf: (chip: string) => string | null;
  book: string; others: (readonly [Tier, number])[];
  learn: Learn | undefined; steps: HowStep[];
  /** The option's own feature lines, minus any the model's record contradicts. */
  optionLines: string[];
  whyTitle: string; whyLines: string[]; take: string; glance: { label: string; value: string }[];
  sizeOn: (i: number) => boolean; pickSize: (i: number) => void; pickModel: (slug: string) => void; setSize: (i: number) => void;
  /** Merge answers from the fit form (size included) into the page, so the size, the figures and Book this install all follow. */
  applyAnswers: (a: Answers) => void;
  /** Finance term in months, for the weekly figure. */
  term: number; setTerm: (m: number) => void;
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

export function Price({ v }: { v: PV }) {
  const { known, t, hp } = v;
  return (
    <div className="pr">
      <strong>{known ? `From ${money(t.price!)}` : "Priced at your site check"}</strong>
      <span>{known ? `installed, includes GST${hp ? " and the VEU rebate" : ""}` : "Free site check, then a fixed price in writing"}</span>
    </div>
  );
}

/**
 * The weekly figure under the price, with the terms to flick between. The
 * figures are examples (see SHOW_FINANCE), and the note under them says so.
 */
export function Finance({ v }: { v: PV }) {
  const { known, t, term, setTerm } = v;
  const [open, setOpen] = useState(false);
  if (!SHOW_FINANCE || !known) return null;
  return (
    <div className="fin">
      <p className="fin__line">or <strong>${weekly(t.price!, term)}/wk</strong> over {term} months</p>
      <div className="fin__terms" role="group" aria-label="Finance term">
        {FINANCE_TERMS.map((m) => (
          <button key={m} type="button" className={m === term ? "on" : ""} aria-pressed={m === term} onClick={() => setTerm(m)}>{m} mo</button>
        ))}
      </div>
      <button type="button" className="fin__more" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Hide" : "How this works"}</button>
      {open && <p className="fin__note">{FINANCE_NOTE}</p>}
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
      {v.glance.map((x) => {
        // "up to 25 m²" set as big as the other figures wraps to two lines; the
        // qualifier goes small in front so every tile reads as one figure.
        const m = x.value.match(/^(up to|from|over)\s+(.*)$/i);
        return <div key={x.label}><dd>{m ? <><small>{m[1]}</small>{m[2]}</> : x.value}</dd><dt>{x.label}</dt></div>;
      })}
    </dl>
  );
}

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

/**
 * "Is it right for you?" as a short form: which line sounds like their home,
 * then the same questions the finder asks about this system (size first, then
 * floor, outdoor unit and so on). It ends on the size button to press and
 * hands every answer to the page, so Book this install arrives at the quote
 * form already filled in. If another kind of system fits better it says so
 * after the first tap.
 *
 * Every step is rendered in the same grid cell and only the current one is
 * visible, so the card is always as tall as its tallest step and never jumps
 * as they tap through.
 */
export function FitFinder({ v }: { v: PV }) {
  const { learn, sys, models } = v;
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({});
  const [alt, setAlt] = useState<Alt | null>(null);
  const [done, setDone] = useState(false);
  if (!learn) return null;
  const choices = [{ label: cap(learn.good[0]), alt: null }, ...learn.alt.map((x) => ({ label: cap(x.if), alt: x }))];
  const qs = sys.qs;
  const RESULT = qs.length + 1, ALT = qs.length + 2;
  const sz = a.size ?? 0;
  const button = models.length ? models[modelForAnswer(models, sys.sizes[sz].spec)].chip : sys.sizes[sz].label;
  const picked = qs.filter((q) => a[q.id] != null).map((q) => q.opts[a[q.id]].label);
  const restart = () => { setStep(0); setA({}); setAlt(null); setDone(false); };
  const back = () => { setDone(false); setStep(step === ALT ? 0 : step - 1); };
  // Hidden steps are visibility:hidden, which also takes them out of the tab order.
  const pane = (n: number) => ({ className: `ff__pane${step === n ? " on" : ""}`, "aria-hidden": step !== n });
  const shown = alt ?? learn.alt[0];

  return (
    <div className="ff">
      <div className="ff__head">
        <button type="button" className="ff__again" onClick={back} style={step ? undefined : { visibility: "hidden" }}>← Back</button>
        <span className="ff__n">{step < RESULT ? `Question ${step + 1} of ${qs.length + 1}` : "Your answer"}</span>
      </div>
      <div className="ff__bar" aria-hidden="true">
        {Array.from({ length: qs.length + 1 }, (_, i) => <span key={i} className={i < step || step >= RESULT ? "on" : ""} />)}
      </div>
      <div className="ff__body" aria-live="polite">
        <div {...pane(0)}>
          <span className="ff__q">Which sounds most like your home?</span>
          <div className="ff__opts">
            {choices.map((c) => (
              <button key={c.label} type="button" className="ff__opt" onClick={() => { if (c.alt) { setAlt(c.alt); setStep(ALT); } else { setAlt(null); setStep(1); } }}>
                <span>{c.label}</span><i aria-hidden="true">→</i>
              </button>
            ))}
          </div>
        </div>
        {qs.map((q, k) => (
          <div key={q.id} {...pane(k + 1)}>
            <span className="ff__q">{q.q}</span>
            <div className="ff__opts">
              {q.opts.map((o, i) => (
                <button key={o.label} type="button" className={`ff__opt${a[q.id] === i ? " ff__opt--on" : ""}`} onClick={() => { setA({ ...a, [q.id]: i }); setStep(k + 2); }}>
                  <span><strong>{o.label}</strong>{o.sub && <small>{o.sub}</small>}</span><i aria-hidden="true">→</i>
                </button>
              ))}
            </div>
          </div>
        ))}
        <div {...pane(RESULT)}>
          <div className="ff__res">
            <span className="ff__tag">Your best fit</span>
            <p>Press <b className="ff__btn">{button}</b> in the size bar at the top{done ? ". Done, it's selected with your answers." : ", or let us set it all up."}</p>
            {picked.length > 0 && <div className="ff__chips">{picked.map((x) => <span key={x}>{x}</span>)}</div>}
            <div className="ff__acts">
              {done
                ? <Link href={v.book} className="abtn abtn--or abtn--flat">Book this install →</Link>
                : <button type="button" className="abtn abtn--or abtn--flat" onClick={() => { v.applyAnswers(a); setDone(true); }}>Select {button}</button>}
              <button type="button" className="ff__again" onClick={restart}>Start again</button>
            </div>
          </div>
        </div>
        <div {...pane(ALT)}>
          <div className="ff__res">
            <span className="ff__tag">A better fit</span>
            <p>For that, a <b>{shown.label.toLowerCase()}</b> usually suits better than this one.</p>
            <div className="ff__acts">
              <Link href={`/?find=${shown.go}#find`} className="abtn abtn--or abtn--flat">See {shown.label} options →</Link>
              <button type="button" className="ff__again" onClick={restart}>Start again</button>
            </div>
          </div>
        </div>
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
          <span>{known ? `From ${money(t.price!)} installed${SHOW_FINANCE ? ` or $${weekly(t.price!, v.term)}/wk` : ""}` : "Priced after a free site check"}{model ? ` · ${model.chip}` : size ? ` · ${size.label}` : ""}</span>
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
