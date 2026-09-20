"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { staticSizes, variantLabel, type Family, type FamilyMember } from "@/lib/productFamilies";

export type FamilyCardItem = FamilyMember & {
  brand: string;
  model: string;
  categoryLabel: string;
  /** The product's own specific label, used to key the family. */
  familyLabel?: string;
  photo: string;
  photoFallback?: string;
  accent: string;
};

/**
 * One product family, with its sizes as chips.
 *
 * Picking a chip swaps the model shown — its code, what it suits, its price
 * and where the card points — without leaving the page. That is the whole
 * behaviour; there is no fetch and no animation, because a size selector that
 * makes you wait is worse than six cards in a row.
 *
 * The card renders fully before any of that: server-side it shows the first
 * size, every chip is a real link to a real model page, and JavaScript only
 * upgrades the chips into an in-place switch. Crawlers and anyone whose script
 * failed get a working card with every model linked from it.
 *
 * A family of one gets no chip row at all. Controllers and zoning boards have
 * no size to choose and a lone chip reading "1 of 1" is a control that does
 * nothing.
 */
export function ProductFamilyCard({
  family,
  extra,
}: {
  family: Family<FamilyCardItem>;
  /** An extra control for whichever size is showing. The brand pages hang
   *  their Compare tick on this: the card owns which variant is active, so a
   *  control that acts on "the selected model" has to be handed it. */
  extra?: (active: FamilyCardItem) => React.ReactNode;
}) {
  const [i, setI] = useState(0);
  const active = family.members[i] ?? family.members[0];
  const chips = family.members
    .map((m, idx) => ({ idx, label: m.chipLabel ?? variantLabel(m.capacity), href: m.href }))
    .filter((c) => c.label);
  const showChips = chips.length > 1;
  // Only when there is no selector. Two rows of chips that look alike and
  // behave differently — one you pick from, one you read — is the kind of
  // thing that makes people stop trusting a control.
  const sizes = showChips ? null : staticSizes(active.capacity);

  return (
    <div className="pfam" style={{ ["--card-accent" as string]: active.accent }}>
      {extra && <div className="pfam__extra">{extra(active)}</div>}
      <Link href={active.href} className="pfam__shot" tabIndex={-1} aria-hidden="true">
        {/* Through the optimiser, not a raw <img>. This card is on /range 48
            times and on every brand page, and none of those shots were being
            resized or served as AVIF.
        
            The paths need encoding: forty-six of the eighty-four product
            photos have spaces in their filenames ("Kaden KSI V3 wall split
            system.jpg"), which a browser tolerates on a plain <img> and the
            image optimiser does not. That is the reason these were never
            converted. */}
        <Image
          src={encodeURI(active.photo)}
          alt=""
          fill
          sizes="(max-width: 560px) 45vw, (max-width: 1100px) 30vw, 220px"
          style={{ objectFit: "contain" }}
        />
      </Link>

      <div className="pfam__body">
        <span className="pfam__brand">{active.brand}</span>
        <h3 className="pfam__name">
          <Link href={active.href}>{family.title}</Link>
        </h3>

        {showChips ? (
          <div className="pfam__chips" role="group" aria-label={`${family.title} sizes`}>
            {chips.map((c) => (
              <button
                key={c.idx}
                type="button"
                className={`pfam__chip${c.idx === i ? " is-on" : ""}`}
                aria-pressed={c.idx === i}
                onClick={() => setI(c.idx)}
              >
                {c.label}
              </button>
            ))}
          </div>
        ) : sizes ? (
          <>
            {/* Links, not dead text. One page covers all four outputs, so every
                chip goes to the same place — but a chip you cannot click when
                the chips on the next card along all work reads as broken, and
                the page behind it is where the sizes are set out anyway. */}
            <div className="pfam__chips pfam__chips--static">
              {sizes.map((z) => (
                <Link key={z} href={active.href} className="pfam__chip pfam__chip--static">{z}</Link>
              ))}
            </div>
            <span className="pfam__sizenote">
              {sizes.length} sizes &middot; we size it to the house
            </span>
          </>
        ) : (
          <span className="pfam__model">{active.model}</span>
        )}

        <p className="pfam__fit">{active.bestFor}</p>

        <div className="pfam__foot">
          <span className="pfam__cat">{active.categoryLabel}</span>
          {active.veuEligible && <span className="pfam__veu">VEU</span>}
        </div>

        {/* The price where we publish one, and a way to get one where we do
            not. "See the specs" was the honest label and the useless one: a
            reader on a product card is asking what it costs, and sending them
            to a spec sheet answers a question they did not ask. */}
        {active.installedPriceFrom ? (
          <Link href={active.href} className="pfam__go">
            <span><strong>{active.installedPriceFrom}</strong> installed</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        ) : (
          <div className="pfam__go pfam__go--ask">
            <Link href="/quote" className="pfam__price">
              Get a price <span aria-hidden="true">&rarr;</span>
            </Link>
            <Link href={active.href} className="pfam__specs">Specs</Link>
          </div>
        )}
        {showChips && <span className="pfam__which">{active.model}</span>}
      </div>
    </div>
  );
}
