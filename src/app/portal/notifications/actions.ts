"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { markAllSeen } from "@/lib/portal/notices";

export async function markAllRead(): Promise<{ ok: boolean }> {
  const me = await getPortalUser();
  if (!me) return { ok: false };
  const res = await markAllSeen(me);
  // The bell is on every page, so every page's copy of it is out of date.
  revalidatePath("/portal", "layout");
  revalidatePath("/trade", "layout");
  return res;
}
