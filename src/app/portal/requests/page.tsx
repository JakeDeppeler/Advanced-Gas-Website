import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { IncidentRead, LeaveAnswer, OrderAnswer, ReportAnswer } from "@/components/portal/OfficeAnswers";
import { dbConfigured, listVehicles } from "@/lib/portal/db";
import { listOrders, openReports, toolRequests } from "@/lib/portal/van";
import { listLeave, listTake5 } from "@/lib/portal/people";
import { HAZARDS } from "@/lib/portal/peopleParts";
import { TOOL_REQUEST } from "@/lib/portal/vanParts";
import "@/app/trade/trade.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "From the crew — Team portal" };

/**
 * Everything the crew has sent in from the iPad that waits on the office, on
 * one page: incidents, leave, parts, van reports, tools — each answered where
 * it's read, and the answer goes straight back to the tech's screen.
 */
export default async function RequestsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!(can(user, "overhead") || can(user, "vehicles"))) return <Locked user={user} what="Requests from the crew" forWhom="the office" />;
  const fleet = can(user, "vehicles");
  const people = can(user, "manage_users") || can(user, "overhead");

  const [incidents, leave, orders, reports, tools, vans, take5s] = dbConfigured()
    ? await Promise.all([
        listTake5({ kind: "incident", limit: 10 }),
        listLeave({ status: "asked", limit: 30 }),
        listOrders({ open: true, limit: 40 }),
        openReports(),
        toolRequests(),
        listVehicles().catch(() => []),
        listTake5({ kind: "take5", limit: 12 }),
      ])
    : [[], [], [], [], [], [], []];
  const van = new Map(vans.map((v) => [v.id, v.name]));
  const unseen = incidents.filter((i) => !i.seenAt);

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />
      <div className="pt-head">
        <h1>From the crew</h1>
        <p>What the crew has sent in from the van — answered here, and the answer shows on their iPad.</p>
      </div>

      <div className="tr-embed">
        <section className="tr-card" id="incidents">
          <h2 style={{ paddingBottom: 4 }}>Incidents · {unseen.length} unread</h2>
          {incidents.length ? <div className="tr-rows">{incidents.map((t) => <IncidentRead key={t.id} t={t} />)}</div> : <p className="tr-empty">No incidents reported.</p>}
        </section>

        <section className="tr-card" id="leave">
          <h2 style={{ paddingBottom: 4 }}>Leave to answer · {leave.length}</h2>
          {leave.length
            ? (people ? <div className="tr-rows">{leave.map((l) => <LeaveAnswer key={l.id} l={l} />)}</div> : <p className="tr-empty">A manager answers leave.</p>)
            : <p className="tr-empty">Nobody&rsquo;s waiting on leave.</p>}
        </section>

        <section className="tr-card" id="parts">
          <h2 style={{ paddingBottom: 4 }}>Parts orders · {orders.length} open</h2>
          {orders.length
            ? <div className="tr-rows">{orders.map((o) => <OrderAnswer key={o.id} o={o} van={o.vehicleId ? van.get(o.vehicleId) ?? null : null} canAnswer={fleet} />)}</div>
            : <p className="tr-empty">No parts orders open.</p>}
        </section>

        <section className="tr-card" id="reports">
          <h2 style={{ paddingBottom: 4 }}>Van reports · {reports.length} open</h2>
          {reports.length ? (
            <div className="tr-rows">
              {reports.map((r) => (
                <div key={r.id}>
                  <Link href={`/portal/vehicles/${r.vehicleId}?tab=report`} className="tr-small" style={{ fontWeight: 800, textDecoration: "none", display: "inline-block", paddingTop: 10 }}>{van.get(r.vehicleId) ?? "Van"} →</Link>
                  <ReportAnswer r={r} canAnswer={fleet} photos={[]} />
                </div>
              ))}
            </div>
          ) : <p className="tr-empty">Nothing open on any van.</p>}
        </section>

        <section className="tr-card" id="tools">
          <h2 style={{ paddingBottom: 4 }}>Tools asked about · {tools.length}</h2>
          {tools.length ? (
            <div className="tr-rows">
              {tools.map((t) => (
                <Link key={t.id} href={`/portal/vehicles/${t.vehicleId}?tab=tools`} className="tr-row">
                  <span className="tr-row__k">
                    <strong>{t.name} · {TOOL_REQUEST.find((x) => x.k === t.request)?.label}</strong>
                    <span>{[van.get(t.vehicleId), t.requestedBy, t.requestNote].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className={`tr-chip ${t.reply ? "tr-chip--good" : "tr-chip--info"}`}>{t.reply ?? "Not answered"}</span>
                </Link>
              ))}
            </div>
          ) : <p className="tr-empty">No tools asked about.</p>}
        </section>

        <section className="tr-card">
          <h2 style={{ paddingBottom: 4 }}>Latest Take 5s</h2>
          {take5s.length ? (
            <div className="tr-rows">
              {take5s.map((t) => (
                <div key={t.id} className="tr-row" style={{ minHeight: 0 }}>
                  <span className="tr-row__k">
                    <strong style={{ fontSize: 16 }}>{t.userName}{t.job ? ` · ${t.job}` : ""}</strong>
                    <span>
                      {new Date(t.createdAt).toLocaleString("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                      {t.hazards.length ? ` · ${t.hazards.map((h) => HAZARDS.find((x) => x.k === h)?.label ?? h).join(", ")}` : " · nothing flagged"}
                      {t.controls ? ` · ${t.controls}` : ""}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          ) : <p className="tr-empty">No Take 5s saved yet.</p>}
        </section>
      </div>
    </PortalShell>
  );
}
