import "server-only";
import { loadSwitches } from "@/lib/automation/log";
import { officeIds, teamPeople, todoLists } from "./store";
import type { Person } from "./types";

/**
 * Who a to-do from the trade side lands on: the same people Settings ›
 * Automatic names for the automatic ones, so the office has one place that
 * decides where work goes.
 */
export async function officePerson(kind: "office" | "accounts"): Promise<Person | null> {
  const [sw, people, offIds] = await Promise.all([loadSwitches(), teamPeople(), officeIds()]);
  const office = people.find((p) => p.id === sw.officeTo) ?? people.find((p) => offIds.includes(p.id)) ?? null;
  return kind === "accounts" ? people.find((p) => p.id === sw.accountsTo) ?? office : office;
}

/** The first board list whose name fits, else null (the to-do goes on no list). */
export async function listLike(re: RegExp): Promise<string | null> {
  return (await todoLists().catch(() => [] as string[])).find((l) => re.test(l)) ?? null;
}
