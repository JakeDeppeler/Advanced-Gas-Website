"use client";

import { useState } from "react";

const MOON = "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z";
const SUN = "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4";

/**
 * Light or dark, on its own row at the foot of the side bar. Kept in a cookie the shell reads, so the
 * next page — and the next visit on this device — paints the right way
 * first time rather than flashing light and then turning.
 */
export function ThemeToggle({ initial }: { initial: "light" | "dark" }) {
  const [theme, setTheme] = useState(initial);
  const next = theme === "dark" ? "light" : "dark";
  const flip = () => {
    setTheme(next);
    const root = document.querySelector<HTMLElement>(".pt");
    if (root) {
      if (next === "dark") root.dataset.theme = "dark";
      else delete root.dataset.theme;
    }
    try {
      document.cookie = `pt_theme=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* A browser refusing cookies still gets the change for this page. */
    }
  };
  return (
    <button type="button" className="pt-side__theme" onClick={flip} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={theme === "dark" ? SUN : MOON} />
      </svg>
      <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
