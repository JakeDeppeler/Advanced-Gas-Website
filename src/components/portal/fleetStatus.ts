/**
 * What each van needs, at a glance.
 *
 * The fleet page used to be a grid of cards you had to open one at a time to
 * find out anything. The design makes it a table with a state per column, which
 * only works if each state is something the data actually knows — so each one
 * below is derived from a record that exists, and anything we don't record says
 * so rather than guessing.
 *
 * Pure: takes the van, its last weekly check and its last km reading, returns
 * labels. No database, no clock of its own — "today" is passed in, so the
 * boundaries can be checked against real dates.
 */

/** Ordered worst-first, which is also the order the page sorts on. */
export type Severity = "bad" | "warn" | "ok" | "none";

export type Cell = {
  /** The pill. */
  label: string;
  severity: Severity;
  /** The line under it. Never a guess — it says what we know. */
  detail: string;
};

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

const nice = (isoDate: string) =>
  new Date(isoDate + "T00:00:00Z").toLocaleDateString("en-AU", {
    timeZone: "UTC", weekday: "short", day: "numeric", month: "short",
  });

/** The Monday of the week `today` falls in. The weekly check is due Monday morning. */
export function mondayOf(today: Date): Date {
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  // getUTCDay: 0 = Sunday. Monday is the start of the working week here.
  const back = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - back * DAY);
}

/**
 * The weekly clean and photos.
 *
 * Due Monday morning, so a check dated on or after this week's Monday is done
 * and anything older is overdue — there is no partial credit, because the point
 * of the rule is that it happens every week.
 */
export function cleanCell(lastCheckedOn: string | null, today: Date): Cell {
  if (!lastCheckedOn) return { label: "Never done", severity: "bad", detail: "No weekly check recorded" };
  const monday = iso(mondayOf(today));
  if (lastCheckedOn >= monday) return { label: "Done", severity: "ok", detail: nice(lastCheckedOn) };

  const daysLate = Math.round((Date.parse(monday) - Date.parse(lastCheckedOn)) / DAY);
  // On Monday itself the check is due today rather than late — the crew has the
  // morning to do it, and a van flagged red at 7am every Monday is noise.
  if (today.getUTCDay() === 1) return { label: "Due today", severity: "warn", detail: `Last done ${nice(lastCheckedOn)}` };
  return { label: "Overdue", severity: "bad", detail: `Last done ${nice(lastCheckedOn)} · ${daysLate} days` };
}

/**
 * How close the next service is.
 *
 * Km first, because that is what triggers a service; the date is the fallback
 * for a van that barely moves. A van with no interval set isn't "all good" —
 * nobody has said when it is due, which is a different thing and reads as a
 * prompt rather than a tick.
 */
export function serviceCell(
  odometer: number | null,
  nextServiceKm: number | null,
  nextServiceDate: string | null,
  today: Date,
): Cell {
  if (nextServiceKm != null && odometer != null) {
    const togo = nextServiceKm - odometer;
    if (togo <= 0) return { label: "Due now", severity: "bad", detail: `${Math.abs(togo).toLocaleString("en-AU")} km past ${nextServiceKm.toLocaleString("en-AU")} km` };
    if (togo <= 2000) return { label: "Due soon", severity: "warn", detail: `${togo.toLocaleString("en-AU")} km to go` };
    return { label: "All good", severity: "ok", detail: `${togo.toLocaleString("en-AU")} km to next service` };
  }
  if (nextServiceDate) {
    const days = Math.round((Date.parse(nextServiceDate + "T00:00:00Z") - today.getTime()) / DAY);
    if (days < 0) return { label: "Due now", severity: "bad", detail: `Was due ${nice(nextServiceDate)}` };
    if (days <= 21) return { label: "Due soon", severity: "warn", detail: `Due ${nice(nextServiceDate)}` };
    return { label: "All good", severity: "ok", detail: `Due ${nice(nextServiceDate)}` };
  }
  return { label: "Not set", severity: "none", detail: "Set a service interval" };
}

/**
 * How fresh the odometer is.
 *
 * Everything about servicing hangs off the km reading, so a stale one quietly
 * makes the service column wrong too. Fourteen days is a fortnight of work.
 */
export function kmCell(odometer: number | null, lastReadOn: string | null, today: Date): Cell {
  if (odometer == null || !lastReadOn) return { label: "No reading yet", severity: "warn", detail: "Log the first one" };
  const days = Math.round((today.getTime() - Date.parse(lastReadOn + "T00:00:00Z")) / DAY);
  const reading = `${odometer.toLocaleString("en-AU")} km · ${nice(lastReadOn)}`;
  if (days <= 14) return { label: "Up to date", severity: "ok", detail: reading };
  if (days <= 45) return { label: `${days} days old`, severity: "warn", detail: reading };
  return { label: `${days} days old`, severity: "bad", detail: reading };
}

export type VanRow = {
  id: string;
  name: string;
  who: string | null;
  rego: string | null;
  clean: Cell;
  service: Cell;
  km: Cell;
};

const WEIGHT: Record<Severity, number> = { bad: 0, warn: 1, none: 2, ok: 3 };

/** Worst first, so the van that needs something is the one you read. */
export function sortByUrgency(rows: VanRow[]): VanRow[] {
  const worst = (r: VanRow) => Math.min(WEIGHT[r.clean.severity], WEIGHT[r.service.severity], WEIGHT[r.km.severity]);
  return [...rows].sort((a, b) => worst(a) - worst(b) || a.name.localeCompare(b.name));
}

/** The three counts across the top. */
export function fleetAlerts(rows: VanRow[]) {
  return {
    cleanOverdue: rows.filter((r) => r.clean.severity === "bad").length,
    serviceDue: rows.filter((r) => r.service.severity === "bad" || r.service.severity === "warn").length,
    kmStale: rows.filter((r) => r.km.severity !== "ok").length,
  };
}
