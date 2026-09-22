"use client";

import { useEffect } from "react";

/**
 * The same choreography, for browsers that cannot scrub it themselves.
 *
 * The commercial page's band moves and the frame down its edges are
 * written as one number per element — `--mp` for something arriving,
 * `--mq` for something being scrolled past, `--frame-p` for how far
 * through the page you are. Where the browser has CSS scroll-driven
 * animations it drives those numbers itself and this component does
 * nothing at all: it checks, finds support, and returns.
 *
 * Where it does not, none of that motion exists — the `@supports` guard
 * takes the whole lot out and the page sits still. That is not a corner
 * case. Scroll-driven animations landed in Chrome in 2023 and in WebKit
 * years later, so on the iPhones a good share of this site is read on,
 * the entire commercial page was static. This sets the same numbers from
 * a scroll handler instead, so the page moves the same way everywhere.
 *
 * Three things it will not do:
 *  · run when the browser can do it in CSS — that path is better in
 *    every way and costs no main thread at all
 *  · run for `prefers-reduced-motion: reduce`
 *  · leave anything hidden if it never runs: every number rests at the
 *    value that means "in place", so no script is a still page, not a
 *    blank one
 *
 * The ranges below mirror the ones in commercial.css and design-system.css.
 * That duplication is the price of one appearance in two engines; it is
 * kept to four shapes so there are four numbers to keep in step.
 */

type Mode = "arrive" | "entry" | "pass" | "exit";
type Target = { el: HTMLElement; mode: Mode; a: number; b: number };

const clamp = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/* Arrivals run over a fixed distance rather than a share of the element's
   own height — see the note in commercial.css. `cover Npx` counts from the
   moment the element's top edge touches the bottom of the window, which is
   exactly `innerHeight - rect.top`, so these mirror the CSS one for one. */
const ARRIVE_FROM = 80;   // px into the cover range
const ARRIVE_LEN = 440;   // px the arrival takes
const STEP = 70;          // px each place in a stagger is pushed back

/* Footer blocks are in a shared component and carry no data-m, and their
   CSS ranges are entry-relative percentages rather than cover pixels —
   they are big blocks, so a share of their own height reads fine. */
const FOOTER: [string, number, number][] = [
  [".ftr__top", 0, 0.46],
  [".ftr__badges", 0, 0.46],
  [".ftr__bottom", 0, 0.46],
  [".ftr__col:nth-child(1)", 0.02, 0.44],
  [".ftr__col:nth-child(2)", 0.08, 0.50],
  [".ftr__col:nth-child(3)", 0.14, 0.56],
  [".ftr__col:nth-child(4)", 0.20, 0.62],
];

export function PageMotion() {
  useEffect(() => {
    // The CSS path is strictly better where it exists. Both timelines are
    // checked because the bands use view() and the frame uses scroll().
    const native =
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      CSS.supports("animation-timeline", "view()") &&
      CSS.supports("animation-timeline", "scroll(root)");
    if (native) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;

    const framed = document.querySelector<HTMLElement>(".page-framed");
    const targets: Target[] = [];

    document.querySelectorAll<HTMLElement>("[data-m]").forEach((el) => {
      const v = el.dataset.m || "";
      if (v === "pass") targets.push({ el, mode: "pass", a: 0, b: 1 });
      else if (v === "exit") targets.push({ el, mode: "exit", a: 0, b: 1 });
      else if (v.startsWith("arrive")) {
        const i = Number(v.split(":")[1] ?? 0) || 0;
        const a = ARRIVE_FROM + i * STEP;
        targets.push({ el, mode: "arrive", a, b: a + ARRIVE_LEN });
      }
    });

    if (framed) {
      FOOTER.forEach(([sel, a, b]) => {
        const el = document.querySelector<HTMLElement>(sel);
        if (el) targets.push({ el, mode: "entry", a, b });
      });
    }

    if (!targets.length && !framed) return;

    // Only now is anything going to move, so only now does the document
    // claim it — the frame's rails are keyed off this, and a pair of grey
    // hairlines that never fill would be worse than no rails at all.
    document.documentElement.dataset.motion = "js";

    let ticking = false;

    const paint = () => {
      ticking = false;
      const vh = window.innerHeight;

      if (framed) {
        const d = document.documentElement;
        const max = d.scrollHeight - vh;
        d.style.setProperty("--frame-p", String(max > 0 ? clamp(window.scrollY / max) : 0));
      }

      for (const t of targets) {
        const r = t.el.getBoundingClientRect();
        const h = r.height || 1;
        // `arrive` counts pixels since the element appeared; the rest are
        // fractions of their own phase, exactly as the CSS ranges read.
        const raw =
          t.mode === "arrive" ? vh - r.top
          : t.mode === "exit" ? clamp(-r.top / h)
          : t.mode === "pass" ? clamp((vh - r.top) / (vh + h))
          : clamp((vh - r.top) / h);

        const p = t.b > t.a ? clamp((raw - t.a) / (t.b - t.a)) : clamp(raw);
        t.el.style.setProperty(t.mode === "pass" || t.mode === "exit" ? "--mq" : "--mp", String(p));
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      delete document.documentElement.dataset.motion;
      document.documentElement.style.removeProperty("--frame-p");
      targets.forEach((t) => {
        t.el.style.removeProperty("--mp");
        t.el.style.removeProperty("--mq");
      });
    };
  }, []);

  return null;
}
