/**
 * The owner seed.
 *
 * The team allow-list now lives in the database (portal_users), managed
 * from the admin screen. This file is just the hard-coded fallback so the
 * owner can always get in — even on a fresh deploy, or if the database is
 * unreachable, or if a row got deleted by accident. Anyone here is treated
 * as an admin regardless of what the database says.
 *
 * Keep it lowercase; lookups are case-insensitive.
 */

import type { Role } from "./caps";

export type { Role };

export type SeedMember = { email: string; name: string; role: Role };

const OWNERS: SeedMember[] = [
  { email: "jake@advancedgas.com.au", name: "Jake Deppeler", role: "admin" },
  { email: "jake@trusttrade.au", name: "Jake Deppeler", role: "admin" },
];

/** True for an owner email — always an admin, never locked out. */
export function isOwner(email: string): boolean {
  const e = email.trim().toLowerCase();
  return OWNERS.some((m) => m.email === e);
}

/** The owner seed record for an email, if any. */
export function baseMember(email: string): SeedMember | undefined {
  const e = email.trim().toLowerCase();
  return OWNERS.find((m) => m.email === e);
}
