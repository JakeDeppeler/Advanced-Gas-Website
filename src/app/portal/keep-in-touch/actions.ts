"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { meOf, seesAll, teamPeople, todayMelbourne } from "@/lib/todos/store";
import { createContact, getContact, logTouch, removeContact, updateContact, type ContactInput } from "@/lib/contacts/store";
import { CADENCES, HOWS, KINDS } from "@/lib/contacts/types";

export type ContactResult = { ok: boolean; error?: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

/** The office works this list; anyone else is turned away here as well as on the page. */
async function office() {
  const user = await getPortalUser();
  if (!user || !(await seesAll(user))) return null;
  const me = await meOf(user);
  return me ? { user, me } : null;
}

async function checked(input: ContactInput): Promise<string | null> {
  if (!input.name?.trim()) return "Give them a name.";
  if (!CADENCES.some((c) => c.key === input.cadence)) return "Pick how often.";
  if (input.kind && !KINDS.some((k) => k.key === input.kind)) return "Pick what they are.";
  if (input.email?.trim() && !EMAIL.test(input.email.trim())) return "That email doesn't look right.";
  if (input.ownerId && !(await teamPeople()).some((p) => p.id === input.ownerId)) return "That person isn't on the team list.";
  return null;
}

export async function addContact(input: ContactInput & { lastOn?: string }): Promise<ContactResult> {
  const w = await office();
  if (!w) return { ok: false, error: "Only the office can add to this list." };
  const bad = await checked(input);
  if (bad) return { ok: false, error: bad };
  if (input.lastOn && (!ISO.test(input.lastOn) || input.lastOn > todayMelbourne())) return { ok: false, error: "The last time you spoke can't be in the future." };
  try {
    await createContact({ ...input, by: w.me });
  } catch {
    return { ok: false, error: "Couldn't save them. Try again." };
  }
  revalidatePath("/portal/keep-in-touch");
  return { ok: true };
}

export async function editContact(id: string, input: ContactInput): Promise<ContactResult> {
  const w = await office();
  if (!w) return { ok: false, error: "Only the office can change this list." };
  if (!(await getContact(id))) return { ok: false, error: "They've been taken off the list." };
  const bad = await checked(input);
  if (bad) return { ok: false, error: bad };
  try {
    await updateContact(id, input);
  } catch {
    return { ok: false, error: "Couldn't save that. Try again." };
  }
  revalidatePath("/portal/keep-in-touch");
  return { ok: true };
}

/** "Reached out": a call, a text, a visit — dated, with a note if there's one worth keeping. */
export async function reachedOut(id: string, input: { on: string; how: string; note?: string }): Promise<ContactResult> {
  const w = await office();
  if (!w) return { ok: false, error: "Only the office can log this." };
  const c = await getContact(id);
  if (!c) return { ok: false, error: "They've been taken off the list." };
  if (!ISO.test(input.on ?? "") || input.on > todayMelbourne()) return { ok: false, error: "Pick the day — today or before." };
  if (!HOWS.some((h) => h.key === input.how)) return { ok: false, error: "Pick how you got in touch." };
  try {
    await logTouch(c, { on: input.on, how: input.how, note: input.note, by: w.me });
  } catch {
    return { ok: false, error: "Couldn't save that. Try again." };
  }
  revalidatePath("/portal/keep-in-touch");
  return { ok: true };
}

export async function dropContact(id: string): Promise<ContactResult> {
  const w = await office();
  if (!w) return { ok: false, error: "Only the office can change this list." };
  try {
    await removeContact(id);
  } catch {
    return { ok: false, error: "Couldn't remove them. Try again." };
  }
  revalidatePath("/portal/keep-in-touch");
  return { ok: true };
}
