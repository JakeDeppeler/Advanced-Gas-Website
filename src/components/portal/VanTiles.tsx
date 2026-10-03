import Link from "next/link";
import { Ic } from "@/components/portal/TradeShell";
import type { Vehicle } from "@/lib/portal/db";
import { dbConfigured, listVanChecks } from "@/lib/portal/db";
import { weekFor } from "@/lib/portal/monday";
import { listOrders, listReports, listTools } from "@/lib/portal/van";
import { lowStockCount } from "@/lib/portal/stock";
import { VEHICLE_ITEMS, shortfalls, vehicleKey } from "@/lib/portal/vanChecks";
import { isOpenOrder, isOpenReport, partChip, shortDate, toolState } from "@/lib/portal/vanParts";
import { localToday } from "@/lib/portal/xero";

const list = (xs: string[]) => (xs.length <= 2 ? xs.join(" and ") : `${xs.slice(0, 2).join(", ")} and ${xs.length - 2} more`);

/**
 * The van's four tiles — weekly check, damage & service, parts, tools — and
 * the factory stock row under them. One component for the tech's My van and
 * the office's van page, so the two can't tell a different story about the
 * same van.
 */
export async function VanTiles({ van, hrefs, you }: {
  van: Vehicle;
  hrefs: { check: string; report: string; parts: string; tools: string; stock: string };
  /** "you" on the tech's screen, the driver's first name on the office's. */
  you: boolean;
}) {
  const today = localToday();
  const [week, reports, orders, tools, stockSheets, factoryLow] = await Promise.all([
    weekFor(van),
    listReports(van.id, 20),
    listOrders({ vehicleId: van.id, limit: 10 }),
    listTools(van.id),
    listVanChecks(van.id, "stock", 1).catch(() => []),
    dbConfigured() ? lowStockCount().catch(() => null) : null,
  ]);

  const open = reports.filter(isOpenReport);
  const low = stockSheets[0] ? shortfalls("stock", stockSheets[0].items) : [];
  const openOrders = orders.filter(isOpenOrder);
  const states = (tools ?? []).map((t) => ({ t, s: toolState(t, today) }));
  const broken = states.filter(({ t }) => t.request === "broken");
  const due = states.filter(({ s }) => s.due);
  const asked = states.filter(({ t }) => t.request);
  const lookAt = VEHICLE_ITEMS.filter((i) => week.weekly?.items[vehicleKey(i)]?.state === "action").length;
  const weekDone = week.done === week.steps.length;

  return (
    <>
      <div className="tr-grid tr-grid--2">
        <Link href={hrefs.check} className="tr-tile tr-tile--big">
          <span className={`tr-tile__ic ${weekDone ? "tr-tile__ic--good" : "tr-tile__ic--warn"}`}><Ic n="check" /></span>
          <span className="tr-tile__badge">
            {weekDone ? <span className="tr-chip tr-chip--good">Done</span> : <span className="tr-chip tr-chip--warn">{week.done} of {week.steps.length}</span>}
          </span>
          <span>
            <span className="tr-tile__t">Weekly check</span>
            <span className="tr-tile__s">
              {!week.weekly && week.done === 0
                ? "Not started this week · due Monday by 8am"
                : `${weekDone ? "Sent this week" : `${week.done} of ${week.steps.length} steps done this week`}${lookAt ? ` · ${lookAt} ${lookAt === 1 ? "thing" : "things"} to look at` : ""}`}
            </span>
          </span>
        </Link>

        <Link href={hrefs.report} className="tr-tile tr-tile--big">
          <span className="tr-tile__ic tr-tile__ic--warn"><Ic n="warn" /></span>
          {open.length > 0 && <span className="tr-tile__badge"><span className="tr-chip tr-chip--warn">{open.length} open</span></span>}
          <span>
            <span className="tr-tile__t">Damage &amp; service</span>
            <span className="tr-tile__s">{open.length ? list(open.map((r) => r.title)) : you ? "Nothing waiting on the office" : "Nothing open on this van"}</span>
          </span>
        </Link>

        <Link href={hrefs.parts} className="tr-tile tr-tile--big">
          <span className="tr-tile__ic tr-tile__ic--warn"><Ic n="box" /></span>
          <span className="tr-tile__badge">
            {low.length > 0
              ? <span className="tr-chip tr-chip--warn">{low.length} low</span>
              : openOrders[0] ? <span className={`tr-chip tr-chip--${partChip(openOrders[0]).tone}`}>{partChip(openOrders[0]).label}</span> : null}
          </span>
          <span>
            <span className="tr-tile__t">Order parts</span>
            <span className="tr-tile__s">
              {low.length
                ? list(low.map((l) => l.item))
                : openOrders.length
                  ? `${openOrders.length} ${openOrders.length === 1 ? "order" : "orders"} with the office`
                  : stockSheets[0] ? "Nothing low on the last count" : "No stock count yet"}
            </span>
          </span>
        </Link>

        <Link href={hrefs.tools} className="tr-tile tr-tile--big">
          <span className={`tr-tile__ic ${broken.length ? "tr-tile__ic--bad" : "tr-tile__ic--warn"}`}><Ic n="wrench" /></span>
          {(broken.length > 0 || due.length > 0) && (
            <span className="tr-tile__badge">
              <span className={`tr-chip ${broken.length ? "tr-chip--bad" : "tr-chip--warn"}`}>{broken.length ? `${broken.length} broken` : `${due.length} due`}</span>
            </span>
          )}
          <span>
            <span className="tr-tile__t">Tools &amp; gear</span>
            <span className="tr-tile__s">
              {tools == null
                ? "The register can't be read right now"
                : tools.length === 0
                  ? you ? "The office hasn't put this van's tools on yet" : "Nothing on the register yet — add the van's tools"
                  : asked.length || due.length
                    ? [...asked.map(({ t }) => t.name), ...due.filter(({ t }) => !t.request).map(({ t }) => `${t.name} ${(t.nextDue || "due").toLowerCase()} ${t.nextDueOn ? shortDate(t.nextDueOn) : ""}`.trim())].slice(0, 2).join(" · ")
                    : `${tools.length} on the van, nothing due`}
            </span>
          </span>
        </Link>
      </div>

      <Link href={hrefs.stock} className="tr-card tr-row" style={{ padding: "14px 22px" }}>
        <span className="tr-row__ic tr-row__ic--grey"><Ic n="box" /></span>
        <span className="tr-row__k">
          <strong style={{ fontFamily: "var(--f-display)", fontSize: 21 }}>Factory stock</strong>
          <span>{you ? "See what's on the shelf, and log what you take" : "What's on the shelf, and who took what"}</span>
        </span>
        {factoryLow != null && factoryLow > 0 && <span className="tr-chip tr-chip--warn">{factoryLow} low</span>}
        <span className="tr-row__go"><Ic n="chevron" size={18} /></span>
      </Link>
    </>
  );
}
