"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { IMPORT_USER, moveCredit } from "@/lib/board/saleCredit";

export type CreditResult = { ok: boolean; error?: string };

/** The same people who run the wall board's remote. */
async function office() {
  const me = await getPortalUser();
  return me && can(me, "overhead") ? me : null;
}

/**
 * Move one job's credit. `to` null puts it back where ServiceTitan has it.
 *
 * Who made the move is kept with it. This changes the leaderboard and therefore
 * the commission on it, so "it has always said that" needs an answer.
 */
export async function setSaleCredit(key: string, to: string | null): Promise<CreditResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  const job = String(key ?? "").trim();
  if (!job) return { ok: false, error: "No job." };
  const name = to == null ? null : String(to).trim();
  if (name === "") return { ok: false, error: "Pick somebody." };
  // The ServiceTitan integration account is not a person to credit work to.
  if (name === IMPORT_USER) return { ok: false, error: "That isn't a person." };

  await moveCredit(job, name, me.name ?? me.email ?? null);
  revalidatePath("/portal/board/credit");
  return { ok: true };
}
