/**
 * Tiny signed-token helper for the team portal.
 *
 * HMAC-SHA256 over the Web Crypto API so the exact same code runs in the
 * Edge middleware, in Node route handlers and in server components — no npm
 * dependency, and no "works locally, throws on the edge" surprises.
 *
 * A token is `base64url(payload) . base64url(hmac)`. Used for two things:
 *   - the short-lived magic-link token emailed to a team member, and
 *   - the longer-lived session cookie set once they click it.
 * Both are just payloads with an `exp` (epoch ms); verify() rejects an
 * expired or tampered token.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function sign(payload: Record<string, unknown>, secret: string): Promise<string> {
  const body = bytesToB64url(enc.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(body)));
  return `${body}.${bytesToB64url(sig)}`;
}

export async function verify<T = Record<string, unknown>>(
  token: string,
  secret: string,
): Promise<T | null> {
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!body || !sig) return null;
  const key = await hmacKey(secret);
  let ok = false;
  try {
    ok = await crypto.subtle.verify("HMAC", key, b64urlToBytes(sig), enc.encode(body));
  } catch {
    return null;
  }
  if (!ok) return null;
  try {
    const payload = JSON.parse(dec.decode(b64urlToBytes(body))) as { exp?: number };
    if (typeof payload.exp === "number" && Date.now() > payload.exp) return null;
    return payload as T;
  } catch {
    return null;
  }
}
