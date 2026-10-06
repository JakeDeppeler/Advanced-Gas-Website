"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The live board, small: the real thing at 1920 × 1080, scaled to the width it
 * has. It's another board, so it follows the remote the way the TV does — what
 * you press shows here as well. Clicks go nowhere: its own Skip and Hold would
 * only move this copy, which isn't what anybody pressing them here means.
 */
export function BoardPreview() {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / 1920);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={box} className="pt-wb__frame">
      {scale > 0 && (
        <iframe
          src="/portal/finance/board/open"
          title="The wall board, live"
          tabIndex={-1}
          style={{ transform: `scale(${scale})` }}
        />
      )}
    </div>
  );
}
