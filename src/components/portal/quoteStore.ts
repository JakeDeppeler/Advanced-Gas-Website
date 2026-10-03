"use client";

import { useCallback, useEffect, useState } from "react";
import type { ArtKind } from "@/lib/portal/pricebook";

/**
 * The quote being built on this iPad.
 *
 * A working draft, held on the device: the options a tech is lining up in a
 * customer's kitchen, before any of it goes into ServiceTitan — which is still
 * where a quote is sent from. It lives in the browser rather than the database
 * because it belongs to the visit, not the business; nothing reads it but the
 * tech building it, and losing it costs a minute, not a record.
 */

export type QuoteOption = {
  id: string; cat: string; brand: string; name: string;
  price: number | null; priceLabel: string | null; priceNote: string; art: ArtKind;
};
export type QuoteExtra = { id: string; label: string; amount: number };
export type Quote = { customer: string; options: QuoteOption[]; extras: QuoteExtra[] };

const KEY = "tr-quote-v1";
const EVENT = "tr-quote";
const EMPTY: Quote = { customer: "", options: [], extras: [] };

function read(): Quote {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const q = JSON.parse(raw) as Partial<Quote>;
    return { customer: q.customer ?? "", options: Array.isArray(q.options) ? q.options : [], extras: Array.isArray(q.extras) ? q.extras : [] };
  } catch {
    return EMPTY;
  }
}

function write(q: Quote) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(q));
  } catch {
    // Private mode or storage full: the quote still works for this screen.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useQuote(): [Quote, (f: (q: Quote) => Quote) => void, boolean] {
  const [q, setQ] = useState<Quote>(EMPTY);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => setQ(read());
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  const update = useCallback((f: (q: Quote) => Quote) => {
    const next = f(read());
    setQ(next);
    write(next);
  }, []);
  return [q, update, ready];
}

/** Three options is what a customer can weigh; more is a catalogue. */
export const MAX_OPTIONS = 3;

export const optionTotal = (o: QuoteOption, extras: QuoteExtra[]) =>
  o.price == null ? null : o.price + extras.reduce((s, e) => s + e.amount, 0);
