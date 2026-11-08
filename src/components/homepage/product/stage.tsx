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
  const tiles = [
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
            <svg className="stg__air" viewBox="0 0 420 260" aria-hidden="true">
              <path d="M70 0 C 50 80, 10 140, -50 210" />
              <path d="M150 0 C 140 90, 120 160, 90 240" />
              <path d="M210 0 C 210 100, 210 170, 210 260" />
              <path d="M270 0 C 280 90, 300 160, 330 240" />
              <path d="M350 0 C 370 80, 410 140, 470 210" />
            </svg>
          )}
        </div>

        <h1 className="stg__h1">
          <span className="stg__brand">{t.brand}</span> {t.model}{chip && <> <span className="stg__chip" key={chip}>{chip}</span></>}
        </h1>

        <div className="stg__split">
          <div className="stg__left">
            <ul className="stg__tiles" aria-label="At a glance">
              {tiles.map((x, i) => <li key={x.small} style={{ animationDelay: `${0.4 + i * 0.12}s` }}><b>{x.big}</b><span>{x.small}</span></li>)}
            </ul>

            <div className="stg__card stg__about">
              <h2>{model?.bestFor ?? sys.sub}</h2>
              <p>{blurb}</p>
              <span className="stg__code">{model?.code ?? t.model} · {t.tier} option · {cat.label}</span>
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
                    const r = v.roomOf(m.chip);
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
              {v.newBuildHp && <p className="stg__note">The VEU rebate is for replacing an existing gas or electric system, so it usually won&apos;t apply to a new build. We&apos;ll confirm at the site check.</p>}
            </div>
          </div>

          <div className="stg__right">
            <Link href="/about" className="stg__side">
              <span className="stg__ico stg__ico--navy" aria-hidden="true">AGA</span>
              <span className="stg__st"><small>Supplied &amp; installed by</small><b>Advanced Gas &amp; Aircon</b></span>
              <span className="stg__plus" aria-hidden="true">+</span>
            </Link>
            <Link href={v.book} className="stg__side">
              <span className="stg__ico stg__ico--or" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v12H8l-4 4z" /></svg>
              </span>
              <span className="stg__st"><small>{v.known ? `From ${money(t.price!)} installed` : "Written quote in 12 hrs"}</small><b>Quote this model</b></span>
              <span className="stg__plus" aria-hidden="true">+</span>
            </Link>
          </div>
        </div>
      </div>
      {room.ours && !room.studio && <span className="stg__cap">Behind: one of our installs</span>}
    </section>
  );
}

/** Up to four of the model's features as picture cards, the title on the card and the detail under it. */
export function KeyFeatures({ v }: { v: PV }) {
  const items = v.features.slice(0, 4);
  if (items.length < 3) return null;
  return (
    <section className="pxs stf" id="features">
      <div className="wrap stf__in">
        <h2 className="stg__sh">Key features</h2>
        <div className="stf__grid" data-n={items.length}>
          {items.map((x, i) => (
            <article key={x.h} className="stf__card">
              <div className={`stf__img stf__img--${i % 4}`}>
                <span className="stf__n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <h3>{x.h}</h3>
              </div>
              {x.p && <p>{x.p}</p>}
            </article>
          ))}
        </div>
      </div>
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
  const slots = v.preview && docs.length === 0;

  return (
    <section className="pxs pxs--cream str" id="resources">
      <div className="wrap str__in">
        <h2 className="stg__sh">Resources</h2>
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
      </div>
    </section>
  );
}
