"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ALL_RECLAIM_MODELS,
  FINISH_SHORT,
  RECLAIM_SIZES,
  searchIndex,
  type ReclaimModel,
} from "@/lib/reclaimModels";

/**
 * Model-code finder for the Reclaim range.
 *
 * Someone lands here having typed a part number off a quote, or a
 * phrase like "315 stainless steel heat pump". Both have to work, so
 * the search runs over a haystack that mixes the codes with the words
 * people actually use (see searchIndex in lib/reclaimModels).
 *
 * Every row is rendered on the server and only hidden on the client,
 * the same approach as the pricing tabs: filtering must never take
 * content out of the HTML, because the whole point of this page is
 * that the codes are in the HTML for a crawler to find.
 */

const FINISHES = [
  { key: "glass-lined", label: "Glass-lined" },
  { key: "stainless-tall", label: "Stainless, tall" },
  { key: "stainless-squat", label: "Stainless, squat" },
  { key: "duplex", label: "Duplex" },
  { key: "earthworker", label: "Earthworker" },
] as const;

function Row({ m }: { m: ReclaimModel }) {
  return (
    <>
      <td className="rmf__code">
        <code>{m.code}</code>
        {!m.verified && <span className="rmf__flag" title={m.note}>confirm on quote</span>}
      </td>
      <td>{m.litres} L</td>
      <td>{FINISH_SHORT[m.finish]}</td>
      <td>{m.wifi ? "Wi-Fi (V2)" : "No Wi-Fi (V1.1)"}</td>
      <td>{m.compressor}</td>
      <td>{m.tankWarrantyYears} yr tank</td>
      <td className="rmf__go">
        {m.productSlug ? (
          <Link href={`/brands/reclaim/${m.productSlug}`}>Details →</Link>
        ) : (
          <Link href="/quote">Get a price →</Link>
        )}
      </td>
    </>
  );
}

export function ReclaimModelFinder() {
  const [q, setQ] = useState("");
  const [size, setSize] = useState<number | null>(null);
  const [finish, setFinish] = useState<string | null>(null);
  const [wifi, setWifi] = useState<boolean | null>(null);

  // Built once. The haystack is stable, so there's no reason to rebuild
  // it on every keystroke.
  const indexed = useMemo(
    () => ALL_RECLAIM_MODELS.map((m) => ({ m, hay: searchIndex(m) })),
    [],
  );

  const needle = q.trim().toLowerCase();
  const visible = useMemo(() => {
    const set = new Set<string>();
    for (const { m, hay } of indexed) {
      if (size !== null && m.litres !== size) continue;
      if (finish !== null && m.finish !== finish) continue;
      if (wifi !== null && m.wifi !== wifi) continue;
      // Every whitespace-separated term has to hit, so "315 squat" and
      // "squat 315" both narrow rather than widen.
      if (needle && !needle.split(/\s+/).every((t) => hay.includes(t))) continue;
      set.add(m.code);
    }
    return set;
  }, [indexed, needle, size, finish, wifi]);

  const clear = () => {
    setQ("");
    setSize(null);
    setFinish(null);
    setWifi(null);
  };
  const filtered = q || size !== null || finish !== null || wifi !== null;

  return (
    <div className="rmf">
      <div className="rmf__controls">
        <label className="rmf__search">
          <span className="rmf__search-label">Search a model code, size or finish</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="REHP-CO2-315SSQ, 315 stainless, wifi&hellip;"
            autoComplete="off"
          />
        </label>

        <div className="rmf__chiprow" role="group" aria-label="Filter by tank size">
          <button type="button" className={`rmf__chip${size === null ? " is-on" : ""}`} onClick={() => setSize(null)}>
            Any size
          </button>
          {RECLAIM_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              className={`rmf__chip${size === s ? " is-on" : ""}`}
              onClick={() => setSize(size === s ? null : s)}
            >
              {s} L
            </button>
          ))}
        </div>

        <div className="rmf__chiprow" role="group" aria-label="Filter by tank finish">
          <button type="button" className={`rmf__chip${finish === null ? " is-on" : ""}`} onClick={() => setFinish(null)}>
            Any tank
          </button>
          {FINISHES.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`rmf__chip${finish === f.key ? " is-on" : ""}`}
              onClick={() => setFinish(finish === f.key ? null : f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="rmf__chiprow" role="group" aria-label="Filter by controller">
          <button type="button" className={`rmf__chip${wifi === null ? " is-on" : ""}`} onClick={() => setWifi(null)}>
            Any controller
          </button>
          <button type="button" className={`rmf__chip${wifi === true ? " is-on" : ""}`} onClick={() => setWifi(wifi === true ? null : true)}>
            Wi-Fi (V2)
          </button>
          <button type="button" className={`rmf__chip${wifi === false ? " is-on" : ""}`} onClick={() => setWifi(wifi === false ? null : false)}>
            No Wi-Fi (V1.1)
          </button>
        </div>

        <p className="rmf__count" aria-live="polite">
          Showing <strong>{visible.size}</strong> of {ALL_RECLAIM_MODELS.length} systems
          {filtered && (
            <>
              {" "}
              <button type="button" className="rmf__clear" onClick={clear}>
                Clear filters
              </button>
            </>
          )}
        </p>
      </div>

      {visible.size === 0 && (
        <p className="rmf__empty">
          Nothing matches that. Reclaim change their codes between generations, so if
          you have one off an older quote, send us a photo of the plate on the tank and
          we&rsquo;ll tell you exactly what it is and what replaces it.
        </p>
      )}

      <div className="rmf__scroll">
        <table className="rmf__table">
          <caption className="sr-only">
            Every Reclaim and Panasonic CO₂ heat pump system code, with tank size,
            finish, controller and warranty
          </caption>
          <thead>
            <tr>
              <th scope="col">System code</th>
              <th scope="col">Tank</th>
              <th scope="col">Finish</th>
              <th scope="col">Controller</th>
              <th scope="col">Heat pump</th>
              <th scope="col">Warranty</th>
              <th scope="col"><span className="sr-only">Link</span></th>
            </tr>
          </thead>
          <tbody>
            {ALL_RECLAIM_MODELS.map((m) => (
              <tr key={m.code} hidden={!visible.has(m.code)}>
                <Row m={m} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
