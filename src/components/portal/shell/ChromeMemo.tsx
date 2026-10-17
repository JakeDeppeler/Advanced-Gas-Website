"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type Memo = { html: string; theme: string | null };
declare global { interface Window { __ptChrome?: Memo } }

/** The page outline drawn inside the kept chrome while the next page loads. */
export const SKELETON = `<div class="ld" aria-hidden="true">
  <div class="ld-head"><span class="ld-b ld-title"></span><span class="ld-kpis"><span class="ld-b"></span><span class="ld-b"></span><span class="ld-b"></span></span></div>
  <div class="ld-row"><span class="ld-b ld-tile"></span><span class="ld-b ld-tile"></span><span class="ld-b ld-tile"></span><span class="ld-b ld-tile"></span></div>
  <span class="ld-b ld-card"></span>
</div>`;

/**
 * Remembers the menu as it's drawn now, so the loading screen can show the
 * same one. The loading screen can't know who's signed in or what their counts
 * are, and without this it drew a stand-in bar: the menu blinked to something
 * else on every click. With it only the page area changes while a page loads.
 */
export function ChromeMemo() {
  const path = usePathname();
  useEffect(() => {
    const save = () => {
      const root = document.querySelector<HTMLElement>(".pt.pn");
      if (!root) return;
      const copy = root.cloneNode(true) as HTMLElement;
      const main = copy.querySelector(".pn-content");
      if (main) main.innerHTML = SKELETON;
      // Nothing in the copy is live, and none of it should be reachable by keyboard.
      copy.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
      copy.querySelectorAll("a,button,input,select,textarea").forEach((el) => el.setAttribute("tabindex", "-1"));
      copy.querySelectorAll(".pn-drop.open,[data-open]").forEach((el) => el.classList.remove("open"));
      window.__ptChrome = { html: copy.outerHTML, theme: root.getAttribute("data-theme") };
    };
    save();
    // Counts stream in after the page: take the copy again once they've landed.
    const t = setTimeout(save, 1500);
    return () => clearTimeout(t);
  }, [path]);
  return null;
}
