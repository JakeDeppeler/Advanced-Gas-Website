"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can, CAPS, type Cap } from "@/lib/portal/caps";
import { saveAccessMap } from "@/lib/portal/db";
import { CREW_LEVELS, type AccessMap } from "@/lib/portal/crew";

export type ActionResult = { ok: boolean; error?: string };

export async function saveAccess(map: Record<string, string[]>): Promise<ActionResult> {
  const me = await getPortalUser();
  if (!me || !can(me, "manage_users")) return { ok: false, error: "Only an admin can change access." };

  // Only known levels and known capabilities get through.
  const capKeys = CAPS.map((c) => c.key) as string[];
  const clean = {} as AccessMap;
  for (const l of CREW_LEVELS) clean[l.key] = ((map[l.key] ?? []).filter((c) => capKeys.includes(c)) as Cap[]);

  const res = await saveAccessMap(clean);
  if (!res.ok) return { ok: false, error: res.error === "not-configured" ? "Database not connected." : "Couldn't save." };
  revalidatePath("/portal/admin/access");
  return { ok: true };
}
