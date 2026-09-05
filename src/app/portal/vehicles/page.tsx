import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listVehicles, dbConfigured, type Vehicle } from "@/lib/portal/db";
import { fuelPerYear, vehicleFinance } from "@/components/portal/vehicleMath";
import { STATUS_LABEL } from "@/components/portal/vehicleStatus";
import { PortalShell } from "@/components/portal/PortalShell";
import { AddVehicleForm } from "@/components/portal/AddVehicleForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vehicles — Team portal" };

const km = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("en-AU")} km`);
const money = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

// Until fuel is tracked per van, one pump price for the fleet. Close enough to
// rank a thirsty van against an economical one, which is what the figure is for.
const FUEL_PRICE = 2.0;

/** What the fleet is worth, what's owed on it, and what a year of it costs. */
function fleetTotals(vehicles: Vehicle[]) {
  let owing = 0, worth = 0, dep = 0, servicing = 0, fuel = 0;
  let owingKnown = false, worthKnown = false, depKnown = false, servKnown = false, fuelKnown = false;
  for (const v of vehicles) {
    const fin = vehicleFinance(v);
    if (v.amountOwing != null) { owing += v.amountOwing; owingKnown = true; }
    if (fin.worthNow !== null) { worth += fin.worthNow; worthKnown = true; }
    if (fin.annualDep !== null) { dep += fin.annualDep; depKnown = true; }
    if (fin.servicePerYear !== null) { servicing += fin.servicePerYear; servKnown = true; }
    const f = fuelPerYear(v, FUEL_PRICE);
    if (f !== null) { fuel += f; fuelKnown = true; }
  }
  return {
    owing: owingKnown ? owing : null,
    worth: worthKnown ? worth : null,
    equity: owingKnown && worthKnown ? worth - owing : null,
    dep: depKnown ? dep : null,
    servicing: servKnown ? servicing : null,
    fuel: fuelKnown ? fuel : null,
    running: depKnown || servKnown || fuelKnown ? dep + servicing + fuel : null,
  };
}

function status(v: Vehicle): { txt: string; cls: string } | null {
  if (v.nextServiceKm === null || v.odometer === null) return null;
  const left = v.nextServiceKm - v.odometer;
  if (left <= 0) return { txt: `Service overdue ${km(Math.abs(left))}`, cls: "overdue" };
  if (left <= 1000) return { txt: `Service due in ${km(left)}`, cls: "soon" };
  return { txt: `${km(left)} to service`, cls: "ok" };
}

function Card({ v }: { v: Vehicle }) {
  const s = status(v);
  return (
    <Link href={`/portal/vehicles/${v.id}`} className={`pt-card${v.active ? "" : " is-off"}`}>
      <div className="pt-card__tag">{v.rego || "Vehicle"}</div>
      <div className="pt-card__title">{v.name}</div>
      <p className="pt-card__desc">{v.details || " "}</p>
      <div className="pt-veh__cardstat"><span>{km(v.odometer)}</span>{s && <span className={`pt-veh__status pt-veh__status--${s.cls}`}>{s.txt}</span>}</div>
    </Link>
  );
}

export default async function VehiclesPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const canManage = can(user, "vehicles");
  const ready = dbConfigured();
  const vehicles = ready ? await listVehicles() : [];
  const onRoad = vehicles.filter((v) => v.status === "on");
  const repair = vehicles.filter((v) => v.status === "repair");
  const off = vehicles.filter((v) => v.status === "off");
  const t = fleetTotals(vehicles);

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">Vehicles</div>
        <h1>The fleet.</h1>
        <p>Servicing, km readings, fuel and the damage log. Open a vehicle to see its history or add an entry — anyone can log fuel and readings.</p>
      </div>

      {!ready && (
        <div className="pt-note pt-note--warn"><strong>Database not connected.</strong> Vehicles need the Supabase keys set on the server.</div>
      )}

      {vehicles.length > 0 && (
        <>
          <div className="pt-cap__strip pt-veh__fleet">
            <div className="pt-cap__stripcell"><span>Vans on the road</span><strong>{onRoad.length}<em> of {vehicles.length}</em></strong></div>
            <div className="pt-cap__stripcell"><span>Worth today</span><strong>{t.worth !== null ? money(t.worth) : "—"}</strong></div>
            <div className="pt-cap__stripcell"><span>Still owing</span><strong>{t.owing !== null ? money(t.owing) : "—"}</strong></div>
            <div className="pt-cap__stripcell"><span>Equity</span><strong>{t.equity !== null ? money(t.equity) : "—"}</strong></div>
          </div>

          <section className="pt-panel">
            <h2 className="pt-panel__h">What the fleet costs a year</h2>
            <p className="pt-panel__sub">
              Straight-line depreciation, servicing worked out from each van&rsquo;s interval and what a service costs, and fuel at {money(FUEL_PRICE)}/L.
              This is the figure the Vehicles line in <strong>Costs &amp; capacity</strong> has to cover.
            </p>
            <div className="pt-pl__heads">
              <div className="pt-pl__head"><span className="pt-pl__headlabel">Depreciation</span><strong className="pt-pl__headval">{t.dep !== null ? money(t.dep) : "—"}</strong></div>
              <div className="pt-pl__head"><span className="pt-pl__headlabel">Servicing</span><strong className="pt-pl__headval">{t.servicing !== null ? money(t.servicing) : "—"}</strong></div>
              <div className="pt-pl__head"><span className="pt-pl__headlabel">Fuel</span><strong className="pt-pl__headval">{t.fuel !== null ? money(t.fuel) : "—"}</strong></div>
              <div className="pt-pl__head"><span className="pt-pl__headlabel">All of it</span><strong className="pt-pl__headval">{t.running !== null ? money(t.running) : "—"}</strong></div>
            </div>
            {(t.dep === null || t.servicing === null || t.fuel === null) && (
              <p className="pt-panel__sub" style={{ marginBottom: 0 }}>
                A dash means the figures aren&rsquo;t filled in yet — purchase price and lifespan for depreciation, service cost and km a year for servicing, fuel use for fuel.
              </p>
            )}
          </section>
        </>
      )}

      {canManage && <div style={{ marginBottom: 18 }}><AddVehicleForm /></div>}

      {vehicles.length === 0 ? (
        <div className="pt-rep__empty">No vehicles yet{canManage ? " — add one above." : "."}</div>
      ) : (
        <>
          <div className="pt-grid">{onRoad.map((v) => <Card key={v.id} v={v} />)}</div>
          {repair.length > 0 && (
            <>
              <div className="pt-tm__listhead"><h2 className="pt-panel__h">Getting fixed <span className="pt-tm__count">{repair.length}</span></h2></div>
              <div className="pt-grid">{repair.map((v) => <Card key={v.id} v={v} />)}</div>
            </>
          )}
          {off.length > 0 && (
            <>
              <div className="pt-tm__listhead pt-tm__listhead--muted"><h2 className="pt-panel__h">Off the road <span className="pt-tm__count">{off.length}</span></h2></div>
              <div className="pt-grid">{off.map((v) => <Card key={v.id} v={v} />)}</div>
            </>
          )}
        </>
      )}
    </PortalShell>
  );
}
