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
import { SESSION_COOKIE } from "./constants";
import type { PortalUser } from "./caps";

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
  return resolveUser(String(p.email));
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: Math.floor(SESSION_TTL_MS / 1000),
};
