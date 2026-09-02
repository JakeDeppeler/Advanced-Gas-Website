"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can, isRole, overridesFrom, type Cap, type Role } from "@/lib/portal/caps";
import { createUser, updateUser, deleteUser } from "@/lib/portal/db";
import { isOwner } from "@/lib/portal/team";

export type ActionResult = { ok: boolean; error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireManager() {
  const me = await getPortalUser();
  if (!me || !can(me, "manage_users")) return null;
  return me;
}

export async function addMember(input: { email: string; name: string; role: string }): Promise<ActionResult> {
  const me = await requireManager();
  if (!me) return { ok: false, error: "Not allowed." };

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const role = input.role;
  if (!EMAIL_RE.test(email)) return { ok: false, error: "That doesn't look like an email address." };
  if (!name) return { ok: false, error: "Give them a name." };
  if (!isRole(role)) return { ok: false, error: "Pick a role." };

  const res = await createUser({ email, name, role, invitedBy: me.email });
  if (!res.ok) {
    if (res.error === "exists") return { ok: false, error: "Someone with that email is already on the list." };
    if (res.error === "not-configured") return { ok: false, error: "The database isn't connected yet — see the note above." };
    return { ok: false, error: "Couldn't add them. Try again." };
  }
  revalidatePath("/portal/admin/team");
  return { ok: true };
}

export async function updateMember(input: {
  id: string;
  email: string;
  role: string;
  caps: Record<Cap, boolean>;
  active: boolean;
}): Promise<ActionResult> {
  const me = await requireManager();
  if (!me) return { ok: false, error: "Not allowed." };

  const { id, email } = input;
  if (!id) return { ok: false, error: "Missing user." };
  if (!isRole(input.role)) return { ok: false, error: "Pick a role." };

  const owner = isOwner(email);
  const role: Role = owner ? "admin" : input.role;
  // An owner is always an active admin; nobody can lock themselves out here.
  const active = owner || email === me.email ? true : input.active;
  const caps = overridesFrom(role, input.caps);

  const res = await updateUser(id, { role, caps, active });
  if (!res.ok) {
    if (res.error === "not-configured") return { ok: false, error: "The database isn't connected yet." };
    return { ok: false, error: "Couldn't save. Try again." };
  }
  revalidatePath("/portal/admin/team");
  return { ok: true };
}

export async function removeMember(input: { id: string; email: string }): Promise<ActionResult> {
  const me = await requireManager();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!input.id) return { ok: false, error: "Missing user." };
  if (isOwner(input.email)) return { ok: false, error: "The owner can't be removed." };
  if (input.email.trim().toLowerCase() === me.email) return { ok: false, error: "You can't remove yourself." };

  const res = await deleteUser(input.id);
  if (!res.ok) return { ok: false, error: "Couldn't remove them. Try again." };
  revalidatePath("/portal/admin/team");
  return { ok: true };
}
