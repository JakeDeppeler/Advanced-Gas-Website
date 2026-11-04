"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export type Address = { label: string; suburb: string | null; postcode: string | null };

/**
 * The quote form's address box: start typing and pick the full address from
 * the list (/api/address). A customer who ignores the list, or whose street
 * isn't found, can still type it out; we take what they wrote.
 *
 * A combobox in the ARIA sense: arrows move through the list, Enter picks,
 * Escape closes, and the list is announced as it changes.
 */
export function AddressField({ value, onChange, invalid, icon }: {
  value: string;
  onChange: (a: Address) => void;
  invalid?: boolean;
  icon: ReactNode;
}) {
  const id = useId();
  const [hits, setHits] = useState<Address[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [picked, setPicked] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function type(text: string) {
    onChange({ label: text, suburb: null, postcode: null });
    setPicked(false);
    if (timer.current) clearTimeout(timer.current);
    if (text.trim().length < 3) { setHits([]); setOpen(false); return; }
    // Wait for a pause in the typing, and ignore answers that come back out of order.
    timer.current = setTimeout(async () => {
      const n = ++seq.current;
      try {
        const res = await fetch(`/api/address?q=${encodeURIComponent(text.trim())}`);
        const out = (await res.json()) as { results?: Address[] };
        if (n !== seq.current) return;
        setHits(out.results ?? []);
        setOpen((out.results ?? []).length > 0);
        setActive(-1);
      } catch {
        if (n === seq.current) { setHits([]); setOpen(false); }
      }
    }, 250);
  }

  function pick(a: Address) {
    onChange(a);
    setPicked(true);
    setOpen(false);
    setHits([]);
  }

  function key(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !hits.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % hits.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i <= 0 ? hits.length - 1 : i - 1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(hits[active]); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  return (
    <div className="qf__addr">
      <label className={`qf__in${invalid ? " qf__in--bad" : ""}${picked ? " qf__in--ok" : ""}`} htmlFor={`${id}-a`}>
        {icon}
        <span className="qf__inb">
          <span className="qf__inl">Address</span>
          <input
            id={`${id}-a`} name="address" type="text" autoComplete="street-address" required
            placeholder="Start typing your street address"
            role="combobox" aria-expanded={open} aria-controls={`${id}-l`} aria-autocomplete="list"
            aria-activedescendant={open && active >= 0 ? `${id}-o${active}` : undefined}
            aria-invalid={invalid}
            value={value} onChange={(e) => type(e.target.value)} onKeyDown={key}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onFocus={() => hits.length && !picked && setOpen(true)}
          />
        </span>
        {picked && <span className="qf__tick" aria-label="Address found">✓</span>}
      </label>
      {open && (
        <ul className="qf__sugg" id={`${id}-l`} role="listbox" aria-label="Matching addresses">
          {hits.map((h, i) => (
            <li
              key={h.label} id={`${id}-o${i}`} role="option" aria-selected={i === active}
              className={i === active ? "on" : undefined}
              onMouseDown={(e) => { e.preventDefault(); pick(h); }}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
              <span>{h.label}</span>
            </li>
          ))}
        </ul>
      )}
      <span className="sr-only" aria-live="polite">{open ? `${hits.length} addresses found` : ""}</span>
    </div>
  );
}
