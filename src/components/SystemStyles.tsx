"use client";

import { useState } from "react";

/**
 * Choose your system — the six shapes, with the F range folded in.
 *
 * The F models used to be a section of their own further down the page,
 * which meant somebody read about the FilterWall in "choose your system"
 * and then read about it again forty lines later. Now the F Series card
 * carries a button and the four models open underneath the grid, so the
 * detail is one click from the card it belongs to rather than a second
 * pass at the same product.
 *
 * Photo paths arrive already resolved — the server knows what's on disk,
 * this side of the wire doesn't.
 */

export type StyleCard = {
  brand: string;
  name: string;
  tier: string;
  style: string;
  blurb: string;
  facts: readonly string[];
  photo: string | null;
  lead?: boolean;
};

export type ModelCard = {
  name: string;
  suits: string;
  flow: string;
  cartridge: string;
  reasons: readonly string[];
  photo: string | null;
  common?: boolean;
};

export function SystemStyles({ styles, models }: { styles: StyleCard[]; models: ModelCard[] }) {
  const [open, setOpen] = useState(false);
  const hasRange = models.length > 0;

  return (
    <>
      <div className="wf-styles__grid">
        {styles.map((sy) => (
          <article className={`wf-style${sy.lead ? " is-lead" : ""}`} key={sy.name}>
            {sy.photo && (
              <div className="wf-style__photo">
                <img src={sy.photo} alt={`${sy.brand} ${sy.name}`} loading="lazy" width="600" height="450" />
              </div>
            )}
            <div className="wf-style__body">
              <span className="wf-style__tier">{sy.tier}</span>
              <h3>{sy.name}</h3>
              <span className="wf-style__style">{sy.brand} · {sy.style}</span>
              <p>{sy.blurb}</p>
              <ul>{sy.facts.map((f) => <li key={f}>{f}</li>)}</ul>
              {sy.lead && hasRange && (
                <button
                  type="button"
                  className={`wf-style__more${open ? " is-open" : ""}`}
                  aria-expanded={open}
                  aria-controls="wf-range-drop"
                  onClick={() => setOpen((v) => !v)}
                >
                  {open ? "Hide the four models" : "The four models, F3 to F6"}
                  <span aria-hidden="true">{open ? "↑" : "↓"}</span>
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {hasRange && (
        <div className="wf-range__drop" id="wf-range-drop" hidden={!open}>
          <div className="wf-range__drophead">
            <h3>Four versions, and why you&rsquo;d pick each one.</h3>
            <p>
              They differ on two things only: how much water the house pulls at once, and whether
              you want scale protection with it. Everything else is identical.
            </p>
          </div>
          <div className="wf-range__grid">
            {models.map((m) => (
              <article className={`wf-model${m.common ? " is-common" : ""}`} key={m.name}>
                {m.common && <span className="wf-model__tag">Most common here</span>}
                {m.photo ? (
                  <div className="wf-model__shot">
                    <img src={m.photo} alt={m.name} loading="lazy" width="400" height="300" />
                  </div>
                ) : (
                  <div className="wf-model__code" aria-hidden="true">{m.name.split(" ").pop()}</div>
                )}
                <h4>{m.name}</h4>
                <p className="wf-model__suits">{m.suits}</p>
                <dl className="wf-model__specs">
                  <div><dt>Flow</dt><dd>{m.flow}</dd></div>
                  <div><dt>Cartridge</dt><dd>{m.cartridge}</dd></div>
                </dl>
                <span className="wf-model__rl">Four reasons to pick it</span>
                <ol className="wf-model__reasons">
                  {m.reasons.map((r) => <li key={r}>{r}</li>)}
                </ol>
              </article>
            ))}
          </div>
          <p className="wf-range__note">
            <strong>Priced at quote, not on the page.</strong> What it costs depends on where the
            main comes in and what the pipework needs, and a &ldquo;from&rdquo; figure with none of
            that behind it is bait.
          </p>
        </div>
      )}
    </>
  );
}
