"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/portal/shell/Menu";

export const SEARCH_EVENT = "pn:search";

/**
 * The search, behind a round button on a wide screen, its box dropping under
 * it; "/" opens it from anywhere. Narrower, it's the box in the bar.
 */
export function SearchPop({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const show = () => setOpen(true);
    const away = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      // "/" opens it from anywhere but a box being typed in.
      const t = e.target as HTMLElement | null;
      if (e.key === "/" && !(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener(SEARCH_EVENT, show);
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener(SEARCH_EVENT, show);
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", key);
    };
  }, []);
  useEffect(() => { if (open) ref.current?.querySelector<HTMLInputElement>("input")?.focus(); }, [open]);
  return (
    <div ref={ref} className={`pn-search pn-spop${open ? " open" : ""}`}>
      <button type="button" className="pn-round" aria-label="Search" aria-expanded={open} title="Search ( / )" onClick={() => setOpen((o) => !o)}>
        <Icon name="search" size={17} />
      </button>
      {/* Under the wide breakpoint this is the plain box in the bar; the CSS decides. */}
      <div className="pn-spanel">{children}</div>
    </div>
  );
}
