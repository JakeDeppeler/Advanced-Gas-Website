import "server-only";
import { q, sbDelete, sbInsert, sbSelect } from "@/lib/dashboard/db";

export type Licence = { id: string; userId: string; name: string; number: string | null; expiresOn: string | null };
type Row = { id: string; user_id: string; name: string; number: string | null; expires_on: string | null };
const toLicence = (r: Row): Licence => ({ id: r.id, userId: r.user_id, name: r.name, number: r.number, expiresOn: r.expires_on });

/** One person's, or everyone's when no id is given; soonest to run out first, the ones that don't run out last. */
export async function listLicences(userId?: string): Promise<Licence[]> {
  const rows = await sbSelect<Row>("portal_licences", [
    q.select("id,user_id,name,number,expires_on"), userId ? q.eq("user_id", userId) : "", "order=expires_on.asc.nullslast,name.asc",
  ].filter(Boolean).join("&")).catch(() => []);
  // Sorted here as well as asked for: soonest first, the ones that never run out last.
  return rows.map(toLicence).sort((a, b) => (a.expiresOn ?? "9999").localeCompare(b.expiresOn ?? "9999") || a.name.localeCompare(b.name));
}

export async function addLicence(input: { userId: string; name: string; number: string | null; expiresOn: string | null; by: string }) {
  await sbInsert("portal_licences", { user_id: input.userId, name: input.name, number: input.number, expires_on: input.expiresOn, created_by: input.by });
}

export async function removeLicence(id: string) {
  await sbDelete("portal_licences", q.eq("id", id));
}

/** Good, due within 60 days, or run out — in words as well as colour. */
export function licenceState(expiresOn: string | null, today: string): { k: "good" | "mid" | "bad" | "none"; w: string; days: number | null } {
  if (!expiresOn) return { k: "none", w: "Doesn’t expire", days: null };
  const days = Math.round((Date.parse(`${expiresOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (days < 0) return { k: "bad", w: "Run out", days };
  if (days <= 60) return { k: "mid", w: `${days} days left`, days };
  return { k: "good", w: "Current", days };
}
