"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addItem, editItem, removeItem, signTool } from "@/app/portal/stock/actions";

export type ToolItem = {
  id: string; name: string; serial: string | null; location: string | null; category: string | null;
  holder: string | null; out: boolean; dueOn: string | null; due: "over" | "soon" | "ok" | null;
};

type Filter = "all" | "in" | "out" | "due";

const day = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/**
 * The factory's tools, one to a row: in the factory or out with somebody, and
 * when each is next due a test & tag or a service. Signing a tool out names
 * who has it; booking it back clears that. Both are movements, so who took
 * what shows tools beside the shelf.
 */
export function ToolBoard({ tools, canSave, kinds, names, people }: {
  tools: ToolItem[];
  canSave: boolean;
  /** The kinds to group by, in order. */
  kinds: string[];
  /** Tool names to suggest when adding one. */
  names: string[];
  /** Who a tool can go out to: the crew, and the vans. */
  people: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [adding, setAdding] = useState(tools.length === 0);
  const [outFor, setOutFor] = useState<string | null>(null);
  const [holder, setHolder] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const blank = { name: "", serial: "", category: "", location: "", dueOn: "" };
  const [f, setF] = useState(blank);
  const [e, setE] = useState(blank);

  const counts = {
    all: tools.length,
    in: tools.filter((t) => !t.out).length,
    out: tools.filter((t) => t.out).length,
    due: tools.filter((t) => t.due === "over" || t.due === "soon").length,
  };
  const shown = tools.filter((t) => filter === "all" || (filter === "in" ? !t.out : filter === "out" ? t.out : t.due === "over" || t.due === "soon"));
  const groups = useMemo(() => {
    const by = new Map<string, ToolItem[]>();
    for (const t of shown) by.set(t.category || "Other", [...(by.get(t.category || "Other") ?? []), t]);
    const order = (k: string) => { const n = kinds.indexOf(k); return n < 0 ? kinds.length : n; };
    return [...by.entries()].sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b));
  }, [shown, kinds]);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after: () => void, okText = "Saved.") {
    start(async () => {
      const res = await fn();
      if (!res.ok) return setMsg({ ok: false, text: res.error ?? "Couldn't save." });
      after();
      setMsg({ ok: true, text: okText });
      router.refresh();
    });
  }

  return (
    <section className="pt-panel">
      <div className="pt-stk__head">
        <h2 className="pt-panel__h">Tools</h2>
        {canSave && !adding && <button type="button" className="pt-btn pt-btn--orange" onClick={() => { setAdding(true); setMsg(null); }}>+ Add a tool</button>}
      </div>
      {msg && <p className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`} role="status">{msg.text}</p>}

      {adding && canSave && (
        <div className="pt-stk__add">
          <label className="pt-field pt-stk__name2"><span>What it is</span><input value={f.name} onChange={(ev) => setF({ ...f, name: ev.target.value })} placeholder="Core drill" list="tool-names" /></label>
          <label className="pt-field"><span>Serial or asset no.</span><input value={f.serial} onChange={(ev) => setF({ ...f, serial: ev.target.value })} placeholder="AG-014" /></label>
          <label className="pt-field"><span>Kind</span><input value={f.category} onChange={(ev) => setF({ ...f, category: ev.target.value })} placeholder={kinds[0] ?? ""} list="tool-kinds" /></label>
          <label className="pt-field"><span>Where it lives</span><input value={f.location} onChange={(ev) => setF({ ...f, location: ev.target.value })} placeholder="Tool cage" /></label>
          <label className="pt-field"><span>Test &amp; tag or service due</span><input type="date" value={f.dueOn} onChange={(ev) => setF({ ...f, dueOn: ev.target.value })} /></label>
          <div className="pt-stk__addacts">
            {tools.length > 0 && <button type="button" className="pt-btn pt-btn--ghost" onClick={() => { setAdding(false); setF(blank); }} disabled={pending}>Cancel</button>}
            <button
              type="button" className="pt-btn pt-btn--orange" disabled={pending || !f.name.trim()}
              onClick={() => run(() => addItem({ section: "tools", name: f.name, unit: "each", qty: "1", minQty: "", location: f.location, category: f.category, serial: f.serial, dueOn: f.dueOn }), () => { setF(blank); setAdding(false); }, "Added.")}
            >
              {pending ? "Saving…" : "Add it"}
            </button>
          </div>
        </div>
      )}

      {tools.length > 0 && (
        <div className="pt-seg pt-tool__filter" role="group" aria-label="Show">
          {([["all", "All"], ["in", "In the factory"], ["out", "Out"], ["due", "Due for test & tag"]] as const).map(([k, l]) => (
            <button key={k} type="button" className={`pt-seg__b${filter === k ? " is-on" : ""}`} aria-pressed={filter === k} onClick={() => setFilter(k)}>
              {l} · {counts[k]}
            </button>
          ))}
        </div>
      )}

      {tools.length === 0 ? (
        !adding && <p className="pt-rep__empty">No tools on the register yet.</p>
      ) : shown.length === 0 ? (
        <p className="pt-rep__empty">None {filter === "out" ? "out" : filter === "in" ? "in the factory" : "due"} right now.</p>
      ) : (
        groups.map(([k, rows]) => (
          <div key={k} className="pt-stk__group">
            <h3 className="pt-stk__gh">{k} <span>{rows.length}</span></h3>
            <ul className="pt-stk">
              {rows.map((t) => (
                <li key={t.id} className="pt-stk__row pt-tool__row">
                  <span className="pt-stk__name">
                    <strong>{t.name}</strong>
                    <em>{[t.serial, t.location].filter(Boolean).join(" · ") || "No serial or spot recorded"}</em>
                  </span>
                  <span className="pt-tool__state">
                    {/* Where it is, in words: the chip's colour backs the words up, never stands in for them. */}
                    {t.out ? <b className="pt-tool__out">Out · {t.holder ?? "not recorded"}</b> : <b className="pt-tool__in">In the factory</b>}
                    {t.dueOn ? (
                      t.due === "over" ? <b className="pt-stk__low">Overdue since {day(t.dueOn)}</b>
                        : t.due === "soon" ? <b className="pt-tool__soon">Due {day(t.dueOn)}</b>
                          : <small>Due {day(t.dueOn)}</small>
                    ) : <small>No test &amp; tag date</small>}
                  </span>
                  {canSave && (
                    <span className="pt-stk__acts">
                      {t.out ? (
                        <button type="button" className="pt-btn pt-btn--sm pt-btn--ghost" disabled={pending} onClick={() => run(() => signTool({ id: t.id, out: false, holder: "" }), () => undefined, "Back in.")}>Back in</button>
                      ) : (
                        <button type="button" className="pt-btn pt-btn--sm pt-btn--ghost" onClick={() => { setEditing(null); setOutFor(t.id); setHolder(""); setMsg(null); }}>Sign out</button>
                      )}
                      <button
                        type="button" className="pt-btn pt-btn--sm pt-btn--ghost" aria-label={`Edit ${t.name}`}
                        onClick={() => { setOutFor(null); setEditing(t.id); setMsg(null); setE({ name: t.name, serial: t.serial ?? "", category: t.category ?? "", location: t.location ?? "", dueOn: t.dueOn ?? "" }); }}
                      >
                        Edit
                      </button>
                    </span>
                  )}
                  {outFor === t.id && (
                    <div className="pt-stk__form">
                      <input value={holder} onChange={(ev) => setHolder(ev.target.value)} placeholder="Who's taking it — a name or a van" aria-label="Who's taking it" list="tool-people" autoFocus />
                      <button type="button" className="pt-btn pt-btn--sm pt-btn--orange" disabled={pending || !holder.trim()} onClick={() => run(() => signTool({ id: t.id, out: true, holder }), () => setOutFor(null), "Signed out.")}>
                        {pending ? "Saving…" : "Sign out"}
                      </button>
                      <button type="button" className="pt-btn pt-btn--sm pt-btn--ghost" onClick={() => setOutFor(null)} disabled={pending}>Cancel</button>
                    </div>
                  )}
                  {editing === t.id && (
                    <div className="pt-stk__form pt-stk__edit">
                      <input value={e.name} onChange={(ev) => setE({ ...e, name: ev.target.value })} placeholder="Name" aria-label="Name" />
                      <input value={e.serial} onChange={(ev) => setE({ ...e, serial: ev.target.value })} placeholder="Serial or asset no." aria-label="Serial or asset number" />
                      <input value={e.category} onChange={(ev) => setE({ ...e, category: ev.target.value })} placeholder="Kind" aria-label="Kind" list="tool-kinds" />
                      <input value={e.location} onChange={(ev) => setE({ ...e, location: ev.target.value })} placeholder="Where it lives" aria-label="Where it lives" />
                      <label className="pt-tool__date">Test &amp; tag due <input type="date" value={e.dueOn} onChange={(ev) => setE({ ...e, dueOn: ev.target.value })} /></label>
                      <button
                        type="button" className="pt-btn pt-btn--sm pt-btn--orange" disabled={pending || !e.name.trim()}
                        onClick={() => run(() => editItem({ id: t.id, name: e.name, location: e.location, category: e.category, serial: e.serial, dueOn: e.dueOn }), () => setEditing(null))}
                      >
                        {pending ? "Saving…" : "Save"}
                      </button>
                      <button type="button" className="pt-btn pt-btn--sm pt-btn--ghost" onClick={() => setEditing(null)} disabled={pending}>Cancel</button>
                      <button
                        type="button" className="pt-btn pt-btn--sm pt-btn--ghost pt-stk__rm" disabled={pending}
                        onClick={() => { if (window.confirm(`Take ${t.name} off the register?`)) run(() => removeItem({ id: t.id }), () => setEditing(null), "Removed."); }}
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
      )}
      <datalist id="tool-kinds">{kinds.map((k) => <option key={k} value={k} />)}</datalist>
      <datalist id="tool-names">{names.map((k) => <option key={k} value={k} />)}</datalist>
      <datalist id="tool-people">{people.map((k) => <option key={k} value={k} />)}</datalist>
    </section>
  );
}
