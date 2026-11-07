import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The pieces every rebuilt inside page shares (about, reviews, contact,
 * services, suburbs, tools), so a page is its own content laid into the same
 * frame as the homepage, product and brand pages.
 *
 * Pages using these wrap themselves in `.ag ag--flat` with data-no-reveal and
 * import homepage/product/brand CSS plus page/kit.css.
 */

export function Crumbs({ trail, back }: { trail: { name: string; href?: string }[]; back?: { label: string; href: string } }) {
  return (
    <nav className="ppx__crumbbar" aria-label="Breadcrumb">
      <div className="wrap ppx__crumbin">
        <ol className="pp__crumbs">
          <li><Link href="/">Home</Link></li>
          {trail.map((c) => <li key={c.name} aria-current={c.href ? undefined : "page"}>{c.href ? <Link href={c.href}>{c.name}</Link> : c.name}</li>)}
        </ol>
        {back && <Link href={back.href} className="ppx__back">{back.label}</Link>}
      </div>
    </nav>
  );
}

/** The dark page header: words on the left, a picture on the right, figures along the foot. */
export function Hero({ eye, title, sub, img, imgAlt, scene = true, ctas = true, facts, children }: {
  eye: string; title: ReactNode; sub?: ReactNode; img?: string; imgAlt?: string; scene?: boolean; ctas?: boolean;
  facts?: { v: string; k: string }[]; children?: ReactNode;
}) {
  return (
    <section className={`bxh${img ? "" : " bxh--plain"}`}>
      <div className="wrap bxh__in">
        <div className="bxh__copy">
          <span className="lk2__eye">{eye}</span>
          <h1 className="bxh__h1 kx__h1">{title}</h1>
          {sub && <p className="bxh__sub">{sub}</p>}
          {children}
          {ctas && (
            <div className="bxh__ctas">
              <Link href="/#quote" className="abtn abtn--or abtn--flat">Get a free quote →</Link>
              <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="page-hero">Call (03) 5947 8000</a>
            </div>
          )}
        </div>
        {img && (
          <div className={`bxh__img${scene ? " bxh__img--scene" : ""}`}>
            <Image src={img} alt={imgAlt ?? ""} fill priority sizes="(max-width: 900px) 100vw, 640px" />
          </div>
        )}
      </div>
      {facts && facts.length > 0 && (
        <div className="wrap">
          <dl className="bxh__facts">{facts.map((f) => <div key={f.k}><dd>{f.v}</dd><dt>{f.k}</dt></div>)}</dl>
        </div>
      )}
    </section>
  );
}

/** A section heading: small label, big line, optional lede. */
export function Head({ eye, h, lede, dark = false }: { eye: string; h: ReactNode; lede?: ReactNode; dark?: boolean }) {
  return (
    <div className="pp__lead">
      <span className={`aeye${dark ? " aeye--dark" : ""}`}><i /> {eye}</span>
      <h2 className="h2 h2--sm">{h}</h2>
      {lede && <p className={dark ? "bx__lede" : undefined}>{lede}</p>}
    </div>
  );
}

/** Numbered cards, as the brand page's "what you get". */
export function Tiles({ items }: { items: { t: string; line?: string; d: string }[] }) {
  return (
    <div className="bxt">
      {items.map((b, i) => (
        <article key={b.t} className="bxt__card">
          <span className="bxt__n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
          <h3>{b.t}</h3>
          {b.line && <strong>{b.line}</strong>}
          <p>{b.d}</p>
        </article>
      ))}
    </div>
  );
}

/** "Where next" link cards at the foot of a page. */
export function Next({ items }: { items: { t: string; s: string; href: string }[] }) {
  return (
    <ul className="kxn">
      {items.map((x) => (
        <li key={x.href}><Link href={x.href}><strong>{x.t}</strong><span>{x.s}</span><i aria-hidden="true">→</i></Link></li>
      ))}
    </ul>
  );
}

/** The orange quote band every page ends on. */
export function Cta({ title, text = "A free site check, then one fixed price in writing. Six years on our workmanship." }: { title: ReactNode; text?: ReactNode }) {
  return (
    <section className="bxc">
      <div className="wrap bxc__in">
        <div>
          <h2 className="h2 h2--sm">{title}</h2>
          <p>{text}</p>
        </div>
        <div className="bxh__ctas">
          <Link href="/#quote" className="abtn abtn--or abtn--flat">Get a free quote →</Link>
          <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="page-cta">Call (03) 5947 8000</a>
        </div>
      </div>
    </section>
  );
}
