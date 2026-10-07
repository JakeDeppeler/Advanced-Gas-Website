/**
 * Future planning: what somebody wants to do for the business — not the day's
 * jobs or quotes, but the things that change how it runs.
 *
 * No due dates and nothing is ever flagged late. A plan sits under when its
 * writer would like to get to it, and moves from an idea to being worked on to
 * done. Shared by the page and the server.
 */

export type Horizon = "month" | "quarter" | "year" | "someday";
export const HORIZONS: Array<{ key: Horizon; label: string; blurb: string }> = [
  { key: "month", label: "This month", blurb: "Getting to it now" },
  { key: "quarter", label: "Next 3 months", blurb: "Before the season turns" },
  { key: "year", label: "This year", blurb: "On the list for the year" },
  { key: "someday", label: "Someday", blurb: "Worth keeping, no date" },
];

export type PlanStatus = "idea" | "doing" | "done";
export const STATUS_LABEL: Record<PlanStatus, string> = { idea: "Idea", doing: "Working on it", done: "Done" };

/** What part of the business it's about. Optional; an unknown key reads as "Other". */
export const AREAS: Array<{ key: string; label: string }> = [
  { key: "growth", label: "Growth" },
  { key: "team", label: "Team & hiring" },
  { key: "marketing", label: "Marketing & brand" },
  { key: "systems", label: "Systems & admin" },
  { key: "vans", label: "Vans & equipment" },
  { key: "money", label: "Money" },
  { key: "premises", label: "Workshop & premises" },
  { key: "me", label: "Me" },
  { key: "other", label: "Other" },
];
export const areaLabel = (k: string | null) => (k ? AREAS.find((a) => a.key === k)?.label ?? "Other" : null);

export type Plan = {
  id: string;
  title: string;
  notes: string | null;
  area: string | null;
  horizon: Horizon;
  status: PlanStatus;
  doneAt: string | null;
  createdAt: string;
};

/** Being worked on first, then ideas, oldest first within each: what's been waiting longest is easiest to see. */
export function byPlan(a: Plan, b: Plan): number {
  const r = (p: Plan) => (p.status === "doing" ? 0 : 1);
  return r(a) - r(b) || (a.createdAt < b.createdAt ? -1 : 1);
}
