"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addItem, move } from "@/app/portal/stock/actions";

type Item = { id: string; name: string; unit: string; qty: number; minQty: number; location: string | null; low: boolean };
type Reason = "taken" | "delivered" | "returned" | "count";

const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString("en-AU") : n.toLocaleString("en-AU", { maximumFractionDigits: 2 }));

/** The shelf, with a take / add / count control on each line and a form to add a line. */
export function StockBoard({ items, canSave }: { items: Item[]; canSave: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<string | null>(null);
  const [reason, setReason] = useState<Reason>("taken");
  const [qty, setQty] = useState("1");
  const [forWhat, setForWhat] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [adding, setAdding] = useState(items.length === 0);
  const [f, setF] = useState({ name: "", unit: "each", qty: "", minQty: "", location: "" });

  function openRow(id: string, r: Reason) {
    setOpen(id); setReason(r); setQty(r === "count" ? String(items.find((i) => i.id === id)?.qty ?? "") : "1"); setForWhat(""); setMsg(null);
  }

  function save(id: string) {
    start(async () => {
      const res = await move({ itemId: id, reason, qty, forWhat });
      if (!res.ok) return setMsg({ ok: false, text: res.error ?? "Couldn't save." });
      setOpen(null);
      setMsg({ ok: true, text: "Saved." });
      router.refresh();
    });
  }

  function add() {
    start(async () => {
      const res = await addItem(f);
      if (!res.ok) return setMsg({ ok: false, text: res.error ?? "Couldn't save." });
      setF({ name: "", unit: "each", qty: "", minQty: "", location: "" });
      setAdding(false);
      setMsg({ ok: true, text: "Added." });
      router.refresh();
    });
  }

  return (
    <section className="pt-panel">
      <div className="pt-stk__head">
        <h2 className="pt-panel__h">On the shelf</h2>
        {canSave && !adding && <button type="button" className="pt-btn pt-btn--ghost" onClick={() => setAdding(true)}>+ Add a line</button>}
      </div>
      {msg && <p className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`} role="status">{msg.text}</p>}

      {adding && canSave && (
        <div className="pt-stk__add">
          <label className="pt-field"><span>What it is</span><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="1/4 inch copper, 15m coil" /></label>
          <label className="pt-field"><span>Counted in</span><input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} placeholder="each, coil, box" /></label>
          <label className="pt-field"><span>On the shelf now</span><input inputMode="decimal" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} placeholder="0" /></label>
          <label className="pt-field"><span>Low at</span><input inputMode="decimal" value={f.minQty} onChange={(e) => setF({ ...f, minQty: e.target.value })} placeholder="2" /></label>
          <label className="pt-field"><span>Where it lives</span><input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Bay 3, top shelf" /></label>
          <div className="pt-stk__addacts">
            {items.length > 0 && <button type="button" className="pt-btn pt-btn--ghost" onClick={() => setAdding(false)} disabled={pending}>Cancel</button>}
            <button type="button" className="pt-btn pt-btn--orange" onClick={add} disabled={pending || !f.name.trim()}>{pending ? "Saving…" : "Add it"}</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        !adding && <p className="pt-rep__empty">Nothing on the list yet.</p>
      ) : (
        <ul className="pt-stk">
          {items.map((i) => (
            <li key={i.id} className={`pt-stk__row${i.low ? " is-low" : ""}`}>
              <span className="pt-stk__name">
                <strong>{i.name}</strong>
                <em>{i.location || "No spot recorded"}</em>
              </span>
              <span className="pt-stk__qty">
                <strong>{fmt(i.qty)}</strong> {i.unit}
                {/* Said in words beside the number, never only in the colour. */}
                {i.low ? <b className="pt-stk__low">Low — at or under {fmt(i.minQty)}</b> : i.minQty > 0 ? <small>low at {fmt(i.minQty)}</small> : null}
              </span>
              {canSave && (
                <span className="pt-stk__acts">
                  <button type="button" className="pt-btn pt-btn--sm pt-btn--ghost" onClick={() => openRow(i.id, "taken")}>Take</button>
                  <button type="button" className="pt-btn pt-btn--sm pt-btn--ghost" onClick={() => openRow(i.id, "delivered")}>Add</button>
                  <button type="button" className="pt-btn pt-btn--sm pt-btn--ghost" onClick={() => openRow(i.id, "count")}>Count</button>
                </span>
              )}
              {open === i.id && (
                <div className="pt-stk__form">
                  <select value={reason} onChange={(e) => setReason(e.target.value as Reason)} aria-label="What happened">
                    <option value="taken">Taken off the shelf</option>
                    <option value="returned">Put back</option>
                    <option value="delivered">Delivered</option>
                    <option value="count">Stocktake — the shelf has</option>
                  </select>
                  <input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} aria-label="How many" />
                  <input value={forWhat} onChange={(e) => setForWhat(e.target.value)} placeholder={reason === "taken" ? "For which job or van" : "Note (optional)"} aria-label="For" />
                  <button type="button" className="pt-btn pt-btn--sm pt-btn--orange" onClick={() => save(i.id)} disabled={pending}>{pending ? "Saving…" : "Save"}</button>
                  <button type="button" className="pt-btn pt-btn--sm pt-btn--ghost" onClick={() => setOpen(null)} disabled={pending}>Cancel</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
