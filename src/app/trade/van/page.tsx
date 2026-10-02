import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell } from "@/components/portal/TradeShell";
import { VanIssue } from "@/components/portal/VanIssue";
import { listVehicleLogs, listVanChecks, vehicleFor, dbConfigured } from "@/lib/portal/db";
import { cleanCell, serviceCell } from "@/components/portal/fleetStatus";
import { KIND_LABEL } from "@/lib/portal/vanChecks";
import { localToday } from "@/lib/portal/xero";

export const dynamic = "force-dynamic";
export const metadata = { title: "My van — Trade portal" };

const LOG_LABEL: Record<string, string> = {
  reading: "Km reading", fuel: "Fuel", service: "Service", damage: "Damage",
};

const when = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });

/**
 * The van signed to you: where it's at, what you've logged on it, and the two
 * things you can raise from the driveway.
 */
export default async function TradeVan() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const van = user.id && dbConfigured() ? await vehicleFor(user.id).catch(() => null) : null;
  const [logs, checks] = van
    ? await Promise.all([listVehicleLogs(van.id).catch(() => []), listVanChecks(van.id, undefined, 20).catch(() => [])])
    : [[], []];

  const today = localToday();
  const lastWeekly = checks.find((c) => c.kind === "weekly") ?? null;
  const clean = cleanCell(lastWeekly?.checkedOn ?? null, today);
  const service = serviceCell(van?.odometer ?? null, van?.nextServiceKm ?? null, van?.nextServiceDate ?? null, today);

  // Km DRIVEN each week, not the odometer.
  //
  // Four odometer readings — 5,020 through 6,140 — drew four bars within a
  // fifth of each other: a chart with no shape, saying nothing a tech would
  // act on. The gaps between them are the week's work, and they do have shape:
  // 590, 270, 260. The reading itself is the fact tile at the top of the page,
  // which is where a single number belongs.
  const readings = logs.filter((l) => l.kind === "reading" && l.odometer != null).slice(0, 5).reverse();
  const weeks = readings.slice(1).map((r, i) => ({
    id: r.id,
    on: r.logDate,
    km: (r.odometer as number) - (readings[i].odometer as number),
  })).filter((w) => w.km >= 0);
  const peak = weeks.reduce((a, w) => Math.max(a, w.km), 0);

  // One list, so "your log" means the same thing as the van's history on the
  // office page — checks and log entries together, newest first.
  const feed = [
    ...logs.map((l) => ({ when: l.logDate, what: `${LOG_LABEL[l.kind] ?? l.kind}${l.odometer != null ? ` · ${l.odometer.toLocaleString("en-AU")} km` : ""}${l.detail ? ` · ${l.detail}` : ""}`, by: l.createdBy })),
    ...checks.map((c) => ({ when: c.checkedOn, what: KIND_LABEL[c.kind], by: c.checkedBy })),
  ].sort((a, b) => b.when.localeCompare(a.when)).slice(0, 10);

  if (!van) {
    return (
      <TradeShell user={user} active="/trade/van" title="My van" sub="Nothing signed to you yet">
        <div className="tr-card tr-stack">
          <h2>No van is signed to you</h2>
          <p style={{ margin: 0 }}>
            {dbConfigured()
              ? "The office signs vans to people on the fleet page. Once yours is signed over, its readings, checks and service history show up here."
              : "The database isn't connected yet, so there's nothing to read."}
          </p>
          <Link href="/trade" className="tr-btn" style={{ alignSelf: "flex-start" }}>Back to home</Link>
        </div>
      </TradeShell>
    );
  }

  return (
    <TradeShell
      user={user} active="/trade/van"
      title="My van"
      sub={`${van.name}${van.rego ? ` · ${van.rego}` : ""} · signed to you`}
      action={<Link href="/trade/monday" className="tr-btn tr-btn--go">Monday jobs</Link>}
    >
      <div className="tr-split" style={{ ["--tr-cols" as string]: "minmax(0, 1fr) 400px" }}>
        <div className="tr-stack">
          <div className="tr-facts" style={{ ["--tr-n" as string]: 2 }}>
            <div className="tr-fact">
              <span className="tr-fact__k">Odometer</span>
              <strong className="tr-fact__v">{van.odometer != null ? `${van.odometer.toLocaleString("en-AU")} km` : "Not logged"}</strong>
            </div>
            <div className="tr-fact">
              <span className="tr-fact__k">Next service</span>
              <strong className="tr-fact__v">{service.label}</strong>
              <span className="tr-foot">{service.detail}</span>
            </div>
            <div className="tr-fact">
              <span className="tr-fact__k">Weekly check</span>
              <strong className="tr-fact__v">{clean.label}</strong>
              <span className="tr-foot">{clean.detail}</span>
            </div>
            <div className="tr-fact">
              <span className="tr-fact__k">On the road</span>
              <strong className="tr-fact__v">
                {van.status === "on" ? "Yes" : van.status === "repair" ? "In for repair" : "Off the road"}
              </strong>
            </div>
          </div>

          <section className="tr-card tr-stack" style={{ gap: 14 }}>
            <h2>Km driven each week</h2>
            {weeks.length ? (
              <div className="tr-chart">
                {weeks.map((w) => (
                  <div className="tr-chart__col" key={w.id}>
                    <span className="tr-chart__v">{w.km.toLocaleString("en-AU")}</span>
                    <span className="tr-chart__bar" style={{ height: `${peak ? Math.max(6, (w.km / peak) * 110) : 6}px` }} />
                    <span className="tr-chart__d">to {when(w.on)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="tr-empty" style={{ margin: 0 }}>
                {readings.length === 1
                  ? "One reading so far. Next Monday's gives the first week's distance."
                  : "No readings logged yet. The Monday jobs put one on here every week."}
              </p>
            )}
          </section>

          <section className="tr-card">
            <h2 style={{ paddingBottom: 6 }}>Your log</h2>
            {feed.length ? (
              <div className="tr-rows">
                {feed.map((f, i) => (
                  <div className="tr-row" key={`${f.when}-${i}`}>
                    <span className="tr-row__k"><strong>{f.what}</strong>{f.by && <span>{f.by}</span>}</span>
                    <span className="tr-row__v" style={{ fontSize: 15, fontWeight: 600, color: "var(--pt-ink-2)" }}>{when(f.when)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="tr-empty" style={{ margin: 0 }}>Nothing logged on this van yet.</p>
            )}
          </section>
        </div>

        <VanIssue vanName={van.name} />
      </div>
    </TradeShell>
  );
}
