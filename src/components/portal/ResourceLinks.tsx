"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addLink, removeLink, type ResourceLink } from "@/app/portal/resources/actions";

const host = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

/** Our prices, a shelf of the pricebook each: what we charge, by kind of job, a press from the price lists. */
export function OurPrices({ shelves }: { shelves: { key: string; label: string }[] }) {
  return (
    <section className="pk-card pk-pad rs-prices" aria-label="Our prices">
      <div className="pk-card-h"><b>Our prices</b><span>installed prices from the pricebook, inc GST</span></div>
      <div className="rs-pricebtns">
        {shelves.map((s) => <Link key={s.key} className="pk-btn g" href={`/trade/pricebook/${s.key}`}>{s.label}</Link>)}
      </div>
    </section>
  );
}

/** Supplier websites: their sites, trade logins and price-list pages, in one place. */
export function SupplierLinks({ links, canEdit }: { links: ResourceLink[]; canEdit: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const sorted = [...links].sort((a, b) => a.name.localeCompare(b.name));
  const save = () => start(async () => {
    const r = await addLink({ name, url, note });
    if (r.ok) { setName(""); setUrl(""); setNote(""); setAdding(false); setMsg(null); router.refresh(); } else setMsg(r.error ?? "Couldn't save it.");
  });
  return (
    <section className="pk-card pk-pad" aria-label="Supplier websites">
      <div className="pk-card-h"><b>Supplier websites</b><span>{links.length ? `${links.length} link${links.length === 1 ? "" : "s"}` : "trade logins, price lists, product pages"}</span></div>
      {sorted.length > 0 ? (
        <div className="rs-links">
          {sorted.map((l) => (
            <div key={l.id} className="rs-link">
              <a href={l.url} target="_blank" rel="noopener noreferrer"><b>{l.name}</b><span>{l.note ? `${l.note} · ` : ""}{host(l.url)} ↗</span></a>
              {canEdit && <button type="button" className="pk-linkbtn" disabled={busy} onClick={() => { if (confirm(`Take ${l.name} off the list?`)) start(async () => { await removeLink(l.id); router.refresh(); }); }}>Remove</button>}
            </div>
          ))}
        </div>
      ) : <div className="pk-empty">No links yet.{canEdit ? " Add each supplier's website or trade login." : ""}</div>}
      {canEdit && (adding ? (
        <div className="rs-add">
          <input id="rs-name" className="pk-in" placeholder="Name, e.g. Reece" value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" autoFocus />
          <input id="rs-url" className="pk-in" placeholder="Web address, e.g. reece.com.au" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Web address" inputMode="url" />
          <input id="rs-note" className="pk-in" placeholder="Note (optional), e.g. trade login" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note" />
          <button type="button" className="pk-btn" disabled={busy} onClick={save}>{busy ? "Saving…" : "Add link"}</button>
          <button type="button" className="pk-btn g" onClick={() => { setAdding(false); setMsg(null); }}>Cancel</button>
        </div>
      ) : <div className="pk-btns" style={{ marginTop: 10 }}><button type="button" className="pk-btn g" onClick={() => setAdding(true)}>+ Add a link</button></div>)}
      {msg && <p className="pk-said bad" role="status">{msg}</p>}
    </section>
  );
}
