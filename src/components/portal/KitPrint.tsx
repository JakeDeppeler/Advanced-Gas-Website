"use client";

/** The kit lists' print button: the one thing on the page that needs a click handler. */
export function KitPrint() {
  return (
    <button type="button" className="pk-btn g pt-kit__print" onClick={() => window.print()}>
      Print this list
    </button>
  );
}
