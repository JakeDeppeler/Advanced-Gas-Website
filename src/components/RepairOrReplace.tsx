"use client";

import Link from "next/link";
import { useState } from "react";
import { LIFE_EXPECTANCY } from "@/lib/upgradeAngle";

/**
 * Repair or replace, with the arithmetic shown.
 *
 * The page around this already argues the case in prose. What somebody
 * standing next to a dead heater actually has is a system, an age and a
 * number a tradesman just quoted them, and no way to tell whether that
 * number is worth paying.
 *
 * So it does the sum the way we'd do it on the phone: what the repair
 * costs per year of life it realistically buys, against what replacing
 * costs per year over a new system's life. It will say repair. It says
 * repair more often than a company selling replacements would like.
 *
 * Runs in the browser. Nothing recorded, nothing sent.
 */

const AGES = [
  { id: 3, label: "Under 5" },
  { id: 7, label: "5 – 9" },
  { id: 12, label: "10 – 14" },
  { id: 17, label: "15+" },
];

export function RepairOrReplace() {
  const [sysName, setSysName] = useState<string | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [repair, setRepair] = useState("");

  const sys = LIFE_EXPECTANCY.find((l) => l.system === sysName);
  const repairCost = Number(repair.replace(/[^0-9.]/g, ""));
  const ready = sys && age !== null && repair.trim() !== "" && repairCost > 0;

  let verdict: { call: "repair" | "replace" | "borderline"; heading: string; body: string; sums: string[] } | null = null;

  if (ready && sys && age !== null) {
    // Years the repair realistically buys: what's left of the design life,
    // floored at one. Past the replace-from age we don't pretend a repair
    // buys a full run.
    const yearsLeft = Math.max(1, sys.replaceFrom + 3 - age);
    const perYearRepair = Math.round(repairCost / yearsLeft);
    // A new one over its own design life.
    const perYearNew = Math.round(sys.replaceCost / (sys.replaceFrom + 3));
    const share = Math.round((repairCost / sys.replaceCost) * 100);

    const sums = [
      `Repair: $${repairCost.toLocaleString()} ÷ ~${yearsLeft} more year${yearsLeft === 1 ? "" : "s"} = about $${perYearRepair.toLocaleString()} a year`,
      `Replace: $${sys.replaceCost.toLocaleString()} ÷ ~${sys.replaceFrom + 3} years = about $${perYearNew.toLocaleString()} a year`,
      `The repair is ${share}% of what a new one costs installed`,
    ];

    if (age >= sys.replaceFrom && share >= 30) {
      verdict = {
        call: "replace",
        heading: "Replace it.",
        body: `At ${age >= 17 ? "fifteen-plus" : "ten-plus"} years you're paying to keep something alive that is already past its design life, and this repair costs more per remaining year than a new system does per year of its own. ${sys.upside}`,
        sums,
      };
    } else if (perYearRepair < perYearNew * 0.6) {
      verdict = {
        call: "repair",
        heading: "Repair it.",
        body: `The repair works out well under what a replacement costs per year, and the system has life left in it. Get it fixed and put the money back in your pocket — we'd tell you the same thing on the phone.`,
        sums,
      };
    } else {
      verdict = {
        call: "borderline",
        heading: "It's close. Get both prices.",
        body: `On these numbers there's not much in it, which means the deciding factor is something the calculator can't see — whether the fault is the expensive part or a cheap one, and what condition the rest of it is in. Worth having both figures in front of you before you commit.`,
        sums,
      };
    }
  }

  return (
    <div className="ror">
      <div className="ror__head">
        <span className="ror__lbl">Repair or replace?</span>
        <h3>Put the number next to the alternative.</h3>
        <p>
          Three things and it does the sum we&rsquo;d do on the phone. Runs in your browser —
          nothing recorded, nothing sent.
        </p>
      </div>

      <fieldset className="ror__q">
        <legend>What is it?</legend>
        <div className="ror__opts">
          {LIFE_EXPECTANCY.map((l) => (
            <button
              key={l.system}
              type="button"
              className={`ror__opt${sysName === l.system ? " is-on" : ""}`}
              aria-pressed={sysName === l.system}
              onClick={() => setSysName(l.system)}
            >
              {l.system}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="ror__q">
        <legend>How old, roughly?</legend>
        <div className="ror__opts ror__opts--age">
          {AGES.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`ror__opt${age === a.id ? " is-on" : ""}`}
              aria-pressed={age === a.id}
              onClick={() => setAge(a.id)}
            >
              {a.label} <em>years</em>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="ror__q">
        <legend>What&rsquo;s the repair quoted at?</legend>
        <label className="ror__money">
          <span aria-hidden="true">$</span>
          <input
            type="text"
            inputMode="numeric"
            value={repair}
            onChange={(e) => setRepair(e.target.value)}
            placeholder="850"
            aria-label="Quoted repair cost in dollars"
          />
        </label>
      </fieldset>

      <div className="ror__out" aria-live="polite">
        {verdict && sys ? (
          <div className={`ror__answer ror__answer--${verdict.call}`} key={verdict.heading}>
            <span className="ror__outlbl">On these numbers</span>
            <h4>{verdict.heading}</h4>
            <p>{verdict.body}</p>
            <ul className="ror__sums">
              {verdict.sums.map((x) => <li key={x}>{x}</li>)}
            </ul>
            <div className="ror__cta">
              {verdict.call === "repair" ? (
                <Link href="/services/aircon-servicing-repairs" className="ds-btn ds-btn--orange">
                  Book the repair →
                </Link>
              ) : (
                <Link href={sys.replaceHref} className="ds-btn ds-btn--orange">
                  What a replacement costs →
                </Link>
              )}
              <Link href="/quote" className="ror__second">Or get both prices side by side</Link>
            </div>
            <p className="ror__fine">
              A guide, not a quote. It can&rsquo;t see which part failed, and that&rsquo;s often the
              thing that decides it — so we look before we tell you either way.
            </p>
          </div>
        ) : (
          <p className="ror__waiting">
            Pick the system, the age and the quoted repair, and the sum appears here.
          </p>
        )}
      </div>
    </div>
  );
}
