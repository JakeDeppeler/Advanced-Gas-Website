import "server-only";
import { stFetch, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { logAuto, type AutoEntry } from "@/lib/automation/log";
import { EVAP_UNITS, OTHER_TEMPLATES, evapTemplate, type TemplateSpec } from "./quoteTemplateSpecs";
import { flatText, summaryAction, textHash } from "./summaryRule";
import { summaryHtml } from "./wording";

/**
 * The templates quoteTemplatesAdd.ts made keep the summary quoteTemplateSpecs.ts
 * gives them: when its wording changes (the Brivis comparison, 16 Nov), the
 * new words go onto the template in ServiceTitan after the next sync, each
 * read back. Only over words this code put there (summaryRule.ts): a summary
 * the office has edited is left as it is and named in the progress record.
 */
const KEY = "quote_template_summaries";
type Live = { id: number; name?: string; summary?: string | null };
type Progress = { written?: Record<string, string>; edited?: Record<string, string>; fails?: number; notes?: Record<string, string> };

const specs = (): TemplateSpec[] => [...EVAP_UNITS.map((u) => evapTemplate(u, 0, 0)), ...OTHER_TEMPLATES];

export async function syncTemplateSummaries(until: number, all: Live[]): Promise<{ written: string[]; edited: string[]; failed: string[] }> {
  const out = { written: [] as string[], edited: [] as string[], failed: [] as string[] };
  const p: Progress = (await getSettings<Progress>(KEY).catch(() => null)) ?? {};
  if ((p.fails ?? 0) >= 3) return out;
  const written = (p.written ??= {}), edited = (p.edited ??= {}), notes = (p.notes ??= {});
  const made = (await getSettings<{ templates?: Record<string, number> }>("quote_templates_added").catch(() => null))?.templates ?? {};
  const byId = new Map(all.map((t) => [t.id, t]));
  const log: AutoEntry[] = [];
  let changed = false;

  for (const s of specs()) {
    if (Date.now() > until) break;
    const t = made[s.code] != null ? byId.get(made[s.code]) : undefined;
    if (!t) continue;
    const want = textHash(flatText(s.summary));
    const action = summaryAction(t.summary, s, written[s.code]);
    if (action === "same") {
      // Remembered as ours, so a later change to the spec can go over it.
      if (written[s.code] !== want) { written[s.code] = want; changed = true; }
      continue;
    }
    if (action === "edited") {
      if (!edited[s.code]) { edited[s.code] = new Date().toISOString(); changed = true; out.edited.push(t.name ?? s.name); }
      continue;
    }
    const path = stTenantPath("sales", `estimate-templates/${t.id}`);
    try {
      await stSend("PATCH", path, { summary: summaryHtml(s.summary) });
      const back = await stFetch<Live>(path);
      if (summaryAction(back.summary, s) !== "same") throw new Error("ServiceTitan answered OK but the summary reads back different");
      written[s.code] = want;
      delete notes[s.code];
      changed = true;
      out.written.push(t.name ?? s.name);
    } catch (e) {
      p.fails = (p.fails ?? 0) + 1;
      notes[s.code] = (e as Error).message.slice(0, 200);
      changed = true;
      out.failed.push(t.name ?? s.name);
      log.push({ at: new Date().toISOString(), kind: "quoteTemplates", ok: false, title: `Quote template "${t.name ?? s.name}" couldn't take its new summary`, detail: (e as Error).message.slice(0, 300) });
      break;
    }
  }
  if (out.written.length) log.push({ at: new Date().toISOString(), kind: "quoteTemplates", ok: true, title: `${out.written.length} quote template summar${out.written.length === 1 ? "y" : "ies"} updated`, detail: out.written.join(", ").slice(0, 400) });
  if (out.edited.length) log.push({ at: new Date().toISOString(), kind: "quoteTemplates", ok: true, title: `${out.edited.length} quote template summar${out.edited.length === 1 ? "y was" : "ies were"} edited in ServiceTitan and left as they are`, detail: out.edited.join(", ").slice(0, 400) });
  if (changed) await saveSettings(KEY, p);
  await logAuto(log).catch(() => undefined);
  return out;
}
