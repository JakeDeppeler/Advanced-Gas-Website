"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Daily tools, opened: the one place to find a tool (Jake, 28 Nov: "the daily
 * tools need to be a main point to find a tool"). A big tile per tool and a
 * search over them, nothing else on the page. Only the tools this person can
 * open are passed in.
 */
export type ToolTile = { href: string; name: string; line: string; icon: keyof typeof ICON; words: string };

const ICON = {
  write: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5",
  duct: "M3 7h12a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h12M18 4v6M6 14v6",
  fault: "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01",
  tank: "M7 3h10v18H7zM7 8h10M10 13h4M12 16v2",
  rebate: "M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8ZM7.5 7.5h.01",
  bolt: "M13 2 3 14h9l-1 8 10-12h-9z",
  talk: "M21 12a8 8 0 0 1-11.8 7L4 20l1-4.5A8 8 0 1 1 21 12zM8 11h8M8 14h5",
} as const;

export function DailyTools({ tools }: { tools: ToolTile[] }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle ? tools.filter((t) => `${t.name} ${t.line} ${t.words}`.toLowerCase().includes(needle)) : tools;
  return (
    <div className="tf">
      <label className="tf-find">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3" /></svg>
        <input id="tf-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a tool: write-up, fault code, rebate…" aria-label="Find a tool" />
      </label>
      {shown.length ? (
        <nav className="tf-grid" aria-label="Daily tools">
          {shown.map((t) => (
            <Link key={t.href} href={t.href} className="tf-tile">
              <span className="tf-ic" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ICON[t.icon]} /></svg></span>
              <b>{t.name}</b>
              <span>{t.line}</span>
              <span className="tf-go" aria-hidden="true">↗</span>
            </Link>
          ))}
        </nav>
      ) : (
        <p className="rp-empty">No tool called that. Try “write”, “fault” or “rebate”.</p>
      )}
    </div>
  );
}
