"use client";

import Image from "next/image";
import Link from "next/link";
import { money, installTime } from "@/lib/homepage/data";
import type { PV } from "./parts";
import "./stage.css";

/**
 * The /find product page's header, Key features and Resources, after the
 * mock-up Jake liked (Nov 2026): the unit floating over a navy stage with
 * air coming off it, the name large and centred under it, and everything
 * to pick and book in cards along the bottom.
 */

/** "Main bedroom or small lounge" → "Main bedroom": the first room is enough on a button. */
const shortRoom = (sub: string) => sub.split(/ or |, /)[0];

/** "Usually half a day for a back-to-back install" → "½ day", for a small tile. */
function shortInstall(s: string): string | null {
  const x = s.replace(/^Usually /, "").replace(/ for .*$/, "");
  if (/site check/i.test(x)) return null;
  return x.replace(/^half a day$/, "½ day").replace(/^(a full|one) day$/, "1 day").replace(/ hours$/, " hrs");
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function StageHero({ v }: { v: PV }) {
  const { t, sys, cat, models, mi, ans, model, room } = v;
  const air = cat.id !== "hw";
  const chip = model?.chip ?? (ans.size != null ? sys.sizes[ans.size]?.spec : undefined);
  const install = shortInstall(installTime(sys));
  // The tiles: our warranty, the install time, then what the model's record states (star rating, Wi-Fi).
  // The maker's warranty leads where the record states one (Jake, Nov 2026:
  // Kaden's seven years should be seen), with ours beside it.
  const maker = v.badges.find((b) => b.kind === "warranty");
  const tiles = [
    ...(maker ? [{ big: maker.big, small: /^(?:(?:parts|[a-z ]*manufacturer) )?warranty$/.test(maker.small) ? "Manufacturer warranty" : cap(maker.small) }] : []),
    { big: "6 yr", small: "Workmanship warranty" },
    ...(install ? [{ big: install, small: "Typical install" }] : []),
    ...v.badges.filter((b) => b.kind !== "warranty").map((b) => ({ big: b.big, small: cap(b.small) })),
  ].slice(0, 4);
  const blurb = v.take.split(/(?<=\.)\s/)[0];

  return (
    <section className="stg" ref={v.heroRef}>
      {/* Only a real install photo goes behind: the drawn rooms have their own unit in them, which doubled up with the one on stage. */}
      {room.ours && !room.studio && <Image key={room.src} src={room.src} alt="" fill priority sizes="100vw" className="stg__bg" style={{ objectPosition: room.pos }} />}
      <span className="stg__shade" aria-hidden="true" />

      <div className="wrap stg__in">
        <div className={`stg__unit${air ? "" : " stg__unit--tall"}`}>
          <span className="stg__panel"><Image src={t.img} alt={`${t.brand} ${t.model}`} fill priority sizes="420px" /></span>
          {air && (
            // Short lines, and the name set below them rather than pulled up
            // over them: a long name or one that wraps used to run into the
            // air (Jake, Nov 2026), so the heading now moves with its own size.
            <svg className="stg__air" viewBox="0 0 420 90" aria-hidden="true">
              <path d="M70 0 C 56 28, 30 50, -6 76" />
              <path d="M150 0 C 144 32, 132 56, 116 84" />
              <path d="M210 0 C 210 34, 210 60, 210 90" />
              <path d="M270 0 C 276 32, 288 56, 304 84" />
              <path d="M350 0 C 364 28, 390 50, 426 76" />
            </svg>
          )}
        </div>

        <h1 className="stg__h1">
          <span className="stg__brand">{t.brand}</span> {t.model}{chip && <> <span className="stg__chip" key={chip}>{chip}</span></>}
        </h1>

        {/* One row of cards under the name, kept short so the tab bar is on the first screen (Jake, Nov 2026). */}
        <div className="stg__bar">
          <div className="stg__card stg__about">
            <ul className="stg__tiles" aria-label="At a glance">
              {tiles.map((x, i) => <li key={x.small} style={{ animationDelay: `${0.4 + i * 0.12}s` }}><b>{x.big}</b><span>{x.small}</span></li>)}
            </ul>
            <h2>{model?.bestFor ?? sys.sub}</h2>
            <p>{blurb}</p>
          </div>

          <div className="stg__card stg__pick">
            <div className="stg__pickhead">
              <span id="stg-size">{models.length ? "Model" : "Size"}</span>
              {v.modelKeys.length > 0 && (
                <dl aria-live="polite">
                  {v.modelKeys.slice(0, 2).map((k) => <div key={k.label}><dd>{k.value}</dd><dt>{k.label}</dt></div>)}
                </dl>
              )}
            </div>
            <div className="stg__sizes" role="group" aria-labelledby="stg-size" style={{ ["--n" as string]: models.length || sys.sizes.length }}>
              {models.length > 0
                ? models.map((m, i) => {
                  // Head counts carry no room under them: the nearest band read
                  // "Four" under the 5 and 6 head buttons, and "Two indoor
                  // heads" under "2 heads" only says it twice.
                  const r = sys.slug === "multi-head" ? null : v.roomOf(m.chip);
                  return (
                    <button key={m.slug} type="button" className={i === mi ? "on" : ""} onClick={() => v.pickModel(m.slug)} aria-pressed={i === mi}>
                      <strong>{m.chip}</strong>{r && <small>{shortRoom(r)}</small>}
                    </button>
                  );
                })
                : sys.sizes.map((z, i) => (
                  <button key={z.label} type="button" className={i === ans.size ? "on" : ""} onClick={() => v.setSize(i)} aria-pressed={i === ans.size}>
                    <strong>{z.label}</strong>{z.sub && <small>{shortRoom(z.sub)}</small>}
                  </button>
                ))}
            </div>
            <span className="stg__code">{model?.code ?? t.model} · {t.tier} option · {cat.label}</span>
            {v.newBuildHp && <p className="stg__note">The VEU rebate is for replacing an existing gas or electric system, so it usually won&apos;t apply to a new build. We&apos;ll confirm at the site check.</p>}
          </div>

          <div className="stg__right">
            <Link href={v.book} className="stg__side stg__side--go">
              <span className="stg__ico stg__ico--or" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v12H8l-4 4z" /></svg>
              </span>
              <span className="stg__st"><small>{v.known ? `From ${money(t.price!)} installed` : "Written quote in 12 hrs"}</small><b>Quote this model</b></span>
              <span className="stg__plus" aria-hidden="true">+</span>
            </Link>
            <Link href="/about" className="stg__side">
              <span className="stg__ico stg__ico--navy" aria-hidden="true">AGA</span>
              <span className="stg__st"><small>Supplied &amp; installed by</small><b>Advanced Gas &amp; Aircon</b></span>
              <span className="stg__plus" aria-hidden="true">+</span>
            </Link>
          </div>
        </div>
      </div>
      {room.ours && !room.studio && <span className="stg__cap">Behind: one of our installs</span>}
    </section>
  );
}

/**
 * Up to four of the model's features as photo cards, laid out like the brand
 * page's "Why we choose it": the photo, then the figure in the brand's
 * colour where there is one, the title and the detail.
 */
export function KeyFeatures({ v }: { v: PV }) {
  const items = v.features.slice(0, 4);
  if (items.length < 3) return null;
  const name = v.model?.code ?? v.t.model;
  // Cream when the white How it works band follows, so two white bands don't run together.
  return (
    <section className={`bk__sec bk__sec--${v.learn ? "cream" : "white"}`} id="features">
      <div className="wrap"><div className="bk__blk bk__col">
        <header className="bk__head">
          <h2 className="h2">Key <span>features</span>.</h2>
          <p>The short version of what the {name} does. The full figures are in the specs further down.</p>
        </header>
        <ul className="bk__reasons stf" data-n={items.length} data-anim="stagger">
          {items.map((x, i) => (
            <li key={x.h} className="bk__card">
              {x.img && (
                <span className={`bk__cimg${x.cover ? " bk__cimg--cover" : ""}`}>
                  <Image src={x.img} alt={x.alt ?? ""} fill sizes="(max-width: 600px) 90vw, (max-width: 1000px) 45vw, 320px" />
                </span>
              )}
              <span className="bk__ctxt">
                {x.v ? <b>{x.v}</b> : <i className="stf__n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</i>}
                <strong>{x.h}</strong>
                {x.p && <span>{x.p}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div></div>
    </section>
  );
}

const Down = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M12 4v14M6 12l6 6 6-6M4 21h16" /></svg>
);
const Out = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
);

/**
 * Brochures, manuals and warranties. Files we host come first; with none
 * yet, the brand's own site (where its brochures and manuals live), the
 * spec sheet that comes with the quote, and the two warranties.
 */
export function Resources({ v }: { v: PV }) {
  const { brand, t, docs } = v;
  const site = brand?.site;
  // "5-year manufacturer parts + labour, plus 6 years on our workmanship." → the maker's part only.
  const maker = brand?.warranty?.split(/\s*(?:\+|,? plus)\s*6[- ]year/i)[0].replace(/[.,;]\s*$/, "");
  const name = v.model?.code ?? t.model;
  // The empty PDF frames are off on previews too now (Jake wants no empty
  // places); real files appear here as soon as they're in lib/homepage/docs.ts.
  const slots = false;

  return (
    <section className="bk__sec bk__sec--cream str" id="resources">
      <div className="wrap"><div className="bk__blk bk__col">
        <header className="bk__head">
          <h2 className="h2">Brochures, manuals and <span>warranties</span>.</h2>
          <p>Where to find the paperwork for the {name}, and what each warranty covers.</p>
        </header>
        <div className="str__grid" data-n={docs.length + (docs.length === 0 && site ? 1 : 0) + 2 + (maker ? 1 : 0) + (slots ? 2 : 0)}>
          {docs.map((d) => (
            <article key={d.href} className="str__card">
              <div className="str__top"><span className="str__tag">{d.kind}</span><span className="str__fmt">PDF</span></div>
              <h3>{d.title}</h3>
              <a className="str__dl" href={d.href} download>Download <Down /></a>
            </article>
          ))}
          {docs.length === 0 && site && (
            <article className="str__card">
              <div className="str__top"><span className="str__tag">Manufacturer</span><span className="str__fmt">Website</span></div>
              <h3>{t.brand} brochures, manuals and spec sheets</h3>
              <a className="str__dl" href={site.href} target="_blank" rel="noopener noreferrer">On {t.brand}&apos;s site <Out /></a>
            </article>
          )}
          <article className="str__card">
            <div className="str__top"><span className="str__tag">Specification</span></div>
            <h3>The spec sheet for the {name}</h3>
            <Link className="str__dl" href={v.book}>Comes with your quote <Out /></Link>
          </article>
          {maker && (
            <article className="str__card">
              <div className="str__top"><span className="str__tag">Warranty</span></div>
              <h3>{t.brand}: {maker}</h3>
              {site ? <a className="str__dl" href={site.href} target="_blank" rel="noopener noreferrer">Warranty terms <Out /></a> : <Link className="str__dl" href={v.book}>On your quote <Out /></Link>}
            </article>
          )}
          <article className="str__card str__card--navy">
            <div className="str__top"><span className="str__tag">AGA</span></div>
            <h3>Advanced Gas &amp; Aircon workmanship warranty (6 yrs)</h3>
            <Link className="str__dl" href="/about#guarantees">What it covers <Out /></Link>
          </article>
          {/* Preview only: where the PDFs go once Jake sends them (lib/homepage/docs.ts). */}
          {slots && ["Brochure", "Operation manual"].map((k) => (
            <article key={k} className="str__card str__card--slot">
              <div className="str__top"><span className="str__tag">{k}</span><span className="str__fmt">PDF</span></div>
              <h3>{name} {k.toLowerCase()}</h3>
              <span className="str__dl">Slot for the PDF · preview only</span>
            </article>
          ))}
        </div>
      </div></div>
    </section>
  );
}
