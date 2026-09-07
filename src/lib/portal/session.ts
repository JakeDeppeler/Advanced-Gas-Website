/**
 * Portal sessions and the magic-link tokens that create them.
 *
 * Two token types, both signed with PORTAL_AUTH_SECRET via ./token:
 *   - a "magic" token (15 min) that goes in the emailed sign-in link, and
 *   - a "session" token (30 days) stored in an httpOnly cookie.
 *
 * The session cookie carries only identity (email + display name). The
 * live role and capabilities are looked up from the database on every
 * request via resolveUser, so changing someone's access — or switching
 * them off — takes effect on their next page load, cookie or not.
 */

import { cookies } from "next/headers";
import { sign, verify } from "./token";
import { resolveUser } from "./db";
import { SESSION_COOKIE, VIEW_AS_COOKIE } from "./constants";
import { can, CAPS_LIST, type Cap, type CapMap, type PortalUser } from "./caps";
import { getAccessMap } from "./db";
import { isCrewLevel } from "./crew";

export { SESSION_COOKIE };
export type { PortalUser };

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAGIC_TTL_MS = 15 * 60 * 1000; // 15 minutes

function secret(): string | null {
  return process.env.PORTAL_AUTH_SECRET || null;
}

export async function createMagicToken(email: string): Promise<string | null> {
  const s = secret();
  if (!s) return null;
  return sign({ email: email.toLowerCase(), t: "magic", exp: Date.now() + MAGIC_TTL_MS }, s);
}

export async function readMagicToken(token: string): Promise<string | null> {
  const s = secret();
  if (!s) return null;
  const p = await verify<{ email: string; t: string }>(token, s);
  if (!p || p.t !== "magic" || !p.email) return null;
  return String(p.email).toLowerCase();
}

export async function createSessionValue(identity: { email: string; name: string }): Promise<string | null> {
  const s = secret();
  if (!s) return null;
  return sign(
    { email: identity.email.toLowerCase(), name: identity.name, t: "session", exp: Date.now() + SESSION_TTL_MS },
    s,
  );
}

/** Current signed-in team member with fresh role + caps from the database. */
export async function getPortalUser(): Promise<PortalUser | null> {
  const value = cookies().get(SESSION_COOKIE)?.value;
  if (!value) return null;
  const s = secret();
  if (!s) return null;
  const p = await verify<{ email?: string; t?: string }>(value, s);
  if (!p || p.t !== "session" || !p.email) return null;
  const real = await resolveUser(String(p.email));
  return real ? applyPreview(real) : null;
}

/**
 * An admin previewing the portal as a tradesman, an apprentice, the office.
 *
 * Downgrade only: each previewed capability is ANDed with the real one, so the
 * cookie can never hand anyone access they did not already have. While it is on
 * the reduced caps are the real ones for every check on the server too — an
 * admin looking through an apprentice's eyes genuinely cannot save an
 * apprentice's page, which is the honest way for a preview to behave.
 */
async function applyPreview(real: PortalUser): Promise<PortalUser> {
  const level = cookies().get(VIEW_AS_COOKIE)?.value;
  if (!level || !isCrewLevel(level) || !can(real, "manage_users")) return real;

  const allowed = (await getAccessMap())[level] ?? [];
  const caps: CapMap = {};
  for (const c of CAPS_LIST) caps[c] = can(real, c) && allowed.includes(c);
  return { ...real, caps, role: "member", viewingAs: level };
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: Math.floor(SESSION_TTL_MS / 1000),
};
