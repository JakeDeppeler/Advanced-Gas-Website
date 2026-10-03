import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { getVehicle, listVehicleLogs, latestVanChecks, listVanChecks, listVanPhotos, listUsers } from "@/lib/portal/db";
import { signedUrls } from "@/lib/portal/storage";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { VehicleDetail } from "@/components/portal/VehicleDetail";
import { VehicleCosts, VehicleChecks } from "@/components/portal/VehicleCosts";
import { VehicleEdit } from "@/components/portal/VehicleEdit";
import { VanWeekly, type WeeklyRow } from "@/components/portal/VanWeekly";
import { CHECK_KINDS, PHOTO_ANGLES, itemKey } from "@/lib/portal/vanChecks";
import type { VehicleLogKind } from "@/lib/portal/db";
import { thisWeek } from "@/components/portal/mondayJobs";

export const dynamic = "force-dynamic";

function dateLabel(d: string) {
  return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}
const dayLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });

/** The design's five tabs, in its order. */
const TABS: { k: string; label: string; log: VehicleLogKind | null }[] = [
  { k: "weekly", label: "Weekly clean & photos", log: null },
  { k: "service", label: "Service requests", log: "service" },
  { k: "readings", label: "Km readings", log: "reading" },
  { k: "fuel", label: "Fuel", log: "fuel" },
  { k: "damage", label: "Damage log", log: "damage" },
  // Not in the design, which stops at the five logs. What the van costs, what
  // it's worth and its details had been stacked under every one of them; they
  // are reference, not something you do on a Monday, so they get a tab.
  { k: "costs", label: "Costs & details", log: null },
];

export default async function VehiclePage({
  params, searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const tab = TABS.find((t) => t.k === searchParams.tab) ?? TABS[0];

  // Everything keyed on the id goes out at once, the van itself included —
  // waiting for the van before asking for its logs was a whole round trip to
  // the database spent learning nothing the URL hadn't already said.
  const [vehicle, logs, latest, users, weeklies] = await Promise.all([
    getVehicle(params.id),
    listVehicleLogs(params.id),
    latestVanChecks(params.id),
    listUsers(),
    listVanChecks(params.id, "weekly", 12),
  ]);
  if (!vehicle) notFound();
  const crew = users.filter((u) => u.active && u.id).map((u) => ({ id: u.id as string, name: u.name }));
  const assignedName = crew.find((c) => c.id === vehicle.assignedTo)?.name ?? null;
  const lastChecks = CHECK_KINDS.map((k) => ({
    kind: k.k,
    short: k.short,
    when: latest[k.k]?.checkedOn ?? null,
    by: latest[k.k]?.checkedBy ?? null,
  }));

  // Only the weekly tab needs the photos, and each check costs a round trip —
  // so they are fetched on that tab and nowhere else.
  const shots = tab.k === "weekly" ? await Promise.all(weeklies.map((c) => listVanPhotos(c.id))) : [];
  const urls = tab.k === "weekly" ? await signedUrls(shots.flat().map((p) => p.path)) : new Map<string, string>();
  const angleOf = (key: string | null) => PHOTO_ANGLES.find((a) => key === itemKey("walkaround", a)) ?? null;

  const lastWeekly = weeklies[0] ?? null;
  const last = lastWeekly
    ? {
        id: lastWeekly.id,
        when: dayLabel(lastWeekly.checkedOn),
        by: lastWeekly.checkedBy,
        stockDone: Object.keys(lastWeekly.items ?? {}).some((k) => k.startsWith("weekly|Stock counted")),
        photos: (shots[0] ?? []).map((p) => ({ angle: angleOf(p.itemKey) ?? p.label ?? "Photo", url: urls.get(p.path) ?? null })),
      }
    : null;
  const history: WeeklyRow[] = weeklies.map((c, i) => {
    const got = new Set((shots[i] ?? []).map((p) => angleOf(p.itemKey)).filter(Boolean) as string[]);
    return {
      id: c.id,
      when: dayLabel(c.checkedOn),
      by: c.checkedBy,
      photos: (shots[i] ?? []).length,
      missing: PHOTO_ANGLES.filter((a) => !got.has(a)),
    };
  });
  // "Overdue" is this week's, not a guess from how long ago the last one was:
  // a van checked last Friday and again next Monday was never overdue.
  const overdue = !thisWeek(lastWeekly?.checkedOn, new Date());

  const sub = [
    vehicle.details,
    vehicle.rego ? `Rego ${vehicle.rego}` : null,
    vehicle.odometer !== null ? `${vehicle.odometer.toLocaleString("en-AU")} km` : null,
    vehicle.nextServiceKm !== null ? `Next service at ${vehicle.nextServiceKm.toLocaleString("en-AU")} km` : null,
  ].filter(Boolean) as string[];

  const view = {
    id: vehicle.id, name: vehicle.name, rego: vehicle.rego, details: vehicle.details,
    odometer: vehicle.odometer, serviceIntervalKm: vehicle.serviceIntervalKm,
    nextServiceKm: vehicle.nextServiceKm, nextServiceDate: vehicle.nextServiceDate, status: vehicle.status,
    purchasePrice: vehicle.purchasePrice, resaleValue: vehicle.resaleValue, lifespanYears: vehicle.lifespanYears, fuelPer100: vehicle.fuelPer100,
    amountOwing: vehicle.amountOwing, purchasedOn: vehicle.purchasedOn, condition: vehicle.condition,
    serviceCost: vehicle.serviceCost, kmYear: vehicle.kmYear, assignedTo: vehicle.assignedTo,
  };

  return (
    <PortalShell user={user}>
      <div className="pt-head pt-head--split">
        <div>
          <PortalBack href="/portal/vehicles" label="The fleet" />
          <h1>{vehicle.name}{assignedName ? ` · ${assignedName.split(" ")[0]}` : ""}</h1>
          <p className="pt-vhead__facts">{sub.map((s) => <span key={s}>{s}</span>)}</p>
        </div>
        <div className="pt-vhead__acts">
          <Link href={`/portal/vehicles/${vehicle.id}/checks/weekly`} className="pt-btn pt-btn--orange">Do weekly clean</Link>
          <Link href={`/portal/vehicles/${vehicle.id}?tab=readings`} className="pt-btn pt-btn--ghost">Log km</Link>
          <Link href={`/portal/vehicles/${vehicle.id}?tab=service`} className="pt-btn pt-btn--ghost">Request service</Link>
        </div>
      </div>

      <nav className="pt-tabs" aria-label="This van">
        {TABS.map((t) => (
          <Link
            key={t.k}
            href={`/portal/vehicles/${vehicle.id}${t.k === "weekly" ? "" : `?tab=${t.k}`}`}
            aria-current={t.k === tab.k ? "page" : undefined}
            className={`pt-tab${t.k === tab.k ? " is-on" : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab.k === "weekly" && (
        <>
          <VanWeekly vehicleId={vehicle.id} last={last} overdue={overdue} history={history} />
          <VehicleChecks vehicleId={vehicle.id} checks={lastChecks} assignedName={assignedName} />
        </>
      )}

      {/* Always drawn: it carries the off-the-road banner every tab needs,
          and the log panel only when the tab is one of the logs. */}
      <VehicleDetail
        vehicle={view}
        logs={logs.map((l) => ({
          id: l.id, kind: l.kind, dateLabel: dateLabel(l.logDate),
          odometer: l.odometer, cost: l.cost, litres: l.litres, detail: l.detail, createdBy: l.createdBy,
        }))}
        canManage={can(user, "vehicles")}
        crew={crew}
        log={tab.log}
      />

      {tab.k === "costs" && (
        <>
          <VehicleCosts vehicle={view} />
          {can(user, "vehicles") && <VehicleEdit vehicle={view} crew={crew} />}
        </>
      )}
    </PortalShell>
  );
}
