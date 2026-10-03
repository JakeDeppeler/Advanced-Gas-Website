"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addLog, removeLog } from "@/app/portal/vehicles/actions";
import { NumField } from "@/components/portal/NumField";
import { STATUS_LABEL, STATUS_NOTE } from "@/components/portal/vehicleStatus";
import type { VehicleCondition, VehicleLogKind, VehicleStatus } from "@/lib/portal/db";
import { money2 } from "@/lib/portal/format";

export type VehicleView = {
  id: string; name: string; rego: string | null; details: string | null;
  odometer: number | null; serviceIntervalKm: number | null;
  nextServiceKm: number | null; nextServiceDate: string | null; status: VehicleStatus;
  purchasePrice: number | null; resaleValue: number | null; lifespanYears: number | null; fuelPer100: number | null;
  amountOwing: number | null; purchasedOn: string | null; condition: VehicleCondition | null;
  serviceCost: number | null; kmYear: number | null; assignedTo: string | null;
};
export type LogView = {
  id: string; kind: VehicleLogKind; dateLabel: string;
  odometer: number | null; cost: number | null; litres: number | null;
  detail: string | null; createdBy: string | null;
};

const KIND_LABEL: Record<VehicleLogKind, string> = { reading: "Km reading", fuel: "Fuel", service: "Service", damage: "Damage" };

const km = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("en-AU")} km`);
const dateShort = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
/** Log rows keep their cents — a fuel docket has them and rounding a receipt
 *  to the dollar makes it stop matching the paperwork. The stat strip above
 *  uses whole dollars (see `money` from format.ts): nobody wants depreciation
 *  per year to the cent. Both now come from one place instead of two local
 *  declarations that happened to disagree on the same screen. */
const logMoney = (n: number | null) => (n === null ? null : money2(n));
const toInt = (v: string): number | null => { const n = parseInt(v.replace(/[^0-9]/g, ""), 10); return Number.isNaN(n) ? null : n; };
const toNum = (v: string): number | null => { const n = parseFloat(v.replace(/[^0-9.]/g, "")); return Number.isNaN(n) ? null : n; };

export type CheckSummary = { kind: string; short: string; when: string | null; by: string | null };

export type CrewOption = { id: string; name: string };

/** What each tab's log form and history are called in the design. */
const LOG_TITLE: Record<VehicleLogKind, { h: string; sub: string; empty: string }> = {
  reading: { h: "Km readings", sub: "The odometer, whenever somebody looks at it. Anyone on the crew can add one.", empty: "No readings logged yet." },
  fuel: { h: "Fuel", sub: "Every fill, with the litres and what it cost.", empty: "No fills logged yet." },
  service: { h: "Service requests", sub: "What was asked for, what was done, and what it cost.", empty: "No services logged yet." },
  damage: { h: "Damage log", sub: "Anything that happened to the van — logged the day it happened, not at sale time.", empty: "Nothing logged — which is the point." },
};

export function VehicleDetail({ vehicle, logs, canManage, crew, log }: { vehicle: VehicleView; logs: LogView[]; canManage: boolean; crew: CrewOption[]; log: VehicleLogKind | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const refresh = () => router.refresh();

  // add-log form — the tab picks the kind, so there is no picker.
  const kind: VehicleLogKind = log ?? "reading";
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [odo, setOdo] = useState("");
  const [cost, setCost] = useState("");
  const [litres, setLitres] = useState("");
  const [detail, setDetail] = useState("");
  const [msg, setMsg] = useState("");

  const shown = log ? logs.filter((l) => l.kind === log) : [];

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

      {/* The tab's own panel: its history first, because reading it is why
          most people open the tab, then the one form that adds to it. */}
      {log && (
      <section className="pt-panel">
        <div className="pt-veh__edithead">
          <h2 className="pt-panel__h">{LOG_TITLE[log].h} <span className="pt-tm__count">{shown.length}</span></h2>
        </div>
        <p className="pt-panel__sub">{LOG_TITLE[log].sub}</p>

        {shown.length === 0 ? (
          <div className="pf-empty">{LOG_TITLE[log].empty}</div>
        ) : (
          <div className="pt-veh__logs">
            {shown.map((l) => (
              <div key={l.id} className="pt-veh__log">
                <span className={`pt-veh__logtag pt-veh__logtag--${l.kind}`}>{KIND_LABEL[l.kind]}</span>
                <div className="pt-veh__logbody">
                  <div className="pt-veh__logfacts">
                    <strong>{l.dateLabel}</strong>
                    {l.odometer !== null && <span>{km(l.odometer)}</span>}
                    {l.litres !== null && <span>{l.litres} L</span>}
                    {logMoney(l.cost) && <span>{logMoney(l.cost)}</span>}
                  </div>
                  {l.detail && <div className="pt-veh__logdetail">{l.detail}</div>}
                  {l.createdBy && <div className="pt-veh__logby">— {l.createdBy}</div>}
                </div>
                {canManage && <button type="button" className="pf-del" disabled={pending} onClick={() => start(async () => { await removeLog({ id: l.id, vehicleId: vehicle.id }); refresh(); })}>Delete</button>}
              </div>
            ))}
          </div>
        )}

        <h3 className="pf-set__label" style={{ marginTop: 22 }}>
          {log === "service" ? "Request a service" : log === "damage" ? "Log damage" : log === "fuel" ? "Log a fill" : "Log a reading"}
        </h3>
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
      )}

    </div>
  );
}
