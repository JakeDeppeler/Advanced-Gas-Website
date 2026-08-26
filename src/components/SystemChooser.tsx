"use client";

import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";

/**
 * Choose your system — and, behind a button on each card, the brands,
 * the sizes and what each size costs installed.
 *
 * Indicative pricing used to be a section of its own further down the
 * page, which meant somebody read about split systems here and then met
 * the three split system prices forty lines later with nothing tying
 * them together. The prices belong to the system, so they live on the
 * system's card: press the button and the sizes open underneath the
 * grid, one system at a time.
 *
 * Photo paths arrive already resolved — the server knows what's on disk,
 * this side of the wire doesn't.
 */

export type ChooserSize = {
  /** The size or tier, e.g. "Single split system (5.0 kW · living)". */
  label: string;
  /** Installed price, or a sentence where we don't publish one. */
  price: string;
  /** Comma-separated inclusions. Each item has to stand on its own. */
  includes: string;
  /** Caption above the figure — "Installed" is wrong over a call-out. */
  priceKey?: string;
};

export type ChooserCard = {
  id: string;
  label: string;
  blurb: string;
  photo: string | null;
  photoAlt: string;
  photoScene: boolean;
  brands: string[];
  priceFrom?: string;
  facts: { lead: string; note?: string }[];
  href: string;
  /** True on the system whose page this is. It keeps its card — being
   *  able to see the thing you're reading about next to the ones you
   *  aren't is the point — but says so instead of linking to itself. */
  current?: boolean;
  /** The sizes we fit and what each costs installed. */
  sizes?: ChooserSize[];
};

export function SystemChooser({
  cards,
  heading,
  lede,
  footnote,
}: {
  cards: ChooserCard[];
  heading: string;
  lede?: string;
  footnote?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);

  if (cards.length === 0) return null;
  const cols = cards.length === 4 ? 4 : Math.min(cards.length, 3);
  const openCard = cards.find((c) => c.id === open) ?? null;

  return (
    <section className="dp-choose">
      <div className="wrap">
        <div className="ds-section-head">
          <span className="ds-eyebrow ds-eyebrow--on-dark">
            <span className="ds-dot" /> Choose your system
          </span>
          <h2 className="ds-h--on-dark">{heading}</h2>
          {lede && <p className="dp-choose__lede">{lede}</p>}
        </div>

        {/* Four shapes go four across; anything else caps at three, so
            five doesn't become a five-column squeeze or a 3 + 2 with the
            type of a four-across grid. The class carries it as well as
            the custom property: React writes the inline style without a
            space, which an attribute selector written the readable way
            silently misses. */}
        <div className={`wf-styles__grid is-${cols}up`} style={{ "--cols": cols } as CSSProperties}>
          {cards.map((c, i) => {
            const on = open === c.id;
            const n = c.sizes?.length ?? 0;
            return (
              <article className={`wf-style${(c.current ?? i === 0) ? " is-lead" : ""}`} key={c.id}>
                {c.photo && (
                  <div className={`wf-style__photo${c.photoScene ? " is-scene" : ""}`}>
                    <img src={c.photo} alt={c.photoAlt} loading="lazy" width="600" height="450" />
                  </div>
                )}
                <div className="wf-style__body">
                  {c.priceFrom && <span className="wf-style__tier">{c.priceFrom}</span>}
                  <h3>{c.label}</h3>
                  {c.brands.length > 0 && (
                    <span className="wf-style__style">{c.brands.join(" · ")}</span>
                  )}
                  <p>{c.blurb}</p>
                  <ul>
                    {c.facts.map((f) => (
                      <li key={f.lead}>
                        <strong>{f.lead}</strong>
                        {f.note && <> &mdash; {f.note}</>}
                      </li>
                    ))}
                  </ul>

                  {n > 0 && (
                    <button
                      type="button"
                      className={`wf-style__more${on ? " is-open" : ""}`}
                      aria-expanded={on}
                      aria-controls="choose-sizes-drop"
                      onClick={() => {
                        const next = on ? null : c.id;
                        setOpen(next);
                        // The panel opens under every card, which on a
                        // four-card grid is well past the fold. Without
                        // this you press it and, as far as you can tell,
                        // nothing happens.
                        if (next) {
                          requestAnimationFrame(() =>
                            dropRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
                          );
                        }
                      }}
                    >
                      {on ? "Hide the sizes" : n === 1 ? "Size and price" : `The ${n} sizes and prices`}
                      <span aria-hidden="true">{on ? "↑" : "↓"}</span>
                    </button>
                  )}

                  {c.current ? (
                    <span className="wf-style__here">You&rsquo;re reading this one</span>
                  ) : (
                    <Link className="wf-style__go" href={c.href}>
                      See the full detail
                      <span aria-hidden="true">→</span>
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div ref={dropRef} className="wf-range__drop" id="choose-sizes-drop" hidden={!openCard}>
          {openCard && (
            <>
              <div className="wf-range__drophead">
                <h3>{openCard.label}</h3>
                <p>
                  {openCard.brands.length > 0 && (
                    <>
                      We fit it in <strong>{openCard.brands.join(" and ")}</strong>.{" "}
                    </>
                  )}
                  Installed, back to back, with everything below in the number.
                </p>
              </div>
              <div className="choose-sizes">
                {openCard.sizes!.map((z) => {
                  const isFigure = /\d/.test(z.price);
                  return (
                    <article className="choose-size" key={z.label}>
                      <h4>{z.label}</h4>
                      <div className="choose-size__num">
                        <span className="choose-size__k">
                          {z.priceKey ?? (isFigure ? "Installed" : "Priced at quote")}
                        </span>
                        <span className={`choose-size__v${isFigure ? "" : " is-words"}`}>{z.price}</span>
                      </div>
                      <ul>
                        {z.includes.split(/,\s+/).map((inc) => (
                          // The source string is one sentence, so
                          // everything after the first comma arrives
                          // lowercase. As list items they each start a
                          // line of their own.
                          <li key={inc}>{inc.charAt(0).toUpperCase() + inc.slice(1)}</li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>
              {footnote && <p className="choose-sizes__fp">{footnote}</p>}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
