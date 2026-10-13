import type { Vehicle } from "@/lib/portal/db";
import type { Cell } from "@/components/portal/fleetStatus";
import { serviceCell } from "@/components/portal/fleetStatus";
import { vanState } from "@/lib/portal/fleet/vanState";
import { partChip, shortDate } from "@/lib/portal/vanParts";
import { Grid, Group, Pill, Row, Tile, type Status, type Tone } from "@/components/portal/kit/Kit";

const DAY = 86_400_000;
const list = (xs: string[]) => (xs.length <= 2 ? xs.join(" and ") : `${xs.slice(0, 2).join(", ")} and ${xs.length - 2} more`);

/** The fleet table's severities in the kit's words: the word is the signal, the colour agrees. */
export const TONE: Record<Cell["severity"], Tone> = { bad: "bad", warn: "mid", ok: "good", none: "none" };
export const cellSt = (c: Cell): Status => ({ k: TONE[c.severity], w: c.label });

/** The four figures anybody asks about a van, as tiles across the top of its page. */
export async function VanFacts({ van, today, kmCell }: { van: Vehicle; today: Date; kmCell: Cell }) {
  const { week, weekDone, lookAt } = await vanState(van);
  const service = serviceCell(van.odometer, van.nextServiceKm, van.nextServiceDate, today);
  const kmTo = van.nextServiceKm != null && van.odometer != null ? van.nextServiceKm - van.odometer : null;
  const regoDays = van.regoDue ? Math.round((Date.parse(`${van.regoDue}T00:00:00Z`) - today.getTime()) / DAY) : null;
  const regoSt: Status = regoDays == null ? { k: "none", w: "Not set" } : regoDays < 0 ? { k: "bad", w: "Overdue" } : regoDays <= 30 ? { k: "mid", w: "Soon" } : { k: "good", w: "OK" };
  return (
    <Grid cols={4}>
      <Tile label="Odometer" st={cellSt(kmCell)} fig={van.odometer != null ? `${van.odometer.toLocaleString("en-AU")} km` : "—"} frac={null} sub={kmCell.detail} />
      <Tile label="Next service" st={cellSt(service)} fig={van.nextServiceKm != null ? `${van.nextServiceKm.toLocaleString("en-AU")} km` : van.nextServiceDate ? shortDate(van.nextServiceDate) : "Not set"}
        frac={kmTo != null && van.serviceIntervalKm ? 1 - Math.max(0, kmTo) / van.serviceIntervalKm : null} sub={service.detail} />
      <Tile label="Rego due" st={regoSt} fig={van.regoDue ? shortDate(van.regoDue) : "Not set"} frac={null}
        sub={regoDays == null ? "add it on Costs & details" : regoDays < 0 ? `${-regoDays} days ago` : `in ${regoDays} days`} />
      <Tile label="This week’s check" st={weekDone ? { k: "good", w: "Done" } : week.done ? { k: "mid", w: "Part done" } : { k: "bad", w: "Not started" }}
        fig={`${week.done} of ${week.steps.length}`} frac={week.done / Math.max(1, week.steps.length)} sub={lookAt ? `${lookAt} ${lookAt === 1 ? "thing" : "things"} to look at` : "due Monday by 8am"} />
    </Grid>
  );
}

/**
 * The van page's overview, the office's half of the tech's four tiles: each
 * part of the van in a row, how it stands, and the way into its tab.
 */
export async function VanOverview({ van, hrefs, driver }: {
  van: Vehicle;
  hrefs: { check: string; report: string; parts: string; tools: string; stock: string };
  driver: string | null;
}) {
  const { week, weekDone, lookAt, open, stockSheet, low, openOrders, tools, broken, due, asked, factoryLow } = await vanState(van);
  const chip = openOrders[0] ? partChip(openOrders[0]) : null;
  const toolSub = tools == null ? "The register can’t be read right now"
    : tools.length === 0 ? "Nothing on the register yet — add the van’s tools"
      : asked.length || due.length
        ? [...asked.map(({ t }) => t.name), ...due.filter(({ t }) => !t.request).map(({ t }) => `${t.name} ${(t.nextDue || "due").toLowerCase()} ${t.nextDueOn ? shortDate(t.nextDueOn) : ""}`.trim())].slice(0, 2).join(" · ")
        : `${tools.length} on the van, nothing due`;
  return (
    <Group>
      <Row href={hrefs.check} title="Weekly check"
        sub={!week.weekly && week.done === 0 ? `Not started this week${driver ? ` · ${driver}` : ""} · due Monday by 8am`
          : `${weekDone ? "Sent this week" : `${week.done} of ${week.steps.length} steps done`}${lookAt ? ` · ${lookAt} ${lookAt === 1 ? "thing" : "things"} to look at` : ""}`}
        end={<Pill st={weekDone ? { k: "good", w: "Done" } : { k: week.done ? "mid" : "bad", w: `${week.done} of ${week.steps.length}` }} />} />
      <Row href={hrefs.report} title="Damage & service" sub={open.length ? list(open.map((r) => r.title)) : "Nothing open on this van"}
        end={<Pill st={open.length ? { k: "mid", w: `${open.length} open` } : { k: "good", w: "Nothing open" }} />} />
      <Row href={hrefs.parts} title="Order parts"
        sub={low.length ? list(low.map((l) => l.item)) : openOrders.length ? `${openOrders.length} ${openOrders.length === 1 ? "order" : "orders"} with the office` : stockSheet ? "Nothing low on the last count" : "No stock count yet"}
        end={low.length ? <Pill st={{ k: "mid", w: `${low.length} low` }} /> : chip ? <Pill st={{ k: chip.tone === "good" ? "good" : chip.tone === "warn" ? "mid" : "none", w: chip.label }} /> : <Pill st={{ k: "good", w: "Stocked" }} />} />
      <Row href={hrefs.tools} title="Tools & gear" sub={toolSub}
        end={broken.length ? <Pill st={{ k: "bad", w: `${broken.length} broken` }} /> : due.length ? <Pill st={{ k: "mid", w: `${due.length} due` }} /> : tools?.length ? <Pill st={{ k: "good", w: "All good" }} /> : undefined} />
      <Row href={hrefs.stock} title="Factory stock" sub="What’s on the shelf, and who took what"
        end={factoryLow ? <Pill st={{ k: "mid", w: `${factoryLow} low` }} /> : undefined} />
    </Group>
  );
}
