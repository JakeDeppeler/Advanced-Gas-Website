"use client";

import { useState } from "react";

/**
 * Copy one value — a licence number, an ABN — to the clipboard.
 *
 * The button says what happened rather than flashing an icon, because the
 * person who pressed it is usually mid-sentence on the phone and needs to
 * know it worked without looking twice. It falls back to saying so when the
 * browser refuses, which it does over plain http and in some locked-down
 * installs; silently doing nothing would have them paste the last thing they
 * copied into a compliance form.
 */
export function CopyValue({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  return (
    <button
      type="button"
      className={`pt-copy${state === "done" ? " is-done" : ""}`}
      aria-label={`Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setState("done");
          setTimeout(() => setState("idle"), 1600);
        } catch {
          setState("failed");
        }
      }}
    >
      {state === "done" ? "Copied" : state === "failed" ? "Select it by hand" : "Copy"}
    </button>
  );
}
