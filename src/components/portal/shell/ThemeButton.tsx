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
export function ThemeButton({ initial }: { initial: ThemeChoice }) {
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
  return (
    <button type="button" className="pn-theme" onClick={flip} aria-label={`Switch to ${dark ? "light" : "dark"} mode`}>
      <span aria-hidden="true">{dark ? "☾" : "☀"}</span> {dark ? "Dark" : "Light"}
    </button>
  );
}
