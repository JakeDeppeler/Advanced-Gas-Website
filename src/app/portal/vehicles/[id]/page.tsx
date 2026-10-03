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
import { VanHead } from "@/components/portal/tradeVan";
import { VanTiles } from "@/components/portal/VanTiles";
import { Ic } from "@/components/portal/TradeShell";
import { OrderAnswer, ReportAnswer, ToolRegister } from "@/components/portal/OfficeAnswers";
import { CHECK_KINDS, PHOTO_ANGLES, VEHICLE_CHECK, itemKey, vehicleKey } from "@/lib/portal/vanChecks";
import { thisWeek } from "@/components/portal/mondayJobs";
import { weekFor } from "@/lib/portal/monday";
import { listOrders, listReports, listTools, reportPhotos } from "@/lib/portal/van";
import { localToday } from "@/lib/portal/xero";
import "@/app/trade/trade.css";

export const dynamic = "force-dynamic";

function dateLabel(d: string) {
  return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}
const dayLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });

/**
 * The van page's tabs: the tech's five, in the design's order, then the two
 * that are the office's alone — the km and fuel logs, and what the van costs.
 */
const TABS = [
  { k: "overview", label: "Overview" },
  { k: "check", label: "Weekly check" },
  { k: "report", label: "Damage & service" },
  { k: "parts", label: "Order parts" },
  { k: "tools", label: "Tools & gear" },
  { k: "km", label: "Km & fuel" },
  { k: "costs", label: "Costs & details" },
] as const;
type TabKey = (typeof TABS)[number]["k"];

/** Old links into the page, from before the tabs were the van screens'. */
const OLD: Record<string, TabKey> = { weekly: "check", service: "report", damage: "report", readings: "km", fuel: "km" };

/**
 * One van, as the office sees it: the same overview and tabs the tech has on
 * the iPad, with the office's half of each — answering a report, ordering
 * the parts, keeping the tool register.
 */
export default async function VehiclePage({ params, searchParams }: { params: { id: string }; searchParams: { tab?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const raw = searchParams.tab ?? "overview";
  const tab: TabKey = (TABS.find((t) => t.k === raw)?.k ?? OLD[raw] ?? "overview") as TabKey;
  const canManage = can(user, "vehicles");

  const [vehicle, users] = await Promise.all([getVehicle(params.id), listUsers()]);
  if (!vehicle) notFound();
  const crew = users.filter((u) => u.active && u.id).map((u) => ({ id: u.id as string, name: u.name }));
  const driver = crew.find((c) => c.id === vehicle.assignedTo)?.name ?? null;
  const first = driver?.split(" ")[0] ?? null;
  const today = localToday();
  const href = (k: TabKey) => `/portal/vehicles/${vehicle.id}${k === "overview" ? "" : `?tab=${k}`}`;

  const view = {
    id: vehicle.id, name: vehicle.name, rego: vehicle.rego, details: vehicle.details,
    odometer: vehicle.odometer, serviceIntervalKm: vehicle.serviceIntervalKm,
    nextServiceKm: vehicle.nextServiceKm, nextServiceDate: vehicle.nextServiceDate, status: vehicle.status,
    purchasePrice: vehicle.purchasePrice, resaleValue: vehicle.resaleValue, lifespanYears: vehicle.lifespanYears, fuelPer100: vehicle.fuelPer100,
    amountOwing: vehicle.amountOwing, purchasedOn: vehicle.purchasedOn, condition: vehicle.condition,
    serviceCost: vehicle.serviceCost, kmYear: vehicle.kmYear, assignedTo: vehicle.assignedTo, regoDue: vehicle.regoDue,
  };

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/vehicles" label="The fleet" />
      <div className="pt-head pt-head--split">
        <div>
          <h1>{vehicle.name}{first ? ` · ${first}` : ""}</h1>
          <p>Checks, damage, parts and tools — what {first ?? "the driver"} sends in from the van, and the office&rsquo;s answers.</p>
        </div>
        <div className="pt-vhead__acts">
          <Link href={`/portal/vehicles/${vehicle.id}/checks/monthly`} className="pt-btn pt-btn--orange">Do the monthly check</Link>
          <Link href={href("km")} className="pt-btn pt-btn--ghost">Log km</Link>
        </div>
      </div>

      <div className="tr-embed">
        <VanHead van={vehicle} who={driver ? `Signed to ${driver}` : "Not signed to anyone"} today={today} />

        <nav className="tr-tabs" aria-label="This van">
          {TABS.map((t) => (
            <Link key={t.k} href={href(t.k)} aria-current={t.k === tab ? "page" : undefined} className={t.k === tab ? "is-on" : undefined}>{t.label}</Link>
          ))}
        </nav>

        {tab === "overview" && (
          <VanTiles van={vehicle} you={false} hrefs={{ check: href("check"), report: href("report"), parts: href("parts"), tools: href("tools"), stock: "/portal/stock" }} />
        )}

        {tab === "check" && <CheckTab vehicleId={vehicle.id} driver={first} />}
        {tab === "report" && <ReportTab vehicleId={vehicle.id} canManage={canManage} />}
        {tab === "parts" && <PartsTab vehicleId={vehicle.id} vanName={vehicle.name} canManage={canManage} />}
        {tab === "tools" && <ToolsTab vehicleId={vehicle.id} canManage={canManage} />}
      </div>

      {tab === "km" && <KmTab view={view} crew={crew} canManage={canManage} />}
      {tab === "costs" && (
        <>
          <VehicleCosts vehicle={view} />
          {canManage && <VehicleEdit vehicle={view} crew={crew} />}
        </>
      )}
    </PortalShell>
  );
}

/* ---------------------------------------------------------------- tabs */

async function CheckTab({ vehicleId, driver }: { vehicleId: string; driver: string | null }) {
  const vehicle = (await getVehicle(vehicleId))!;
  const [week, weeklies, latest] = await Promise.all([weekFor(vehicle), listVanChecks(vehicleId, "weekly", 12), latestVanChecks(vehicleId)]);
  const shots = await Promise.all(weeklies.map((c) => listVanPhotos(c.id)));
  const urls = await signedUrls(shots.flat().map((p) => p.path));
  const angleOf = (key: string | null) => PHOTO_ANGLES.find((a) => key === itemKey("walkaround", a)) ?? null;
  const lastWeekly = weeklies[0] ?? null;
  const last = lastWeekly ? {
    id: lastWeekly.id, when: dayLabel(lastWeekly.checkedOn), by: lastWeekly.checkedBy,
    stockDone: week.steps.find((s) => s.key === "stock")?.done ?? false,
    photos: (shots[0] ?? []).filter((p) => angleOf(p.itemKey)).map((p) => ({ angle: angleOf(p.itemKey) ?? p.label ?? "Photo", url: urls.get(p.path) ?? null })),
  } : null;
  const history: WeeklyRow[] = weeklies.map((c, i) => {
    const got = new Set((shots[i] ?? []).map((p) => angleOf(p.itemKey)).filter(Boolean) as string[]);
    return { id: c.id, when: dayLabel(c.checkedOn), by: c.checkedBy, photos: got.size, missing: PHOTO_ANGLES.filter((a) => !got.has(a)) };
  });
  const flagged = VEHICLE_CHECK.flatMap((g) => g.items).filter((i) => week.weekly?.items[vehicleKey(i)]?.state === "action");
  const checks = CHECK_KINDS.map((k) => ({ kind: k.k, short: k.short, when: latest[k.k]?.checkedOn ?? null, by: latest[k.k]?.checkedBy ?? null }));

  return (
    <>
      <div className="tr-split tr-split--left" style={{ ["--tr-side" as string]: "320px" }}>
        <section className="tr-card tr-steps">
          <div className="tr-steps__h">
            <strong>This week</strong>
            <span className="tr-small">{week.done} of {week.steps.length} done{driver ? ` · ${driver}` : ""}</span>
            <div className="tr-bar tr-bar--thin" style={{ marginTop: 10 }} aria-hidden="true"><span style={{ width: `${(week.done / week.steps.length) * 100}%` }} /></div>
          </div>
          {week.steps.map((s, i) => (
            <div key={s.key} className="tr-step" style={{ cursor: "default" }}>
              <span className={`tr-step__c${s.done ? " is-done" : ""}`}>{s.done ? <Ic n="tick" size={18} /> : i + 1}</span>
              <span className="tr-step__t"><strong>{s.title}</strong><span className={s.warn ? "is-warn" : undefined}>{s.status}</span></span>
            </div>
          ))}
        </section>
        <section className="tr-card tr-stack" style={{ gap: 10 }}>
          <h2>Flagged on the vehicle check</h2>
          {flagged.length ? (
            <div className="tr-rows">
              {flagged.map((i) => {
                const e = week.weekly?.items[vehicleKey(i)];
                return (
                  <div key={i} className="tr-row">
                    <span className="tr-row__ic"><Ic n="warn" size={20} /></span>
                    <span className="tr-row__k">
                      <strong>{i}</strong>
                      <span>{[e?.note, e?.drive === false ? "NOT to be driven" : e?.drive ? "still drivable" : null].filter(Boolean).join(" · ") || "No note"}</span>
                    </span>
                    <span className={`tr-chip ${e?.reported ? "tr-chip--info" : "tr-chip--warn"}`}>{e?.reported ? "On Damage & service" : "Not sent yet"}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="tr-empty">{week.done === 0 ? "This week's check hasn't been started." : "Nothing flagged this week."}</p>
          )}
          <p className="tr-small">When the check is sent, each flagged line becomes a service request on the Damage &amp; service tab, where it gets its answer.</p>
        </section>
      </div>
      <VanWeekly vehicleId={vehicleId} last={last} overdue={!thisWeek(lastWeekly?.checkedOn, new Date())} history={history} />
      <VehicleChecks vehicleId={vehicleId} checks={checks} assignedName={driver} />
    </>
  );
}

async function ReportTab({ vehicleId, canManage }: { vehicleId: string; canManage: boolean }) {
  const reports = await listReports(vehicleId, 40);
  const photos = await reportPhotos(reports.map((r) => r.id));
  const urls = await signedUrls([...photos.values()].flat().map((p) => p.path));
  const open = reports.filter((r) => r.status && r.status !== "fixed");
  const rest = reports.filter((r) => !r.status || r.status === "fixed");
  const card = (title: string, list: typeof reports, empty: string) => (
    <section className="tr-card">
      <h2 style={{ paddingBottom: 4 }}>{title} · {list.length}</h2>
      {list.length ? (
        <div className="tr-rows">
          {list.map((r) => <ReportAnswer key={r.id} r={r} canAnswer={canManage} photos={(photos.get(r.id) ?? []).map((p) => ({ url: urls.get(p.path) ?? null, label: p.label }))} />)}
        </div>
      ) : <p className="tr-empty">{empty}</p>}
    </section>
  );
  return (
    <>
      {card("Waiting on the office", open, "Nothing open. Reports from the van land here.")}
      {card("Fixed and earlier", rest, "Nothing logged yet.")}
    </>
  );
}

async function PartsTab({ vehicleId, vanName, canManage }: { vehicleId: string; vanName: string; canManage: boolean }) {
  const orders = await listOrders({ vehicleId, limit: 30 });
  return (
    <section className="tr-card">
      <h2 style={{ paddingBottom: 4 }}>Parts orders from this van · {orders.length}</h2>
      {orders.length ? (
        <div className="tr-rows">{orders.map((o) => <OrderAnswer key={o.id} o={o} canAnswer={canManage} />)}</div>
      ) : <p className="tr-empty">Nothing ordered from {vanName} yet. Orders sent from the iPad land here, and on the factory stock page.</p>}
    </section>
  );
}

async function ToolsTab({ vehicleId, canManage }: { vehicleId: string; canManage: boolean }) {
  const tools = await listTools(vehicleId);
  if (tools == null) return <p className="tr-card tr-empty">The tool register can&rsquo;t be read right now.</p>;
  return <ToolRegister vehicleId={vehicleId} tools={tools} canEdit={canManage} />;
}

async function KmTab({ view, crew, canManage }: { view: Parameters<typeof VehicleDetail>[0]["vehicle"]; crew: { id: string; name: string }[]; canManage: boolean }) {
  const logs = (await listVehicleLogs(view.id)).map((l) => ({
    id: l.id, kind: l.kind, dateLabel: dateLabel(l.logDate),
    odometer: l.odometer, cost: l.cost, litres: l.litres, detail: l.detail, createdBy: l.createdBy,
  }));
  return (
    <>
      <VehicleDetail vehicle={view} logs={logs} canManage={canManage} crew={crew} log="reading" />
      <VehicleDetail vehicle={view} logs={logs} canManage={canManage} crew={crew} log="fuel" banner={false} />
    </>
  );
}
