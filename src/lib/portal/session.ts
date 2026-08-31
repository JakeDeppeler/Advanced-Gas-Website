/**
 * Portal sessions and the magic-link tokens that create them.
 *
 * Two token types, both signed with PORTAL_AUTH_SECRET via ./token:
 *   - a "magic" token (15 min) that goes in the emailed sign-in link, and
 *   - a "session" token (30 days) stored in an httpOnly cookie.
 *
 * readSessionValue re-checks the team allow-list on every read, so pulling
 * someone out of team.ts logs them out immediately, cookie or not.
 */

import { cookies } from "next/headers";
import { sign, verify } from "./token";
import { findMember, type Role } from "./team";
import { SESSION_COOKIE } from "./constants";

export { SESSION_COOKIE };
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAGIC_TTL_MS = 15 * 60 * 1000; // 15 minutes

export type PortalUser = { email: string; name: string; role: Role };

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

export async function createSessionValue(user: PortalUser): Promise<string | null> {
  const s = secret();
  if (!s) return null;
  return sign(
    { email: user.email, name: user.name, role: user.role, t: "session", exp: Date.now() + SESSION_TTL_MS },
    s,
  );
}

export async function readSessionValue(value: string): Promise<PortalUser | null> {
  const s = secret();
  if (!s) return null;
  const p = await verify<{ email: string; name: string; role: Role; t: string }>(value, s);
  if (!p || p.t !== "session" || !p.email) return null;
  const member = findMember(String(p.email));
  if (!member) return null; // removed from the team → no session
  return { email: member.email, name: member.name, role: member.role };
}

/** Current signed-in team member, or null. For server components / routes. */
export async function getPortalUser(): Promise<PortalUser | null> {
  const value = cookies().get(SESSION_COOKIE)?.value;
  if (!value) return null;
  return readSessionValue(value);
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: Math.floor(SESSION_TTL_MS / 1000),
};
