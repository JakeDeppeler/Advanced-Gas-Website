"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { VIEW_AS_COOKIE } from "@/lib/portal/constants";
import { isCrewLevel } from "@/lib/portal/crew";

/**
 * Start previewing the portal as a crew level. Only someone who can manage the
 * team may start one, and the session helper intersects the previewed access
 * with their own, so this can only ever show less than they already had.
 */
export async function startPreview(level: string): Promise<{ ok: boolean; error?: string }> {
  const me = await getPortalUser();
  if (!me || !can(me, "manage_users")) return { ok: false, error: "Only an admin can do that." };
  if (!isCrewLevel(level)) return { ok: false, error: "Unknown level." };
  cookies().set(VIEW_AS_COOKIE, level, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // an hour is plenty, and it can't be left on by accident
  });
  revalidatePath("/portal", "layout");
  return { ok: true };
}

/** Anyone may end a preview — it only ever gives access back. */
export async function endPreview(): Promise<{ ok: boolean }> {
  cookies().delete(VIEW_AS_COOKIE);
  revalidatePath("/portal", "layout");
  return { ok: true };
}
