import "server-only";
import { stFetch, stList, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { logAuto, type AutoEntry } from "@/lib/automation/log";
import { BASIC_PREMIUM, evapProposals } from "./evapProposalSpecs";

/**
 * The evap proposals (evapProposalSpecs.ts) made in ServiceTitan, on the
 * templates quoteTemplatesAdd.ts made, after each sync until all are in. One
 * already there by name (made by hand meanwhile) is taken as made. Three
 * refusals stop it for a person to look at.
 */
const KEY = "evap_proposals";
type Raw = Record<string, unknown>;
type Progress = { made?: Record<string, number>; fails?: number; notes?: Record<string, string> };

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export async function addEvapProposals(until: number): Promise<{ made: string[]; failed: string[]; left: number }> {
  const specs = evapProposals();
  const p: Progress = (await getSettings<Progress>(KEY).catch(() => null)) ?? {};
  const made = (p.made ??= {}), notes = (p.notes ??= {});
  const todo = specs.filter((s) => !made[s.key]);
  const out = { made: [] as string[], failed: [] as string[], left: todo.length };
  if (!todo.length || (p.fails ?? 0) >= 3) return out;
  const log: AutoEntry[] = [];

  const templates = (await getSettings<{ templates?: Record<string, number> }>("quote_templates_added").catch(() => null))?.templates ?? {};
  const existing = new Map((await stList<Raw>("sales", "proposal-templates", {}, 5).catch(() => [] as Raw[]))
    .map((t) => [norm(t.name), Number(t.id)] as const));

  for (const s of todo) {
    if (Date.now() > until) break;
    const there = existing.get(norm(s.name));
    if (there) { made[s.key] = there; continue; }
    const missing = s.options.filter((o) => !templates[o.templateCode]).map((o) => o.templateName);
    if (missing.length) { notes[s.key] = `waiting on ${missing.join(", ")}`; continue; }
    try {
      const created = await stSend<Raw | null>("POST", stTenantPath("sales", "proposal-templates"), {
        name: s.name, description: "", proposalTypeId: BASIC_PREMIUM.typeId, active: true, status: "Publish", businessUnitIds: [],
        options: s.options.map((o) => ({ order: o.order, estimateTemplateId: templates[o.templateCode], proposalTypeOptionId: BASIC_PREMIUM.optionIds[o.order] })),
      });
      const id = Number(created?.id);
      if (!id) throw new Error("ServiceTitan answered without the new proposal's id");
      made[s.key] = id;
      out.made.push(s.name);
      await saveSettings(KEY, p);
      const back = await stFetch<Raw>(stTenantPath("sales", `proposal-templates/${id}`)).catch(() => null);
      const opts = Array.isArray(back?.options) ? back.options.length : null;
      if (opts == null) notes[s.key] = "made, couldn't be read back";
      else if (opts !== s.options.length) notes[s.key] = `made with ${opts} of ${s.options.length} options`;
      else delete notes[s.key];
    } catch (e) {
      p.fails = (p.fails ?? 0) + 1;
      out.failed.push(s.name);
      log.push({ at: new Date().toISOString(), kind: "quoteTemplates", ok: false, title: `Proposal "${s.name}" couldn't be made`, detail: (e as Error).message.slice(0, 300) });
      break;
    }
  }
  out.left = specs.filter((s) => !made[s.key]).length;
  if (out.made.length) log.push({ at: new Date().toISOString(), kind: "quoteTemplates", ok: true, title: `${out.made.length} evap proposal${out.made.length === 1 ? "" : "s"} added to ServiceTitan`, detail: out.left ? `${out.left} to go` : undefined });
  await saveSettings(KEY, p);
  await logAuto(log).catch(() => undefined);
  return out;
}
