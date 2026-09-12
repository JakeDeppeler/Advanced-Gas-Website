"use client";

/**
 * Print / save as PDF, for the capability statement.
 *
 * The page is designed to be filed, and "print this" is the one thing on it
 * that needs a click handler. A client component for a single button keeps
 * the rest of the document server-rendered.
 */
export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <button type="button" className="comm-print" onClick={() => window.print()}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z" />
      </svg>
      {label}
    </button>
  );
}
