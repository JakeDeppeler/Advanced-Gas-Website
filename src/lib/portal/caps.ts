/**
 * Roles and capabilities for the team portal.
 *
 * Everyone signed in can see the everyday stuff — handbook, learning,
 * information, tools. The four capabilities below are the gated bits, and
 * a person gets them in one of two ways:
 *
 *   1. their ROLE's defaults (admin / lead hand / team member), or
 *   2. a per-person OVERRIDE an admin toggles on top (stored in `caps`),
 *      which wins over the role default either way.
 *
 * Pure and dependency-free so the Edge middleware can import it too.
 */

export type Role = "admin" | "lead" | "member";

export type Cap = "overhead" | "manage_users" | "reports_read" | "reports_write";

/** Per-person overrides. Only keys that differ from the role default are stored. */
export type CapMap = Partial<Record<Cap, boolean>>;

export type PortalUser = {
  id?: string;
  email: string;
  name: string;
  role: Role;
  caps: CapMap;
  active: boolean;
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  lead: "Lead hand",
  member: "Team member",
};

export const ROLE_BLURB: Record<Role, string> = {
  admin: "Full access — overhead costing, managing the team, and all reports.",
  lead: "Runs the crew — writes and reads team reports, no overhead costing.",
  member: "Everyday access — handbook, learning, information and tools.",
};

export const ROLES: Role[] = ["member", "lead", "admin"];

export const CAPS: { key: Cap; label: string; desc: string }[] = [
  { key: "overhead", label: "Overhead costing", desc: "See the overhead-cost and charge-out tool." },
  { key: "manage_users", label: "Manage team & access", desc: "Add people and change what each person can see." },
  { key: "reports_read", label: "Read team reports", desc: "Read coaching, performance and handover notes." },
  { key: "reports_write", label: "Write team reports", desc: "Write notes about team members." },
];

const ROLE_DEFAULTS: Record<Role, Record<Cap, boolean>> = {
  admin: { overhead: true, manage_users: true, reports_read: true, reports_write: true },
  lead: { overhead: false, manage_users: false, reports_read: true, reports_write: true },
  member: { overhead: false, manage_users: false, reports_read: false, reports_write: false },
};

export function roleDefault(role: Role, cap: Cap): boolean {
  return ROLE_DEFAULTS[role]?.[cap] ?? false;
}

/** The effective answer for one capability: a per-person override wins, else the role default. */
export function can(user: Pick<PortalUser, "role" | "caps">, cap: Cap): boolean {
  const override = user.caps?.[cap];
  if (typeof override === "boolean") return override;
  return roleDefault(user.role, cap);
}

/** The full effective capability set for a user — handy for the UI. */
export function effectiveCaps(user: Pick<PortalUser, "role" | "caps">): Record<Cap, boolean> {
  return {
    overhead: can(user, "overhead"),
    manage_users: can(user, "manage_users"),
    reports_read: can(user, "reports_read"),
    reports_write: can(user, "reports_write"),
  };
}

/**
 * Turn a set of desired effective values into the minimal override map,
 * relative to a role: only values that differ from the role default are
 * kept, so changing someone's role still moves their defaults with it.
 */
export function overridesFrom(role: Role, desired: Record<Cap, boolean>): CapMap {
  const caps: CapMap = {};
  for (const { key } of CAPS) {
    if (desired[key] !== roleDefault(role, key)) caps[key] = desired[key];
  }
  return caps;
}

export function isRole(v: unknown): v is Role {
  return v === "admin" || v === "lead" || v === "member";
}

/** Report categories — kept in sync with the portal_reports check constraint. */
export const REPORT_CATEGORIES: { key: string; label: string; blurb: string }[] = [
  { key: "note", label: "General note", blurb: "Anything worth the crew knowing." },
  { key: "coaching", label: "Coaching", blurb: "A skill to build on, done well or to work on." },
  { key: "performance", label: "Performance", blurb: "How they're tracking, good or needs a word." },
  { key: "handover", label: "Handover", blurb: "Passing a job or a customer to someone else." },
  { key: "incident", label: "Incident", blurb: "Something that went wrong and how it was handled." },
];

export function categoryLabel(key: string): string {
  return REPORT_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
