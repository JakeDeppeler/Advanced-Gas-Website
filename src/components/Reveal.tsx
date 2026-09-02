"use client";

import { useEffect } from "react";

/**
 * Site-wide scroll reveal.
 *
 * One observer for the whole document rather than a wrapper component
 * around every block — sections get revealed by being sections, so this
 * works on pages nobody has touched and on any page added later.
 *
 * Deliberately restrained: a short fade and a 14px rise, once, and never
 * on anything above the fold. An animation you notice on a plumbing site
 * is an animation that has gone too far.
 *
 * Three things it will not do:
 *  · run at all for `prefers-reduced-motion: reduce`
 *  · hide anything if the observer never fires — elements start visible
 *    in the CSS and are only hidden once this has run, so a failure
 *    leaves a normal page rather than a blank one
 *  · touch the first screenful, which would delay the LCP text
 */
export function Reveal() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;

    const root = document.getElementById("main");
    if (!root) return;

    // Sections, plus the repeating card/tile children inside them so a
    // grid arrives in sequence rather than as one block.
    const targets = new Set<Element>();
    root.querySelectorAll("section").forEach((sec) => {
      const box = sec.getBoundingClientRect();
      if (box.top < window.innerHeight * 0.9) return; // above the fold, leave alone
      targets.add(sec);
    });

    if (!targets.size) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("is-revealed");
          io.unobserve(e.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.04 },
    );

    targets.forEach((t) => {
      t.classList.add("reveal");
      io.observe(t);
    });

    return () => io.disconnect();
  }, []);

  return null;
}
