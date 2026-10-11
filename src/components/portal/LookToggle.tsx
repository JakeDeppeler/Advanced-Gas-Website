"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * Try the new look, or go back. Admins only, their own browser only: a
 * cookie the shell reads, then a refresh, because some pages (Home first)
 * are laid out differently in it, not just coloured differently.
 */
export function LookToggle({ initial }: { initial: "classic" | "neutral" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = initial === "neutral" ? "classic" : "neutral";
  const flip = () => {
    try {
      document.cookie = `pt_look=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* No cookies, no switch. */
    }
    start(() => router.refresh());
  };
  return (
    <button type="button" className="pt-side__theme" onClick={flip} disabled={pending} title={next === "neutral" ? "Only you see it until it's approved" : "Back to the current look"}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3a9 9 0 1 0 0 18V3z" />
        <circle cx="12" cy="12" r="9" />
      </svg>
      <span>{initial === "neutral" ? "Back to the current look" : "Try the new look"}</span>
    </button>
  );
}
