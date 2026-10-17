"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { loadRoles, saveRoles } from "@/lib/portal/roles/store";
import type { Role } from "@/lib/portal/roles/types";
import { canEditStandards } from "@/lib/portal/standards";

export type RoleResult = { ok: boolean; error?: string; id?: string };

/** Only the owner sets the roles; everyone can read them. */
async function editor() {
  const u = await getPortalUser();
  return u && canEditStandards(u) ? u : null;
}

const lines = (v: unknown) => (Array.isArray(v) ? v : String(v ?? "").split("\n")).map((x) => String(x).trim()).filter(Boolean).slice(0, 40).map((x) => x.slice(0, 300));
const text = (v: unknown, n = 2000) => String(v ?? "").trim().slice(0, n);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "role";

/** Save one role, new or changed. */
export async function saveRole(input: Partial<Role> & { id?: string }): Promise<RoleResult> {
  if (!(await editor())) return { ok: false, error: "Only the owner can change the roles." };
  const name = text(input.name, 80);
  if (!name) return { ok: false, error: "Give the role a name." };
  const state = await loadRoles();
  const id = input.id && state.roles.some((r) => r.id === input.id) ? input.id : (() => {
    let base = slug(name), n = 2, id = base;
    while (state.roles.some((r) => r.id === id)) id = `${base}-${n++}`;
    return id;
  })();
  const role: Role = {
    id, name, tagline: text(input.tagline, 200), reportsTo: text(input.reportsTo, 200), growsInto: text(input.growsInto, 200), manages: text(input.manages, 200),
    intro: text(input.intro), day: lines(input.day), owns: lines(input.owns), notOwns: lines(input.notOwns), measured: lines(input.measured), requires: lines(input.requires),
    moveUp: text(input.moveUp, 600),
  };
  const roles = state.roles.some((r) => r.id === id) ? state.roles.map((r) => (r.id === id ? role : r)) : [...state.roles, role];
  const r = await saveRoles({ ...state, roles });
  if (!r.ok) return { ok: false, error: "Couldn't save the role." };
  revalidatePath("/portal/roles", "layout");
  return { ok: true, id };
}

/** Take a role away; anyone in it is left without one. */
export async function removeRole(id: string): Promise<RoleResult> {
  if (!(await editor())) return { ok: false, error: "Only the owner can change the roles." };
  const state = await loadRoles();
  const assign = Object.fromEntries(Object.entries(state.assign).filter(([, r]) => r !== id));
  const r = await saveRoles({ roles: state.roles.filter((x) => x.id !== id), assign });
  if (!r.ok) return { ok: false, error: "Couldn't remove it." };
  revalidatePath("/portal/roles", "layout");
  return { ok: true };
}

/** Put a person in a role, or take them out of it (role ""). One role each. */
export async function assignRole(personId: string, roleId: string): Promise<RoleResult> {
  if (!(await editor())) return { ok: false, error: "Only the owner can change who's in a role." };
  const state = await loadRoles();
  const assign = { ...state.assign };
  if (roleId && state.roles.some((r) => r.id === roleId)) assign[personId] = roleId;
  else delete assign[personId];
  const r = await saveRoles({ ...state, assign });
  if (!r.ok) return { ok: false, error: "Couldn't save that." };
  revalidatePath("/portal/roles", "layout");
  return { ok: true };
}
