"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveVehicle, removeVehicle } from "@/app/portal/vehicles/actions";
import { NumField } from "@/components/portal/NumField";
import { CONDITION_OPTS, STATUS_OPTS } from "@/components/portal/vehicleStatus";
import type { VehicleView, CrewOption } from "@/components/portal/VehicleDetail";

const toInt = (v: string): number | null => { const n = parseInt(v.replace(/[^0-9]/g, ""), 10); return Number.isNaN(n) ? null : n; };
const toNum = (v: string): number | null => { const n = parseFloat(v.replace(/[^0-9.]/g, "")); return Number.isNaN(n) ? null : n; };

/**
 * The manager's edit panel for a van.
 *
 * It left VehicleDetail when the design tabbed the van's history: it belongs
 * at the foot of every tab, under the costs, not wedged between the tab's own
 * panel and the check sheets.
 */
export function VehicleEdit({ vehicle, crew }: { vehicle: VehicleView; crew: CrewOption[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const refresh = () => router.refresh();
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({
    name: vehicle.name, rego: vehicle.rego ?? "", details: vehicle.details ?? "",
    odometer: vehicle.odometer?.toString() ?? "", interval: vehicle.serviceIntervalKm?.toString() ?? "",
    nextKm: vehicle.nextServiceKm?.toString() ?? "", nextDate: vehicle.nextServiceDate ?? "", status: vehicle.status,
    fuel: vehicle.fuelPer100?.toString() ?? "",
    bought: vehicle.purchasedOn ?? "", condition: vehicle.condition,
    serviceCost: vehicle.serviceCost?.toString() ?? "", kmYear: vehicle.kmYear?.toString() ?? "",
    assignedTo: vehicle.assignedTo ?? "", regoDue: vehicle.regoDue ?? "",
  });

  return (
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
              <NumField label="A service costs" value={f.serviceCost} onChange={(v) => setF({ ...f, serviceCost: v })} prefix="$" />
              <NumField label="Km a year" hint="(roughly)" value={f.kmYear} onChange={(v) => setF({ ...f, kmYear: v })} suffix="km" />
              <NumField label="Next service at" value={f.nextKm} onChange={(v) => setF({ ...f, nextKm: v })} suffix="km" />
              <label className="pt-field"><span>Next service date</span><input type="date" value={f.nextDate} onChange={(e) => setF({ ...f, nextDate: e.target.value })} /></label>
              <label className="pt-field"><span>Rego due</span><input type="date" value={f.regoDue} onChange={(e) => setF({ ...f, regoDue: e.target.value })} /></label>
              <label className="pt-field"><span>When we got it</span><input type="date" value={f.bought} onChange={(e) => setF({ ...f, bought: e.target.value })} /></label>
              <label className="pt-field">
                <span>Signed to</span>
                <select value={f.assignedTo} onChange={(e) => setF({ ...f, assignedTo: e.target.value })}>
                  <option value="">Nobody yet</option>
                  {crew.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <div className="pt-field">
                <span>Condition when we got it</span>
                <div className="pt-seg" role="group" aria-label="Condition when bought">
                  {CONDITION_OPTS.map((o) => (
                    <button
                      key={o.k}
                      type="button"
                      className={`pt-seg__b${f.condition === o.k ? " is-on" : ""}`}
                      aria-pressed={f.condition === o.k}
                      onClick={() => setF({ ...f, condition: f.condition === o.k ? null : o.k })}
                    >{o.label}</button>
                  ))}
                </div>
              </div>
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
            <p className="pt-panel__sub">What it cost, what&rsquo;s still owing, the repayment, resale and life are set on <a href="/portal/finance/capacity?part=vans">Finance → Our numbers → Vans &amp; loans</a>.</p>
            <div className="pf-row-end" style={{ justifyContent: "space-between" }}>
              <button type="button" className="pt-btn pt-btn--danger pt-btn--sm" disabled={pending} onClick={() => start(async () => { const r = await removeVehicle({ id: vehicle.id }); if (r.ok) router.push("/portal/vehicles"); })}>Remove vehicle</button>
              <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" disabled={pending} onClick={() => start(async () => {
                const r = await saveVehicle({
                  id: vehicle.id, name: f.name, rego: f.rego, details: f.details,
                  odometer: f.odometer ? toInt(f.odometer) : null, serviceIntervalKm: f.interval ? toInt(f.interval) : null,
                  nextServiceKm: f.nextKm ? toInt(f.nextKm) : null, nextServiceDate: f.nextDate, status: f.status,
                  fuelPer100: f.fuel ? toNum(f.fuel) : null,
                  purchasedOn: f.bought, condition: f.condition,
                  serviceCost: f.serviceCost ? toNum(f.serviceCost) : null, kmYear: f.kmYear ? toInt(f.kmYear) : null,
                  assignedTo: f.assignedTo, regoDue: f.regoDue,
                });
                if (r.ok) { setEditing(false); refresh(); }
              })}>{pending ? "Saving…" : "Save"}</button>
            </div>
          </>
        )}
      </section>
  );
}
