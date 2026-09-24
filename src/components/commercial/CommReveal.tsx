"use client";

import { useEffect } from "react";

/**
 * The reveals on this page: a 28px rise and a fade, staggered across
 * siblings by `--i`, on anything carrying `.cx-rv`.
 *
 * One observer for the whole page rather than a wrapper round every card,
 * so a section added later gets the behaviour by carrying the class.
 *
 * The part worth explaining is what it does NOT do. The design hides every
 * `.rv` element in CSS and reveals it on intersection, which means a page
 * whose JavaScript failed is a blank page — and on a page selling a written
 * standard that is the worst possible failure. So nothing is hidden by the
 * stylesheet. This arms the elements it is going to reveal, at the moment it
 * runs, and only the ones still below the fold: anything already on screen
 * is marked arrived in the same pass, so it never flashes out and back.
 * No JavaScript, or a thrown error, leaves an ordinary page.
 *
 * And it does nothing at all for `prefers-reduced-motion: reduce`, which is
 * the same thing: an unarmed element is a visible one.
 */

export function CommReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = Array.from(document.querySelectorAll<HTMLElement>(".cx-rv"));
    if (!targets.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("in");
          io.unobserve(e.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    // The fold, less a margin: an element straddling the bottom edge is one
    // the reader is already looking at, so it arrives rather than animating.
    const fold = window.innerHeight * 0.92;

    targets.forEach((el) => {
      el.classList.add("is-armed");
      if (el.getBoundingClientRect().top < fold) el.classList.add("in");
      else io.observe(el);
    });

    return () => io.disconnect();
  }, []);

  return null;
}
