"use client";

import { useEffect } from "react";

/**
 * The blocks layout's own scroll animation: anything marked `data-anim`
 * gets `is-in` the first time it's on screen, and the CSS does the rest
 * (cards rising in turn, the route drawing, the timeline filling).
 *
 * The page opts out of the site-wide Reveal (data-no-reveal on its root),
 * because two systems on one block fade its background colour too.
 *
 * Nothing is hidden until this has run: the root only gets `bk--motion`
 * here, and the hidden starting states hang off that class. No JavaScript,
 * or reduced motion, means the finished page, not a blank one.
 */
export function BkMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.querySelector<HTMLElement>(".bk");
    if (!root) return;
    const els = [...root.querySelectorAll<HTMLElement>("[data-anim]")];
    // Children of a staggered group come in one after another.
    els.forEach((el) => {
      if (el.dataset.anim === "stagger") [...el.children].forEach((c, i) => (c as HTMLElement).style.setProperty("--i", String(i)));
    });
    // Anything already on screen when the page opens is shown straight away,
    // so the first screen never flickers.
    const fold = window.innerHeight;
    els.forEach((el) => { if (el.getBoundingClientRect().top < fold * 0.9) el.classList.add("is-in"); });
    root.classList.add("bk--motion");

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }),
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    els.forEach((el) => { if (!el.classList.contains("is-in")) io.observe(el); });
    return () => io.disconnect();
  }, []);
  return null;
}
