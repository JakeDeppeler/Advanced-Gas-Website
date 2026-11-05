"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { getSettings, saveSettings } from "@/lib/portal/db";

export type ResourceLink = { id: string; name: string; url: string; note?: string; by?: string; at?: string };
const KEY = "resource_links";

export async function loadLinks(): Promise<ResourceLink[]> {
  const s = await getSettings<{ items?: ResourceLink[] }>(KEY).catch(() => null);
  return Array.isArray(s?.items) ? s.items : [];
}

async function office() {
  const me = await getPortalUser();
  return me && can(me, "overhead") ? me : null;
}

/** A supplier's website (or their trade login, a price-list page) on Team › Resources. */
export async function addLink(input: { name: string; url: string; note?: string }): Promise<{ ok: boolean; error?: string }> {
  const me = await office();
  if (!me) return { ok: false, error: "Only the office can add links." };
  const name = String(input.name ?? "").trim().slice(0, 80);
  let url = String(input.url ?? "").trim().slice(0, 400);
  if (!name) return { ok: false, error: "Give it a name, e.g. Reece." };
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  // Web addresses only: a link here opens in everyone's browser.
  try { const u = new URL(url); if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) throw new Error(); } catch { return { ok: false, error: "That doesn't read as a web address." }; }
  const cur = await loadLinks();
  const r = await saveSettings(KEY, { items: [...cur, { id: crypto.randomUUID(), name, url, note: String(input.note ?? "").trim().slice(0, 120) || undefined, by: me.name, at: new Date().toISOString() }].slice(0, 200) });
  revalidatePath("/portal/resources");
  return r.ok ? { ok: true } : { ok: false, error: "Couldn't save it." };
}

export async function removeLink(id: string): Promise<{ ok: boolean; error?: string }> {
  const me = await office();
  if (!me) return { ok: false, error: "Only the office can remove links." };
  const r = await saveSettings(KEY, { items: (await loadLinks()).filter((l) => l.id !== id) });
  revalidatePath("/portal/resources");
  return r.ok ? { ok: true } : { ok: false, error: "Couldn't save it." };
}
