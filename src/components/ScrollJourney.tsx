"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A job as one scroll: a drawing that holds while the beats move past it.
 *
 * Built for the commercial page — six cards in a grid replaced with a program,
 * because the people reading that one run programs for a living — and it does
 * the same work on the home page, where the job is somebody's house rather
 * than somebody's site. The shell is here; each page brings its own beats and
 * its own drawings.
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
 *
 * One beat can be followed by an `interlude` — a panel that interrupts the
 * run rather than continuing it. It exists because the journey is long, and
 * the one place on the page where somebody can actually act sits below all of
 * it. The interlude is not observed and holds no scene, so the drawing and
 * the beat count are unaffected by it.
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
  /** Keys a block of real content for beats that carry more than a
   *  paragraph — a list of clients, the packages, the figures. Rendered
   *  between the body and the why-line, so the beat still lands on its
   *  argument. */
  extra?: string;
};

export function ScrollJourney({
  beats,
  renderScene,
  renderExtra,
  interlude,
}: {
  beats: readonly JourneyBeat[];
  renderScene: (scene: string) => ReactNode;
  renderExtra?: (extra: string) => ReactNode;
  /** A panel dropped in after the beat at `after` (0-based). Not a beat:
   *  no scene, no dot, and the observer never sees it. */
  interlude?: { after: number; node: ReactNode };
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
          <Fragment key={b.n}>
            <li
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
                {b.extra && renderExtra ? <div className="cjbeat__extra">{renderExtra(b.extra)}</div> : null}
                <p className="cjbeat__why">{b.why}</p>
              </div>
            </li>
            {interlude && interlude.after === i ? (
              <li className="cjband">
                <div className="cjbeat__rail cjbeat__rail--band" aria-hidden="true"><span /></div>
                <div className="cjband__body">{interlude.node}</div>
              </li>
            ) : null}
          </Fragment>
        ))}
      </ol>
    </div>
  );
}
