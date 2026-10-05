"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addItem, editItem, move, removeItem, startFromVanList, stocktake } from "@/app/portal/stock/actions";

export type CountedItem = {
  id: string; name: string; brand: string | null; unit: string; qty: number; minQty: number;
  location: string | null; category: string | null; countedAt: string | null; low: boolean;
};
export type VanLine = { key: string; item: string; unit: string; min: number; have: boolean };
export type VanGroup = { group: string; lines: VanLine[] };
export type ProductPick = { id: string; brand: string; name: string; shelf: string; kept?: boolean };

type Reason = "taken" | "delivered" | "returned" | "count";
type Mode = "list" | "add" | "count" | "seed";

const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString("en-AU") : n.toLocaleString("en-AU", { maximumFractionDigits: 2 }));
const label = (i: Pick<CountedItem, "name" | "brand">) => (i.brand ? `${i.brand} · ${i.name}` : i.name);

/**
 * The counted part of the factory — materials, or systems — grouped by kind,
 * with take / add / count on each line, the whole shelf counted at once, and
 * for materials a start from the van stock sheet.
 *
 * A line nobody has counted says so instead of showing a nought: "not counted
 * yet" and "none on the shelf" are different things, and only one of them
 * means order more.
 */
export function StockBoard({ section, items, canSave, kinds, vanGroups, products }: {
  section: "materials" | "systems";
  items: CountedItem[];
  canSave: boolean;
  /** The kinds to group by, in order; anything else follows, A–Z. */
  kinds: string[];
  vanGroups?: VanGroup[];
  products?: ProductPick[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const systems = section === "systems";
  const one = systems ? "system" : "line";
  const [mode, setMode] = useState<Mode>(items.length === 0 && !vanGroups?.some((g) => g.lines.length) ? "add" : "list");
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [reason, setReason] = useState<Reason>("taken");
  const [qty, setQty] = useState("1");
  const [forWhat, setForWhat] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const blank = { name: "", brand: "", productId: "", unit: "each", qty: "", minQty: "", location: "", category: "" };
  const [f, setF] = useState(blank);
  const [e, setE] = useState({ name: "", brand: "", unit: "", minQty: "", location: "", category: "" });
  const [counts, setCounts] = useState<Record<string, { count: string; minQty: string }>>({});
  const [ticked, setTicked] = useState<Set<string>>(() => new Set((vanGroups ?? []).flatMap((g) => g.lines.filter((l) => !l.have).map((l) => l.key))));

  const groups = useMemo(() => {
    const by = new Map<string, CountedItem[]>();
    for (const i of items) {
      const k = i.category || "Other";
      by.set(k, [...(by.get(k) ?? []), i]);
    }
    const order = (k: string) => { const n = kinds.indexOf(k); return n < 0 ? kinds.length : n; };
    return [...by.entries()].sort(([a], [b]) => order(a) - order(b) || (a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)));
  }, [items, kinds]);
  const toAdd = (vanGroups ?? []).reduce((n, g) => n + g.lines.filter((l) => !l.have).length, 0);

  function run(fn: () => Promise<{ ok: boolean; error?: string; note?: string }>, after: () => void, okText = "Saved.") {
    start(async () => {
      const res = await fn();
      if (!res.ok) return setMsg({ ok: false, text: res.error ?? "Couldn't save." });
      after();
      setMsg({ ok: true, text: res.note ?? okText });
      router.refresh();
    });
  }

  function openRow(i: CountedItem, r: Reason) {
    setEditing(null); setOpen(i.id); setReason(r); setQty(r === "count" ? (i.countedAt ? String(i.qty) : "") : "1"); setForWhat(""); setMsg(null);
  }
  function openEdit(i: CountedItem) {
    setOpen(null); setEditing(i.id); setMsg(null);
    setE({ name: i.name, brand: i.brand ?? "", unit: i.unit, minQty: String(i.minQty || ""), location: i.location ?? "", category: i.category ?? "" });
  }
  function startCount() {
    setCounts(Object.fromEntries(items.map((i) => [i.id, { count: "", minQty: i.minQty ? String(i.minQty) : "" }])));
    setMode("count"); setMsg(null);
  }
  function pickProduct(id: string) {
    const p = products?.find((x) => x.id === id);
    setF(p ? { ...f, productId: p.id, brand: p.brand, name: p.name, category: p.shelf } : { ...f, productId: "" });
  }

  return (
    <section className="pt-panel">
      <div className="pt-stk__head">
        <h2 className="pt-panel__h">{systems ? "Systems in the factory" : "On the shelf"}</h2>
        {canSave && mode === "list" && (
          <div className="pt-stk__tools">
            {!systems && toAdd > 0 && <button type="button" className="pt-btn pt-btn--ghost" onClick={() => { setMode("seed"); setMsg(null); }}>Start from the van list</button>}
            {items.length > 0 && <button type="button" className="pt-btn pt-btn--ghost" onClick={startCount}>Count the shelf</button>}
            <button type="button" className="pt-btn pt-btn--orange" onClick={() => { setMode("add"); setMsg(null); }}>+ Add a {one}</button>
          </div>
        )}
      </div>
      {msg && <p className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`} role="status">{msg.text}</p>}

      {mode === "add" && canSave && (
        <div className="pt-stk__add">
          {systems && products && products.length > 0 && (
            <label className="pt-field pt-stk__wide">
              <span>From the pricebook</span>
              <select value={f.productId} onChange={(ev) => pickProduct(ev.target.value)}>
                <option value="">Not in the pricebook — type it below</option>
                {[...new Set(products.map((p) => p.shelf))].map((s) => (
                  <optgroup key={s} label={s}>
                    {products.filter((p) => p.shelf === s).map((p) => (
                      <option key={p.id} value={p.id} disabled={p.kept}>{p.brand} · {p.name}{p.kept ? " — on the list" : ""}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          )}
          {systems && <label className="pt-field"><span>Brand</span><input value={f.brand} onChange={(ev) => setF({ ...f, brand: ev.target.value })} placeholder="Daikin" /></label>}
          <label className="pt-field pt-stk__name2"><span>{systems ? "Model" : "What it is"}</span><input value={f.name} onChange={(ev) => setF({ ...f, name: ev.target.value })} placeholder={systems ? "Cora 7.1 kW" : '1/2" copper, 6m length'} /></label>
          {!systems && <label className="pt-field"><span>Counted in</span><input value={f.unit} onChange={(ev) => setF({ ...f, unit: ev.target.value })} placeholder="each, length, roll" /></label>}
          <label className="pt-field"><span>On the shelf now</span><input inputMode="decimal" value={f.qty} onChange={(ev) => setF({ ...f, qty: ev.target.value })} placeholder="Leave blank if not counted" /></label>
          <label className="pt-field"><span>Low at</span><input inputMode="decimal" value={f.minQty} onChange={(ev) => setF({ ...f, minQty: ev.target.value })} placeholder={systems ? "1" : "2"} /></label>
          <label className="pt-field"><span>Where it lives</span><input value={f.location} onChange={(ev) => setF({ ...f, location: ev.target.value })} placeholder="Bay 3, top shelf" /></label>
          <label className="pt-field pt-stk__name2"><span>{systems ? "Type" : "Kind"}</span><input value={f.category} onChange={(ev) => setF({ ...f, category: ev.target.value })} placeholder={kinds[0] ?? ""} list={`kinds-${section}`} /></label>
          <div className="pt-stk__addacts">
            <button type="button" className="pt-btn pt-btn--ghost" onClick={() => { setMode("list"); setF(blank); }} disabled={pending}>Cancel</button>
            <button
              type="button" className="pt-btn pt-btn--orange" disabled={pending || !f.name.trim()}
              onClick={() => run(() => addItem({ section, ...f }), () => { setF(blank); setMode("list"); }, "Added.")}
            >
              {pending ? "Saving…" : "Add it"}
            </button>
          </div>
        </div>
      )}

      {mode === "seed" && vanGroups && (
        <div className="pt-stk__seed">
          <p className="pt-panel__sub">
            The van stock sheet, so the factory and the vans call everything the same thing. Untick what the factory doesn&rsquo;t keep.
            Nothing is counted yet — count the shelf next — and each low mark starts at one restock for every van.
          </p>
          {vanGroups.map((g) => {
            const free = g.lines.filter((l) => !l.have);
            const all = free.length > 0 && free.every((l) => ticked.has(l.key));
            return (
              <fieldset key={g.group} className="pt-stk__seedg">
                <legend>
                  <label>
                    <input
                      type="checkbox" checked={all} disabled={!free.length}
                      onChange={() => setTicked((t) => { const n = new Set(t); free.forEach((l) => (all ? n.delete(l.key) : n.add(l.key))); return n; })}
                    />
                    {g.group}
                  </label>
                </legend>
                {g.lines.map((l) => (
                  <label key={l.key} className={`pt-stk__seedl${l.have ? " is-have" : ""}`}>
                    <input
                      type="checkbox" checked={l.have || ticked.has(l.key)} disabled={l.have}
                      onChange={() => setTicked((t) => { const n = new Set(t); if (n.has(l.key)) n.delete(l.key); else n.add(l.key); return n; })}
                    />
                    <span>{l.item}</span>
                    <small>{l.have ? "on the list" : l.unit}</small>
                  </label>
                ))}
              </fieldset>
            );
          })}
          <div className="pt-stk__addacts">
            <button type="button" className="pt-btn pt-btn--ghost" onClick={() => setMode("list")} disabled={pending}>Cancel</button>
            <button
              type="button" className="pt-btn pt-btn--orange" disabled={pending || ticked.size === 0}
              onClick={() => run(() => startFromVanList({ keys: [...ticked] }), () => setMode("list"))}
            >
              {pending ? "Adding…" : `Add ${ticked.size} ${ticked.size === 1 ? "line" : "lines"}`}
            </button>
          </div>
        </div>
      )}

      {mode === "count" && (
        <div className="pt-stk__count">
          <p className="pt-panel__sub">Type what&rsquo;s on the shelf. A blank leaves the line as it is; everything typed is saved as one stocktake, in your name.</p>
          <div className="pt-fleet__wrap">
            <table className="pt-fleet pt-otab">
              <thead><tr><th>{systems ? "System" : "Line"}</th><th className="pt-otab__num">Was</th><th className="pt-otab__num">Counted</th><th className="pt-otab__num">Low at</th></tr></thead>
              <tbody>
                {groups.flatMap(([k, rows]) => [
                  <tr key={`h-${k}`} className="pt-stk__grouprow"><th colSpan={4} scope="colgroup">{k}</th></tr>,
                  ...rows.map((i) => (
                    <tr key={i.id}>
                      <td><strong>{label(i)}</strong><span className="pt-fleet__sub">{[i.unit, i.location].filter(Boolean).join(" · ")}</span></td>
                      <td className="pt-otab__num">{i.countedAt ? fmt(i.qty) : "not counted"}</td>
                      <td className="pt-otab__num">
                        <input
                          className="pt-stk__cin" inputMode="decimal" aria-label={`Counted, ${label(i)}`} value={counts[i.id]?.count ?? ""}
                          onChange={(ev) => setCounts((c) => ({ ...c, [i.id]: { ...c[i.id], count: ev.target.value } }))}
                        />
                      </td>
                      <td className="pt-otab__num">
                        <input
                          className="pt-stk__cin" inputMode="decimal" aria-label={`Low at, ${label(i)}`} value={counts[i.id]?.minQty ?? ""}
                          onChange={(ev) => setCounts((c) => ({ ...c, [i.id]: { ...c[i.id], minQty: ev.target.value } }))}
                        />
                      </td>
                    </tr>
                  )),
                ])}
              </tbody>
            </table>
          </div>
          <div className="pt-stk__addacts">
            <button type="button" className="pt-btn pt-btn--ghost" onClick={() => setMode("list")} disabled={pending}>Cancel</button>
            <button
              type="button" className="pt-btn pt-btn--orange" disabled={pending}
              onClick={() => run(() => stocktake({ rows: Object.entries(counts).map(([id, v]) => ({ id, count: v.count ?? "", minQty: v.minQty ?? "" })) }), () => setMode("list"))}
            >
              {pending ? "Saving…" : "Save the count"}
            </button>
          </div>
        </div>
      )}

      {mode !== "count" && (items.length === 0 ? (
        mode === "list" && <p className="pt-rep__empty">{systems ? "No systems on the list yet." : "Nothing on the list yet."}</p>
      ) : (
        groups.map(([k, rows]) => (
          <div key={k} className="pt-stk__group">
            <h3 className="pt-stk__gh">{k} <span>{rows.length}</span></h3>
            <ul className="pt-stk">
              {rows.map((i) => (
                <li key={i.id} className={`pt-stk__row${i.low ? " is-low" : ""}`}>
                  <span className="pt-stk__name">
                    <strong>{label(i)}</strong>
                    <em>{i.location || "No spot recorded"}</em>
                  </span>
                  <span className="pt-stk__qty">
                    {i.countedAt ? <><strong>{fmt(i.qty)}</strong> {i.unit}</> : <b className="pt-stk__unk">Not counted yet</b>}
                    {/* Said in words beside the number, never only in the colour. */}
                    {i.low ? <b className="pt-stk__low">Low — at or under {fmt(i.minQty)}</b> : i.minQty > 0 ? <small>low at {fmt(i.minQty)}</small> : null}
                  </span>
                  {canSave && (
                    <span className="pt-stk__acts">
                      <button type="button" className="pt-btn pt-btn--sm pt-btn--ghost" onClick={() => openRow(i, "taken")}>Take</button>
                      <button type="button" className="pt-btn pt-btn--sm pt-btn--ghost" onClick={() => openRow(i, "delivered")}>Add</button>
                      <button type="button" className="pt-btn pt-btn--sm pt-btn--ghost" onClick={() => openRow(i, "count")}>Count</button>
                      <button type="button" className="pt-btn pt-btn--sm pt-btn--ghost" onClick={() => openEdit(i)} aria-label={`Edit ${label(i)}`}>Edit</button>
                    </span>
                  )}
                  {open === i.id && (
                    <div className="pt-stk__form">
                      <select value={reason} onChange={(ev) => setReason(ev.target.value as Reason)} aria-label="What happened">
                        <option value="taken">Taken off the shelf</option>
                        <option value="returned">Put back</option>
                        <option value="delivered">Delivered</option>
                        <option value="count">Stocktake — the shelf has</option>
                      </select>
                      <input inputMode="decimal" value={qty} onChange={(ev) => setQty(ev.target.value)} aria-label="How many" />
                      <input value={forWhat} onChange={(ev) => setForWhat(ev.target.value)} placeholder={reason === "taken" ? "For which job or van" : "Note (optional)"} aria-label="For" />
                      <button type="button" className="pt-btn pt-btn--sm pt-btn--orange" disabled={pending} onClick={() => run(() => move({ itemId: i.id, reason, qty, forWhat }), () => setOpen(null))}>
                        {pending ? "Saving…" : "Save"}
                      </button>
                      <button type="button" className="pt-btn pt-btn--sm pt-btn--ghost" onClick={() => setOpen(null)} disabled={pending}>Cancel</button>
                    </div>
                  )}
                  {editing === i.id && (
                    <div className="pt-stk__form pt-stk__edit">
                      {systems && <input value={e.brand} onChange={(ev) => setE({ ...e, brand: ev.target.value })} placeholder="Brand" aria-label="Brand" />}
                      <input value={e.name} onChange={(ev) => setE({ ...e, name: ev.target.value })} placeholder={systems ? "Model" : "Name"} aria-label={systems ? "Model" : "Name"} />
                      {!systems && <input value={e.unit} onChange={(ev) => setE({ ...e, unit: ev.target.value })} placeholder="Counted in" aria-label="Counted in" />}
                      <input inputMode="decimal" value={e.minQty} onChange={(ev) => setE({ ...e, minQty: ev.target.value })} placeholder="Low at" aria-label="Low at" />
                      <input value={e.location} onChange={(ev) => setE({ ...e, location: ev.target.value })} placeholder="Where it lives" aria-label="Where it lives" />
                      <input value={e.category} onChange={(ev) => setE({ ...e, category: ev.target.value })} placeholder={systems ? "Type" : "Kind"} aria-label={systems ? "Type" : "Kind"} list={`kinds-${section}`} />
                      <button
                        type="button" className="pt-btn pt-btn--sm pt-btn--orange" disabled={pending || !e.name.trim()}
                        onClick={() => run(() => editItem({ id: i.id, ...e, brand: systems ? e.brand : undefined }), () => setEditing(null))}
                      >
                        {pending ? "Saving…" : "Save"}
                      </button>
                      <button type="button" className="pt-btn pt-btn--sm pt-btn--ghost" onClick={() => setEditing(null)} disabled={pending}>Cancel</button>
                      <button
                        type="button" className="pt-btn pt-btn--sm pt-btn--ghost pt-stk__rm" disabled={pending}
                        onClick={() => { if (window.confirm(`Take ${label(i)} off the list?`)) run(() => removeItem({ id: i.id }), () => setEditing(null), "Removed."); }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))
      ))}
      <datalist id={`kinds-${section}`}>{kinds.map((k) => <option key={k} value={k} />)}</datalist>
    </section>
  );
}
