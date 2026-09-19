"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Suggestion = { t: string; p: string; k: string };

/**
 * The header's search box, with suggestions under it.
 *
 * Still a real form. It posts to /search, so pressing enter works whether or
 * not the suggestion list has answered and whether or not JavaScript ran at
 * all; the dropdown is an accelerator on top, not the mechanism.
 *
 * The matching happens on the server through /api/search. The alternative was
 * shipping the index to the browser, and the index is seventy-three suburbs
 * and ninety-three brands' worth of prose.
 */
export function HeaderSearch() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const listId = useId();

  // Debounced, and every response is checked against the query that is in the
  // box now: a slow answer for "duc" must not land on top of "ducted".
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits([]); return; }
    let live = true;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        if (!r.ok || !live) return;
        const data = (await r.json()) as { hits: Suggestion[] };
        if (live) { setHits(data.hits ?? []); setActive(-1); }
      } catch { /* the form still works */ }
    }, 160);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  // Clicking away closes it.
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  const go = (path: string) => { setOpen(false); setQ(""); router.push(path); };

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || hits.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % hits.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i <= 0 ? hits.length - 1 : i - 1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); go(hits[active].p); }
    else if (e.key === "Escape") { setOpen(false); setActive(-1); }
  }

  const show = open && q.trim().length >= 2;

  return (
    <form
      ref={box}
      className="hdr__search"
      action="/search"
      method="get"
      role="search"
      onSubmit={() => setOpen(false)}
    >
      <label className="hdr__searchlbl" htmlFor="hdr-q">Search the site</label>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.2-3.2" />
      </svg>
      <input
        id="hdr-q"
        name="q"
        type="search"
        placeholder="Search"
        autoComplete="off"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        role="combobox"
        aria-expanded={show && hits.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
      />

      {show && (
        <div className="hdr__sugg" id={listId} role="listbox">
          {hits.length === 0 ? (
            <p className="hdr__suggnone">Nothing matches that. Press enter to search anyway.</p>
          ) : (
            <>
              {hits.map((h, i) => (
                <button
                  key={h.p}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  className={`hdr__suggrow${i === active ? " is-active" : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(h.p)}
                >
                  <span className="hdr__suggt">{h.t}</span>
                  <span className="hdr__suggk">{h.k}</span>
                </button>
              ))}
              <button type="submit" className="hdr__suggall">
                See everything for &ldquo;{q.trim()}&rdquo; &rarr;
              </button>
            </>
          )}
        </div>
      )}
    </form>
  );
}
