"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addVehicle } from "@/app/portal/vehicles/actions";

function toInt(v: string): number | null {
  const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
  return Number.isNaN(n) ? null : n;
}

export function AddVehicleForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [rego, setRego] = useState("");
  const [details, setDetails] = useState("");
  const [odo, setOdo] = useState("");
  const [interval, setInterval] = useState("");
  const [msg, setMsg] = useState("");

  if (!open) {
    return (
      <button type="button" className="pt-btn pt-btn--orange" onClick={() => setOpen(true)}>+ Add a vehicle</button>
    );
  }

  return (
    <section className="pt-panel">
      <h2 className="pt-panel__h">Add a vehicle</h2>
      <div className="pf-add" style={{ gridTemplateColumns: "1.3fr 0.8fr 1.3fr", marginBottom: 10 }}>
        <input className="pf-inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. Ute 1 — Hilux)" />
        <input className="pf-inp" value={rego} onChange={(e) => setRego(e.target.value)} placeholder="Rego" />
        <input className="pf-inp" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Make / model / year" />
      </div>
      <div className="pf-add" style={{ gridTemplateColumns: "1fr 1fr auto auto" }}>
        <input className="pf-inp" value={odo} onChange={(e) => setOdo(e.target.value)} placeholder="Current km" inputMode="numeric" />
        <input className="pf-inp" value={interval} onChange={(e) => setInterval(e.target.value)} placeholder="Service every … km" inputMode="numeric" />
        <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setOpen(false)} disabled={pending}>Cancel</button>
        <button
          type="button"
          className="pt-btn pt-btn--orange pt-btn--sm"
          disabled={pending || !name.trim()}
          onClick={() => start(async () => {
            const res = await addVehicle({ name, rego, details, odometer: toInt(odo), serviceIntervalKm: toInt(interval) });
            if (res.ok) {
              setName(""); setRego(""); setDetails(""); setOdo(""); setInterval(""); setOpen(false);
              router.refresh();
            } else {
              setMsg(res.error || "Couldn't add it.");
            }
          })}
        >{pending ? "Adding…" : "Add vehicle"}</button>
      </div>
      {msg && <div className="pt-inline is-err" style={{ marginTop: 8 }}>{msg}</div>}
    </section>
  );
}
