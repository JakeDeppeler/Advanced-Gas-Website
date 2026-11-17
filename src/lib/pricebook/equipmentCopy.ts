/**
 * What each unit's line says on a quote (Jake, 17 Nov): "how it saves money,
 * the key feature, why it's better than its other model, like Mitsubishi vs
 * other brand or a Promina vs another model below it, the warranty". The job
 * itself (what we do, remove, include) is the template summary (wording.ts).
 *
 * Every description is the unit's name and four labelled paragraphs, the same
 * four on every unit, so a customer comparing options reads like for like.
 * Facts are the manufacturer's own (sources by family below); a figure the
 * manufacturer doesn't publish isn't here. Pure, for scripts/check-quote-templates.ts;
 * quoteWording.ts writes them to the pricebook and onto every template line.
 */

export type EquipmentFacts = { name: string; model?: string | null; code?: string | null };

export const EQUIPMENT_LABELS = {
  saves: "Why it saves you money:",
  features: "Key features:",
  choose: "Why choose it:",
  warranty: "Warranty:",
} as const;

/** Our own cover, after the manufacturer's, on every unit we install (brands.ts). */
export const WORKMANSHIP = "Plus our 6-year workmanship warranty on the installation.";

export type Copy = { title: string; saves: string; features: string; choose: string; warranty: string };

/** One description, in the one order. */
export const copyText = (c: Copy) =>
  [c.title, `${EQUIPMENT_LABELS.saves} ${c.saves}`, `${EQUIPMENT_LABELS.features} ${c.features}`, `${EQUIPMENT_LABELS.choose} ${c.choose}`, `${EQUIPMENT_LABELS.warranty} ${c.warranty} ${WORKMANSHIP}`]
    .map((p) => p.trim().replace(/\s+/g, " ")).join("\n\n");

type Unit = { name: string; model: string; all: string };
type Family = { key: string; matches: (u: Unit) => boolean; copy: (u: Unit) => Copy };

const FAMILIES: Family[] = [];

/** The description for a pricebook unit, or null when no family covers it (it keeps its own). */
export function equipmentCopy(e: EquipmentFacts): { family: string; text: string } | null {
  const u: Unit = { name: e.name.trim(), model: (e.model ?? "").trim(), all: `${e.name} ${e.model ?? ""} ${e.code ?? ""}` };
  const f = FAMILIES.find((x) => x.matches(u));
  return f ? { family: f.key, text: copyText(f.copy(u)) } : null;
}

export const equipmentFamilies = () => FAMILIES.map((f) => f.key);
