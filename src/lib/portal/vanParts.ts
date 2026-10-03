/**
 * The shapes the van screens share between the server and the browser — the
 * report statuses, the tool register's arithmetic, a parts order — and the
 * words each one is shown with.
 *
 * Pure: no database, no `server-only`, so the client forms can import the same
 * labels the server pages print and the two can't drift.
 */

export type ReportKind = "service" | "damage";
/** Null on every report written before statuses existed — read as "logged". */
export type ReportStatus = "open" | "booked" | "quote" | "fixed" | null;

export type VanReport = {
  id: string;
  vehicleId: string;
  kind: ReportKind;
  on: string;
  title: string;
  detail: string | null;
  status: ReportStatus;
  statusNote: string | null;
  area: string | null;
  drivable: boolean | null;
  thirdParty: boolean | null;
  source: string | null;
  createdBy: string | null;
  createdAt: string;
};

export const REPORT_STATUS: { k: Exclude<ReportStatus, null>; label: string; tone: "info" | "warn" | "good" }[] = [
  { k: "open", label: "With the office", tone: "info" },
  { k: "booked", label: "Booked in", tone: "warn" },
  { k: "quote", label: "Getting a quote", tone: "warn" },
  { k: "fixed", label: "Fixed", tone: "good" },
];

/** The chip a report wears. A booking carries its own words — "Booked 14 Oct". */
export function reportChip(r: Pick<VanReport, "status" | "statusNote">): { label: string; tone: "info" | "warn" | "good" | "plain" } {
  if (!r.status) return { label: "Logged", tone: "plain" };
  const s = REPORT_STATUS.find((x) => x.k === r.status)!;
  return { label: r.statusNote ? `${s.label} · ${r.statusNote}` : s.label, tone: s.tone };
}

/** Still waiting on somebody. A legacy row with no status is not counted. */
export const isOpenReport = (r: Pick<VanReport, "status">) => r.status === "open" || r.status === "booked" || r.status === "quote";

export const VAN_AREAS = ["Front", "Back", "Driver side", "Passenger side", "Roof & racks", "Inside"];

export const SERVICE_WHAT = ["Due for a service", "Warning light on", "Tyres", "Brakes", "Noise or vibration", "Something else"];

/* ---------------------------------------------------------------- parts */

export type PartLine = { item: string; qty: number };
export type PartStatus = "requested" | "ordered" | "ready" | "done" | "cancelled";

export type PartOrder = {
  id: string;
  vehicleId: string | null;
  requestedBy: string | null;
  forWhat: "van" | "job";
  job: string | null;
  lines: PartLine[];
  deliver: "factory" | "pickup";
  neededBy: "today" | "tomorrow" | "week";
  note: string | null;
  status: PartStatus;
  statusNote: string | null;
  createdAt: string;
};

export const PART_STATUS: { k: PartStatus; label: string; tone: "info" | "warn" | "good" | "plain" }[] = [
  { k: "requested", label: "Asked for", tone: "info" },
  { k: "ordered", label: "Ordered", tone: "warn" },
  { k: "ready", label: "Ready to collect", tone: "good" },
  { k: "done", label: "Done", tone: "plain" },
  { k: "cancelled", label: "Cancelled", tone: "plain" },
];

export const partChip = (o: Pick<PartOrder, "status" | "statusNote">) => {
  const s = PART_STATUS.find((x) => x.k === o.status) ?? PART_STATUS[0];
  return { label: o.statusNote ? `${s.label} · ${o.statusNote}` : s.label, tone: s.tone };
};

export const isOpenOrder = (o: Pick<PartOrder, "status">) => o.status === "requested" || o.status === "ordered" || o.status === "ready";

export const NEEDED_BY: { k: PartOrder["neededBy"]; label: string }[] = [
  { k: "today", label: "Today" },
  { k: "tomorrow", label: "Tomorrow" },
  { k: "week", label: "This week" },
];

/* ---------------------------------------------------------------- tools */

export type ToolKind = "refrigeration" | "gas" | "power" | "safety" | "other";
export type ToolRequest = "broken" | "service" | "replace";

export type VanTool = {
  id: string;
  vehicleId: string;
  name: string;
  model: string | null;
  kind: ToolKind;
  boughtOn: string | null;
  lifeYears: number | null;
  lastDoneOn: string | null;
  lastDone: string | null;
  nextDueOn: string | null;
  nextDue: string | null;
  request: ToolRequest | null;
  requestNote: string | null;
  requestedAt: string | null;
  requestedBy: string | null;
  reply: string | null;
};

export const TOOL_KINDS: { k: ToolKind; label: string }[] = [
  { k: "refrigeration", label: "Refrigeration" },
  { k: "gas", label: "Gas" },
  { k: "power", label: "Power tools" },
  { k: "safety", label: "Safety & access" },
  { k: "other", label: "Other" },
];

export const TOOL_REQUEST: { k: ToolRequest; label: string; ask: string }[] = [
  { k: "broken", label: "Broken", ask: "It's broken" },
  { k: "service", label: "Service or tag", ask: "Needs a service or tag" },
  { k: "replace", label: "Replace", ask: "Due for replacing" },
];

const DAY = 86_400_000;

/** Years and months between two ISO dates, as a tech would say it. */
export function ageLabel(fromIso: string, today: Date): string {
  const from = new Date(`${fromIso}T00:00:00Z`);
  let months = (today.getUTCFullYear() - from.getUTCFullYear()) * 12 + (today.getUTCMonth() - from.getUTCMonth());
  if (today.getUTCDate() < from.getUTCDate()) months -= 1;
  months = Math.max(0, months);
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} mth${m === 1 ? "" : "s"}`;
  return m ? `${y} yr${y === 1 ? "" : "s"} ${m} mth${m === 1 ? "" : "s"}` : `${y} yr${y === 1 ? "" : "s"}`;
}

export type ToolState = {
  /** Age over expected life, 0..1+, or null when either is unknown. */
  lifePct: number | null;
  age: string | null;
  /** Within the last sixth of its expected life, or past it. */
  old: boolean;
  /** A service or test-and-tag due inside a month, or overdue. */
  due: boolean;
  overdue: boolean;
  broken: boolean;
};

/**
 * Where a tool is at.
 *
 * "Getting old" is measured against the life the office set for that kind of
 * tool, never a blanket number: a vacuum pump at five years is near the end, a
 * set of benders at five years has barely started.
 */
export function toolState(t: VanTool, today: Date): ToolState {
  const age = t.boughtOn ? ageLabel(t.boughtOn, today) : null;
  const lifePct = t.boughtOn && t.lifeYears && t.lifeYears > 0
    ? (today.getTime() - Date.parse(`${t.boughtOn}T00:00:00Z`)) / (t.lifeYears * 365.25 * DAY)
    : null;
  const dueIn = t.nextDueOn ? (Date.parse(`${t.nextDueOn}T00:00:00Z`) - today.getTime()) / DAY : null;
  return {
    lifePct,
    age,
    old: lifePct != null && lifePct >= 5 / 6,
    due: dueIn != null && dueIn <= 31,
    overdue: dueIn != null && dueIn < 0,
    broken: t.request === "broken",
  };
}

/** The chip on a tool's row: what's been asked, or what the office said back. */
export function toolChip(t: VanTool, s: ToolState): { label: string; tone: "info" | "warn" | "good" | "bad" | "plain" } {
  if (t.request) return { label: t.reply || "With the office", tone: t.reply ? "good" : "info" };
  if (s.overdue) return { label: `${t.nextDue || "Due"} overdue`, tone: "bad" };
  if (s.due) return { label: `${t.nextDue || "Due"} ${shortDate(t.nextDueOn!)}`, tone: "warn" };
  if (s.old) return { label: "Getting old", tone: "warn" };
  return { label: "OK", tone: "good" };
}

export const shortDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "short" });

export const monthYear = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", month: "short", year: "numeric" });
