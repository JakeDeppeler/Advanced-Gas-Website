"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * "Which one suits me?" for the range page.
 *
 * Ninety-odd models is a lot to read, and the filter rail only helps
 * somebody who already knows what the thing is called. Two questions
 * here — what you're trying to do and the size of the place — and it
 * names a system and points at it.
 *
 * It recommends a category, not a model number. Picking between a 250 L
 * and a 315 L tank is a conversation about when everybody showers, and
 * pretending a dropdown settles it would be worse than not asking.
 */

type Job = "cool" | "heat" | "hotwater" | "water";
type Size = "room" | "few" | "house";

const JOBS: { id: Job; label: string; sub: string }[] = [
  { id: "cool", label: "Cool the place", sub: "Summer is the problem" },
  { id: "heat", label: "Heat the place", sub: "Winter is the problem" },
  { id: "hotwater", label: "Hot water", sub: "Replacing or upgrading the unit" },
  { id: "water", label: "Better water", sub: "Taste, grit, or it's tank water" },
];

const SIZES: { id: Size; label: string }[] = [
  { id: "room", label: "One room" },
  { id: "few", label: "A few rooms" },
  { id: "house", label: "The whole house" },
];

type Rec = { heading: string; body: string; href: string; cta: string; filter: string };

function recommend(job: Job, size: Size): Rec {
  if (job === "water") {
    return {
      heading: "Water filtration",
      body:
        "Whole-home if the complaint is the shower or the washing, under-sink if it's what you drink, and filtration plus UV if you're on tank water. Which one depends entirely on the symptom, and the section walks through it.",
      href: "/water-filtration",
      cta: "Water filtration",
      filter: "Water filtration",
    };
  }
  if (job === "hotwater") {
    return {
      heading: size === "room" ? "An all-in-one heat pump" : "A heat pump — split or all-in-one",
      body:
        size === "room"
          ? "One or two people means a 180–200 L all-in-one, which is the cheapest way in and where the VEU rebate reaches furthest. One shell, one spot, usually a same-day swap."
          : "For a household this size it's a heat pump either way. All-in-one if there's only one spot for it; a split if you've room for a compressor outside, because that's where the bigger tanks and the cold-morning performance live.",
      href: size === "room" ? "/services/heat-pump-installation/all-in-one" : "/services/heat-pump-installation",
      cta: size === "room" ? "All-in-one heat pumps" : "Heat pump hot water",
      filter: size === "room" ? "Heat pump, all-in-one" : "Split heat pump",
    };
  }
  if (job === "heat") {
    if (size === "house") {
      return {
        heading: "Ducted — reverse-cycle or gas",
        body:
          "Whole-house heating is a ducted job. Reverse-cycle does your cooling as well and runs cheaper; gas ducted is the cheaper install and the straight swap if there's already one in the roof. We'll price both.",
        href: "/services/gas-plumbing/gas-ducted",
        cta: "Gas ducted heating",
        filter: "Gas ducted heating",
      };
    }
    return {
      heading: "A reverse-cycle split",
      body:
        "For one room or a few, a reverse-cycle split heats as well as it cools and costs a fraction of gas to run — it moves heat rather than burning something to make it. Nothing else we fit beats it at this size.",
      href: "/services/air-conditioning-installation/split",
      cta: "Split system installation",
      filter: "Split system",
    };
  }
  // cooling
  if (size === "room") {
    return {
      heading: "A split system",
      body:
        "One outdoor unit, one head, one room. Cheapest to buy, cheapest to run and usually in by lunchtime. 2.5 kW for a bedroom, 5.0 for living, 7.1 for large open-plan.",
      href: "/services/air-conditioning-installation/split",
      cta: "Split system installation",
      filter: "Split system",
    };
  }
  if (size === "few") {
    return {
      heading: "A multi-head",
      body:
        "Two to five heads off one outdoor unit, each room on its own control. Tidier outside than separate splits and one set of penetrations instead of four.",
      href: "/services/air-conditioning-installation/multi",
      cta: "Multi-head installation",
      filter: "Multi-head",
    };
  }
  return {
    heading: "Ducted reverse-cycle",
    body:
      "Whole-house cooling and heating from one system in the roof, zoned so you're only conditioning the rooms you're in. Nothing on any wall, and one unit to service rather than five.",
    href: "/services/air-conditioning-installation/ducted",
    cta: "Ducted installation",
    filter: "Ducted air conditioning",
  };
}

export function RangeFinder() {
  const [job, setJob] = useState<Job | null>(null);
  const [size, setSize] = useState<Size | null>(null);
  // Water filtration doesn't branch on size — the symptom decides it,
  // and asking a question whose answer is ignored is worse than not asking.
  const rec = job === "water" ? recommend("water", "room") : job && size ? recommend(job, size) : null;

  return (
    <div className="rfind">
      <span className="rfind__lbl">Point me at one</span>
      <h3>Two questions and we&rsquo;ll narrow it down.</h3>

      <fieldset className="rfind__q">
        <legend>What are you trying to do?</legend>
        <div className="rfind__opts">
          {JOBS.map((j) => (
            <button
              key={j.id}
              type="button"
              className={`rfind__opt${job === j.id ? " is-on" : ""}`}
              aria-pressed={job === j.id}
              onClick={() => setJob(j.id)}
            >
              <strong>{j.label}</strong>
              <span>{j.sub}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="rfind__q" hidden={job === "water"}>
        <legend>How much of the place?</legend>
        <div className="rfind__opts rfind__opts--3">
          {SIZES.map((sz) => (
            <button
              key={sz.id}
              type="button"
              className={`rfind__opt rfind__opt--sm${size === sz.id ? " is-on" : ""}`}
              aria-pressed={size === sz.id}
              onClick={() => setSize(sz.id)}
            >
              <strong>{sz.label}</strong>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="rfind__out" aria-live="polite">
        {rec ? (
          <div className="rfind__rec" key={rec.heading}>
            <span className="rfind__reclbl">What we&rsquo;d point you at</span>
            <h4>{rec.heading}</h4>
            <p>{rec.body}</p>
            <Link href={rec.href} className="ds-btn ds-btn--orange">{rec.cta} →</Link>
            <p className="rfind__fine">
              A category, not a model number — picking between two tank sizes is a conversation
              about when everybody showers, and no dropdown settles that honestly.
            </p>
          </div>
        ) : (
          <p className="rfind__waiting">
            {job === "water"
              ? "Pick a size to see the answer — or just press Water filtration above."
              : "Answer both and we'll name one."}
          </p>
        )}
      </div>
    </div>
  );
}
