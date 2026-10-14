"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveStPo } from "@/app/portal/supply/emails/actions";

type Opt = { id: number; name: string };

/**
 * Supplier emails › ServiceTitan purchase orders: what a sent order is filed
 * under in ServiceTitan, and whether every order goes in on its own (on, once
 * the type and warehouse are picked).
 */
export function StPoForm({ initial, types, warehouses, vendors, businessUnits, suppliers, found, error }: {
  initial: { auto: boolean; typeId: number | null; warehouseId: number | null; stockBusinessUnitId: number | null; vendorIds: Record<string, number> };
  types: Opt[]; warehouses: Opt[]; vendors: Opt[]; businessUnits: Opt[];
  suppliers: { id: string; name: string }[];
  /** The vendor each supplier is matched to by name, when it isn't set by hand. */
  found: Record<string, number | null>;
  /** Why ServiceTitan's lists couldn't be read — usually a scope not ticked. */
  error: string | null;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [f, setF] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const pick = (id: string, label: string, value: number | null, opts: Opt[], on: (v: number | null) => void, sub?: string) => (
    <div className="pk-kv">
      <span className="t"><b>{label}</b>{sub && <span>{sub}</span>}</span>
      <select id={id} className="pk-in" style={{ width: 260 }} value={value ?? ""} aria-label={label} onChange={(e) => on(e.target.value ? Number(e.target.value) : null)} disabled={!opts.length}>
        <option value="">{opts.length ? "Choose…" : "Not available"}</option>
        {opts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );

  return (
    <section className="pk-card pk-pad" id="servicetitan">
      <div className="pk-card-h"><b>ServiceTitan purchase orders</b><span>each sent order onto its jobs in ServiceTitan</span></div>
      <p className="pk-note" style={{ marginBottom: 8 }}>
        A sent order goes into ServiceTitan as a purchase order on each job it&rsquo;s for, and one for any factory stock, so the crew can see on the job what&rsquo;s been ordered for it.
        The supplier still gets the email as before. Pick the type and the warehouse below and every sent order goes in by itself; orders sent before go in from <b>Bring them up to date</b> under On the job in ServiceTitan.
      </p>
      {error && <p className="pk-said bad" role="status" style={{ marginBottom: 8 }}>{error}</p>}
      <div className="pk-glh">Filed under</div>
      {pick("stpo-type", "Purchase order type", f.typeId, types, (v) => setF({ ...f, typeId: v }))}
      {pick("stpo-wh", "Warehouse", f.warehouseId, warehouses, (v) => setF({ ...f, warehouseId: v }), "where the stock goes, and where the jobs' parts come through")}
      {pick("stpo-bu", "Business unit for factory stock", f.stockBusinessUnitId, businessUnits, (v) => setF({ ...f, stockBusinessUnitId: v }), "a job's purchase order takes the job's own")}
      <div className="pk-glh">Suppliers in ServiceTitan</div>
      {suppliers.map((s) => {
        const auto = found[s.id] ?? null;
        const autoName = auto != null ? vendors.find((v) => v.id === auto)?.name ?? `vendor ${auto}` : null;
        return (
          <div className="pk-kv" key={s.id}>
            <span className="t"><b>{s.name}</b><span>{f.vendorIds[s.id] ? "set by hand" : autoName ? `matched by name: ${autoName}` : "not matched — pick one"}</span></span>
            <select id={`stpo-v-${s.id}`} className="pk-in" style={{ width: 260 }} value={f.vendorIds[s.id] ?? ""} aria-label={`${s.name} in ServiceTitan`}
              onChange={(e) => {
                const v = { ...f.vendorIds };
                if (e.target.value) v[s.id] = Number(e.target.value); else delete v[s.id];
                setF({ ...f, vendorIds: v });
              }}>
              <option value="">{autoName ? `As matched (${autoName})` : "Choose…"}</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        );
      })}
      <div className="pk-glh">Every order</div>
      <div className="pk-kv">
        <span className="t"><b>Put every sent order into ServiceTitan</b><span>as it&rsquo;s sent — a refusal never stops the email going</span></span>
        <label className="pk-check"><input id="stpo-auto" type="checkbox" checked={f.auto} onChange={(e) => setF({ ...f, auto: e.target.checked })} /> {f.auto ? "On" : "Off"}</label>
      </div>
      <div className="pk-btns" style={{ marginTop: 14, alignItems: "center" }}>
        <button type="button" className="pk-btn" disabled={busy} onClick={() => start(async () => {
          const r = await saveStPo(f);
          setMsg(r.ok ? { ok: true, text: "Saved." } : { ok: false, text: r.error ?? "Couldn’t save." });
          if (r.ok) router.refresh();
        })}>{busy ? "Saving…" : "Save"}</button>
        {msg && <span className={`pk-said${msg.ok ? "" : " bad"}`} role="status">{msg.text}</span>}
      </div>
    </section>
  );
}
