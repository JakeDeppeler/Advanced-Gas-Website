"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addLog, removeLog, saveVehicle, removeVehicle } from "@/app/portal/vehicles/actions";
import { NumField } from "@/components/portal/NumField";
import { CONDITION_LABEL, CONDITION_OPTS, STATUS_LABEL, STATUS_NOTE, STATUS_OPTS } from "@/components/portal/vehicleStatus";
import { vehicleFinance, years } from "@/components/portal/vehicleMath";
import type { VehicleCondition, VehicleLogKind, VehicleStatus } from "@/lib/portal/db";

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

const KINDS: { key: VehicleLogKind; label: string }[] = [
  { key: "reading", label: "Km reading" },
  { key: "fuel", label: "Fuel" },
  { key: "service", label: "Service" },
  { key: "damage", label: "Damage" },
];
const KIND_LABEL: Record<VehicleLogKind, string> = { reading: "Km reading", fuel: "Fuel", service: "Service", damage: "Damage" };

const km = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("en-AU")} km`);
const dateShort = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
const money = (n: number | null) => (n === null ? null : n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 2 }));
const toInt = (v: string): number | null => { const n = parseInt(v.replace(/[^0-9]/g, ""), 10); return Number.isNaN(n) ? null : n; };
const toNum = (v: string): number | null => { const n = parseFloat(v.replace(/[^0-9.]/g, "")); return Number.isNaN(n) ? null : n; };

export type CheckSummary = { kind: string; short: string; when: string | null; by: string | null };

export type CrewOption = { id: string; name: string };

export function VehicleDetail({ vehicle, logs, canManage, checks, crew }: { vehicle: VehicleView; logs: LogView[]; canManage: boolean; checks: CheckSummary[]; crew: CrewOption[] }) {
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
    bought: vehicle.purchasedOn ?? "", condition: vehicle.condition,
    serviceCost: vehicle.serviceCost?.toString() ?? "", kmYear: vehicle.kmYear?.toString() ?? "",
    assignedTo: vehicle.assignedTo ?? "",
  });

  const kmToService = vehicle.nextServiceKm !== null && vehicle.odometer !== null ? vehicle.nextServiceKm - vehicle.odometer : null;
  const status = kmToService === null ? null : kmToService <= 0 ? "overdue" : kmToService <= 1000 ? "soon" : "ok";
  const annualDep = vehicle.purchasePrice !== null && vehicle.lifespanYears ? (vehicle.purchasePrice - (vehicle.resaleValue ?? 0)) / vehicle.lifespanYears : null;
  const fin = vehicleFinance(vehicle);
  const assignedName = crew.find((c) => c.id === vehicle.assignedTo)?.name ?? null;
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
        {fin.servicePerYear !== null && <div className="pt-veh__stat"><span>Servicing / yr</span><strong>{dollars(fin.servicePerYear)}</strong></div>}
        {fin.sellBy && <div className="pt-veh__stat"><span>Sell by</span><strong>{fin.sellBy}</strong></div>}
        {fin.lifeLeft !== null && <div className="pt-veh__stat"><span>Life left</span><strong className={fin.pastLife ? "is-neg" : ""}>{fin.pastLife ? `${years(fin.lifeLeft)} over` : years(fin.lifeLeft)}</strong></div>}
        {fin.worthNow !== null && <div className="pt-veh__stat"><span>Worth today</span><strong>{dollars(fin.worthNow)}</strong></div>}
        {vehicle.amountOwing !== null && <div className="pt-veh__stat"><span>Still owing</span><strong>{dollars(vehicle.amountOwing)}</strong></div>}
        {fin.equityNow !== null && <div className="pt-veh__stat"><span>Equity</span><strong className={fin.underwater ? "is-neg" : ""}>{dollars(fin.equityNow)}</strong></div>}
      </section>

      {(fin.ageYears !== null || vehicle.amountOwing !== null) && (
        <div className={`pt-veh__calc pt-veh__calc--block${fin.underwater || fin.pastLife ? " is-warn" : ""}`}>
          {vehicle.condition && <>{CONDITION_LABEL[vehicle.condition]}{fin.ageYears !== null ? `, ${years(fin.ageYears)} ago` : ""}. </>}
          {!vehicle.condition && fin.ageYears !== null && <>Ours for {years(fin.ageYears)}. </>}
          {fin.pastLife
            ? <>It&rsquo;s <strong>{years(fin.lifeLeft as number)} past</strong> the {vehicle.lifespanYears} years it was costed over — it should have gone by {fin.sellBy}. </>
            : fin.lifeLeft !== null && <>About <strong>{years(fin.lifeLeft)}</strong> left{fin.sellBy ? <> — sell by <strong>{fin.sellBy}</strong></> : null}. </>}
          {fin.equityNow !== null && (
            fin.underwater
              ? <>It&rsquo;s worth about {dollars(fin.worthNow as number)} with {dollars(vehicle.amountOwing as number)} owing, so we owe <strong>{dollars(Math.abs(fin.equityNow))} more than it&rsquo;s worth</strong>.</>
              : <>Worth about {dollars(fin.worthNow as number)} with {dollars(vehicle.amountOwing as number)} owing — <strong>{dollars(fin.equityNow)}</strong> of that is ours.</>
          )}
          {fin.owingPerYearLeft !== null && fin.annualDep !== null && (
            <> Clearing what&rsquo;s owing before then costs <strong>{dollars(fin.owingPerYearLeft)}</strong> a year, against {dollars(fin.annualDep)} a year of value lost.</>
          )}
        </div>
      )}

      <section className="pt-panel">
        <div className="pt-veh__edithead">
          <h2 className="pt-panel__h">Stock &amp; checks{assignedName ? <span className="pt-veh__signed">Signed to {assignedName}</span> : null}</h2>
          <Link href={`/portal/vehicles/${vehicle.id}/checks`} className="pt-btn pt-btn--navy pt-btn--sm">Open the sheets →</Link>
        </div>
        <p className="pt-panel__sub">The daily check, the monthly condition check and the stock count — the same sheets that live in the van.</p>
        <div className="pt-veh__checks">
          {checks.map((c) => (
            <Link key={c.kind} href={`/portal/vehicles/${vehicle.id}/checks/${c.kind}`} className="pt-veh__check">
              <strong>{c.short}</strong>
              <span>{c.when ? `${dateShort(c.when)}${c.by ? ` · ${c.by}` : ""}` : "Never done"}</span>
            </Link>
          ))}
        </div>
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
                <NumField label="A service costs" value={f.serviceCost} onChange={(v) => setF({ ...f, serviceCost: v })} prefix="$" />
                <NumField label="Km a year" hint="(roughly)" value={f.kmYear} onChange={(v) => setF({ ...f, kmYear: v })} suffix="km" />
                <NumField label="Next service at" value={f.nextKm} onChange={(v) => setF({ ...f, nextKm: v })} suffix="km" />
                <label className="pt-field"><span>Next service date</span><input type="date" value={f.nextDate} onChange={(e) => setF({ ...f, nextDate: e.target.value })} /></label>
                <NumField label="Purchase price" value={f.purchase} onChange={(v) => setF({ ...f, purchase: v })} prefix="$" />
                <NumField label="Still owing" hint="(finance left to pay)" value={f.owing} onChange={(v) => setF({ ...f, owing: v })} prefix="$" />
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
                    purchasedOn: f.bought, condition: f.condition,
                    serviceCost: f.serviceCost ? toNum(f.serviceCost) : null, kmYear: f.kmYear ? toInt(f.kmYear) : null,
                    assignedTo: f.assignedTo,
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
