import Image from "next/image";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { RATING_TEXT } from "@/lib/reviews";
import { HeroQuote } from "../HeroQuote";
import { HomeHeader, PhoneIcon } from "../HomeHeader";
import { QuotePreset } from "./QuotePreset";
import "../homepage.css";
import "./pagehero.css";

/**
 * The top of every inside page that has moved onto the homepage's look (Jake,
 * Nov 2026: the inside pages should "resemble the home page"): the floating
 * pill header over one of our photos under the navy scrim, the headline with
 * its coloured second line, the orange and call buttons, the trust row, and
 * the quick quote card (or a card that suits the page better) on the right.
 *
 * It renders the header too, because the homepage's CSS pads the hero for
 * the pill only when the two are siblings (.ahdr--pill ~ .ahero). A page
 * using it also renders <SiteModeStrip tabs={false} /> just outside its .ag
 * root, and its path is listed in ownHeader() in components/ChromeGate.tsx so
 * the layout's flat header steps aside.
 */

export type HeroFact = { v: string; k: string; href?: string };

/**
 * The homepage's own trust row after the stars, for a page with no figures
 * of its own: the same two lines, the same link. They are written here and
 * in app/page.tsx; change both together.
 */
export const HOME_TRUST: HeroFact[] = [
  { v: "1,200+", k: "installs done" },
  { v: "Up to $6,000 →", k: "Aircon rebates", href: "/rebates" },
];

/**
 * A headline with its coloured part in braces, the way the content files
 * mark one. When the coloured part ends the headline it drops to a line of
 * its own, as the homepage's "One standard. / Every job." does; in the middle
 * of a sentence it stays inline rather than breaking the sentence in three.
 */
export function heroTitle(h: string): ReactNode {
  const m = h.match(/^(.*?)\{(.+?)\}(.*)$/);
  if (!m) return h;
  const [, before, part, after] = m;
  // The full stop after it goes on the same line, not a line of its own.
  if (/^[\s.?!,]*$/.test(after)) return <>{before}<span className="phx__l2">{part}{after}</span></>;
  return <>{before}<span>{part}</span>{after}</>;
}

/** The call button, as the homepage hero's. */
export function CallButton({ from, cls = "abtn--line" }: { from: string; cls?: string }) {
  return <a href="tel:+61359478000" data-call-from={from} className={`abtn ${cls} abtn--call`}><PhoneIcon />Call (03) 5947 8000</a>;
}

export function PageHero({
  crumbs, eye, title, sub, photo, pos, ctas, trust = HOME_TRUST, rating = { value: RATING_TEXT }, card, quote, short = false, from = "page-hero", children,
}: {
  /** The trail after Home; the last one is this page. */
  crumbs: { name: string; href?: string }[];
  eye?: string;
  /** A string with the coloured part in braces, or the heading itself. */
  title: ReactNode;
  sub?: ReactNode;
  /** One of our own photos, full width under the scrim. */
  photo: string;
  /** Where the photo's subject sits, for the crop (CSS object-position). */
  pos?: string;
  /** The buttons. Defaults to the homepage's: a free quote (the card beside it) and a call. */
  ctas?: ReactNode;
  /** The figures after the stars. Only ones the page or the site already states. */
  trust?: HeroFact[];
  /** The rating that leads the trust row; false leaves it out. */
  rating?: { value: string; label?: string } | false;
  /** The card on the right. Defaults to the quick quote form; false for none. */
  card?: ReactNode | false;
  /** The quote form's service to open at, by its own label ("Cooling", "Hot water"). */
  quote?: string;
  /** A shorter hero, for a page whose main thing sits right under it (the contact form). */
  short?: boolean;
  /** data-call-from for the default call button. */
  from?: string;
  /** Anything under the buttons. */
  children?: ReactNode;
}) {
  const right = card === undefined ? <HeroQuote /> : card;
  return (
    <>
      <HomeHeader />
      <section className={`ahero phx${short ? " phx--short" : ""}${right ? "" : " phx--solo"}`}>
        <Image src={photo} alt="" aria-hidden="true" fill priority sizes="100vw" className="ahero__bg" style={pos ? { objectPosition: pos } : undefined} />
        <div className="ahero__scrim" aria-hidden="true" />
        <div className="wrap ahero__in">
          <div className="ahero__copy anim">
            <nav aria-label="Breadcrumb" className="phx__crumbs">
              <ol>
                <li><Link href="/">Home</Link></li>
                {crumbs.map((c) => <li key={c.name} aria-current={c.href ? undefined : "page"}>{c.href ? <Link href={c.href}>{c.name}</Link> : c.name}</li>)}
              </ol>
            </nav>
            {eye && <span className="phx__eye">{eye}</span>}
            <h1 className="ahero__h1 phx__h1">{typeof title === "string" ? heroTitle(title) : title}</h1>
            {sub && <p className="ahero__p">{sub}</p>}
            <div className="ahero__ctas">
              {ctas ?? <><a href="#quote" className="abtn abtn--or">Get a free quote →</a><CallButton from={from} /></>}
            </div>
            {children}
            {(rating || trust.length > 0) && (
              <div className="ahero__trust">
                {rating && (
                  <span className="ahero__stars">
                    <span className="stars" aria-hidden="true">★★★★★</span>
                    <span style={{ display: "flex", flexDirection: "column" }}><strong>{rating.value} / 5</strong><small>{rating.label ?? "Google reviews"}</small></span>
                  </span>
                )}
                {trust.map((f, i) => (
                  <Fragment key={f.k}>
                    {(rating || i > 0) && <span className="ahero__sep" aria-hidden="true" />}
                    {f.href
                      ? <Link href={f.href} className="phx__fact"><strong>{f.v}</strong><small>{f.k}</small></Link>
                      : <span className="phx__fact"><strong>{f.v}</strong><small>{f.k}</small></span>}
                  </Fragment>
                ))}
              </div>
            )}
          </div>
          {right}
          {right && card === undefined && quote && <QuotePreset service={quote} />}
        </div>
      </section>
    </>
  );
}

/**
 * The white card on the right for a page where the quote form isn't the
 * right thing to offer (the brand logos, the tools' questions, the
 * membership tiers): the quote form's own box, so the hero keeps its shape.
 */
export function HeroCard({ label, children, foot }: { label: string; children: ReactNode; foot?: ReactNode }) {
  return (
    <aside className="qf phx__card anim" aria-label={label} style={{ animationDelay: ".12s" }}>
      <span className="phx__cardlbl">{label}</span>
      {children}
      {foot && <div className="phx__cardfoot">{foot}</div>}
    </aside>
  );
}
