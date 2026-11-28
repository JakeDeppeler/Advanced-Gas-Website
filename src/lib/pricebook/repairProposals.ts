import "server-only";
import { stFetch, stList, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { logAuto, type AutoEntry } from "@/lib/automation/log";
import { REPAIR_REPLACE_UPGRADE, repairProposals, type TemplateRef } from "./repairProposalSpecs";

/**
 * The Repair, Replace, Upgrade proposals (repairProposalSpecs.ts) made in
 * ServiceTitan after each sync until all are in, as the evap proposals are
 * (evapProposals.ts): one already there by name is taken as made, one whose
 * templates aren't all found waits and says which, and three refusals stop it
 * for a person to look at. Each is recorded the moment it exists, so a run cut
 * off part way never makes it twice.
 */
const KEY = "repair_proposals";
type Raw = Record<string, unknown>;
type Progress = { made?: Record<string, number>; fails?: number; notes?: Record<string, string> };

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export async function addRepairProposals(until: number): Promise<{ made: string[]; failed: string[]; waiting: number; left: number }> {
  const specs = repairProposals();
  const p: Progress = (await getSettings<Progress>(KEY).catch(() => null)) ?? {};
  const made = (p.made ??= {}), notes = (p.notes ??= {});
  const todo = specs.filter((s) => !made[s.key]);
  const out = { made: [] as string[], failed: [] as string[], waiting: 0, left: todo.length };
  if (!todo.length || (p.fails ?? 0) >= 3 || Date.now() > until) return out;
  const log: AutoEntry[] = [];

  const byCode = (await getSettings<{ templates?: Record<string, number> }>("quote_templates_added").catch(() => null))?.templates ?? {};
  const [templates, live] = await Promise.all([
    stList<{ id: number; name?: string }>("sales", "estimate-templates", { active: "True" }, 5),
    stList<Raw>("sales", "proposal-templates", {}, 5).catch(() => [] as Raw[]),
  ]);
  const byName = new Map(templates.map((t) => [norm(t.name), t.id] as const));
  const activeIds = new Set(templates.map((t) => t.id));
  const existing = new Map(live.map((t) => [norm(t.name), Number(t.id)] as const));
  const idOf = (r: TemplateRef) => {
    const id = "code" in r ? byCode[r.code] : byName.get(norm(r.name));
    return id && activeIds.has(id) ? id : undefined;
  };

  for (const s of todo) {
    if (Date.now() > until) break;
    // Made under the key it had before the spec changed: brought up to this one in place.
    const old = s.was ? made[s.was] : undefined;
    if (old) {
      const ids = s.options.map((o) => idOf(o.ref));
      if (ids.some((x) => !x)) { notes[s.key] = "waiting on its templates to take over the old proposal"; out.waiting++; continue; }
      try {
        await stSend("PATCH", stTenantPath("sales", `proposal-templates/${old}`), {
          name: s.name,
          estimateAssignments: s.options.map((o, k) => ({ order: o.order, estimateTemplateId: ids[k], proposalTypeOptionId: REPAIR_REPLACE_UPGRADE.optionIds[o.order] })),
        });
        made[s.key] = old;
        delete made[s.was!];
        out.made.push(`${s.name} (was the one-size proposal)`);
        await saveSettings(KEY, p);
      } catch (e) {
        p.fails = (p.fails ?? 0) + 1;
        out.failed.push(s.name);
        log.push({ at: new Date().toISOString(), kind: "quoteTemplates", ok: false, title: `Proposal "${s.name}" couldn't take over the old one`, detail: (e as Error).message.slice(0, 300) });
        break;
      }
      continue;
    }
    const there = existing.get(norm(s.name));
    if (there) { made[s.key] = there; delete notes[s.key]; continue; }
    const ids = s.options.map((o) => idOf(o.ref));
    const missing = s.options.filter((_, k) => !ids[k]).map((o) => ("code" in o.ref ? o.ref.code : o.ref.name));
    if (missing.length) { notes[s.key] = `waiting on ${missing.join(", ")}`; out.waiting++; continue; }
    try {
      const created = await stSend<Raw | null>("POST", stTenantPath("sales", "proposal-templates"), {
        name: s.name, description: "", proposalTypeId: REPAIR_REPLACE_UPGRADE.typeId, active: true, status: "Publish", businessUnitIds: [],
        estimateAssignments: s.options.map((o, k) => ({ order: o.order, estimateTemplateId: ids[k], proposalTypeOptionId: REPAIR_REPLACE_UPGRADE.optionIds[o.order] })),
      });
      const id = Number(created?.id);
      if (!id) throw new Error("ServiceTitan answered without the new proposal's id");
      made[s.key] = id;
      out.made.push(s.name);
      await saveSettings(KEY, p);
      const back = await stFetch<Raw>(stTenantPath("sales", `proposal-templates/${id}`)).catch(() => null);
      const list = back?.estimateAssignments ?? back?.options;
      const n = Array.isArray(list) ? list.length : null;
      if (n == null) notes[s.key] = "made, couldn't be read back";
      else if (n !== s.options.length) notes[s.key] = `made with ${n} of ${s.options.length} options`;
      else delete notes[s.key];
    } catch (e) {
      p.fails = (p.fails ?? 0) + 1;
      out.failed.push(s.name);
      log.push({ at: new Date().toISOString(), kind: "quoteTemplates", ok: false, title: `Proposal "${s.name}" couldn't be made`, detail: (e as Error).message.slice(0, 300) });
      break;
    }
  }
  out.left = specs.filter((s) => !made[s.key]).length;
  if (out.made.length) log.push({ at: new Date().toISOString(), kind: "quoteTemplates", ok: true, title: `${out.made.length} repair proposal${out.made.length === 1 ? "" : "s"} added to ServiceTitan`, detail: out.left ? `${out.left} to go` : undefined });
  await saveSettings(KEY, p);
  await logAuto(log).catch(() => undefined);
  return out;
}
