import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listVehicles, dbConfigured, type Vehicle } from "@/lib/portal/db";
import { STATUS_LABEL } from "@/components/portal/vehicleStatus";
import { PortalShell } from "@/components/portal/PortalShell";
import { AddVehicleForm } from "@/components/portal/AddVehicleForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vehicles — Team portal" };

const km = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("en-AU")} km`);

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
