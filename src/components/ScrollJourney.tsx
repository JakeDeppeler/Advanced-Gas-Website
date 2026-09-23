"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A job as one scroll: a drawing that holds while the beats move past it.
 *
 * Built for the commercial page, and now the home page's alone — the
 * commercial front page was rebuilt around a program, a schedule and a
 * compliance table instead, because a head contractor checks a page rather
 * than watching one. On the residential side the opposite is true: somebody
 * deciding whether to let a trade into their house is following a story, and
 * this tells it. The shell is here; the page brings its own beats and its own
 * drawings.
 *
 * Every beat ends on one line saying why it matters that it is us doing it, so
 * the argument sits inside the job rather than in a box further down the page.
 *
 * Three things it will not do:
 *  · animate for `prefers-reduced-motion: reduce` — the scenes still change,
 *    because which scene is showing is information, but nothing moves
 *  · depend on a scroll listener — one IntersectionObserver over a thin band
 *    at the middle of the viewport decides which beat is live
 *  · leave a blank panel if the observer never fires: the first scene is the
 *    initial state, so a failure looks like a static illustration
 */

export type JourneyBeat = {
  n: string;
  /** The stage, in the words the job runs on. */
  kicker: string;
  h: string;
  p: string;
  /** Why it matters that it is us. One line, no paragraph. */
  why: string;
  scene: string;
};

export function ScrollJourney({
  beats,
  renderScene,
}: {
  beats: readonly JourneyBeat[];
  renderScene: (scene: string) => ReactNode;
}) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const nodes = refs.current.filter(Boolean) as HTMLLIElement[];
    if (!nodes.length) return;

    // A thin band across the middle of the window. Whichever beat is crossing
    // it is the live one — no scroll handler, and no dependency on how tall
    // any individual beat happens to be.
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const i = nodes.indexOf(e.target as HTMLLIElement);
          if (i >= 0) setActive(i);
        });
      },
      { rootMargin: "-46% 0px -46% 0px", threshold: 0 },
    );

    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [beats]);

  return (
    <div className="cj">
      <div className="cj__stage" aria-hidden="true">
        <div className="cj__frame">
          {beats.map((b, i) => (
            <svg
              key={b.n}
              viewBox="0 0 340 220"
              className={`cjscene${i === active ? " is-on" : ""}`}
              role="presentation"
            >
              {renderScene(b.scene)}
            </svg>
          ))}
        </div>
        <div className="cj__dots">
          {beats.map((b, i) => (
            <span key={b.n} className={`cj__dot${i === active ? " is-on" : ""}${i < active ? " is-done" : ""}`} />
          ))}
        </div>
      </div>

      <ol className="cj__beats">
        {beats.map((b, i) => (
          <li
            key={b.n}
            ref={(el) => { refs.current[i] = el; }}
            className={`cjbeat${i === active ? " is-on" : ""}`}
          >
            <div className="cjbeat__rail" aria-hidden="true"><span /></div>
            <div className="cjbeat__body">
              <span className="cjbeat__kick">
                <b>{b.n}</b> {b.kicker}
              </span>
              <h3>{b.h}</h3>
              <p>{b.p}</p>
              <p className="cjbeat__why">{b.why}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
