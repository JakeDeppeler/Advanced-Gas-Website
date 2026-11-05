"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addLink, removeLink, type ResourceLink } from "@/app/portal/resources/actions";

const host = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

export type PriceShelf = {
  key: string; label: string; blurb: string;
  products: { brand: string; name: string; size: string | null; price: string | null; note: string; href: string }[];
  tiers: { tier: string; price: string; what: string }[];
};

/**
 * Our prices, a button per pricebook shelf that opens the shelf's installed
 * prices over the page: brand, size and price, searchable, with the way
 * through to the full pricebook. Read from the published price list, the
 * same as the Trade iPad's, so it can't disagree with what the customer sees.
 */
export function OurPrices({ shelves }: { shelves: PriceShelf[] }) {
  const [open, setOpen] = useState<PriceShelf | null>(null);
  const [q, setQ] = useState("");
  const close = () => { setOpen(null); setQ(""); };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const rows = open ? open.products.filter((p) => words.every((w) => `${p.brand} ${p.name} ${p.size ?? ""}`.toLowerCase().includes(w))) : [];
  return (
    <section className="pk-card pk-pad rs-prices" aria-label="Our prices">
      <div className="pk-card-h"><b>Our prices</b><span>installed prices from the pricebook, inc GST</span></div>
      <div className="rs-pricebtns">
        {shelves.map((s) => <button key={s.key} type="button" className="pk-btn g" onClick={() => setOpen(s)}>{s.label}</button>)}
      </div>
      {open && (
        <div className="rs-pop" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="rs-popbox" role="dialog" aria-modal="true" aria-labelledby="rs-pop-h">
            <div className="rs-pophead">
              <span><b id="rs-pop-h">{open.label}</b><span>{open.blurb} Installed, inc GST.</span></span>
              <button type="button" className="rs-x" aria-label="Close" onClick={close}>×</button>
            </div>
            {open.products.length > 6 && (
              <input id="rs-pop-q" className="pk-in rs-popq" type="search" autoFocus placeholder="Brand or size, e.g. Mitsubishi 7.1" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a model" />
            )}
            <div className="rs-popbody">
              {open.products.length > 0 && (
                <table className="rs-pt">
                  <tbody>
                    {rows.map((p) => (
                      <tr key={`${p.brand}-${p.name}`}>
                        <td><b>{p.brand}</b> {p.name.toLowerCase().startsWith(p.brand.toLowerCase()) ? p.name.slice(p.brand.length).trim() : p.name}</td>
                        <td className="s">{p.size ?? ""}</td>
                        <td className="p" title={p.note}>{p.price ?? "On site"}</td>
                      </tr>
                    ))}
                    {rows.length === 0 && <tr><td colSpan={3} className="none">Nothing by that name on this shelf.</td></tr>}
                  </tbody>
                </table>
              )}
              {open.tiers.length > 0 && (
                <>
                  <div className="rs-plh">{open.products.length ? "Published price bands" : "Published prices"}</div>
                  <table className="rs-pt">
                    <tbody>
                      {open.tiers.map((t) => (
                        <tr key={`${t.tier}-${t.price}`}><td>{t.tier}</td><td className="s">{t.what}</td><td className="p">{t.price}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              {!open.products.length && !open.tiers.length && <p className="pk-empty">No prices on this shelf yet.</p>}
            </div>
            <div className="rs-popfoot">
              <Link className="pk-btn" href={`/trade/pricebook/${open.key}`}>Open the full pricebook ›</Link>
              <button type="button" className="pk-btn g" onClick={close}>Close</button>
            </div>
          </div>
        </div>
      )}
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
