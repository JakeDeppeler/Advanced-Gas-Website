"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addLog, removeLog, saveVehicle, removeVehicle } from "@/app/portal/vehicles/actions";
import type { VehicleLogKind } from "@/lib/portal/db";

export type VehicleView = {
  id: string; name: string; rego: string | null; details: string | null;
  odometer: number | null; serviceIntervalKm: number | null;
  nextServiceKm: number | null; nextServiceDate: string | null; active: boolean;
};
export type LogView = {
  id: string; kind: VehicleLogKind; dateLabel: string;
  odometer: number | null; cost: number | null; litres: number | null;
  detail: string | null; createdBy: string | null;
};

const KINDS: { key: VehicleLogKind; label: string }[] = [
  { key: "reading", label: "Km reading" },
  { key: "fuel", label: "Fuel" },
  { key: "service", label: "Service" },
  { key: "damage", label: "Damage" },
];
const KIND_LABEL: Record<VehicleLogKind, string> = { reading: "Km reading", fuel: "Fuel", service: "Service", damage: "Damage" };

const km = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("en-AU")} km`);
const money = (n: number | null) => (n === null ? null : n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 2 }));
const toInt = (v: string): number | null => { const n = parseInt(v.replace(/[^0-9]/g, ""), 10); return Number.isNaN(n) ? null : n; };
const toNum = (v: string): number | null => { const n = parseFloat(v.replace(/[^0-9.]/g, "")); return Number.isNaN(n) ? null : n; };

export function VehicleDetail({ vehicle, logs, canManage }: { vehicle: VehicleView; logs: LogView[]; canManage: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const refresh = () => router.refresh();

  // add-log form
  const [kind, setKind] = useState<VehicleLogKind>("reading");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [odo, setOdo] = useState("");
  const [cost, setCost] = useState("");
  const [litres, setLitres] = useState("");
  const [detail, setDetail] = useState("");
  const [msg, setMsg] = useState("");

  // edit panel
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({
    name: vehicle.name, rego: vehicle.rego ?? "", details: vehicle.details ?? "",
    odometer: vehicle.odometer?.toString() ?? "", interval: vehicle.serviceIntervalKm?.toString() ?? "",
    nextKm: vehicle.nextServiceKm?.toString() ?? "", nextDate: vehicle.nextServiceDate ?? "", active: vehicle.active,
  });

  const kmToService = vehicle.nextServiceKm !== null && vehicle.odometer !== null ? vehicle.nextServiceKm - vehicle.odometer : null;
  const status = kmToService === null ? null : kmToService <= 0 ? "overdue" : kmToService <= 1000 ? "soon" : "ok";

  function submitLog() {
    setMsg("");
    start(async () => {
      const res = await addLog({
        vehicleId: vehicle.id, kind, logDate: date,
        odometer: toInt(odo), cost: toNum(cost), litres: kind === "fuel" ? toNum(litres) : null, detail,
      });
      if (res.ok) { setOdo(""); setCost(""); setLitres(""); setDetail(""); refresh(); }
      else setMsg(res.error || "Couldn't save.");
    });
  }

  return (
    <div className="pt-veh">
      {/* stats */}
      <section className="pt-panel pt-veh__stats">
        <div className="pt-veh__stat"><span>Current odometer</span><strong>{km(vehicle.odometer)}</strong></div>
        <div className="pt-veh__stat"><span>Service every</span><strong>{vehicle.serviceIntervalKm ? km(vehicle.serviceIntervalKm) : "—"}</strong></div>
        <div className="pt-veh__stat"><span>Next service at</span><strong>{km(vehicle.nextServiceKm)}</strong></div>
        <div className="pt-veh__stat">
          <span>Service status</span>
          {status === null ? <strong>—</strong> : (
            <strong className={`pt-veh__status pt-veh__status--${status}`}>
              {status === "overdue" ? `Overdue ${km(Math.abs(kmToService as number))}` : status === "soon" ? `Due in ${km(kmToService as number)}` : `${km(kmToService as number)} to go`}
            </strong>
          )}
        </div>
        {vehicle.nextServiceDate && <div className="pt-veh__stat"><span>Next service date</span><strong>{vehicle.nextServiceDate}</strong></div>}
      </section>

      {/* add log */}
      <section className="pt-panel">
        <h2 className="pt-panel__h">Log an entry</h2>
        <p className="pt-panel__sub">A km reading, a fuel fill, a service, or damage. Anyone on the crew can add one.</p>
        <div className="pt-veh__kinds">
          {KINDS.map((k) => (
            <button key={k.key} type="button" className={`pt-veh__kind pt-veh__kind--${k.key}${kind === k.key ? " is-on" : ""}`} onClick={() => setKind(k.key)}>{k.label}</button>
          ))}
        </div>
        <div className="pt-veh__logform">
          <label className="pt-field"><span>Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="pt-field"><span>Odometer (km)</span><input inputMode="numeric" value={odo} onChange={(e) => setOdo(e.target.value)} placeholder="e.g. 84300" /></label>
          {kind === "fuel" && <label className="pt-field"><span>Litres</span><input inputMode="decimal" value={litres} onChange={(e) => setLitres(e.target.value)} placeholder="e.g. 62" /></label>}
          {(kind === "fuel" || kind === "service" || kind === "damage") && <label className="pt-field"><span>Cost ($)</span><input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="e.g. 120" /></label>}
        </div>
        <label className="pt-field" style={{ marginTop: 10 }}>
          <span>{kind === "service" ? "What was done" : kind === "damage" ? "What happened" : "Note"} {kind === "reading" ? <em>(optional)</em> : null}</span>
          <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder={kind === "service" ? "e.g. Full service, oil + filters" : kind === "damage" ? "e.g. Scratch on rear bar" : "Anything worth noting"} />
        </label>
        <div className="pf-row-end">
          {msg && <span className="pt-inline is-err">{msg}</span>}
          <button type="button" className="pt-btn pt-btn--orange pt-btn--sm" disabled={pending} onClick={submitLog}>{pending ? "Saving…" : "Add entry"}</button>
        </div>
      </section>

      {/* log timeline */}
      <section className="pt-panel">
        <h2 className="pt-panel__h">History <span className="pt-tm__count">{logs.length}</span></h2>
        {logs.length === 0 ? (
          <div className="pf-empty">Nothing logged yet.</div>
        ) : (
          <div className="pt-veh__logs">
            {logs.map((l) => (
              <div key={l.id} className="pt-veh__log">
                <span className={`pt-veh__logtag pt-veh__logtag--${l.kind}`}>{KIND_LABEL[l.kind]}</span>
                <div className="pt-veh__logbody">
                  <div className="pt-veh__logfacts">
                    <strong>{l.dateLabel}</strong>
                    {l.odometer !== null && <span>{km(l.odometer)}</span>}
                    {l.litres !== null && <span>{l.litres} L</span>}
                    {money(l.cost) && <span>{money(l.cost)}</span>}
                  </div>
                  {l.detail && <div className="pt-veh__logdetail">{l.detail}</div>}
                  {l.createdBy && <div className="pt-veh__logby">— {l.createdBy}</div>}
                </div>
                {canManage && <button type="button" className="pf-del" disabled={pending} onClick={() => start(async () => { await removeLog({ id: l.id, vehicleId: vehicle.id }); refresh(); })}>Delete</button>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* manager edit */}
      {canManage && (
        <section className="pt-panel">
          <div className="pt-veh__edithead">
            <h2 className="pt-panel__h">Vehicle details</h2>
            <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setEditing((v) => !v)}>{editing ? "Close" : "Edit"}</button>
          </div>
          {editing && (
            <>
              <div className="pt-veh__editgrid">
                <label className="pt-field"><span>Name</span><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
                <label className="pt-field"><span>Rego</span><input value={f.rego} onChange={(e) => setF({ ...f, rego: e.target.value })} /></label>
                <label className="pt-field"><span>Make / model / year</span><input value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></label>
                <label className="pt-field"><span>Current km</span><input inputMode="numeric" value={f.odometer} onChange={(e) => setF({ ...f, odometer: e.target.value })} /></label>
                <label className="pt-field"><span>Service interval (km)</span><input inputMode="numeric" value={f.interval} onChange={(e) => setF({ ...f, interval: e.target.value })} /></label>
                <label className="pt-field"><span>Next service at (km)</span><input inputMode="numeric" value={f.nextKm} onChange={(e) => setF({ ...f, nextKm: e.target.value })} /></label>
                <label className="pt-field"><span>Next service date</span><input type="date" value={f.nextDate} onChange={(e) => setF({ ...f, nextDate: e.target.value })} /></label>
                <label className="pt-switch pt-switch--sm" style={{ alignSelf: "end" }}>
                  <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
                  <span className="pt-switch__track" aria-hidden="true"><span className="pt-switch__thumb" /></span>
                  <span className="pt-switch__label">{f.active ? "In service" : "Off the road"}</span>
                </label>
              </div>
              <div className="pf-row-end" style={{ justifyContent: "space-between" }}>
                <button type="button" className="pt-btn pt-btn--danger pt-btn--sm" disabled={pending} onClick={() => start(async () => { const r = await removeVehicle({ id: vehicle.id }); if (r.ok) router.push("/portal/vehicles"); })}>Remove vehicle</button>
                <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" disabled={pending} onClick={() => start(async () => {
                  const r = await saveVehicle({
                    id: vehicle.id, name: f.name, rego: f.rego, details: f.details,
                    odometer: f.odometer ? toInt(f.odometer) : null, serviceIntervalKm: f.interval ? toInt(f.interval) : null,
                    nextServiceKm: f.nextKm ? toInt(f.nextKm) : null, nextServiceDate: f.nextDate, active: f.active,
                  });
                  if (r.ok) { setEditing(false); refresh(); }
                })}>{pending ? "Saving…" : "Save"}</button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
