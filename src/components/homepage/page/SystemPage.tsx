import Image from "next/image";
import Link from "next/link";
import {
  type Category, type System, galleryFor, heroFor, installTime, productHref, realOption, money, weekly,
  PRODUCT_FAQS, SHOW_FINANCE, FINANCE_MONTHS, TONES, WORKMANSHIP,
} from "@/lib/homepage/data";
import { LEARN, SYS_INTRO, SYS_PROS } from "@/lib/homepage/learn";
import { Crumbs, Hero, Head, Next, Cta } from "./kit";

/**
 * A system's own page (/find/split-system and so on), where the header's
 * product links land: what this kind of system is, how it works, what it's
 * good and bad at, then the three options we install, each opening its
 * product page. Choosing comes after understanding, which is the order the
 * finder can't give on its own.
 *
 * Everything here reads from the same records as the finder and the product
 * pages (homepage/data.ts and learn.ts), so the three can't drift apart.
 */
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

export function SystemPage({ cat, sys }: { cat: Category; sys: System }) {
  const learn = LEARN[sys.slug];
  const pc = SYS_PROS[sys.slug];
  const first = sys.tiers.find((t) => !t.same) ?? sys.tiers[0];
  const gal = galleryFor(sys, first);
  const hero = heroFor(sys, first);
  const prices = sys.tiers.map((t) => t.price).filter((p): p is number => typeof p === "number");
  const from = prices.length ? Math.min(...prices) : null;
  const brands = [...new Set(sys.tiers.map((t) => t.brand))];
  const others = cat.systems.filter((s) => s.slug !== sys.slug);
  const lower = sys.label.toLowerCase();
  const sizedByRoom = cat.id !== "hw" && /room/i.test(sys.q);

  return (
    <div className="ag ag--flat" data-no-reveal>
      <Crumbs trail={[{ name: cat.label, href: `/?find=${cat.id}#find` }, { name: sys.label }]} back={{ label: "Find yours in a few taps →", href: `/?find=${sys.slug}#find` }} />
      <Hero
        eye={`${cat.label} · ${sys.sub}`} title={sys.label} sub={SYS_INTRO[sys.slug] ?? sys.sub}
        img={hero.src} imgAlt={hero.alt} ctas={false}
        facts={[
          ...(from != null ? [{ v: `From ${money(from)}`, k: SHOW_FINANCE ? `Installed, or $${weekly(from, FINANCE_MONTHS)}/wk` : "Installed, GST included" }] : []),
          { v: `${sys.tiers.length} options`, k: brands.join(", ") },
          { v: cap(installTime(sys).replace(/^Usually /, "").replace(/ for a .*$/, "")), k: "Install time" },
          { v: "6 years", k: "On our workmanship" },
        ]}
      >
        <div className="bxh__ctas">
          <a href="#options" className="abtn abtn--or abtn--flat">See the {sys.tiers.length} options ↓</a>
          <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="system-hero">Call (03) 5947 8000</a>
        </div>
      </Hero>

      <nav className="pxt" aria-label="On this page">
        <div className="wrap pxt__in">
          {[...(learn ? [["fit", "Who it suits"], ["how", "How it works"]] : []), ...(pc ? [["pros", "Pros & cons"]] : []), ["options", "The options"], ["sizes", "Sizes"], ["faqs", "FAQs"]].map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}
        </div>
      </nav>

      {learn && (
        <section className="pxs" id="fit">
          <div className="wrap pp__col">
            <Head eye="Is it right for you?" h={`Who a ${lower} suits.`} />
            <div className="pcx">
              <div className="pcx__col pcx__col--pro">
                <h3><span aria-hidden="true">✓</span> A good fit if</h3>
                <ul>{learn.good.map((g) => <li key={g}>{g}</li>)}</ul>
              </div>
              {learn.alt.length > 0 && (
                <div className="pcx__col pcx__col--con">
                  <h3><span aria-hidden="true">→</span> Look elsewhere if</h3>
                  <ul className="sxw__alt">
                    {learn.alt.map((a) => <li key={a.if}><Link href={`/find/${a.go}`}>{cap(a.if)}: <b>{a.label.toLowerCase()} →</b></Link></li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {learn && (
        <section className="lk2__story" id="how">
          <div className="wrap">
            <div className="lk2__storyhead"><span className="aeye"><i /> How it works</span><h2 className="h2">How a {lower} works.</h2></div>
            {learn.how.map((x, i) => {
              const img = gal[i % gal.length];
              return (
                <div key={x.t} className={`lk2__row${i % 2 ? " lk2__row--flip" : ""}`}>
                  <div className={`lk2__rowimg${img.kind === "p" ? " lk2__rowimg--prod" : ""}`}>
                    <Image src={img.src} alt={img.alt} fill sizes="(max-width: 900px) 100vw, 640px" />
                    {img.kind === "c" && <span className="pm__cap">One of our installs</span>}
                  </div>
                  <div className="lk2__rowt"><span>{String(i + 1).padStart(2, "0")}</span><h3>{x.t}</h3><p>{x.d}</p></div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {pc && (
        <section className="pxs" id="pros">
          <div className="wrap pp__col">
            <Head eye="Pros & cons" h={`The honest bit about ${lower}s.`} lede="True of every one we install. Each option's own strengths and limits are on its page." />
            <div className="pcx">
              <div className="pcx__col pcx__col--pro"><h3><span aria-hidden="true">+</span> What it does well</h3><ul>{pc.pros.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div className="pcx__col pcx__col--con"><h3><span aria-hidden="true">−</span> Worth knowing</h3><ul>{pc.cons.map((x) => <li key={x}>{x}</li>)}</ul></div>
            </div>
          </div>
        </section>
      )}

      <section className="pxs pxs--navy" id="options">
        <div className="wrap pp__col">
          <Head dark eye="The options" h={`The ${sys.tiers.length} ${lower} options we install.`} lede="Each has its own page: how it works, its pros and cons, which size to choose, the specs and the brand behind it." />
          <div className="sxo">
            {sys.tiers.map((t, i) => {
              const real = realOption(sys, t);
              const feats = t.feats.filter((f) => f !== WORKMANSHIP);
              return (
                <article key={t.slug} className="sxo__card">
                  <span className="sxo__tier"><i style={{ background: TONES[i] }} aria-hidden="true" />{t.tier}</span>
                  <span className="sxo__img"><Image src={t.img} alt="" fill sizes="(max-width: 900px) 90vw, 400px" /></span>
                  <span className="sxo__brand">{t.brand}</span>
                  <h3>{t.model}</h3>
                  {typeof t.price === "number" && (
                    <p className="sxo__price">From {money(t.price)}{SHOW_FINANCE && <small> or ${weekly(t.price, FINANCE_MONTHS)}/wk</small>}</p>
                  )}
                  <ul className="pp__hl">{feats.map((f) => <li key={f}><span aria-hidden="true">✓</span>{f}</li>)}</ul>
                  <Link href={productHref(sys, t, {})} className="abtn abtn--or abtn--flat sxo__go">
                    {real.tier !== t ? `About the ${real.tier.brand} ${real.tier.model}` : `About the ${t.model}`} →
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="pxs pxs--sky" id="sizes">
        <div className="wrap pp__two">
          <Head
            eye="Sizes" h="What size do you need?"
            lede={<>{sizedByRoom ? "Sized to the room, not the catalogue. " : ""}A rough guide only: we confirm the size at the free site check{sizedByRoom ? <>, or <Link href="/tools/sizing-calculator" style={{ color: "#050A30" }}>work it out yourself</Link></> : ""}.</>}
          />
          <dl className="sxz">
            {sys.sizes.map((z) => (
              <div key={z.label} className="sxz__row">
                <dt><strong>{z.label}</strong>{z.sub && <small>{z.sub}</small>}</dt>
                {z.spec && <dd>{z.spec}</dd>}
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="pxs" id="faqs">
        <div className="wrap pp__two">
          <Head eye="Questions" h={`About ${lower}s.`} lede={<>Still want a human? <a href="tel:+61359478000" data-call-from="system-faq" style={{ color: "#050A30" }}>Call (03) 5947 8000</a>.</>} />
          <div className="afaqs">{PRODUCT_FAQS[sys.faq].map((f) => <details key={f.q} className="afaq"><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
        </div>
      </section>

      <section className="pxs pxs--cream">
        <div className="wrap pp__col">
          <Head eye="Where next" h="Keep going." />
          <Next items={[
            { t: "Find the right one for your home", s: "A few quick questions, then your options side by side", href: `/?find=${sys.slug}#find` },
            ...others.map((o) => ({ t: o.label, s: o.sub, href: `/find/${o.slug}` })),
          ]} />
        </div>
      </section>

      <Cta title={`Ready to talk about a ${lower}?`} />
    </div>
  );
}
