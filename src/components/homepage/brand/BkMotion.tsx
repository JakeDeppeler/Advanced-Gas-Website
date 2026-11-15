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
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }),
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    const seen = new WeakSet<HTMLElement>();
    const take = (els: HTMLElement[], fold: number) => els.forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      // Children of a staggered group come in one after another.
      if (el.dataset.anim === "stagger") [...el.children].forEach((c, i) => (c as HTMLElement).style.setProperty("--i", String(i)));
      // Anything already on screen is shown straight away, so the first
      // screen never flickers.
      if (el.getBoundingClientRect().top < fold) el.classList.add("is-in");
      else io.observe(el);
    });
    take([...root.querySelectorAll<HTMLElement>("[data-anim]")], window.innerHeight * 0.9);
    root.classList.add("bk--motion");

    // A block can mount after this has run: a product page's Key features
    // only exists once a model with a feature list is picked, which happens
    // after load for ?model= links and on every size button. Without this it
    // stayed hidden under bk--motion for good.
    const mo = new MutationObserver(() => take([...root.querySelectorAll<HTMLElement>("[data-anim]")], window.innerHeight * 0.9));
    mo.observe(root, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
  return null;
}
