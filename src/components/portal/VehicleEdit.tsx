"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveVehicle, removeVehicle } from "@/app/portal/vehicles/actions";
import { CONDITION_OPTS, STATUS_LABEL, STATUS_OPTS } from "@/components/portal/vehicleStatus";
import type { VehicleView, CrewOption } from "@/components/portal/VehicleDetail";
import { EditHead, Fact } from "@/components/portal/fleet/EditCard";
import { Pill } from "@/components/portal/kit/Kit";

const toInt = (v: string): number | null => { const n = parseInt(v.replace(/[^0-9]/g, ""), 10); return Number.isNaN(n) ? null : n; };
const toNum = (v: string): number | null => { const n = parseFloat(v.replace(/[^0-9.]/g, "")); return Number.isNaN(n) ? null : n; };
const kmS = (n: number | null) => (n == null ? null : `${n.toLocaleString("en-AU")} km`);
const dayS = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }) : null);

type F = {
  name: string; rego: string; details: string; odometer: string; interval: string; nextKm: string; nextDate: string;
  status: VehicleView["status"]; fuel: string; bought: string; condition: VehicleView["condition"];
  serviceCost: string; kmYear: string; assignedTo: string; regoDue: string;
};
const fromVehicle = (v: VehicleView): F => ({
  name: v.name, rego: v.rego ?? "", details: v.details ?? "",
  odometer: v.odometer?.toString() ?? "", interval: v.serviceIntervalKm?.toString() ?? "",
  nextKm: v.nextServiceKm?.toString() ?? "", nextDate: v.nextServiceDate ?? "", status: v.status,
  fuel: v.fuelPer100?.toString() ?? "", bought: v.purchasedOn ?? "", condition: v.condition,
  serviceCost: v.serviceCost?.toString() ?? "", kmYear: v.kmYear?.toString() ?? "",
  assignedTo: v.assignedTo ?? "", regoDue: v.regoDue ?? "",
});

/**
 * A van's details — who has it, the odometer and servicing, rego, fuel — read
 * at a glance, and changed only after pressing Edit. What it cost and how it's
 * paid for is the card beside it (LoanForm), so "bought on" lives there when
 * that card is shown and here when it isn't.
 */
export function VehicleEdit({ vehicle, crew, canEdit = true, showBought = true }: {
  vehicle: VehicleView; crew: CrewOption[]; canEdit?: boolean;
  /** False when the money card is on the page and carries the date bought. */
  showBought?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [f, setF] = useState<F>(() => fromVehicle(vehicle));
  const who = crew.find((c) => c.id === vehicle.assignedTo)?.name ?? null;

  const input = (k: keyof F, label: string, unit = "", o: { date?: boolean; text?: boolean; wide?: boolean; sub?: string } = {}) => (
    <div className="pk-kv">
      <span className="t"><b>{label}</b>{o.sub && <span>{o.sub}</span>}</span>
      <input id={`veh-${k}-${vehicle.id}`} className={`pk-in${o.text || o.date ? "" : " num"}`} type={o.date ? "date" : "text"}
        inputMode={o.text || o.date ? undefined : "decimal"} style={o.wide ? { width: 200 } : o.date ? { width: 160 } : undefined}
        value={f[k] as string} aria-label={label} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
      {unit && <span className="pk-unit">{unit}</span>}
    </div>
  );

  const save = () => start(async () => {
    if (!f.name.trim()) { setMsg({ ok: false, text: "Give the van a name." }); return; }
    const r = await saveVehicle({
      id: vehicle.id, name: f.name, rego: f.rego, details: f.details,
      odometer: f.odometer ? toInt(f.odometer) : null, serviceIntervalKm: f.interval ? toInt(f.interval) : null,
      nextServiceKm: f.nextKm ? toInt(f.nextKm) : null, nextServiceDate: f.nextDate, status: f.status,
      fuelPer100: f.fuel ? toNum(f.fuel) : null,
      purchasedOn: f.bought, condition: f.condition,
      serviceCost: f.serviceCost ? toNum(f.serviceCost) : null, kmYear: f.kmYear ? toInt(f.kmYear) : null,
      assignedTo: f.assignedTo, regoDue: f.regoDue,
    });
    setMsg(r.ok ? { ok: true, text: "Saved." } : { ok: false, text: r.error ?? "Couldn’t save." });
    if (r.ok) { setEditing(false); router.refresh(); }
  });

  return (
    <section className="pk-card pk-pad">
      <EditHead title="Vehicle details" sub={editing ? "changing" : undefined} editing={editing} canEdit={canEdit}
        onEdit={() => { setF(fromVehicle(vehicle)); setMsg(null); setEditing(true); }}
        onCancel={() => { setEditing(false); setConfirmRemove(false); setMsg(null); }} />

      {!editing ? (
        <div className="pk-edit-cols">
          <div>
            <div className="pk-glh">The van</div>
            <Fact t="Name" v={vehicle.name} />
            <Fact t="Rego" v={vehicle.rego} />
            <Fact t="Make, model, year" v={vehicle.details} />
            <Fact t="Signed to" v={who ?? "Nobody yet"} />
            <Fact t="Road status" v={<Pill st={vehicle.status === "on" ? { k: "good", w: STATUS_LABEL.on } : vehicle.status === "repair" ? { k: "mid", w: STATUS_LABEL.repair } : { k: "none", w: STATUS_LABEL.off }} />} />
            <Fact t="Rego due" v={dayS(vehicle.regoDue)} />
            {showBought && <Fact t="When we got it" v={dayS(vehicle.purchasedOn)} />}
            <Fact t="Condition when we got it" v={vehicle.condition ? CONDITION_OPTS.find((o) => o.k === vehicle.condition)?.label : null} />
          </div>
          <div>
            <div className="pk-glh">On the road</div>
            <Fact t="Odometer" v={kmS(vehicle.odometer)} />
            <Fact t="Service every" v={kmS(vehicle.serviceIntervalKm)} />
            <Fact t="A service costs" v={vehicle.serviceCost != null ? `$${vehicle.serviceCost.toLocaleString("en-AU")}` : null} />
            <Fact t="Next service at" v={kmS(vehicle.nextServiceKm)} />
            <Fact t="Next service date" v={dayS(vehicle.nextServiceDate)} />
            <Fact t="Km a year" sub="roughly" v={kmS(vehicle.kmYear)} />
            <Fact t="Fuel use" v={vehicle.fuelPer100 != null ? `${vehicle.fuelPer100} L/100 km` : null} />
          </div>
        </div>
      ) : (
        <>
          <div className="pk-edit-cols">
            <div>
              <div className="pk-glh">The van</div>
              {input("name", "Name", "", { text: true, wide: true })}
              {input("rego", "Rego", "", { text: true, wide: true })}
              {input("details", "Make, model, year", "", { text: true, wide: true })}
              <div className="pk-kv">
                <span className="t"><b>Signed to</b></span>
                <select id={`veh-assigned-${vehicle.id}`} className="pk-in" style={{ width: 200 }} value={f.assignedTo} onChange={(e) => setF({ ...f, assignedTo: e.target.value })} aria-label="Signed to">
                  <option value="">Nobody yet</option>
                  {crew.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="pk-kv">
                <span className="t"><b>Road status</b></span>
                <span className="pk-pick" role="group" aria-label="Road status">
                  {STATUS_OPTS.map((o) => <button key={o.k} type="button" aria-pressed={f.status === o.k} onClick={() => setF({ ...f, status: o.k })}>{o.label}</button>)}
                </span>
              </div>
              {input("regoDue", "Rego due", "", { date: true })}
              {showBought && input("bought", "When we got it", "", { date: true })}
              <div className="pk-kv">
                <span className="t"><b>Condition when we got it</b></span>
                <span className="pk-pick" role="group" aria-label="Condition when bought">
                  {CONDITION_OPTS.map((o) => <button key={o.k} type="button" aria-pressed={f.condition === o.k} onClick={() => setF({ ...f, condition: f.condition === o.k ? null : o.k })}>{o.label}</button>)}
                </span>
              </div>
            </div>
            <div>
              <div className="pk-glh">On the road</div>
              {input("odometer", "Odometer", "km")}
              {input("interval", "Service every", "km")}
              {input("serviceCost", "A service costs", "$")}
              {input("nextKm", "Next service at", "km")}
              {input("nextDate", "Next service date", "", { date: true })}
              {input("kmYear", "Km a year", "km", { sub: "roughly" })}
              {input("fuel", "Fuel use", "L/100 km")}
            </div>
          </div>
          <div className="pk-btns" style={{ marginTop: 14, alignItems: "center", justifyContent: "space-between" }}>
            <span className="pk-btns" style={{ alignItems: "center" }}>
              <button type="button" className="pk-btn" disabled={pending} onClick={save}>{pending ? "Saving…" : "Save"}</button>
              <button type="button" className="pk-btn g" disabled={pending} onClick={() => setEditing(false)}>Cancel</button>
              {msg && <span className={`pk-said${msg.ok ? "" : " bad"}`} role="status">{msg.text}</span>}
            </span>
            {/* Removing a van takes two presses: it goes from every list, and its history with it. */}
            {confirmRemove ? (
              <span className="pk-btns" style={{ alignItems: "center" }}>
                <span className="pk-note">Remove {vehicle.name} and its history?</span>
                <button type="button" className="pk-btn bad" disabled={pending} onClick={() => start(async () => { const r = await removeVehicle({ id: vehicle.id }); if (r.ok) router.push("/portal/vehicles"); else setMsg({ ok: false, text: r.error ?? "Couldn’t remove it." }); })}>Yes, remove it</button>
                <button type="button" className="pk-btn g" onClick={() => setConfirmRemove(false)}>Keep it</button>
              </span>
            ) : (
              <button type="button" className="pk-btn g" onClick={() => setConfirmRemove(true)}>Remove vehicle…</button>
            )}
          </div>
        </>
      )}
      {!editing && msg?.ok && <p className="pk-said" role="status" style={{ marginTop: 10 }}>{msg.text}</p>}
    </section>
  );
}
