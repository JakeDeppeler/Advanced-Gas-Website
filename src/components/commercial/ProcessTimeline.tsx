"use client";

import { useEffect, useRef, useState } from "react";
import { COMM_PROCESS } from "@/lib/commercial";

/**
 * How a job runs: six steps, read against a card that keeps count.
 *
 * The six stages are a list. What makes them a sequence you are moving
 * through rather than six paragraphs is the card on the left, which holds
 * still while they pass it and always shows the step you are actually
 * reading — big number, title, and six bars filling behind it.
 *
 * The line down the middle of the viewport is the read head. Whichever step
 * has crossed it is the live one, which is the only definition that works
 * for steps of six different heights.
 *
 * Three things it will not do:
 *  · animate for `prefers-reduced-motion: reduce` — the number still changes,
 *    because which step is showing is information, but it changes at once
 *    instead of fading out and back
 *  · run a listener per frame: one scroll handler, coalesced into a single
 *    rAF, and it only touches the DOM for the fill height
 *  · leave the card blank if the handler never fires — step 01 is the
 *    initial state, so a failure looks like a static card
 */

const SWAP_MS = 180;

/**
 * The short name for each stage, for the mono line above its heading.
 * Held here rather than in the data because it is a label for this layout —
 * the same six steps are set as plain prose on the capability statement.
 */
const STEP_LABELS = ["The plans", "The scope", "The price", "On site", "Signed off", "Handover"];

export function ProcessTimeline() {
  // `live` is where the scroll is; `shown` is what the card is displaying.
  // They differ for 180ms while the number fades out and back.
  const [live, setLive] = useState(0);
  const [shown, setShown] = useState(0);
  const [swapping, setSwapping] = useState(false);
  const listRef = useRef<HTMLOListElement | null>(null);
  const fillRef = useRef<HTMLSpanElement | null>(null);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;

    const read = () => {
      raf = 0;
      const list = listRef.current;
      const fill = fillRef.current;
      if (!list || !fill) return;

      const mid = window.innerHeight * 0.5;
      const box = list.getBoundingClientRect();
      fill.style.height = `${Math.max(0, Math.min(box.height - 16, mid - box.top))}px`;

      let at = 0;
      stepRefs.current.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top < mid) at = i;
      });
      setLive(at);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (live === shown) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(live);
      return;
    }
    setSwapping(true);
    const t = window.setTimeout(() => {
      setShown(live);
      setSwapping(false);
    }, SWAP_MS);
    return () => window.clearTimeout(t);
  }, [live, shown]);

  const step = COMM_PROCESS[shown];

  return (
    <div className="cx-proc">
      {/* The card holds still while the steps go past it. aria-hidden because
          it is a restatement of the heading of whichever step is live — a
          screen reader gets the list itself, which is the real content. */}
      <div className="cx-proc__vis" aria-hidden="true">
        <div className="cx-proc__card">
          <span className="cx-proc__eye">Step</span>
          <div>
            <div className={`cx-proc__big${swapping ? " is-swapping" : ""}`}>{step.n}</div>
            <div className={`cx-proc__t${swapping ? " is-swapping" : ""}`}>{step.h}</div>
            <div className="cx-proc__bars">
              {COMM_PROCESS.map((s, i) => (
                <i key={s.n} className={i <= live ? "is-on" : undefined} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <ol className="cx-steps" ref={listRef}>
        <span className="cx-steps__fill" ref={fillRef} aria-hidden="true" />
        {COMM_PROCESS.map((s, i) => (
          <li
            key={s.n}
            className={`cx-step${i <= live ? " is-on" : ""}`}
            ref={(el) => {
              stepRefs.current[i] = el;
            }}
          >
            <span className="cx-step__n">
              {s.n} · {STEP_LABELS[i]}
            </span>
            <h3>{s.h}</h3>
            <p>{s.p}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
