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
 *
 * A proposal made before the spec gave it another option (the 76s, made with
 * no Advance before Jake chose the F86DS) has the option added, provided every
 * option on it now is one the spec has: one the office has changed is left
 * alone and noted. Checked against the list, since a proposal can't be read
 * back by its id.
 */
const KEY = "evap_proposals";
type Raw = Record<string, unknown>;
type Progress = { made?: Record<string, number>; fails?: number; extended?: Record<string, string>; extendFails?: number; notes?: Record<string, string> };

const optionIds = (t: Raw | undefined) =>
  (Array.isArray(t?.estimateAssignments) ? t!.estimateAssignments as Raw[] : Array.isArray(t?.options) ? t!.options as Raw[] : []).map((o) => Number(o.estimateTemplateId));

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export async function addEvapProposals(until: number): Promise<{ made: string[]; extended: string[]; failed: string[]; left: number }> {
  const specs = evapProposals();
  const p: Progress = (await getSettings<Progress>(KEY).catch(() => null)) ?? {};
  const made = (p.made ??= {}), notes = (p.notes ??= {}), extended = (p.extended ??= {});
  const todo = specs.filter((s) => !made[s.key]);
  const out = { made: [] as string[], extended: [] as string[], failed: [] as string[], left: todo.length };
  const createOn = todo.length > 0 && (p.fails ?? 0) < 3;
  const extendOn = (p.extendFails ?? 0) < 3;
  if (!createOn && !extendOn) return out;
  const log: AutoEntry[] = [];

  const templates = (await getSettings<{ templates?: Record<string, number> }>("quote_templates_added").catch(() => null))?.templates ?? {};
  const assignments = (s: (typeof specs)[number]) =>
    s.options.map((o) => ({ order: o.order, estimateTemplateId: templates[o.templateCode], proposalTypeOptionId: BASIC_PREMIUM.optionIds[o.order] }));
  const live = await stList<Raw>("sales", "proposal-templates", {}, 5).catch(() => null);
  const existing = new Map((live ?? []).map((t) => [norm(t.name), Number(t.id)] as const));
  const liveById = new Map((live ?? []).map((t) => [Number(t.id), t] as const));

  // --- Made before the spec gave them another option ---------------------------------
  const short = extendOn && live ? specs.filter((s) => {
    const id = made[s.key];
    if (!id || !liveById.has(id) || s.options.some((o) => !templates[o.templateCode])) return false;
    const want = new Set(assignments(s).map((a) => a.estimateTemplateId));
    const have = optionIds(liveById.get(id));
    if (have.length >= want.size) return false;
    if (have.some((h) => !want.has(h))) { notes[s.key] = "an option on it isn't one of ours: left as it is"; return false; }
    return true;
  }) : [];
  for (const s of short) {
    if (Date.now() > until) break;
    try {
      await stSend("PATCH", stTenantPath("sales", `proposal-templates/${made[s.key]}`), { estimateAssignments: assignments(s) });
      extended[s.key] = `${s.options.length} options ${new Date().toISOString()}`;
      out.extended.push(s.name);
      await saveSettings(KEY, p);
    } catch (e) {
      p.extendFails = (p.extendFails ?? 0) + 1;
      out.failed.push(s.name);
      log.push({ at: new Date().toISOString(), kind: "quoteTemplates", ok: false, title: `Proposal "${s.name}" couldn't take its new option`, detail: (e as Error).message.slice(0, 300) });
      break;
    }
  }
  if (out.extended.length) {
    // One read of the list for the lot: is each now offering what was sent?
    const back = new Map((await stList<Raw>("sales", "proposal-templates", {}, 5).catch(() => [] as Raw[])).map((t) => [Number(t.id), t] as const));
    for (const s of short.filter((x) => out.extended.includes(x.name))) {
      const have = optionIds(back.get(made[s.key])).sort().join();
      const want = assignments(s).map((a) => a.estimateTemplateId).sort().join();
      if (have === want) delete notes[s.key];
      else { notes[s.key] = `sent ${s.options.length} options, reads back ${have ? have.split(",").length : 0}`; delete extended[s.key]; p.extendFails = (p.extendFails ?? 0) + 1; }
    }
    log.push({ at: new Date().toISOString(), kind: "quoteTemplates", ok: true, title: `${out.extended.length} evap proposal${out.extended.length === 1 ? "" : "s"} given ${out.extended.length === 1 ? "its" : "their"} new option`, detail: out.extended.join(", ") });
  }
  if (!createOn) {
    await saveSettings(KEY, p);
    await logAuto(log).catch(() => undefined);
    return out;
  }

  for (const s of todo) {
    if (Date.now() > until) break;
    const there = existing.get(norm(s.name));
    if (there) { made[s.key] = there; continue; }
    const missing = s.options.filter((o) => !templates[o.templateCode]).map((o) => o.templateName);
    if (missing.length) { notes[s.key] = `waiting on ${missing.join(", ")}`; continue; }
    try {
      const created = await stSend<Raw | null>("POST", stTenantPath("sales", "proposal-templates"), {
        name: s.name, description: "", proposalTypeId: BASIC_PREMIUM.typeId, active: true, status: "Publish", businessUnitIds: [],
        // ServiceTitan's field for the options (400 "Required property 'estimateAssignments'" without it).
        estimateAssignments: assignments(s),
      });
      const id = Number(created?.id);
      if (!id) throw new Error("ServiceTitan answered without the new proposal's id");
      made[s.key] = id;
      out.made.push(s.name);
      await saveSettings(KEY, p);
      const back = await stFetch<Raw>(stTenantPath("sales", `proposal-templates/${id}`)).catch(() => null);
      const list = back?.estimateAssignments ?? back?.options;
      const opts = Array.isArray(list) ? list.length : null;
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
