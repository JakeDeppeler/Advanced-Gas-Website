"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addVehicle } from "@/app/portal/vehicles/actions";
import { NumField } from "@/components/portal/NumField";

const toInt = (v: string): number | null => { const n = parseInt(v.replace(/[^0-9]/g, ""), 10); return Number.isNaN(n) ? null : n; };
const toNum = (v: string): number | null => { const n = parseFloat(v.replace(/[^0-9.]/g, "")); return Number.isNaN(n) ? null : n; };

const BLANK = {
  name: "", rego: "", details: "",
  odometer: "", interval: "", nextKm: "", nextDate: "",
  purchase: "", resale: "", lifespan: "", fuel: "",
};

export function AddVehicleForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(BLANK);
  const [msg, setMsg] = useState("");

  const set = (k: keyof typeof BLANK) => (v: string) => setF((prev) => ({ ...prev, [k]: v }));

  // What the running cost of this vehicle works out to, shown while you type so
  // you can see the figure the overhead will pick up.
  const purchase = toNum(f.purchase);
  const lifespan = toNum(f.lifespan);
  const annualDep = purchase !== null && lifespan ? (purchase - (toNum(f.resale) ?? 0)) / lifespan : null;

  if (!open) {
    return <button type="button" className="pt-btn pt-btn--orange" onClick={() => setOpen(true)}>+ Add a vehicle</button>;
  }

  return (
    <section className="pt-panel">
      <h2 className="pt-panel__h">Add a vehicle</h2>
      <p className="pt-panel__sub">Fill in what you know now — anything you skip can be added later from the vehicle&rsquo;s page.</p>

      <div className="pt-veh__addgrid">
        <label className="pt-field"><span>Name</span><input value={f.name} onChange={(e) => set("name")(e.target.value)} placeholder="e.g. Ute 1 — Hilux" /></label>
        <label className="pt-field"><span>Rego</span><input value={f.rego} onChange={(e) => set("rego")(e.target.value)} placeholder="e.g. 1AB 2CD" /></label>
        <label className="pt-field"><span>Make / model / year</span><input value={f.details} onChange={(e) => set("details")(e.target.value)} placeholder="e.g. Toyota Hilux 2022" /></label>
      </div>

      <div className="pt-veh__addhead">Servicing</div>
      <div className="pt-veh__addgrid">
        <NumField label="Current odometer" value={f.odometer} onChange={set("odometer")} suffix="km" placeholder="84,300" />
        <NumField label="Service every" value={f.interval} onChange={set("interval")} suffix="km" placeholder="10,000" />
        <NumField label="Next service at" hint="(optional)" value={f.nextKm} onChange={set("nextKm")} suffix="km" placeholder="worked out for you" />
        <label className="pt-field"><span>Next service date <em>(optional)</em></span><input type="date" value={f.nextDate} onChange={(e) => set("nextDate")(e.target.value)} /></label>
      </div>

      <div className="pt-veh__addhead">Running cost</div>
      <div className="pt-veh__addgrid">
        <NumField label="Purchase price" value={f.purchase} onChange={set("purchase")} prefix="$" placeholder="52,000" />
        <NumField label="Resale value" hint="(at end of life)" value={f.resale} onChange={set("resale")} prefix="$" placeholder="15,000" />
        <NumField label="Lifespan" value={f.lifespan} onChange={set("lifespan")} suffix="years" decimal placeholder="5" />
        <NumField label="Fuel use" value={f.fuel} onChange={set("fuel")} suffix="L/100km" decimal placeholder="9.5" />
      </div>

      {annualDep !== null && (
        <div className="pt-veh__calc">
          That&rsquo;s <strong>{annualDep.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 })}</strong> a year in depreciation.
        </div>
      )}

      <div className="pf-row-end">
        {msg && <span className="pt-inline is-err">{msg}</span>}
        <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => { setOpen(false); setMsg(""); }} disabled={pending}>Cancel</button>
        <button
          type="button"
          className="pt-btn pt-btn--orange pt-btn--sm"
          disabled={pending || !f.name.trim()}
          onClick={() => start(async () => {
            setMsg("");
            const res = await addVehicle({
              name: f.name, rego: f.rego, details: f.details,
              odometer: toInt(f.odometer), serviceIntervalKm: toInt(f.interval),
              nextServiceKm: toInt(f.nextKm), nextServiceDate: f.nextDate,
              purchasePrice: toNum(f.purchase), resaleValue: toNum(f.resale),
              lifespanYears: toNum(f.lifespan), fuelPer100: toNum(f.fuel),
            });
            if (res.ok) { setF(BLANK); setOpen(false); router.refresh(); }
            else setMsg(res.error || "Couldn't add it.");
          })}
        >{pending ? "Adding…" : "Add vehicle"}</button>
      </div>
    </section>
  );
}
