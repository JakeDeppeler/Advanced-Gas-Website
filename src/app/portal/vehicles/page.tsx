import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listVehicles, listUsers, dbConfigured, type Vehicle } from "@/lib/portal/db";
import { FUEL_PRICE, KM_PER_WEEK, fuelPerYear, kmAYear, vehicleFinance } from "@/components/portal/vehicleMath";
import { STATUS_LABEL } from "@/components/portal/vehicleStatus";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { AddVehicleForm } from "@/components/portal/AddVehicleForm";
import { money } from "@/lib/portal/format";
import { listVanChecks, listVehicleLogs } from "@/lib/portal/db";
import { cleanCell, fleetAlerts, kmCell, serviceCell, sortByUrgency, type VanRow } from "@/components/portal/fleetStatus";
import { localToday } from "@/lib/portal/xero";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vehicles — Team portal" };

const km = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("en-AU")} km`);

/** What the fleet is worth, what's owed on it, and what a year of it costs. */
function fleetTotals(vehicles: Vehicle[]) {
  let owing = 0, worth = 0, dep = 0, servicing = 0, fuel = 0;
  let owingKnown = false, worthKnown = false, depKnown = false, servKnown = false, fuelKnown = false;
  for (const v of vehicles) {
    const fin = vehicleFinance(v);
    if (v.amountOwing != null) { owing += v.amountOwing; owingKnown = true; }
    if (fin.worthNow !== null) { worth += fin.worthNow; worthKnown = true; }
    // A van that's paid for isn't costing money each year — the depreciation is
    // still real, but it isn't cash going out, so it stays off the running cost.
    if (fin.annualDep !== null && !fin.ownedOutright) { dep += fin.annualDep; depKnown = true; }
    if (fin.servicePerYear !== null) { servicing += fin.servicePerYear; servKnown = true; }
    const f = fuelPerYear(v);
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

/** One van's row: the three states it can be in, each with what we know under it. */
function FleetTable({ rows, caption, muted }: { rows: VanRow[]; caption?: string; muted?: boolean }) {
  return (
    <section className={`pt-panel pt-fleetp${muted ? " is-muted" : ""}`}>
      {caption && <h2 className="pt-panel__h">{caption}</h2>}
      <div className="pt-fleet__wrap">
        <table className="pt-fleet">
          <thead>
            <tr>
              <th scope="col">Van</th>
              <th scope="col">Weekly clean &amp; photos</th>
              <th scope="col">Service</th>
              <th scope="col">Km reading</th>
              <th scope="col"><span className="pt-sr">Open</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <th scope="row">
                  <div className="pt-fleet__van">
                    <div className="pt-fleet__icon" aria-hidden="true">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19a2 2 0 1 0 0-.01M17 19a2 2 0 1 0 0-.01" /></svg>
                    </div>
                    <div>
                      <strong>{r.name}</strong>
                      <span>{[r.who, r.rego].filter(Boolean).join(" · ") || "No driver set"}</span>
                    </div>
                  </div>
                </th>
                {([r.clean, r.service, r.km] as const).map((c, i) => (
                  <td key={i}>
                    {/* The word is the signal; the colour only agrees with it. */}
                    <span className={`pt-vstat pt-vstat--${c.severity}`}>{c.label}</span>
                    <span className="pt-fleet__detail">{c.detail}</span>
                  </td>
                ))}
                <td className="pt-fleet__go">
                  <Link href={`/portal/vehicles/${r.id}`}>Open →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * The four views of the fleet the design asks for.
 *
 * One table, four ways of reading it. On a four-van fleet "all vans" answers
 * most questions, but the three others are the ones somebody opens this page
 * already looking for — and sorting by the column they care about beats
 * scanning three pills per row for the one that is amber.
 */
const VIEWS = [
  { k: "all", label: "All vans" },
  { k: "clean", label: "Weekly clean & photos" },
  { k: "service", label: "Service requests" },
  { k: "km", label: "Km readings" },
] as const;
type ViewKey = (typeof VIEWS)[number]["k"];

const SEVERITY = { bad: 0, warn: 1, ok: 2, none: 3 } as const;

/** Worst first on the column this view is about; everything else as it was. */
function forView(rows: VanRow[], view: ViewKey): VanRow[] {
  if (view === "all") return rows;
  const col = view === "clean" ? "clean" : view === "service" ? "service" : "km";
  return [...rows].sort((a, b) => SEVERITY[a[col].severity] - SEVERITY[b[col].severity]);
}

export default async function VehiclesPage({ searchParams }: { searchParams: { view?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const view: ViewKey = (VIEWS.find((v) => v.k === searchParams.view)?.k ?? "all") as ViewKey;

  const canManage = can(user, "vehicles");
  const ready = dbConfigured();
  const [vehicles, users] = ready ? await Promise.all([listVehicles(), listUsers()]) : [[], []];
  const crew = users.filter((u) => u.active && u.id).map((u) => ({ id: u.id as string, name: u.name }));
  const nameOf = new Map(crew.map((c) => [c.id, c.name]));
  const onRoad = vehicles.filter((v) => v.status === "on");
  const repair = vehicles.filter((v) => v.status === "repair");
  const off = vehicles.filter((v) => v.status === "off");
  const t = fleetTotals(vehicles);

  /**
   * Each van's three states.
   *
   * One pair of reads per van. The fleet is four vans, so a query each beats
   * inventing a bulk endpoint; if it ever grows past a dozen this is the thing
   * to change.
   */
  const today = localToday();
  const built = await Promise.all(
    vehicles.map(async (v): Promise<VanRow> => {
      const [checks, logs] = ready
        ? await Promise.all([
            listVanChecks(v.id, "weekly", 1).catch(() => []),
            listVehicleLogs(v.id).catch(() => []),
          ])
        : [[], []];
      const lastRead = logs.filter((l) => l.kind === "reading").sort((a, b) => b.logDate.localeCompare(a.logDate))[0];
      return {
        id: v.id,
        name: v.name,
        who: v.assignedTo ? nameOf.get(v.assignedTo) ?? null : null,
        rego: v.rego,
        clean: cleanCell(checks[0]?.checkedOn ?? null, today),
        service: serviceCell(v.odometer, v.nextServiceKm, v.nextServiceDate, today),
        // The odometer on the van record is the number; a reading log is what
        // dates it. Without one we can't say how old the figure is.
        km: kmCell(v.odometer, lastRead?.logDate ?? null, today),
      };
    }),
  );

  const byId = new Map(built.map((r) => [r.id, r]));
  const rows = sortByUrgency(onRoad.map((v) => byId.get(v.id)!).filter(Boolean));
  const offRows = sortByUrgency([...repair, ...off].map((v) => byId.get(v.id)!).filter(Boolean));
  const alerts = fleetAlerts(rows);

  return (
    <PortalShell user={user}>
      <div className="pt-head pt-head--split">
        <div>
          <PortalBack href="/portal" label="Home" />
          <h1>The fleet</h1>
          <p>{vehicles.length} {vehicles.length === 1 ? "van" : "vans"}. Weekly clean and photos are due every Monday morning.</p>
        </div>
        {rows.length > 0 && (
          <Link href={`/portal/vehicles/${rows[0].id}`} className="pt-btn pt-btn--orange pt-head__act">
            + Log for a van
          </Link>
        )}
      </div>

      {!ready && (
        <div className="pt-note pt-note--warn"><strong>Database not connected.</strong> Vehicles need the Supabase keys set on the server.</div>
      )}

      {rows.length > 0 && (
        <div className="pt-alerts">
          {/* Only the ones that are actually true. Three permanent tiles reading
              zero teach people to stop looking at the row. */}
          {alerts.cleanOverdue > 0 && (
            <div className="pt-alert"><span>{alerts.cleanOverdue}</span><strong>Weekly clean overdue</strong><em>Due Monday morning</em></div>
          )}
          {alerts.serviceDue > 0 && (
            <div className="pt-alert"><span>{alerts.serviceDue}</span><strong>Service due</strong><em>Within 2,000 km or three weeks</em></div>
          )}
          {alerts.kmStale > 0 && (
            <div className="pt-alert"><span>{alerts.kmStale}</span><strong>Km reading missing</strong><em>Everything else hangs off it</em></div>
          )}
          {alerts.cleanOverdue + alerts.serviceDue + alerts.kmStale === 0 && (
            <div className="pt-alert is-clear"><span>✓</span><strong>Nothing outstanding</strong><em>Every van is up to date</em></div>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div className="pt-viewrow">
          <nav className="pt-tabs pt-tabs--seg" aria-label="Fleet views">
            {VIEWS.map((v) => (
              <Link
                key={v.k}
                href={v.k === "all" ? "/portal/vehicles" : `/portal/vehicles?view=${v.k}`}
                aria-current={v.k === view ? "page" : undefined}
                className={`pt-tab${v.k === view ? " is-on" : ""}`}
              >
                {v.label}
              </Link>
            ))}
          </nav>
          <span className="pt-tabs__note">{view === "all" ? "Most urgent first" : "Worst on this column first"}</span>
        </div>
      )}

      {vehicles.length === 0 ? (
        <div className="pt-rep__empty">
          {ready
            ? <>No vehicles yet{canManage ? " — add one above." : "."}</>
            : <>The fleet can&rsquo;t be read right now, so this is empty rather than the fleet being empty.</>}
        </div>
      ) : (
        <>
          <FleetTable rows={forView(rows, view)} caption={offRows.length > 0 ? "On the road" : undefined} />
          {offRows.length > 0 && <FleetTable rows={offRows} caption="Not on the road" muted />}
        </>
      )}

      {/* Below the fleet rather than above it: adding a van happens a few times
          a year, and the design keeps the top of the page for what's due. */}
      {canManage && <div className="pt-fleet__add"><AddVehicleForm crew={crew} /></div>}

      {vehicles.length > 0 && (
        <section className="pt-panel pt-fcost">
          <div className="pt-fcost__row">
            <h2 className="pt-panel__h">What the fleet costs a year</h2>
            <dl>
              <div><dt>Depreciation</dt><dd>{t.dep !== null ? money(t.dep) : "not set"}</dd></div>
              <div><dt>Fuel</dt><dd>{t.fuel !== null ? money(t.fuel) : "not set"}</dd></div>
              <div><dt>Servicing</dt><dd>{t.servicing !== null ? money(t.servicing) : "not set"}</dd></div>
              <div><dt>Total</dt><dd>{t.running !== null ? money(t.running) : "—"}</dd></div>
            </dl>
          </div>
          <details className="pt-fcost__how">
            <summary>How these are worked out</summary>
            <p>
              Servicing from each van&rsquo;s interval and what a service costs, fuel at {FUEL_PRICE.toFixed(2)}/L, and {KM_PER_WEEK}km a
              week where no figure has been entered. Depreciation counts only on vans still being paid off — one that&rsquo;s
              bought and paid for still loses value, but that isn&rsquo;t cash going out. &ldquo;Not set&rdquo; means a van is missing
              the figure: purchase price and lifespan for depreciation, service cost and km a year for servicing, fuel use for
              fuel. The total is the Vehicles line in <Link href="/portal/finance/capacity">Costs &amp; capacity</Link>.
            </p>
          </details>
        </section>
      )}
    </PortalShell>
  );
}
