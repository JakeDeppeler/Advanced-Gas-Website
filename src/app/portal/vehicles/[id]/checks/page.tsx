import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { getVehicle, listVanChecks, listVehiclePhotos, listVanPhotos } from "@/lib/portal/db";
import { signedUrls } from "@/lib/portal/storage";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { VanCheckHistory, type CheckView } from "@/components/portal/VanCheckHistory";
import { CHECK_KINDS, actions, shortfalls } from "@/lib/portal/vanChecks";

export const dynamic = "force-dynamic";
export const metadata = { title: "Van checks — Team portal" };

const when = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export default async function ChecksPage({ params }: { params: { id: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const vehicle = await getVehicle(params.id);
  if (!vehicle) notFound();

  const checks = await listVanChecks(vehicle.id, undefined, 60);
  const photoRows = await Promise.all(checks.slice(0, 12).map((c) => listVanPhotos(c.id)));
  const allPhotos = photoRows.flat();
  const urls = await signedUrls(allPhotos.map((p) => p.path));

  const views: CheckView[] = checks.map((c, i) => ({
    id: c.id,
    kind: c.kind,
    label: CHECK_KINDS.find((k) => k.k === c.kind)?.label ?? c.kind,
    when: when(c.checkedOn),
    by: c.checkedBy,
    notes: c.notes,
    actions: actions(c.kind, c.items),
    short: shortfalls(c.kind, c.items),
    photos: (photoRows[i] ?? []).map((p) => ({ id: p.id, label: p.label, url: urls.get(p.path) ?? null })),
  }));

  // The most recent of each kind, so the tiles say how long it's been.
  const latest = new Map(CHECK_KINDS.map((k) => [k.k, checks.find((c) => c.kind === k.k) ?? null]));

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href={`/portal/vehicles/${vehicle.id}`} label={vehicle.name} />
        <div className="pt-head__eyebrow">{vehicle.name}{vehicle.rego ? ` · ${vehicle.rego}` : ""}</div>
        <h1>Stock &amp; checks.</h1>
        <p>The same sheets that live in the van — counted, ticked and photographed here instead of on paper, so the office sees it the moment it&rsquo;s done.</p>
      </div>

      <div className="pt-vc__start">
        {CHECK_KINDS.map((k) => {
          const last = latest.get(k.k) ?? null;
          return (
            <Link key={k.k} href={`/portal/vehicles/${vehicle.id}/checks/${k.k}`} className="pt-vc__starttile">
              <strong>{k.label}</strong>
              <span className="pt-vc__cadence">{k.cadence}</span>
              <span className="pt-vc__last">{last ? `Last done ${when(last.checkedOn)}${last.checkedBy ? ` by ${last.checkedBy}` : ""}` : "Never done"}</span>
            </Link>
          );
        })}
      </div>

      <VanCheckHistory checks={views} vehicleId={vehicle.id} canManage={can(user, "vehicles")} />
    </PortalShell>
  );
}
