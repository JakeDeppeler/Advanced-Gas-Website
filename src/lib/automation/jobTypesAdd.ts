import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { stFetch, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { logAuto, type AutoEntry } from "./log";

/**
 * The job types the 13 Nov review found missing, added to ServiceTitan (Jake,
 * 15 Nov: "all of the missing service, can we add these?"). Each copies its
 * visit length, priority, default tags and custom fields from the type nearest
 * it, so it books and dispatches like its neighbours.
 *
 * Once each, ever: a type made is recorded here, and one the office has since
 * switched off is never made again. The list ServiceTitan returns is active
 * types only, so "not there" can't be taken to mean "never made".
 *
 * No Rebates tag on any of them: it rides only on heat pump installs, and on a
 * water filter or a rangehood it would put "Not On Alitsy" on the job too.
 */
const ADDED = "job_types_added";

const WANTED: { name: string; like: string }[] = [
  { name: "Installation - Water Filtration", like: "Installation - Gas Cooktop" },
  { name: "Service - Water Filtration", like: "Service - Split System" },
  { name: "Installation - Rangehood / Kitchen Appliance", like: "Installation - Gas Cooktop" },
  { name: "Diagnostics - Plumbing", like: "Diagnostics - Water Leak" },
  { name: "Repair - Plumbing", like: "Repair - Gas Line" },
  { name: "Service - Heat Pump", like: "Service - Split System" },
  { name: "Installation - Gas Space Heater / Log Fire", like: "Installation - Gas Storage Hot Water" },
  { name: "Installation - Electric Hot Water", like: "Installation - Gas Storage Hot Water" },
  { name: "Repair - RAC", like: "Repair - Split System" },
  { name: "Repair - Add-on Cooling", like: "Repair - Split System" },
  { name: "Service - Add-on Cooling", like: "Service - Split System" },
  { name: "Diagnostics - Pool / Spa Heater", like: "Diagnostics - Heat Pump" },
  { name: "Repair - Pool / Spa Heater", like: "Repair - Gas Line" },
  { name: "Service - Pool / Spa Heater", like: "Service - Gas Ducted Heater" },
  // Jake, 15 Nov: "we don't install gas logs, we will repair them though".
  { name: "Repair - Gas Space Heater / Log Fire", like: "Repair - Gas Heater" },
];

/**
 * Made on the 15th and not wanted after all (Jake, 15 Nov: "remove the water
 * filtration, we don't install gas log"). Switched off once, not deleted:
 * ServiceTitan keeps job types, and a switched-off one can be turned back on.
 */
const SWITCH_OFF = ["Installation - Water Filtration", "Service - Water Filtration", "Installation - Gas Space Heater / Log Fire"];

type TypeRow = { id: number; name: string | null; active: boolean | null; raw: Record<string, unknown> | null };
const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export async function addMissingJobTypes(): Promise<{ made: string[]; failed: string[]; switchedOff?: string[]; skipped?: string }> {
  const saved = await getSettings<{ names?: Record<string, number | string>; fails?: Record<string, number>; off?: Record<string, string> }>(ADDED).catch(() => null);
  const done = saved?.names ?? {};
  const fails = saved?.fails ?? {};
  const off = saved?.off ?? {};
  // A refusal three times over is ServiceTitan's answer, not a hiccup: left
  // for a person, and not tried again every ten minutes.
  const todo = WANTED.filter((w) => !(w.name in done) && (fails[w.name] ?? 0) < 3);
  const offTodo = SWITCH_OFF.filter((n) => typeof done[n] === "number" && !(n in off) && (fails[`off:${n}`] ?? 0) < 3);
  if (!todo.length && !offTodo.length) return { made: [], failed: [], skipped: "all done" };

  const types = await sbSelect<TypeRow>("st_job_types", q.select("id,name,active,raw"));
  const byName = new Map(types.filter((t) => t.name).map((t) => [key(t.name as string), t]));
  const rebateTags = new Set((await sbSelect<{ id: number; name: string | null }>("st_job_tags", q.select("id,name")).catch(() => []))
    .filter((t) => /^rebates?\b/i.test((t.name ?? "").trim())).map((t) => Number(t.id)));

  const made: string[] = [], failed: string[] = [], log: AutoEntry[] = [];
  const at = () => new Date().toISOString();
  for (const w of todo) {
    const have = byName.get(key(w.name));
    if (have) {
      // Already there (made by hand meanwhile): recorded, not made twice.
      done[w.name] = have.id;
      continue;
    }
    const like = byName.get(key(w.like))?.raw ?? {};
    const pick = <T,>(k: string, d: T): T => (like[k] ?? d) as T;
    const body = {
      name: w.name,
      businessUnitIds: pick<number[]>("businessUnitIds", []),
      skills: pick<string[]>("skills", []),
      tagTypeIds: pick<number[]>("tagTypeIds", []).filter((id) => !rebateTags.has(Number(id))),
      priority: pick<string>("priority", "Normal"),
      duration: pick<number>("duration", 3600),
      soldThreshold: pick<number>("soldThreshold", 0),
      noCharge: false,
      enforceRecurringServiceEventSelection: false,
      invoiceSignaturesRequired: pick<boolean>("invoiceSignaturesRequired", false),
      customFieldTypeIds: pick<number[]>("customFieldTypeIds", []),
    };
    try {
      const reply = await stSend<{ id?: number } | null>("POST", stTenantPath("jpm", "job-types"), body);
      if (!reply?.id) throw new Error("ServiceTitan answered without the new type's id");
      done[w.name] = reply.id;
      made.push(w.name);
      log.push({ at: at(), kind: "jobTypes", ok: true, title: `Job type "${w.name}" added to ServiceTitan`, detail: `Set up like "${w.like}".` });
    } catch (e) {
      failed.push(w.name);
      fails[w.name] = (fails[w.name] ?? 0) + 1;
      log.push({ at: at(), kind: "jobTypes", ok: false, title: `Job type "${w.name}" couldn't be added`, detail: (e as Error).message.slice(0, 200) });
    }
  }
  const switchedOff: string[] = [];
  for (const n of offTodo) {
    const id = done[n] as number;
    try {
      await stSend("PATCH", stTenantPath("jpm", `job-types/${id}`), { active: false });
      // Read back: ServiceTitan can answer OK and keep a field as it was.
      const back = await stFetch<{ active?: boolean }>(stTenantPath("jpm", `job-types/${id}`));
      if (back.active !== false) throw new Error("ServiceTitan answered OK but kept it switched on: switch it off in Settings › Job Types");
      off[n] = at();
      switchedOff.push(n);
      log.push({ at: at(), kind: "jobTypes", ok: true, title: `Job type "${n}" switched off in ServiceTitan` });
    } catch (e) {
      failed.push(n);
      fails[`off:${n}`] = (fails[`off:${n}`] ?? 0) + 1;
      log.push({ at: at(), kind: "jobTypes", ok: false, title: `Job type "${n}" couldn't be switched off`, detail: (e as Error).message.slice(0, 200) });
    }
  }
  await saveSettings(ADDED, { names: done, fails, off });
  await logAuto(log).catch(() => undefined);
  return { made, failed, switchedOff };
}
