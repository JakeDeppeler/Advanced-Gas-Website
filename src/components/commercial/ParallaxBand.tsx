"use client";

import { useEffect, useRef } from "react";

/**
 * The full-bleed photograph of the crew and the vans, moving slightly
 * slower than the page.
 *
 * The image is 125% of the band's height and shifts by −0.12× its distance
 * from the centre of the window, so it never runs out of picture at either
 * end. That ratio is small on purpose: enough that the band feels like a
 * window rather than a panel, not enough to notice as an effect.
 *
 * One scroll listener coalesced into a single rAF, and nothing at all under
 * `prefers-reduced-motion` — where the CSS also pins the transform, so the
 * photograph simply sits still.
 */

export function ParallaxBand({
  src,
  alt,
  title,
  note,
}: {
  src: string;
  alt: string;
  title: string;
  note: string;
}) {
  const img = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;

    const read = () => {
      raf = 0;
      const el = img.current;
      if (!el || !el.parentElement) return;
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const off = r.top + r.height / 2 - window.innerHeight / 2;
      el.style.transform = `translateY(${off * -0.12}px)`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="cx-pband">
      {/* A plain <img>, not next/image: the element is absolutely positioned
          at 125% height and driven by a transform, which is exactly the
          layout next/image's wrapper is built to take over. The file is a
          165KB webp already, so the optimiser has little left to win.
          eslint-disable-next-line @next/next/no-img-element */}
      <img ref={img} src={src} alt={alt} loading="lazy" decoding="async" />
      <div className="cx-pband__cap">
        <div className="wrap">
          <b>{title}</b>
          <span className="cx-mono" style={{ color: "rgba(255,255,255,0.72)" }}>{note}</span>
        </div>
      </div>
    </div>
  );
}
