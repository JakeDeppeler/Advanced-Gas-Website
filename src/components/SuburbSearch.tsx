"use client";

import { useState } from "react";
import Link from "next/link";
import { site } from "@/lib/site";

/**
 * "Check your suburb" — a search box over the service-area chips on the home
 * page. Type a suburb and the list filters to it; type something we don't
 * list and it says so honestly with a call prompt. Client-side only, no
 * data fetch — it filters the same list the chips already render.
 */
export function SuburbSearch({ suburbs }: { suburbs: { name: string; slug: string }[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const filtered = query ? suburbs.filter((s) => s.name.toLowerCase().includes(query)) : suburbs;

  return (
    <div className="subsearch">
      <div className="subsearch__field">
        <svg className="subsearch__icon" viewBox="0 0 20 20" aria-hidden="true" width="18" height="18">
          <path d="M9 2a7 7 0 015.3 11.6l4 4-1.4 1.4-4-4A7 7 0 119 2zm0 2a5 5 0 100 10A5 5 0 009 4z" fill="currentColor" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type your suburb…"
          aria-label="Check whether we service your suburb"
          className="subsearch__input"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="suburbs">
          {filtered.map((s) => (
            <Link key={s.slug} href={`/areas/${s.slug}`} className="suburbs__chip">
              {s.name}
            </Link>
          ))}
        </div>
      ) : (
        <p className="subsearch__none">
          &ldquo;{q}&rdquo; isn&rsquo;t on the list &mdash; but we often travel further for booked work.{" "}
          <a href={`tel:${site.phoneE164}`}>Call {site.phone}</a> and we&rsquo;ll tell you straight.
        </p>
      )}
    </div>
  );
}
