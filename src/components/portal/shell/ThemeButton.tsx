"use client";

import { useEffect, useState } from "react";
import { THEME_COOKIE, type ThemeChoice } from "@/lib/portal/businessTypes";

/** Puts a theme on the page now and keeps it for the next one. */
export function applyTheme(choice: ThemeChoice) {
  const root = document.querySelector<HTMLElement>(".pn");
  if (root) {
    if (choice === "system") delete root.dataset.theme;
    else root.dataset.theme = choice;
  }
  try {
    document.cookie = `${THEME_COOKIE}=${choice}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* The page still turns; the next one won't remember. */
  }
  // So the top bar's button says the right thing when Settings changed it.
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: choice }));
}
const THEME_EVENT = "pn:theme";

const isDark = (choice: ThemeChoice) =>
  choice === "dark" || (choice === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

/**
 * Light or dark, in the top bar as the prototype has it. It says the mode
 * you're in and flips to the other; "match my computer" lives in Settings.
 */
export function ThemeButton({ initial, cls }: { initial: ThemeChoice; cls?: string }) {
  const [choice, setChoice] = useState(initial);
  // "Match my computer" can only be read in the browser.
  const [dark, setDark] = useState(initial === "dark");
  useEffect(() => setDark(isDark(choice)), [choice]);
  useEffect(() => {
    const on = (e: Event) => setChoice((e as CustomEvent<ThemeChoice>).detail);
    window.addEventListener(THEME_EVENT, on);
    return () => window.removeEventListener(THEME_EVENT, on);
  }, []);
  const flip = () => {
    const next: ThemeChoice = dark ? "light" : "dark";
    setChoice(next);
    applyTheme(next);
  };
  // The dock's round button: a moon or a sun, the words in its tooltip.
  if (cls) {
    return (
      <button type="button" className={cls} onClick={flip} aria-label={`Switch to ${dark ? "light" : "dark"} mode`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {dark ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></> : <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />}
        </svg>
        <span className="pn-tip" aria-hidden="true">{dark ? "Light mode" : "Dark mode"}</span>
      </button>
    );
  }
  return (
    <button type="button" className="pn-theme" onClick={flip} aria-label={`Switch to ${dark ? "light" : "dark"} mode`}>
      <span aria-hidden="true">{dark ? "☾" : "☀"}</span> {dark ? "Dark" : "Light"}
    </button>
  );
}
