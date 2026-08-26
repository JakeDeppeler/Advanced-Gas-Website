"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * "Which one should I actually get?" — three questions, on the page
 * where somebody is already asking whether the system they're reading
 * about is the right one.
 *
 * It answers from our own range, and it will send you off this page when
 * that's the honest answer: reading about splits and wanting the whole
 * house done should end up at ducted, not at four splits.
 *
 * Runs entirely in the browser. Nothing is recorded and nothing is sent.
 */

type Rooms = "one" | "few" | "most";
type Roof = "yes" | "no" | "unsure";
type Now = "nothing" | "split" | "ducted" | "gas";

const ROOMS: { id: Rooms; label: string; sub: string }[] = [
  { id: "one", label: "One room", sub: "A bedroom, the living room, a study" },
  { id: "few", label: "Two or three", sub: "A couple of bedrooms, or living plus one" },
  { id: "most", label: "Most of the house", sub: "Every bedroom and the living areas" },
];

const ROOF: { id: Roof; label: string }[] = [
  { id: "yes", label: "Yes, there's room up there" },
  { id: "no", label: "No — flat roof, or it's too tight" },
  { id: "unsure", label: "Not sure" },
];

const NOW: { id: Now; label: string }[] = [
  { id: "nothing", label: "Nothing at all" },
  { id: "split", label: "An old split or two" },
  { id: "ducted", label: "Ducted that's failed or is on its way out" },
  { id: "gas", label: "Gas ducted heating, no cooling" },
];

type Answer = { heading: string; body: string; href: string; cta: string; note?: string };

function advise(rooms: Rooms, roof: Roof, now: Now): Answer {
  if (rooms === "one") {
    return {
      heading: "A split system.",
      body:
        "One room, one head, one outdoor unit. It's the cheapest to buy, the cheapest to run and the quickest to get in — most go in back-to-back in a single morning. Nothing else on our list beats it for a single room.",
      href: "/services/air-conditioning-installation/split",
      cta: "Split system installation",
    };
  }

  if (rooms === "few") {
    if (roof === "no") {
      return {
        heading: "A multi-head.",
        body:
          "Two or three rooms with no roof space to run ducts through: one outdoor unit, a head in each room, each on its own control. Tidier outside than two or three separate splits, and it only takes up one spot on the wall or the ground.",
        href: "/services/air-conditioning-installation/multi",
        cta: "Multi-head installation",
      };
    }
    return {
      heading: "Multi-head, probably — but ask us about ducted.",
      body:
        "For two or three rooms a multi-head is usually the answer: one outdoor unit, a head in each room. With roof space available though, the gap to a small ducted system is often smaller than people expect, and ducted disappears into the ceiling instead of putting a head on three walls.",
      href: "/services/air-conditioning-installation/multi",
      cta: "Multi-head installation",
      note: "We'll price both if you'd like to see the difference in writing.",
    };
  }

  // most of the house
  if (roof === "no") {
    return {
      heading: "A multi-head, in stages.",
      body:
        "Ducted needs somewhere to run the ducts, and without roof space that's off the table. A five-port multi-head covers most homes, and it can go in a room at a time as the budget allows rather than all at once.",
      href: "/services/air-conditioning-installation/multi",
      cta: "Multi-head installation",
      note: "If it's a flat roof or a concrete ceiling, ring us — there are bulkhead options and they depend entirely on the house.",
    };
  }

  return {
    heading: "Ducted.",
    body:
      now === "gas"
        ? "You already have ducts in the roof for the gas heater. Replacing the lot with a ducted reverse-cycle system reuses much of that run, does your cooling as well as your heating, and gets rid of a gas bill. It's the single most common upgrade we do in this corridor."
        : "Whole-house cooling and heating from one system, zoned so you're only conditioning the rooms you're in. Nothing on a wall in any room, and one unit to service rather than five.",
    href: "/services/air-conditioning-installation/ducted",
    cta: "Ducted installation",
    note: now === "ducted" ? "A failed ducted unit is often a like-for-like swap that reuses the existing ductwork, which keeps the cost well below a fresh install." : undefined,
  };
}

export function SystemAdvisor() {
  const [rooms, setRooms] = useState<Rooms | null>(null);
  const [roof, setRoof] = useState<Roof | null>(null);
  const [now, setNow] = useState<Now | null>(null);

  const done = rooms && roof && now;
  const answer = done ? advise(rooms!, roof!, now!) : null;

  return (
    <div className="advisor">
      <div className="advisor__head">
        <span className="advisor__lbl">Not sure this is the one?</span>
        <h3>Three questions and we&rsquo;ll tell you.</h3>
        <p>Runs in your browser. Nothing recorded, nothing sent.</p>
      </div>

      <fieldset className="advisor__q">
        <legend>How many rooms do you want done?</legend>
        <div className="advisor__opts">
          {ROOMS.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`advisor__opt${rooms === o.id ? " is-on" : ""}`}
              onClick={() => setRooms(o.id)}
              aria-pressed={rooms === o.id}
            >
              <strong>{o.label}</strong>
              <span>{o.sub}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="advisor__q">
        <legend>Is there roof space above the ceiling?</legend>
        <div className="advisor__opts advisor__opts--tight">
          {ROOF.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`advisor__opt advisor__opt--sm${roof === o.id ? " is-on" : ""}`}
              onClick={() => setRoof(o.id)}
              aria-pressed={roof === o.id}
            >
              <strong>{o.label}</strong>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="advisor__q">
        <legend>What&rsquo;s there now?</legend>
        <div className="advisor__opts advisor__opts--tight">
          {NOW.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`advisor__opt advisor__opt--sm${now === o.id ? " is-on" : ""}`}
              onClick={() => setNow(o.id)}
              aria-pressed={now === o.id}
            >
              <strong>{o.label}</strong>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="advisor__out" aria-live="polite">
        {answer ? (
          <div className="advisor__answer" key={answer.heading}>
            <span className="advisor__outlbl">What we&rsquo;d fit</span>
            <h4>{answer.heading}</h4>
            <p>{answer.body}</p>
            {answer.note && <p className="advisor__note">{answer.note}</p>}
            <Link href={answer.href} className="ds-btn ds-btn--orange">
              {answer.cta} →
            </Link>
          </div>
        ) : (
          <p className="advisor__waiting">Answer the three and the answer appears here.</p>
        )}
      </div>
    </div>
  );
}
