"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * The search in the top bar.
 *
 * The fast path to "the fault code page" or "clause A3" is typing it, so this
 * searches the actual content — handbook clauses, procedures, videos,
 * information sections, tools — not just the page titles, which would make it
 * a slower version of the side bar.
 *
 * Everything is indexed on the server and handed down as a flat list. It is a
 * few hundred short rows; filtering it in the browser is instant and costs no
 * round trip per keystroke.
 */

export type SearchRow = {
  href: string;
  label: string;
  /** Where it lives, shown faintly to the right: "Handbook · Shelf A". */
  where: string;
  /** Extra words to match that aren't in the label. */
  terms?: string;
  /**
   * The full text — a procedure's steps, a handbook topic's body. Only the
   * results page carries it: the bar's index ships on every page and has no
   * use for a hundred procedures' worth of words.
   */
  body?: string;
  /** The line under the title on the results page, when there's no better one. */
  snip?: string;
};

const MAX = 8;

export function PortalSearch({ rows }: { rows: SearchRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // Lower-cased once, not per keystroke per row.
  const index = useMemo(
    () => rows.map((r) => ({ row: r, hay: `${r.label} ${r.where} ${r.terms ?? ""}`.toLowerCase() })),
    [rows],
  );

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    const words = needle.split(/\s+/);
    return index
      .filter(({ hay }) => words.every((w) => hay.includes(w)))
      // A match on the title beats a match buried in the keywords, so typing
      // "handbook" offers the handbook before eleven clauses inside it.
      .sort((a, b) => {
        const al = a.row.label.toLowerCase().startsWith(needle) ? 0 : a.row.label.toLowerCase().includes(needle) ? 1 : 2;
        const bl = b.row.label.toLowerCase().startsWith(needle) ? 0 : b.row.label.toLowerCase().includes(needle) ? 1 : 2;
        return al - bl || a.row.label.length - b.row.label.length;
      })
      .slice(0, MAX)
      .map((m) => m.row);
  }, [q, index]);

  useEffect(() => setCursor(0), [q]);

  // Clicking anywhere else closes it. Pointerdown rather than click, so the
  // panel is gone before a click lands on whatever is underneath.
  useEffect(() => {
    function away(e: PointerEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, []);

  // "/" focuses the box from anywhere, the way every tool the crew already uses
  // behaves — but never while they are typing into something else.
  useEffect(() => {
    function key(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        input.current?.focus();
      }
    }
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") return (input.current?.blur(), setOpen(false));
    if (!hits.length) {
      if (e.key === "Enter" && q.trim().length >= 2) {
        e.preventDefault();
        setOpen(false);
        router.push(`/portal/search?q=${encodeURIComponent(q.trim())}`);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (c + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (c - 1 + hits.length) % hits.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = hits[cursor];
      setOpen(false);
      const term = q.trim();
      setQ("");
      // Enter on a highlighted row opens it; enter on the box alone opens the
      // full list, which is the case where you want to look rather than jump.
      router.push(hit ? hit.href : `/portal/search?q=${encodeURIComponent(term)}`);
    }
  }

  const showing = open && q.trim().length >= 2;

  return (
    <div className="pt-find" ref={box}>
      <div className="pt-find__box">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          ref={input}
          id="portal-search"
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Search pages, procedures, fault codes, prices…"
          aria-label="Search the portal"
          aria-expanded={showing}
          autoComplete="off"
        />
      </div>

      {showing && (
        <div className="pt-find__out" role="listbox">
          {hits.length === 0 ? (
            <p className="pt-find__none">
              Nothing matches <strong>{q.trim()}</strong>.
            </p>
          ) : (
            hits.map((h, i) => (
              <Link
                key={`${h.href}-${h.label}`}
                href={h.href}
                role="option"
                aria-selected={i === cursor}
                className={`pt-find__hit${i === cursor ? " is-on" : ""}`}
                onMouseEnter={() => setCursor(i)}
                onClick={() => {
                  setOpen(false);
                  setQ("");
                }}
              >
                <span className="pt-find__hitlabel">{h.label}</span>
                <span className="pt-find__hitwhere">{h.where}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
