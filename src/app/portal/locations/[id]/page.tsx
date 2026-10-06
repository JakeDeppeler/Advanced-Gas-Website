import { notFound, redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { LocationImporter } from "@/components/portal/LocationImporter";
import { LocationStatusBoard } from "@/components/portal/LocationStatusBoard";
import { LocationDoubles } from "@/components/portal/LocationDoubles";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { serviceTitanConfigured } from "@/lib/dashboard/servicetitan";
import { fetchCustomer, findDoubles, liveView, loadSpec } from "@/lib/locations/stLocations";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "Site locations — Team portal" };

const day = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

/**
 * One customer's site locations: status board, doubled-up units, and the list
 * loader. Everything shown is read from ServiceTitan on each load, so it
 * matches what the office sees there.
 */
export default async function CustomerLocationsPage({ params }: { params: { id: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "manage_users")) return <Locked user={user} what="Site locations" forWhom="admins" />;
  if (!/^\d+$/.test(params.id)) notFound();
  const id = Number(params.id);

  if (!dashboardDbConfigured() || !serviceTitanConfigured()) {
    return (
      <PortalShell user={user}>
        <PortalBack href="/portal/locations" label="Site locations" />
        <div className="pt-note pt-note--warn">ServiceTitan or the database isn&rsquo;t connected, so there&rsquo;s nothing to show.</div>
      </PortalShell>
    );
  }

  let customer: { id: number; name: string };
  try {
    customer = await fetchCustomer(id);
  } catch (e) {
    const missing = /404/.test((e as Error).message);
    return (
      <PortalShell user={user}>
        <PortalBack href="/portal/locations" label="Site locations" />
        <div className="pt-note pt-note--warn">
          {missing ? <>ServiceTitan has no customer <strong>#{id}</strong>. Check the number on the customer in ServiceTitan.</> : <>Couldn&rsquo;t reach ServiceTitan: {(e as Error).message}</>}
        </div>
      </PortalShell>
    );
  }

  const spec = await loadSpec(id).catch(() => null);
  const view = await liveView(id, spec).catch((e: Error) => ({ error: e.message }) as const);

  const active = "error" in view ? [] : view.locations.filter((l) => l.active);
  const doubles = "error" in view ? [] : findDoubles(view.locations);
  const statuses = spec?.statusTags ?? [];

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/locations" label="Site locations" />
      <div className="pt-head">
        <h1>{customer.name}</h1>
        <p>
          ServiceTitan customer #{id} · {active.length} active location{active.length === 1 ? "" : "s"}
          {spec ? ` · list of ${spec.locations.length} saved ${day(spec.savedAt)}${spec.savedBy ? ` by ${spec.savedBy}` : ""}` : ""}
        </p>
      </div>

      {"error" in view && <div className="pt-note pt-note--warn">Couldn&rsquo;t read the locations from ServiceTitan: {view.error}</div>}

      {statuses.length > 0 && active.length > 0 && (
        <LocationStatusBoard
          customerId={id}
          statuses={statuses}
          locations={active
            .map((l) => ({ id: l.id, name: l.name, status: l.status, tags: l.tags }))
            .sort((a, b) => a.name.localeCompare(b.name, "en-AU", { numeric: true }))}
        />
      )}

      {doubles.length > 0 && (
        <LocationDoubles
          customerId={id}
          doubles={doubles.map((d) => ({
            unit: d.unit,
            keep: { id: d.keep.id, name: d.keep.name, address: d.keep.address, tags: d.keep.tags },
            retire: d.retire.map((r) => ({ id: r.id, name: r.name, address: r.address, tags: r.tags })),
          }))}
        />
      )}

      <LocationImporter
        customerId={id}
        tagNames={"error" in view ? [] : view.tagNames}
        saved={spec ? { count: spec.locations.length, savedAt: spec.savedAt ?? null, savedBy: spec.savedBy ?? null } : null}
      />
    </PortalShell>
  );
}
