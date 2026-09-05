"use client";

import { useRef, type ChangeEvent } from "react";

/**
 * A number box that groups thousands as you type — 45000 reads as 45,000 — with
 * an optional unit sitting inside the box ($ in front, km or L after). What it
 * hands back is still plain digits, so callers parse it exactly as before.
 *
 * The caret is put back by counting digits rather than characters, so adding a
 * separator mid-edit doesn't shunt the cursor to the end.
 */

function group(raw: string): string {
  const [whole, ...rest] = raw.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return rest.length ? `${grouped}.${rest.join("")}` : grouped;
}

function digitsBefore(s: string, pos: number): number {
  return s.slice(0, pos).replace(/\D/g, "").length;
}

function caretAfter(display: string, digits: number): number {
  if (digits === 0) return 0;
  let seen = 0;
  for (let i = 0; i < display.length; i++) {
    if (display[i] >= "0" && display[i] <= "9") seen++;
    if (seen === digits) return i + 1;
  }
  return display.length;
}

export function NumField({
  label, hint, value, onChange, prefix, suffix, decimal = false, placeholder,
}: {
  label?: string;
  hint?: string;
  value: string;
  onChange: (raw: string) => void;
  prefix?: string;
  suffix?: string;
  decimal?: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function handle(e: ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    const wanted = digitsBefore(el.value, el.selectionStart ?? el.value.length);

    let raw = el.value.replace(decimal ? /[^0-9.]/g : /[^0-9]/g, "");
    if (decimal) {
      const [first, ...more] = raw.split(".");
      raw = more.length ? `${first}.${more.join("")}` : first;
    }
    onChange(raw);

    const next = group(raw);
    requestAnimationFrame(() => {
      const node = ref.current;
      if (!node) return;
      // Typing a character that gets stripped leaves the state unchanged, so
      // React skips the render and the stray character stays on screen. Put the
      // grouped value back either way, then restore the caret.
      if (node.value !== next) node.value = next;
      const at = caretAfter(next, wanted);
      node.setSelectionRange(at, at);
    });
  }

  const box = (
    <div className={`pt-num${prefix ? " has-prefix" : ""}${suffix ? " has-suffix" : ""}`}>
      {prefix && <span className="pt-num__fix">{prefix}</span>}
      <input
        ref={ref}
        className="pt-num__inp"
        inputMode={decimal ? "decimal" : "numeric"}
        value={group(value)}
        onChange={handle}
        placeholder={placeholder}
      />
      {suffix && <span className="pt-num__fix">{suffix}</span>}
    </div>
  );

  if (!label) return box;
  return (
    <label className="pt-field">
      <span>{label}{hint ? <em> {hint}</em> : null}</span>
      {box}
    </label>
  );
}
