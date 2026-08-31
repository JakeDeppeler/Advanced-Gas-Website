/**
 * Who can get into the team portal, and who's an admin.
 *
 * This is the allow-list: only these email addresses can request a magic
 * link, and only `role: "admin"` unlocks the admin area (overhead tool,
 * managing content). To add a team member, add a line here — or set the
 * PORTAL_TEAM / PORTAL_ADMINS env vars (comma-separated emails) which are
 * merged in on top, so you can add people without a code change.
 *
 * Keep it lowercase; lookups are case-insensitive.
 */

export type Role = "member" | "admin";

export type TeamMember = {
  email: string;
  name: string;
  role: Role;
};

const BASE_TEAM: TeamMember[] = [
  { email: "jake@trusttrade.au", name: "Jake Deppeler", role: "admin" },
  // Add the rest of the crew here, e.g.:
  // { email: "sam@advancedgas.com.au", name: "Sam", role: "member" },
];

function envEmails(key: string): string[] {
  return (process.env[key] ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** The full team = the code list plus anyone added via env vars. */
export function team(): TeamMember[] {
  const map = new Map<string, TeamMember>();
  for (const m of BASE_TEAM) map.set(m.email.toLowerCase(), { ...m, email: m.email.toLowerCase() });
  for (const e of envEmails("PORTAL_TEAM")) {
    if (!map.has(e)) map.set(e, { email: e, name: e.split("@")[0], role: "member" });
  }
  for (const e of envEmails("PORTAL_ADMINS")) {
    const existing = map.get(e);
    if (existing) existing.role = "admin";
    else map.set(e, { email: e, name: e.split("@")[0], role: "admin" });
  }
  return [...map.values()];
}

export function findMember(email: string): TeamMember | undefined {
  const e = email.trim().toLowerCase();
  return team().find((m) => m.email === e);
}

export function isTeam(email: string): boolean {
  return !!findMember(email);
}
