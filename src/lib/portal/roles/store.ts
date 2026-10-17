import "server-only";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { SEED_ROLES } from "./seed";
import type { Role, RolesState } from "./types";

const KEY = "roles";

/** The roles and who's in them. Until something is saved, the roles from the expectations document. */
export async function loadRoles(): Promise<RolesState> {
  const saved = await getSettings<Partial<RolesState>>(KEY).catch(() => null);
  return {
    roles: Array.isArray(saved?.roles) && saved.roles.length ? (saved.roles as Role[]) : SEED_ROLES,
    assign: saved?.assign && typeof saved.assign === "object" ? saved.assign : {},
  };
}

export async function saveRoles(state: RolesState): Promise<{ ok: boolean }> {
  return saveSettings(KEY, state);
}
