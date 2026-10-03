import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell, VanTabs } from "@/components/portal/TradeShell";
import { VanReportForm } from "@/components/portal/VanReportForm";
import { NoVan, Chip } from "@/components/portal/tradeVan";
import { vehicleFor, dbConfigured } from "@/lib/portal/db";
import { listReports, reportPhotos } from "@/lib/portal/van";
import { reportChip } from "@/lib/portal/vanParts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Damage & service — Trade portal" };

const day = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });

/**
 * Report damage or ask for a service, and see what's become of every report
 * on this van — the same list the office answers from.
 */
export default async function TradeVanReport() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const van = user.id && dbConfigured() ? await vehicleFor(user.id).catch(() => null) : null;
  const reports = van ? await listReports(van.id, 12) : [];
  const photos = await reportPhotos(reports.map((r) => r.id));

  return (
    <TradeShell user={user} active="van" title="My van" sub="Report damage, or tell the office the van needs a look · goes to the office straight away">
      <VanTabs on="report" />
      {!van ? <NoVan /> : (
        <div className="tr-split" style={{ ["--tr-side" as string]: "380px" }}>
          <VanReportForm />
          <div className="tr-stack tr-stack--sm">
            <section className="tr-card">
              <h2 style={{ paddingBottom: 8, borderBottom: "1px solid var(--tr-line)" }}>This van&rsquo;s reports</h2>
              {reports.length ? (
                <div className="tr-rows">
                  {reports.map((r) => {
                    const n = photos.get(r.id)?.length ?? 0;
                    return (
                      <div className="tr-row" key={r.id} style={{ alignItems: "flex-start" }}>
                        <span className="tr-row__k">
                          <span className="tr-kicker" style={{ fontSize: 12.5 }}>{r.kind === "damage" ? "Damage" : "Service"}</span>
                          <strong style={{ fontSize: 17 }}>{r.title}</strong>
                          <span>
                            {[day(r.on), r.source === "weekly" ? "from weekly check" : null, r.area, n ? `${n} photo${n === 1 ? "" : "s"}` : null, r.drivable === false ? "not drivable" : null].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <Chip c={reportChip(r)} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="tr-empty" style={{ paddingTop: 10 }}>Nothing reported on this van yet.</p>
              )}
            </section>
            <p className="tr-small">
              Lands on this van in the office portal, under Vehicles. The office books the repair and updates it here.
            </p>
          </div>
        </div>
      )}
    </TradeShell>
  );
}
