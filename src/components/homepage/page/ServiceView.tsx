import Image from "next/image";
import Link from "next/link";
import type { ServiceContent } from "@/lib/serviceContent";
import type { SystemDetail } from "@/lib/systemDetail";
import { resolveAsset } from "@/lib/publicAsset";

/** A /public path that exists, trying other extensions; the path as given if none does. */
const asset = (src: string) => resolveAsset(src) ?? src;
import { Crumbs, Hero, Head, Tiles, Next, Cta } from "./kit";

type Row = { tier: string; price: string; includes: string; group?: string; photo?: string; photoScene?: boolean; priceKey?: string };
type Sys = NonNullable<ServiceContent["systems"]>[number];

/**
 * Install systems that are also in Find your system, so a service page can
 * send people to the product pages with real options and prices rather than
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

/** Price cards, grouped under their chip so a page covering three trades still reads as three lists. */
export function Prices({ rows }: { rows: Row[] }) {
  if (!rows.length) return null;
  return (
    <div className="kxr">
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
            <p className="kxr__p"><small>{r.priceKey ?? "Installed"}</small>{r.price}</p>
            <ul>{r.includes.split(/,\s*/).filter(Boolean).map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        </article>
      ))}
    </div>
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
function Feature({ f, eye, flip = false }: { f: { heading: string; note?: string; body?: string; photo: string; photoAlt: string; photoScene?: boolean; facts: { v: string; k: string }[] }; eye: string; flip?: boolean }) {
  return (
    <div className={`pxbr${flip ? " kx__flip" : ""}`}>
      <div className={`pxbr__img${f.photoScene ? " pxbr__img--scene" : ""}`}>
        <Image src={asset(f.photo)} alt={f.photoAlt} fill sizes="(max-width: 1000px) 100vw, 640px" />
      </div>
      <div className="pxbr__t">
        <span className="aeye"><i /> {eye}</span>
        <h2 className="h2 h2--sm">{f.heading}</h2>
        <p className="pxbr__sub">{f.note ?? f.body}</p>
        <dl className="kx__facts">{f.facts.map((x) => <div key={x.k}><dd>{x.v}</dd><dt>{x.k}</dt></div>)}</dl>
      </div>
    </div>
  );
}

/** A service: what we do, the kinds of job under it, what it costs, how it runs. */
export function ServiceView({ slug, name, c, choose }: { slug: string; name: string; c: ServiceContent; choose?: { h2: string; lede: string } }) {
  const systems = c.systems ?? [];
  return (
    <div className="ag ag--flat" data-no-reveal>
      <Crumbs trail={[{ name: "Services", href: "/services" }, { name }]} />
      <Hero eye={name} title={c.h1} sub={c.intro} img={c.heroPhoto ? asset(c.heroPhoto) : undefined} imgAlt={c.heroPhotoAlt} facts={c.heroFacts} />

      {systems.length > 0 && (
        <section className="pxs pxs--navy">
          <div className="wrap pp__col">
            <Head dark eye="Choose your system" h={choose?.h2 ?? "Start with the one that brought you here."} lede={choose?.lede} />
            <div className="bxo">
              {systems.map((s) => (
                <Link key={s.id} href={`/services/${slug}/${s.id}`} className="bxo__card">
                  <span className="bxo__img"><Image src={asset(s.photo.src)} alt="" fill sizes="(max-width: 600px) 90vw, 320px" style={s.photo.scene ? { objectFit: "cover", padding: 0 } : undefined} /></span>
                  <span className="bxo__t">
                    <strong>{s.label}</strong>
                    <span className="kx__blurb">{s.blurb}</span>
                    {s.priceFrom && <em>{s.priceFrom}</em>}
                  </span>
                  <i className="bxo__go" aria-hidden="true">→</i>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="pxs pxs--cream">
        <div className="wrap pp__col">
          <Head eye="What's included" h="What you get from us." />
          <Tiles items={c.benefits.map((b) => ({ t: b.t, line: b.line, d: b.d }))} />
        </div>
      </section>

      {c.looks && <section className="pxs"><div className="wrap"><Feature f={c.looks} eye="How it looks" /></div></section>}

      {c.pricing.length > 0 && (
        <section className="pxs pxs--sky" id="prices">
          <div className="wrap pp__col">
            <Head eye="Prices" h="What it costs." lede="Every price includes GST. Your exact price is confirmed in writing after a free site check." />
            <Prices rows={c.pricing} />
          </div>
        </section>
      )}

      {c.steps && c.steps.length > 0 && (
        <section className="pxs pxs--navy">
          <div className="wrap pp__col">
            <div className="lk2__center"><span className="aeye aeye--dark"><i /> How it runs</span><h2 className="h2 h2--sm">From the first call to done.</h2></div>
            <Steps steps={c.steps} />
          </div>
        </section>
      )}

      {c.servicing && <section className="pxs pxs--cream"><div className="wrap"><Feature f={c.servicing} eye="Keeping it working" flip /></div></section>}

      {c.faqs.length > 0 && (
        <section className="pxs" id="faqs">
          <div className="wrap pp__two">
            <Head eye="Questions" h="Before you book." lede={<>Still want a human? <a href="tel:+61359478000" style={{ color: "#050A30" }}>Call (03) 5947 8000</a>.</>} />
            <Faqs faqs={c.faqs} />
          </div>
        </section>
      )}

      <Cta title={`Ready to talk about ${name.toLowerCase()}?`} />
    </div>
  );
}

/** One system under a service: who it suits, where it doesn't, the prices for it alone. */
export function SystemView({ slug, name, s, d, finder }: { slug: string; name: string; s: Sys; d?: SystemDetail; finder?: string }) {
  const title = s.h1 ? <>{s.h1.lead} <em>{s.h1.accent}</em></> : s.label;
  const steps = d?.steps;
  return (
    <div className="ag ag--flat" data-no-reveal>
      <Crumbs trail={[{ name: "Services", href: "/services" }, { name, href: `/services/${slug}` }, { name: s.label }]} />
      <Hero
        eye={`${name} · ${s.label}`} title={title} sub={s.intro ?? s.blurb}
        img={asset(s.photo.src)} imgAlt={s.photo.alt} scene={!!s.photo.scene} ctas={!finder}
      >
        {finder && (
          <div className="bxh__ctas">
            <Link href={`/?find=${finder}#find`} className="abtn abtn--or abtn--flat">See the options and prices →</Link>
            <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="system-hero">Call (03) 5947 8000</a>
          </div>
        )}
      </Hero>

      {(s.bestFor?.length || s.watchOut?.length) ? (
        <section className="pxs">
          <div className="wrap pp__col">
            <Head eye="Is it right for you?" h="Who it suits." />
            <div className="pcx">
              {s.bestFor?.length ? <div className="pcx__col pcx__col--pro"><h3><span aria-hidden="true">+</span> A good fit if</h3><ul>{s.bestFor.map((x) => <li key={x}>{x}</li>)}</ul></div> : null}
              {s.watchOut?.length ? <div className="pcx__col pcx__col--con"><h3><span aria-hidden="true">−</span> Worth knowing</h3><ul>{s.watchOut.map((x) => <li key={x}>{x}</li>)}</ul></div> : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className="pxs pxs--cream">
        <div className="wrap pp__col">
          <Head eye="What's included" h="What you get from us." />
          {s.benefitTiles?.length
            ? <Tiles items={s.benefitTiles.map((b) => ({ t: b.t, line: b.line, d: b.detail }))} />
            : <ul className="pp__hl kx__pts">{s.points.map((p) => <li key={p}><span aria-hidden="true">✓</span>{p}</li>)}</ul>}
        </div>
      </section>

      {s.looks && <section className="pxs"><div className="wrap"><Feature f={s.looks} eye="How it looks" /></div></section>}

      {d?.pricing?.length ? (
        <section className="pxs pxs--sky" id="prices">
          <div className="wrap pp__col">
            <Head eye="Prices" h="What it costs." lede="Every price includes GST. Your exact price is confirmed in writing after a free site check." />
            <Prices rows={d.pricing} />
          </div>
        </section>
      ) : null}

      {steps?.length ? (
        <section className="pxs pxs--navy">
          <div className="wrap pp__col">
            <div className="lk2__center"><span className="aeye aeye--dark"><i /> How it runs</span><h2 className="h2 h2--sm">From the first call to done.</h2></div>
            <Steps steps={steps} />
          </div>
        </section>
      ) : null}

      {s.servicing && <section className="pxs pxs--cream"><div className="wrap"><Feature f={s.servicing} eye="Keeping it working" flip /></div></section>}

      {s.faqs?.length ? (
        <section className="pxs" id="faqs">
          <div className="wrap pp__two">
            <Head eye="Questions" h={`About ${s.label.toLowerCase()}.`} />
            <Faqs faqs={s.faqs} />
          </div>
        </section>
      ) : null}

      <section className="pxs pxs--sky">
        <div className="wrap pp__col">
          <Head eye="Where next" h="Keep going." />
          <Next items={[
            ...(finder ? [{ t: "Options and prices", s: `Every ${s.label.toLowerCase()} we install, with its from price`, href: `/?find=${finder}#find` }] : []),
            { t: `All ${name.toLowerCase()}`, s: "The other jobs under this service", href: `/services/${slug}` },
            { t: "What customers say", s: "Reviews from real jobs", href: "/reviews" },
          ]} />
        </div>
      </section>

      <Cta title={`Ready to talk about ${s.label.toLowerCase()}?`} />
    </div>
  );
}
