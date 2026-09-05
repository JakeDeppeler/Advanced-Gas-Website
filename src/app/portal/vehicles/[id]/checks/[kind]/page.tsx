import { notFound, redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { getVehicle } from "@/lib/portal/db";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { VanCheckForm } from "@/components/portal/VanCheckForm";
import { CHECK_KINDS, type CheckKind } from "@/lib/portal/vanChecks";

export const dynamic = "force-dynamic";
export const metadata = { title: "Van check — Team portal" };

export default async function RunCheckPage({ params }: { params: { id: string; kind: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const def = CHECK_KINDS.find((k) => k.k === params.kind);
  if (!def) notFound();

  const vehicle = await getVehicle(params.id);
  if (!vehicle) notFound();

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href={`/portal/vehicles/${vehicle.id}/checks`} label="Checks" />
        <div className="pt-head__eyebrow">{vehicle.name}{vehicle.rego ? ` · ${vehicle.rego}` : ""}</div>
        <h1>{def.label}.</h1>
      </div>
      <VanCheckForm vehicleId={vehicle.id} vehicleName={vehicle.name} kind={def.k as CheckKind} />
    </PortalShell>
  );
}
