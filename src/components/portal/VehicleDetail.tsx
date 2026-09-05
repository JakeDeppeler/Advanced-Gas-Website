"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addLog, removeLog, saveVehicle, removeVehicle } from "@/app/portal/vehicles/actions";
import { NumField } from "@/components/portal/NumField";
import { STATUS_LABEL, STATUS_NOTE, STATUS_OPTS } from "@/components/portal/vehicleStatus";
import type { VehicleLogKind, VehicleStatus } from "@/lib/portal/db";

export type VehicleView = {
  id: string; name: string; rego: string | null; details: string | null;
  odometer: number | null; serviceIntervalKm: number | null;
  nextServiceKm: number | null; nextServiceDate: string | null; status: VehicleStatus;
  purchasePrice: number | null; resaleValue: number | null; lifespanYears: number | null; fuelPer100: number | null;
  amountOwing: number | null;
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
    nextKm: vehicle.nextServiceKm?.toString() ?? "", nextDate: vehicle.nextServiceDate ?? "", status: vehicle.status,
    purchase: vehicle.purchasePrice?.toString() ?? "", resale: vehicle.resaleValue?.toString() ?? "",
    lifespan: vehicle.lifespanYears?.toString() ?? "", fuel: vehicle.fuelPer100?.toString() ?? "",
    owing: vehicle.amountOwing?.toString() ?? "",
  });

  const kmToService = vehicle.nextServiceKm !== null && vehicle.odometer !== null ? vehicle.nextServiceKm - vehicle.odometer : null;
  const status = kmToService === null ? null : kmToService <= 0 ? "overdue" : kmToService <= 1000 ? "soon" : "ok";
  const annualDep = vehicle.purchasePrice !== null && vehicle.lifespanYears ? (vehicle.purchasePrice - (vehicle.resaleValue ?? 0)) / vehicle.lifespanYears : null;
  // What it's actually worth to the business: resale less whatever finance is
  // still outstanding on it.
  const equity = vehicle.amountOwing !== null && vehicle.resaleValue !== null ? vehicle.resaleValue - vehicle.amountOwing : null;
  const dollars = (v: number) => v.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

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
      {vehicle.status !== "on" && (
        <div className={`pt-veh__off${vehicle.status === "repair" ? " pt-veh__off--repair" : ""}`}>
          <strong>{STATUS_LABEL[vehicle.status]}.</strong>
          <span>{STATUS_NOTE[vehicle.status]}</span>
        </div>
      )}

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
        {annualDep !== null && <div className="pt-veh__stat"><span>Depreciation / yr</span><strong>{dollars(annualDep)}</strong></div>}
        {vehicle.fuelPer100 !== null && <div className="pt-veh__stat"><span>Fuel use</span><strong>{vehicle.fuelPer100} L/100km</strong></div>}
        {vehicle.amountOwing !== null && <div className="pt-veh__stat"><span>Still owing</span><strong>{dollars(vehicle.amountOwing)}</strong></div>}
        {equity !== null && <div className="pt-veh__stat"><span>Worth to us</span><strong className={equity < 0 ? "is-neg" : ""}>{dollars(equity)}</strong></div>}
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
          <NumField label="Odometer" value={odo} onChange={setOdo} suffix="km" placeholder="84,300" />
          {kind === "fuel" && <NumField label="Litres" value={litres} onChange={setLitres} suffix="L" decimal placeholder="62" />}
          {(kind === "fuel" || kind === "service" || kind === "damage") && <NumField label="Cost" value={cost} onChange={setCost} prefix="$" decimal placeholder="120" />}
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
                <NumField label="Current odometer" value={f.odometer} onChange={(v) => setF({ ...f, odometer: v })} suffix="km" />
                <NumField label="Service every" value={f.interval} onChange={(v) => setF({ ...f, interval: v })} suffix="km" />
                <NumField label="Next service at" value={f.nextKm} onChange={(v) => setF({ ...f, nextKm: v })} suffix="km" />
                <label className="pt-field"><span>Next service date</span><input type="date" value={f.nextDate} onChange={(e) => setF({ ...f, nextDate: e.target.value })} /></label>
                <NumField label="Purchase price" value={f.purchase} onChange={(v) => setF({ ...f, purchase: v })} prefix="$" />
                <NumField label="Still owing" hint="(finance left to pay)" value={f.owing} onChange={(v) => setF({ ...f, owing: v })} prefix="$" />
                <NumField label="Resale value" hint="(at end of life)" value={f.resale} onChange={(v) => setF({ ...f, resale: v })} prefix="$" />
                <NumField label="Lifespan" value={f.lifespan} onChange={(v) => setF({ ...f, lifespan: v })} suffix="years" decimal />
                <NumField label="Fuel use" value={f.fuel} onChange={(v) => setF({ ...f, fuel: v })} suffix="L/100km" decimal />
                <div className="pt-field pt-field--wide">
                  <span>Road status</span>
                  <div className="pt-seg" role="group" aria-label="Road status">
                    {STATUS_OPTS.map((o) => (
                      <button
                        key={o.k}
                        type="button"
                        className={`pt-seg__b pt-seg__b--${o.k}${f.status === o.k ? " is-on" : ""}`}
                        aria-pressed={f.status === o.k}
                        onClick={() => setF({ ...f, status: o.k })}
                      >{o.label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="pf-row-end" style={{ justifyContent: "space-between" }}>
                <button type="button" className="pt-btn pt-btn--danger pt-btn--sm" disabled={pending} onClick={() => start(async () => { const r = await removeVehicle({ id: vehicle.id }); if (r.ok) router.push("/portal/vehicles"); })}>Remove vehicle</button>
                <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" disabled={pending} onClick={() => start(async () => {
                  const r = await saveVehicle({
                    id: vehicle.id, name: f.name, rego: f.rego, details: f.details,
                    odometer: f.odometer ? toInt(f.odometer) : null, serviceIntervalKm: f.interval ? toInt(f.interval) : null,
                    nextServiceKm: f.nextKm ? toInt(f.nextKm) : null, nextServiceDate: f.nextDate, status: f.status,
                    purchasePrice: f.purchase ? toNum(f.purchase) : null, resaleValue: f.resale ? toNum(f.resale) : null,
                    lifespanYears: f.lifespan ? toNum(f.lifespan) : null, fuelPer100: f.fuel ? toNum(f.fuel) : null,
                    amountOwing: f.owing ? toNum(f.owing) : null,
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
