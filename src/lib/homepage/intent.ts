"use client";

import type { Answers, Category } from "./data";

/**
 * How one part of the homepage asks another to do something: the header's
 * product cards open the finder at a system, the finder's "Book" fills in the
 * quote form, a service card starts the form at a service.
 *
 * The same requests arrive in the URL from other pages (`/?find=…#find`,
 * `/?book=…#quote`), which is how "Back to your options" and "Book this
 * install" on a /find product page land back on the homepage with the answers
 * intact. <IntentFromUrl> turns those into the same calls.
 *
 * A request made before anything is listening is kept and handed to the first
 * listener, so it doesn't matter whether the URL is read before or after the
 * finder or the form has mounted.
 */
export type Intent =
  | { kind: "find"; system?: string; cat?: Category["id"]; answers?: Answers }
  | { kind: "book"; system: string; tier: string; answers: Answers; model?: string }
  | { kind: "quote"; service: number };

type Listener = (i: Intent) => boolean;

const listeners = new Set<Listener>();
let pending: Intent[] = [];

/** Listeners return true for the intents they handle. */
export function onIntent(fn: Listener): () => void {
  listeners.add(fn);
  pending = pending.filter((i) => !fn(i));
  return () => { listeners.delete(fn); };
}

export function sendIntent(i: Intent, scrollTo?: "find" | "quote") {
  let handled = false;
  listeners.forEach((fn) => { if (fn(i)) handled = true; });
  if (!handled) pending.push(i);
  if (scrollTo) scrollToId(scrollTo);
}

export function scrollToId(id: string | null) {
  // After the state change has rendered, or the scroll lands on the old layout.
  window.setTimeout(() => {
    const el = id ? document.getElementById(id) : null;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (el) el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    else if (!id) window.scrollTo(0, 0);
  }, 40);
}
