import { notFound, redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { getVehicle, listVehicleLogs } from "@/lib/portal/db";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { VehicleDetail } from "@/components/portal/VehicleDetail";

export const dynamic = "force-dynamic";

function dateLabel(d: string) {
  return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

// Portal headings end in a full stop, but a vehicle name is whatever someone
// typed — adding one to "Ford Custom (Jackson" just reads as a typo.
const heading = (name: string) => (/[A-Za-z0-9]$/.test(name.trim()) ? `${name.trim()}.` : name.trim());

export default async function VehiclePage({ params }: { params: { id: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const vehicle = await getVehicle(params.id);
  if (!vehicle) notFound();

  const logs = await listVehicleLogs(vehicle.id);

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href="/portal/vehicles" label="All vehicles" />
        <div className="pt-head__eyebrow">Vehicles{vehicle.rego ? ` · ${vehicle.rego}` : ""}</div>
        <h1>{heading(vehicle.name)}</h1>
        {vehicle.details && <p>{vehicle.details}</p>}
      </div>

      <VehicleDetail
        vehicle={{
          id: vehicle.id, name: vehicle.name, rego: vehicle.rego, details: vehicle.details,
          odometer: vehicle.odometer, serviceIntervalKm: vehicle.serviceIntervalKm,
          nextServiceKm: vehicle.nextServiceKm, nextServiceDate: vehicle.nextServiceDate, status: vehicle.status,
          purchasePrice: vehicle.purchasePrice, resaleValue: vehicle.resaleValue, lifespanYears: vehicle.lifespanYears, fuelPer100: vehicle.fuelPer100,
          amountOwing: vehicle.amountOwing, purchasedOn: vehicle.purchasedOn, condition: vehicle.condition,
        }}
        logs={logs.map((l) => ({
          id: l.id, kind: l.kind, dateLabel: dateLabel(l.logDate),
          odometer: l.odometer, cost: l.cost, litres: l.litres, detail: l.detail, createdBy: l.createdBy,
        }))}
        canManage={can(user, "vehicles")}
      />
    </PortalShell>
  );
}
