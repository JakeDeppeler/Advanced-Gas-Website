import Link from "next/link";
import { CONDITION_LABEL } from "@/components/portal/vehicleStatus";
import { vehicleFinance, years } from "@/components/portal/vehicleMath";
import { money } from "@/lib/portal/format";
import type { VehicleView, CheckSummary } from "@/components/portal/VehicleDetail";

/**
 * What the van costs and what it's worth, and the sheets that live in it.
 *
 * These used to sit inside VehicleDetail. The design tabs the van's history,
 * and these two panels belong under every tab rather than only one — so they
 * came out, and being plain output they came out as server components too.
 */

const km = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("en-AU")} km`);
const dateShort = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short" });

export function VehicleCosts({ vehicle }: { vehicle: VehicleView }) {
  const kmToService = vehicle.nextServiceKm !== null && vehicle.odometer !== null ? vehicle.nextServiceKm - vehicle.odometer : null;
  const status = kmToService === null ? null : kmToService <= 0 ? "overdue" : kmToService <= 1000 ? "soon" : "ok";
  const annualDep = vehicle.purchasePrice !== null && vehicle.lifespanYears ? (vehicle.purchasePrice - (vehicle.resaleValue ?? 0)) / vehicle.lifespanYears : null;
  const fin = vehicleFinance(vehicle);

  return (
    <>
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
        {annualDep !== null && <div className="pt-veh__stat"><span>Depreciation / yr</span><strong>{money(annualDep)}</strong></div>}
        {vehicle.fuelPer100 !== null && <div className="pt-veh__stat"><span>Fuel use</span><strong>{vehicle.fuelPer100} L/100km</strong></div>}
        {fin.servicePerYear !== null && <div className="pt-veh__stat"><span>Servicing / yr</span><strong>{money(fin.servicePerYear)}</strong></div>}
        {fin.sellBy && <div className="pt-veh__stat"><span>Sell by</span><strong>{fin.sellBy}</strong></div>}
        {fin.lifeLeft !== null && <div className="pt-veh__stat"><span>Life left</span><strong className={fin.pastLife ? "is-neg" : ""}>{fin.pastLife ? `${years(fin.lifeLeft)} over` : years(fin.lifeLeft)}</strong></div>}
        {fin.worthNow !== null && <div className="pt-veh__stat"><span>Worth today</span><strong>{money(fin.worthNow)}</strong></div>}
        {vehicle.amountOwing !== null && <div className="pt-veh__stat"><span>Still owing</span><strong>{money(vehicle.amountOwing)}</strong></div>}
        {fin.equityNow !== null && <div className="pt-veh__stat"><span>Equity</span><strong className={fin.underwater ? "is-neg" : ""}>{money(fin.equityNow)}</strong></div>}
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
              ? <>It&rsquo;s worth about {money(fin.worthNow as number)} with {money(vehicle.amountOwing as number)} owing, so we owe <strong>{money(Math.abs(fin.equityNow))} more than it&rsquo;s worth</strong>.</>
              : <>Worth about {money(fin.worthNow as number)} with {money(vehicle.amountOwing as number)} owing — <strong>{money(fin.equityNow)}</strong> of that is ours.</>
          )}
          {fin.owingPerYearLeft !== null && fin.annualDep !== null && (
            <> Clearing what&rsquo;s owing before then costs <strong>{money(fin.owingPerYearLeft)}</strong> a year, against {money(fin.annualDep)} a year of value lost.</>
          )}
        </div>
      )}
    </>
  );
}

export function VehicleChecks({ vehicleId, checks, assignedName }: { vehicleId: string; checks: CheckSummary[]; assignedName: string | null }) {
  return (
    <section className="pt-panel">
      <div className="pt-veh__edithead">
        <h2 className="pt-panel__h">Stock &amp; checks{assignedName ? <span className="pt-veh__signed">Signed to {assignedName}</span> : null}</h2>
        <Link href={`/portal/vehicles/${vehicleId}/checks`} className="pt-btn pt-btn--navy pt-btn--sm">Open the sheets →</Link>
      </div>
      <p className="pt-panel__sub">The daily check, the monthly condition check and the stock count — the same sheets that live in the van.</p>
      <div className="pt-veh__checks">
        {checks.map((c) => (
          <Link key={c.kind} href={`/portal/vehicles/${vehicleId}/checks/${c.kind}`} className="pt-veh__check">
            <strong>{c.short}</strong>
            <span>{c.when ? `${dateShort(c.when)}${c.by ? ` · ${c.by}` : ""}` : "Never done"}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
