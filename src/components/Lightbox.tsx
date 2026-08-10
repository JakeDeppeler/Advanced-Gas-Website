"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Album, AlbumItem } from "@/lib/albums";

/**
 * Click-through viewer for job albums.
 *
 * Opens on a tile, then arrows / swipe / keyboard move through the set.
 * Videos play inline rather than opening a new tab, because sending
 * someone to Instagram mid-gallery is how you lose them.
 *
 * Accessibility: it's a modal dialog, so focus moves in on open, Escape
 * closes, Tab is trapped inside, and focus returns to the tile that
 * opened it. Body scroll is locked while it's up.
 */

function Media({ item, active }: { item: AlbumItem; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);

  // Pause a video when you navigate away from it — otherwise the sound
  // keeps going from a slide nobody is looking at.
  useEffect(() => {
    if (!active && ref.current) ref.current.pause();
  }, [active]);

  if (item.type === "video") {
    return (
      <video
        ref={ref}
        src={item.src}
        poster={item.poster}
        controls
        playsInline
        preload="metadata"
        className="lbx__media"
      />
    );
  }
  return <img src={item.src} alt={item.alt} className="lbx__media" />;
}

export function Lightbox({
  album,
  startAt,
  onClose,
}: {
  album: Album;
  startAt: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(startAt);
  const shellRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);

  const count = album.items.length;
  const next = useCallback(() => setI((n) => (n + 1) % count), [count]);
  const prev = useCallback(() => setI((n) => (n - 1 + count) % count), [count]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Tab") {
        // Trap focus — a modal that lets you tab into the page behind it
        // is a modal in name only.
        const focusables = shellRef.current?.querySelectorAll<HTMLElement>(
          "button, [href], video, [tabindex]:not([tabindex='-1'])",
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    shellRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [next, prev, onClose]);

  const item = album.items[i];

  return (
    <div
      className="lbx"
      role="dialog"
      aria-modal="true"
      aria-label={`${album.title} — item ${i + 1} of ${count}`}
      onClick={(e) => {
        // Backdrop click closes; clicks on the panel don't bubble out.
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
        touchX.current = null;
      }}
    >
      <div className="lbx__shell" ref={shellRef} tabIndex={-1}>
        <div className="lbx__bar">
          <div className="lbx__title">
            <strong>{album.title}</strong>
            {album.suburb && <span>{album.suburb}</span>}
          </div>
          <div className="lbx__count">{i + 1} / {count}</div>
          <button type="button" className="lbx__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="lbx__stage">
          {count > 1 && (
            <button type="button" className="lbx__nav lbx__nav--prev" onClick={prev} aria-label="Previous">
              ‹
            </button>
          )}
          <Media item={item} active />
          {count > 1 && (
            <button type="button" className="lbx__nav lbx__nav--next" onClick={next} aria-label="Next">
              ›
            </button>
          )}
        </div>

        {(item.caption || item.alt) && (
          <p className="lbx__cap">{item.caption ?? item.alt}</p>
        )}

        {count > 1 && (
          <div className="lbx__thumbs">
            {album.items.map((t, n) => (
              <button
                key={t.src}
                type="button"
                className={`lbx__thumb${n === i ? " is-active" : ""}`}
                onClick={() => setI(n)}
                aria-label={`Go to item ${n + 1}`}
                aria-current={n === i}
              >
                <img src={t.type === "video" ? (t.poster ?? t.src) : t.src} alt="" loading="lazy" />
                {t.type === "video" && <span className="lbx__thumb-play" aria-hidden="true">▶</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
