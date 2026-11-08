"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BRANDS, STOREYS, DUCTED_SIZES, ZONES, ROOMS, RUNS, ductedPrice, multiPrice, range,
  type BrandId, type Opt, type Line,
} from "@/lib/homepage/priceBuilder";

const $ = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;

/** One question as a row of buttons, so it works by keyboard and needs no typing. */
function Pick<V extends string | number>({ q, opts, v, set, cols }: { q: string; opts: Opt<V>[]; v: V; set: (v: V) => void; cols?: number }) {
  return (
    <fieldset className="pb__q">
      <legend>{q}</legend>
      <div className="pb__opts" style={cols ? { gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` } : undefined}>
        {opts.map((o) => (
          <button key={String(o.v)} type="button" className={v === o.v ? "on" : ""} aria-pressed={v === o.v} onClick={() => set(o.v)}>
            <b>{o.l}</b>{o.s && <small>{o.s}</small>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Tick({ l, on, set }: { l: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <button type="button" className={`pb__tick${on ? " on" : ""}`} aria-pressed={on} onClick={() => set(!on)}>
      <i aria-hidden="true">{on ? "✓" : "+"}</i>{l}
    </button>
  );
}

/**
 * "Build your price": a few taps and a price range for a ducted or a
 * multi-head system, with what made it up, and a button that books the site
 * check for the brand picked. The sums and every figure live in
 * lib/homepage/priceBuilder.ts; this only asks the questions.
 */
export function PriceBuilder({ kind, book, months, placeholder }: {
  kind: "ducted" | "multi";
  /** The quote link for each brand's option, built on the server. */
  book: Record<BrandId, string>;
  /** Shows a weekly figure over this many months; leave out to hide it. */
  months?: number;
  /** Says on the tool's face that the prices aren't real yet. */
  placeholder: boolean;
}) {
  const [brand, setBrand] = useState<BrandId>("mitsubishi");
  const [storeys, setStoreys] = useState<"single" | "double">("single");
  const [wifi, setWifi] = useState(false);
  // Ducted
  const [size, setSize] = useState("14");
  const [zones, setZones] = useState(4);
  const [removal, setRemoval] = useState(false);
  // Multi-head
  const [rooms, setRooms] = useState(3);
  const [consoles, setConsoles] = useState(0);
  const [run, setRun] = useState<"short" | "medium" | "long">("short");

  const lines: Line[] = kind === "ducted"
    ? ductedPrice({ brand, size, storeys, zones, wifi, removal })
    : multiPrice({ brand, rooms, consoles: Math.min(consoles, rooms), run, storeys, wifi });
  const total = lines.reduce((a, b) => a + b.v, 0);
  const { lo, hi } = range(total);

  return (
    <div className="pb">
      <div className="pb__form">
        <Pick q="Which brand?" opts={BRANDS} v={brand} set={setBrand} cols={2} />
        {kind === "ducted" ? (
          <>
            <Pick q="How big is the home?" opts={DUCTED_SIZES} v={size} set={setSize} cols={3} />
            <Pick q="How many zones?" opts={ZONES} v={zones} set={setZones} cols={3} />
          </>
        ) : (
          <>
            <Pick q="How many rooms?" opts={ROOMS} v={rooms} set={(n) => { setRooms(n); setConsoles((c) => Math.min(c, n)); }} cols={5} />
            <Pick q="How many floor consoles?" opts={Array.from({ length: rooms + 1 }, (_, n) => ({ v: n, l: n ? String(n) : "None" }))} v={Math.min(consoles, rooms)} set={setConsoles} cols={Math.min(rooms + 1, 7)} />
            <Pick q="How far is the furthest room from the outdoor unit?" opts={RUNS} v={run} set={setRun} cols={3} />
          </>
        )}
        <Pick q="One storey or two?" opts={STOREYS} v={storeys} set={setStoreys} cols={2} />
        <fieldset className="pb__q">
          <legend>Anything else?</legend>
          <div className="pb__ticks">
            <Tick l="Control it from my phone" on={wifi} set={setWifi} />
            {kind === "ducted" && <Tick l="Take out the old system" on={removal} set={setRemoval} />}
          </div>
        </fieldset>
      </div>

      <div className="pb__out" aria-live="polite">
        {placeholder && <span className="pb__flag">Placeholder prices · mock-up only</span>}
        <span className="pb__k">Your price, installed</span>
        <strong className="pb__price">{$(lo)} <span>to</span> {$(hi)}</strong>
        {months && <span className="pb__wk">Or a payment plan from about <b>{$(Math.ceil(lo / ((months * 52) / 12)))}/week</b> over {months} months</span>}
        <ul className="pb__lines">
          {lines.map((x, i) => <li key={x.l}><span>{x.l}</span><b>{i ? `+${$(x.v)}` : $(x.v)}</b></li>)}
        </ul>
        <Link href={book[brand]} className="abtn abtn--or abtn--flat pb__go">Book a free site check →</Link>
        <p className="pb__note">A guide to start from. We confirm one fixed price in writing after the site check, and it doesn&apos;t move.</p>
      </div>
    </div>
  );
}
