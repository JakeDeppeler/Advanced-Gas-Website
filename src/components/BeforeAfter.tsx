"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Drag-to-compare before/after slider.
 *
 * The "after" image sits underneath at full size; the "before" image is
 * clipped to the handle position with inset(). Dragging the handle wipes
 * between them. Pointer events cover mouse + touch + pen in one path.
 *
 * Accessible: the handle is a real range input, so keyboard users get
 * arrow-key control and screen readers announce a labelled slider. The
 * visual handle is drawn separately and the input sits transparent on
 * top of it.
 *
 * Both images MUST share an aspect ratio — the wrapper sets one and both
 * images fill it, so a mismatch shows as a crop rather than a jump.
 */
export function BeforeAfter({
  before,
  after,
  beforeLabel = "Before",
  afterLabel = "After",
  /** CSS aspect-ratio for the frame, e.g. "3 / 4" for portrait phone shots. */
  ratio = "3 / 4",
}: {
  before: { src: string; alt: string };
  after: { src: string; alt: string };
  beforeLabel?: string;
  afterLabel?: string;
  ratio?: string;
}) {
  const [pos, setPos] = useState(50);
  const frameRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const el = frameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, pct)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    setFromClientX(e.clientX);
  };
  const endDrag = (e: React.PointerEvent) => {
    draggingRef.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  return (
    <div className="ba">
      <div
        ref={frameRef}
        className="ba__frame"
        style={{ aspectRatio: ratio }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* AFTER sits underneath, full frame. */}
        <img className="ba__img" src={after.src} alt={after.alt} loading="lazy" draggable={false} />

        {/* BEFORE clipped to the handle position. aria-hidden because the
            after image already carries the descriptive alt for AT. */}
        <div className="ba__clip" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <img className="ba__img" src={before.src} alt={before.alt} loading="lazy" draggable={false} />
        </div>

        <span className="ba__tag ba__tag--before" style={{ opacity: pos > 12 ? 1 : 0 }}>
          {beforeLabel}
        </span>
        <span className="ba__tag ba__tag--after" style={{ opacity: pos < 88 ? 1 : 0 }}>
          {afterLabel}
        </span>

        <div className="ba__handle" style={{ left: `${pos}%` }} aria-hidden="true">
          <span className="ba__grip">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l-5 6 5 6M15 6l5 6-5 6" />
            </svg>
          </span>
        </div>

        <input
          className="ba__range"
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label={`Drag to compare: ${beforeLabel} versus ${afterLabel}`}
        />
      </div>
      <p className="ba__hint">Drag the handle to compare, or use the arrow keys.</p>
    </div>
  );
}
