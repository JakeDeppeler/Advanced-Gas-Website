"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * "Which model is right for my home?" — three questions, one answer.
 *
 * Straight off the Puretec page Jake pointed at, and it earns its place:
 * four models that differ on two variables is exactly the situation where
 * a table makes somebody's eyes glaze and three questions doesn't.
 *
 * The logic is deliberately simple and stated on the page underneath, so
 * nobody has to trust a black box: bathrooms decide the flow rate,
 * hardness decides whether ScaleProtect is worth it, and tank water sends
 * you somewhere else entirely.
 */

type Bath = "1-2" | "3+";
type Scale = "yes" | "no" | null;
type Source = "mains" | "tank";

const STEPS = 3;

export function FilterWallSelector() {
  const [bath, setBath] = useState<Bath | null>(null);
  const [scale, setScale] = useState<Scale>(null);
  const [source, setSource] = useState<Source | null>(null);

  const done = bath !== null && scale !== null && source !== null;
  const step = (bath ? 1 : 0) + (scale ? 1 : 0) + (source ? 1 : 0);

  let result: { name: string; why: string; href?: string } | null = null;
  if (done) {
    if (source === "tank") {
      result = {
        name: "Not a FilterWall — you want tank filtration with UV",
        why: "Rainwater has a different problem set: sediment and organics off the roof, plus the biological side. Filtration then UV, in that order, is the answer. A FilterWall is built for mains water.",
        href: "/water-filtration/rainwater-uv",
      };
    } else {
      const big = bath === "3+";
      const prot = scale === "yes";
      const name = big ? (prot ? "FilterWall F6" : "FilterWall F5") : (prot ? "FilterWall F4" : "FilterWall F3");
      result = {
        name,
        why: big
          ? `${prot ? "The larger unit with ScaleProtect. " : "The larger unit. "}Two or more bathrooms means simultaneous outlets, so you want the 55 L/min flow and the 20" cartridge — it lasts longer between changes as well.`
          : `${prot ? "The compact unit with ScaleProtect. " : "The compact unit. "}One or two bathrooms rarely draws more than 30 L/min, so the smaller housing keeps the cost down without becoming the bottleneck.`,
      };
    }
  }

  return (
    <div className="fwsel">
      <div className="fwsel__progress">
        <span>Step {Math.min(step + (done ? 0 : 1), STEPS)} of {STEPS}</span>
        <div className="fwsel__bar"><div style={{ width: `${(step / STEPS) * 100}%` }} /></div>
      </div>

      <fieldset className="fwsel__q">
        <legend>1 &middot; How many bathrooms?</legend>
        <div className="fwsel__opts">
          {(["1-2", "3+"] as Bath[]).map((v) => (
            <button
              key={v}
              type="button"
              className={`fwsel__opt${bath === v ? " is-on" : ""}`}
              onClick={() => setBath(v)}
            >
              {v === "1-2" ? "One or two" : "Three or more"}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="fwsel__q">
        <legend>2 &middot; Any scale on the kettle or shower screen?</legend>
        <div className="fwsel__opts">
          <button type="button" className={`fwsel__opt${scale === "yes" ? " is-on" : ""}`} onClick={() => setScale("yes")}>Yes, some</button>
          <button type="button" className={`fwsel__opt${scale === "no" ? " is-on" : ""}`} onClick={() => setScale("no")}>Not really</button>
        </div>
      </fieldset>

      <fieldset className="fwsel__q">
        <legend>3 &middot; Mains or tank water?</legend>
        <div className="fwsel__opts">
          <button type="button" className={`fwsel__opt${source === "mains" ? " is-on" : ""}`} onClick={() => setSource("mains")}>Mains</button>
          <button type="button" className={`fwsel__opt${source === "tank" ? " is-on" : ""}`} onClick={() => setSource("tank")}>Tank / rainwater</button>
        </div>
      </fieldset>

      {result ? (
        <div className="fwsel__result">
          <span className="fwsel__reslbl">Based on that</span>
          <strong>{result.name}</strong>
          <p>{result.why}</p>
          <div className="fwsel__resacts">
            <Link href="/quote" className="ds-btn ds-btn--orange">Get this quoted →</Link>
            {result.href && <Link href={result.href} className="fwsel__reslink">Read about that instead →</Link>}
          </div>
        </div>
      ) : (
        <p className="fwsel__hint">Answer the three and the model appears here. Nothing gets sent anywhere.</p>
      )}
    </div>
  );
}
