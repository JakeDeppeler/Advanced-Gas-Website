"use client";

import { useEffect } from "react";

/**
 * Marks the page once it's been scrolled. The wide top bar is see-through at
 * the top, so the page's wash runs up behind the menu as it does on Rapport,
 * and only takes its solid band once there's content to pass under it.
 */
export function ScrollMark() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".pt.pn");
    if (!root) return;
    const mark = () => root.toggleAttribute("data-scrolled", window.scrollY > 6);
    mark();
    window.addEventListener("scroll", mark, { passive: true });
    return () => window.removeEventListener("scroll", mark);
  }, []);
  return null;
}
