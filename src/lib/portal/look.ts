import "server-only";
import { cookies } from "next/headers";
import { can, type PortalUser } from "@/lib/portal/caps";

export type Look = "classic" | "neutral";

/**
 * Which look this person sees. The neutral one is being tried before it's
 * signed off, so only an admin can switch to it, and only for their own
 * browser; everyone else keeps the current look. Once approved, the default
 * flips here and the switch can go.
 */
export function currentLook(user: PortalUser): Look {
  if (!can(user, "manage_users")) return "classic";
  return cookies().get("pt_look")?.value === "neutral" ? "neutral" : "classic";
}

/** Who sees the switch. */
export const canTryLook = (user: PortalUser) => can(user, "manage_users");
