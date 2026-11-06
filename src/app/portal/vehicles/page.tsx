import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listVehicles, listUsers, dbConfigured, type Vehicle } from "@/lib/portal/db";
import { FUEL_PRICE, KM_PER_WEEK, fuelPerYear, kmAYear, vehicleFinance } from "@/components/portal/vehicleMath";
import { STATUS_LABEL } from "@/components/portal/vehicleStatus";
import { PortalShell } from "@/components/portal/PortalShell";
import { AddVehicleForm } from "@/components/portal/AddVehicleForm";
import { money } from "@/lib/portal/format";
import { listVanChecks, listVehicleLogs } from "@/lib/portal/db";
import { cleanCell, fleetAlerts, kmCell, serviceCell, sortByUrgency, type VanRow } from "@/components/portal/fleetStatus";
import { localToday } from "@/lib/portal/xero";
import { Btn, Card, Empty, Grid, Head, Kv, Note, Pill, Tabs, Tile, type Status } from "@/components/portal/kit/Kit";
import { cellSt } from "@/components/portal/fleet/VanParts";
import { VanLoans } from "@/components/portal/VanLoans";
import { getGrowth } from "@/lib/portal/growth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vans · Team portal" };

const km = (n: number | null) => (n === null ? "" : `${n.toLocaleString("en-AU")} km`);

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

const COLS = ["Weekly clean", "Service", "Km reading"];

/** One van a row: its three states, each a pill with what we know under it. */
function FleetTable({ rows, title, muted }: { rows: VanRow[]; title: string; muted?: boolean }) {
  return (
    <Card title={title} aside={muted ? "not counted in the alerts" : undefined}>
      <div className="pk-tbl-wrap" style={muted ? { opacity: 0.75 } : undefined}>
        <table className="pk-tbl pk-fleet">
          <thead><tr><th>Van</th><th>Weekly clean &amp; photos</th><th>Service</th><th>Km reading</th><th><span className="pt-sr">Open</span></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/portal/vehicles/${r.id}`} className="pk-fleet-van"><b>{r.name}</b><span>{[r.who, r.rego].filter(Boolean).join(" · ") || "No driver set"}</span></Link></td>
                {([r.clean, r.service, r.km] as const).map((c, i) => (
                  <td key={i} data-l={COLS[i]}><Pill st={cellSt(c)} /><span className="pk-fleet-d">{c.detail}</span></td>
                ))}
                <td><Link href={`/portal/vehicles/${r.id}`} className="pk-fleet-go">Open ›</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
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
  { k: "loans", label: "Vans & loans" },
] as const;
type ViewKey = (typeof VIEWS)[number]["k"];

const SEVERITY = { bad: 0, warn: 1, ok: 2, none: 3 } as const;

/** Worst first on the column this view is about; everything else as it was. */
function forView(rows: VanRow[], view: ViewKey): VanRow[] {
  if (view === "all" || view === "loans") return rows;
  const col = view === "clean" ? "clean" : view === "service" ? "service" : "km";
  return [...rows].sort((a, b) => SEVERITY[a[col].severity] - SEVERITY[b[col].severity]);
}

export default async function VehiclesPage({ searchParams }: { searchParams: { view?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  // What each van cost and owes is the office's: the tab is only there for those who can see money.
  const money$ = can(user, "overhead");
  const views = VIEWS.filter((v) => v.k !== "loans" || money$);
  const view: ViewKey = (views.find((v) => v.k === searchParams.view)?.k ?? "all") as ViewKey;

  const canManage = can(user, "vehicles");
  const ready = dbConfigured();
  const [vehicles, users, growth] = ready
    ? await Promise.all([listVehicles(), listUsers(), view === "loans" ? getGrowth() : null])
    : [[], [], null];
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

  const onCount = onRoad.length;
  const tile = (n: number, bad: boolean): Status => (n === 0 ? { k: "good", w: "All done" } : { k: bad ? "bad" : "mid", w: `${n} to do` });

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Vans" eyebrow={`${vehicles.length} ${vehicles.length === 1 ? "van" : "vans"} · weekly clean and photos are due every Monday morning`} info={[
          ["Weekly clean & photos", "Done once each week, by Monday morning: the van cleaned and photographed from every side."],
          ["Service", "Due within 2,000 km or three weeks shows amber; past it, red."],
          ["Km reading", "The odometer, dated by the last reading. Servicing and running costs hang off it."],
          ...(money$ ? [["Vans & loans", "What each van cost, what it still owes and the repayments. The same figures as Pricing & costs › Vans & loans."] as [string, string]] : []),
        ]} />
        {rows.length > 0 && <div className="pk-btns" style={{ marginTop: -6 }}><Btn href={`/portal/vehicles/${rows[0].id}`}>+ Log for a van</Btn></div>}

        {!ready && <Empty>Vehicles need the database connected. The fleet can’t be read right now, so this is empty rather than the fleet being empty.</Empty>}

        {rows.length > 0 && (
          <Grid cols={4}>
            <Tile label="On the road" st={{ k: "none", w: "" }} fig={`${onCount} of ${vehicles.length}`} frac={vehicles.length ? onCount / vehicles.length : null}
              sub={offRows.length ? `${offRows.length} in for repair or off the road` : "every van is out"} />
            <Tile label="Weekly clean overdue" st={tile(alerts.cleanOverdue, true)} fig={String(alerts.cleanOverdue)} frac={onCount ? 1 - alerts.cleanOverdue / onCount : null} sub="due Monday morning" />
            <Tile label="Service due" st={tile(alerts.serviceDue, false)} fig={String(alerts.serviceDue)} frac={onCount ? 1 - alerts.serviceDue / onCount : null} sub="within 2,000 km or three weeks" />
            <Tile label="Km reading missing" st={tile(alerts.kmStale, false)} fig={String(alerts.kmStale)} frac={onCount ? 1 - alerts.kmStale / onCount : null} sub="everything else hangs off it" />
          </Grid>
        )}

        {vehicles.length > 0 && (
          <Tabs on={view} label="Fleet views" items={views.map((v) => ({ key: v.k, label: v.label, href: v.k === "all" ? "/portal/vehicles" : `/portal/vehicles?view=${v.k}` }))} />
        )}

        {view === "loans" && growth ? (
          <VanLoans growth={growth} vans={vehicles.map((v) => ({
            id: v.id, name: v.name, onRoad: v.status !== "off", purchasePrice: v.purchasePrice, amountOwing: v.amountOwing,
            monthlyRepayment: v.monthlyRepayment, resaleValue: v.resaleValue, lifespanYears: v.lifespanYears,
            fromLoan: v.owingFromLoan, typedRepayment: v.typedRepayment,
          }))} />
        ) : vehicles.length === 0 ? (
          ready && <Empty>No vehicles yet{canManage ? ", add one below." : "."}</Empty>
        ) : (
          <>
            <FleetTable rows={forView(rows, view)} title={view === "all" ? "On the road · most urgent first" : "On the road · worst on this column first"} />
            {offRows.length > 0 && <FleetTable rows={offRows} title="Not on the road" muted />}
          </>
        )}

        {view !== "loans" && vehicles.length > 0 && (
          <Card title="What the fleet costs a year" aside={money$ ? <Link href="/portal/vehicles?view=loans">Loans and repayments ›</Link> : undefined}>
            <Kv t="Depreciation" sub="only on vans still being paid off" v={t.dep !== null ? money(t.dep) : "not set"} />
            <Kv t="Fuel" sub={`at $${FUEL_PRICE.toFixed(2)}/L, ${KM_PER_WEEK} km a week where none is set`} v={t.fuel !== null ? money(t.fuel) : "not set"} />
            <Kv t="Servicing" sub="each van’s interval and what a service costs" v={t.servicing !== null ? money(t.servicing) : "not set"} />
            <Kv t={<b>Total</b>} sub="the Vehicles line in Pricing & costs" v={t.running !== null ? money(t.running) : ""} />
            <Note>A van that’s bought and paid for still loses value, but that isn’t cash going out, so it stays off the total. &ldquo;Not set&rdquo; means a van is missing the figure: purchase price and lifespan, service cost and km a year, or fuel use.</Note>
          </Card>
        )}

        {/* Below the fleet rather than above it: adding a van happens a few times
            a year, and the top of the page is kept for what's due. */}
        {canManage && view !== "loans" && <AddVehicleForm crew={crew} />}
      </div>
    </PortalShell>
  );
}
