import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { ServiceContent } from "@/lib/serviceContent";
import type { SystemDetail } from "@/lib/systemDetail";
import { resolveAsset } from "@/lib/publicAsset";
import { SHOW_PRICES } from "@/lib/homepage/data";

/** A /public path that exists, trying other extensions; the path as given if none does. */
const asset = (src: string) => resolveAsset(src) ?? src;
import { Crumbs, Hero, Tiles, Next } from "./kit";
import { AreaChips } from "./AreasServed";
import { BkMotion } from "../brand/BkMotion";
import "../brand/blocks.css";
import "./service.css";

type Row = { tier: string; price: string; includes: string; group?: string; photo?: string; photoScene?: boolean; priceKey?: string };
type Sys = NonNullable<ServiceContent["systems"]>[number];

/**
 * Install systems that are also in Find your system, so a service page can
 * send people to the product pages with the real options rather than
 * re-listing them.
 */
export const FINDER_FOR: Record<string, string> = {
  "air-conditioning-installation/split": "split-system",
  "air-conditioning-installation/reverse-cycle": "reverse-cycle-split",
  "air-conditioning-installation/multi": "multi-head",
  "air-conditioning-installation/ducted": "ducted",
  "air-conditioning-installation/evap": "evaporative",
  "heat-pump-installation/split-heat-pump": "heat-pump",
  "heat-pump-installation/all-in-one": "heat-pump",
  "gas-plumbing/gas-ducted": "gas-ducted-heating",
  "gas-plumbing/continuous-flow": "gas-continuous-flow",
};

/**
 * Price cards, grouped under their chip so a page covering three trades still reads as three lists.
 *
 * With SHOW_PRICES off the cards stay, because what each job includes is
 * still worth reading, but the figure gives way to how it's priced. The
 * rows keep their prices for the day they are switched back on.
 */
export function Prices({ rows }: { rows: Row[] }) {
  if (!rows.length) return null;
  return (
    <div className="kxr" data-anim="stagger">
      {rows.map((r) => (
        <article key={r.tier} className="kxr__card">
          {r.photo && (
            <span className={`kxr__img${r.photoScene ? " kxr__img--scene" : ""}`}>
              <Image src={asset(r.photo)} alt="" fill sizes="(max-width: 600px) 90vw, 280px" />
            </span>
          )}
          <div className="kxr__t">
            {r.group && <span className="kxr__g">{r.group}</span>}
            <h3>{r.tier}</h3>
            {SHOW_PRICES
              ? <p className="kxr__p"><small>{r.priceKey ?? "Installed"}</small>{r.price}</p>
              : <p className="kxr__p kxr__p--quote"><small>Price</small>Fixed, in writing</p>}
            <ul>{r.includes.split(/,\s*/).filter(Boolean).map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        </article>
      ))}
    </div>
  );
}

function PricesHead() {
  return SHOW_PRICES
    ? <BkHead h="What it {costs}.">Every price includes GST. Your exact price is confirmed in writing after a free site check.</BkHead>
    : <BkHead h="What each job {covers}.">Every job is priced after a free site check, on a fixed written quote including GST. It only changes if the job does, and we tell you before it does.</BkHead>;
}

/** A heading with one part in colour, as the product and brand pages set them: the coloured part is in braces. */
function accent(text: string) {
  return text.split(/[{}]/).map((part, i) => (i % 2 ? <span key={i}>{part}</span> : part));
}

/** Content headings carry no braces: colour the last word, as the product page's "How it works" does. */
const lastWord = (h: string) => (/[{}]/.test(h) ? h : h.replace(/(\S+?)([.?!]?)$/, "{$1}$2"));

/** The product page's section head: the heading, and a line under it. */
function BkHead({ h, children }: { h: string; children?: ReactNode }) {
  return (
    <header className="bk__head">
      <h2 className="h2">{accent(h)}</h2>
      {children && <p>{children}</p>}
    </header>
  );
}

function Faqs({ faqs }: { faqs: { q: string; a: string }[] }) {
  return <div className="afaqs">{faqs.map((f) => <details key={f.q} className="afaq"><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>;
}

function Steps({ steps }: { steps: { title: string; detail: string }[] }) {
  return (
    <ol className="lk2__tl kx__tl">
      {steps.slice(0, 4).map((s, i) => <li key={s.title}><span className="pxb__n" aria-hidden="true">{i + 1}</span><h3>{s.title}</h3><p>{s.detail}</p></li>)}
    </ol>
  );
}

/** A photo one side, words and figures the other: "how it looks" and "keeping it working". */
function Feature({ f, flip = false }: { f: { heading: string; note?: string; body?: string; photo: string; photoAlt: string; photoScene?: boolean; facts: { v: string; k: string }[] }; flip?: boolean }) {
  return (
    <div className={`pxbr${flip ? " kx__flip" : ""}`}>
      <div className={`pxbr__img${f.photoScene ? " pxbr__img--scene" : ""}`}>
        <Image src={asset(f.photo)} alt={f.photoAlt} fill sizes="(max-width: 1000px) 100vw, 640px" />
      </div>
      <div className="pxbr__t">
        <h2 className="h2">{accent(lastWord(f.heading))}</h2>
        <p className="pxbr__sub">{f.note ?? f.body}</p>
        <dl className="kx__facts" data-anim="stagger">{f.facts.map((x) => <div key={x.k}><dd>{x.v}</dd><dt>{x.k}</dt></div>)}</dl>
      </div>
    </div>
  );
}

/**
 * One full-width band of the page. Service pages are built from optional
 * parts (one has a "how it looks", another doesn't), so the light bands are
 * toned white and cream in turn as they come, rather than fixed per section:
 * fixed tones put two creams together whenever the white between them was
 * missing. Navy bands are fixed, as they are on the product page.
 */
type Band = { id?: string; tab?: string; navy?: boolean; cls?: string; body: ReactNode | ((tone: "white" | "cream") => ReactNode) };

function Bands({ list }: { list: Band[] }) {
  let k = 0;
  return (
    <>
      {list.map((b, i) => {
        const tone = b.navy ? "navy" : k++ % 2 ? "cream" : "white";
        return (
          <section key={b.id ?? i} className={`bk__sec bk__sec--${tone}`} id={b.id}>
            <div className="wrap"><div className={`bk__blk ${b.cls ?? "bk__col"}`}>
              {typeof b.body === "function" ? b.body(tone === "navy" ? "white" : tone) : b.body}
            </div></div>
          </section>
        );
      })}
    </>
  );
}

/** The tabs under the hero, one per band that has one. */
function Tabs({ list }: { list: Band[] }) {
  const tabs = list.filter((b) => b.id && b.tab);
  if (tabs.length < 3) return null;
  return (
    <nav className="pxt" aria-label="On this page">
      <div className="wrap pxt__in">{tabs.map((b) => <a key={b.id} href={`#${b.id}`}>{b.tab}</a>)}</div>
    </nav>
  );
}

/** The suburbs nearest the workshop, as a band of the page. */
function Areas({ what }: { what: string }) {
  return (
    <>
      <BkHead h={`${what} in Pakenham and {the suburbs around it}.`}>
        Our own crews, out of the Sierra Circuit workshop in Pakenham, cover everywhere within about 75 km. These are the suburbs nearest it; each page has the drive time and the jobs we usually do there.
      </BkHead>
      <AreaChips />
    </>
  );
}

/** The quote box every product page ends on. */
function EndCta({ title }: { title: ReactNode }) {
  return (
    <section className="bk__sec bk__sec--white bk__sec--end">
      <div className="wrap">
        <div className="bk__box bk__box--acc bk__cta">
          <div>
            <h2 className="bk__boxh">{title}</h2>
            <p>A free site check, then one fixed price in writing. Six years on our workmanship.</p>
          </div>
          <div className="bxh__ctas">
            <Link href="/quote" className="abtn abtn--or abtn--flat">Get a free quote →</Link>
            <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="page-cta">Call (03) 5947 8000</a>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The page root. The product pages' bands (Jake, Nov 2026: the service pages
 * should match them), so .bk for the band styles and BkMotion for the cards
 * rising in turn. The accent is the site's orange: a service has no brand
 * colour of its own.
 */
function Root({ children }: { children: ReactNode }) {
  return (
    // .bk inside .ag, not on it: the band styles are written as ".ag .bk …",
    // as the product page nests them.
    <div className="ag ag--flat" data-no-reveal>
      <div className="bk svk" style={{ ["--acc" as string]: "#C2521A" }}>
        <BkMotion />
        {children}
      </div>
    </div>
  );
}

/** A service: what we do, the kinds of job under it, what it costs, how it runs. */
export function ServiceView({ slug, name, c, choose }: { slug: string; name: string; c: ServiceContent; choose?: { h2: string; lede: string } }) {
  const systems = c.systems ?? [];
  const bands: Band[] = [
    ...(systems.length ? [{
      id: "systems", tab: "Choose your system", navy: true,
      body: (
        <>
          <BkHead h={choose?.h2 ?? "Start with the one that {brought you here}."}>{choose?.lede}</BkHead>
          <div className="bxo" data-anim="stagger">
            {systems.map((s) => (
              <Link key={s.id} href={`/services/${slug}/${s.id}`} className="bxo__card">
                <span className="bxo__img"><Image src={asset(s.photo.src)} alt="" fill sizes="(max-width: 600px) 90vw, 320px" style={s.photo.scene ? { objectFit: "cover", padding: 0 } : undefined} /></span>
                <span className="bxo__t">
                  <strong>{s.label}</strong>
                  <span className="kx__blurb">{s.blurb}</span>
                  {SHOW_PRICES && s.priceFrom && <em>{s.priceFrom}</em>}
                </span>
                <i className="bxo__go" aria-hidden="true">→</i>
              </Link>
            ))}
          </div>
        </>
      ),
    }] : []),
    {
      id: "included", tab: "What's included",
      body: (
        <>
          <BkHead h="What you {get} from us." />
          <Tiles anim items={c.benefits.map((b) => ({ t: b.t, line: b.line, d: b.d }))} />
        </>
      ),
    },
    ...(c.looks ? [{ id: "looks", tab: "How it looks", cls: "", body: <Feature f={c.looks} /> }] : []),
    ...(c.pricing.length ? [{ id: "prices", tab: SHOW_PRICES ? "Prices" : "Pricing", body: <><PricesHead /><Prices rows={c.pricing} /></> }] : []),
    ...(c.steps?.length ? [{
      id: "how", tab: "How it runs", navy: true,
      body: <><BkHead h="From the first call to {done}." /><Steps steps={c.steps} /></>,
    }] : []),
    ...(c.servicing ? [{ id: "servicing", tab: "Servicing", cls: "", body: <Feature f={c.servicing} flip /> }] : []),
    ...(c.faqs.length ? [{
      id: "faqs", tab: "FAQs", cls: "pp__two",
      body: (
        <>
          <BkHead h="Before you {book}.">Still want a human? <a href="tel:+61359478000" data-call-from="service-faq">Call (03) 5947 8000</a>.</BkHead>
          <Faqs faqs={c.faqs} />
        </>
      ),
    }] : []),
    { body: <Areas what={name} /> },
  ];
  return (
    <Root>
      <Crumbs trail={[{ name: "Services", href: "/services" }, { name }]} />
      <Hero eye={name} title={c.h1} sub={c.intro} img={c.heroPhoto ? asset(c.heroPhoto) : undefined} imgAlt={c.heroPhotoAlt} facts={c.heroFacts} />
      <Tabs list={bands} />
      <Bands list={bands} />
      <EndCta title={<>Ready to talk about <span>{name.toLowerCase()}</span>?</>} />
    </Root>
  );
}

/** One system under a service: who it suits, where it doesn't, the prices for it alone. */
export function SystemView({ slug, name, s, d, finder }: { slug: string; name: string; s: Sys; d?: SystemDetail; finder?: string }) {
  const title = s.h1 ? <>{s.h1.lead} <em>{s.h1.accent}</em></> : s.label;
  const steps = d?.steps;
  const label = s.label.toLowerCase();
  const bands: Band[] = [
    ...(s.bestFor?.length || s.watchOut?.length ? [{
      id: "fit", tab: "Who it suits",
      body: (
        <>
          <BkHead h="Who it {suits}." />
          <div className="pcx">
            {s.bestFor?.length ? <div className="pcx__col pcx__col--pro"><h3><span aria-hidden="true">+</span> A good fit if</h3><ul>{s.bestFor.map((x) => <li key={x}>{x}</li>)}</ul></div> : null}
            {s.watchOut?.length ? <div className="pcx__col pcx__col--con"><h3><span aria-hidden="true">−</span> Worth knowing</h3><ul>{s.watchOut.map((x) => <li key={x}>{x}</li>)}</ul></div> : null}
          </div>
        </>
      ),
    }] : []),
    {
      id: "included", tab: "What's included",
      body: (
        <>
          <BkHead h="What you {get} from us." />
          {s.benefitTiles?.length
            ? <Tiles anim items={s.benefitTiles.map((b) => ({ t: b.t, line: b.line, d: b.detail }))} />
            : <ul className="pp__hl kx__pts">{s.points.map((p) => <li key={p}><span aria-hidden="true">✓</span>{p}</li>)}</ul>}
        </>
      ),
    },
    ...(s.looks ? [{ id: "looks", tab: "How it looks", cls: "", body: <Feature f={s.looks} /> }] : []),
    ...(d?.pricing?.length ? [{ id: "prices", tab: SHOW_PRICES ? "Prices" : "Pricing", body: <><PricesHead /><Prices rows={d.pricing} /></> }] : []),
    ...(steps?.length ? [{
      id: "how", tab: "How it runs", navy: true,
      body: <><BkHead h="From the first call to {done}." /><Steps steps={steps} /></>,
    }] : []),
    ...(s.servicing ? [{ id: "servicing", tab: "Servicing", cls: "", body: <Feature f={s.servicing} flip /> }] : []),
    ...(s.faqs?.length ? [{
      id: "faqs", tab: "FAQs", cls: "pp__two",
      body: <><BkHead h={`About ${label}, {before you book}.`} /><Faqs faqs={s.faqs} /></>,
    }] : []),
    {
      id: "next", tab: "Where next",
      body: (
        <>
          <BkHead h="Keep {going}." />
          <Next items={[
            ...(finder ? [{ t: "The options", s: `Every ${label} we install, side by side`, href: `/find/${finder}` }] : []),
            { t: `All ${name.toLowerCase()}`, s: "The other jobs under this service", href: `/services/${slug}` },
            { t: "What customers say", s: "Reviews from real jobs", href: "/reviews" },
          ]} />
        </>
      ),
    },
    { body: <Areas what={s.label} /> },
  ];
  return (
    <Root>
      <Crumbs trail={[{ name: "Services", href: "/services" }, { name, href: `/services/${slug}` }, { name: s.label }]} />
      <Hero
        eye={`${name} · ${s.label}`} title={title} sub={s.intro ?? s.blurb}
        img={asset(s.photo.src)} imgAlt={s.photo.alt} scene={!!s.photo.scene} ctas={!finder}
      >
        {finder && (
          <div className="bxh__ctas">
            <Link href={`/find/${finder}`} className="abtn abtn--or abtn--flat">See the options →</Link>
            <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="system-hero">Call (03) 5947 8000</a>
          </div>
        )}
      </Hero>
      <Tabs list={bands} />
      <Bands list={bands} />
      <EndCta title={<>Ready to talk about <span>{label}</span>?</>} />
    </Root>
  );
}
