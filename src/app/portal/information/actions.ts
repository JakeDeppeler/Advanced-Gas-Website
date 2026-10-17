"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { canEditStandards } from "@/lib/portal/standards";
import { INFO_SECTIONS, type InfoBlockAs, type InfoContentBlock } from "@/lib/portal/content";
import { saveInfoSection } from "@/lib/portal/info/store";

const SHAPES: InfoBlockAs[] = ["rows", "facts", "copy", "people", "chips", "price", "timeline", "stat"];
const t = (v: unknown, n = 400) => String(v ?? "").trim().slice(0, n);
const arr = <T,>(v: unknown, f: (x: Record<string, unknown>) => T | null, n = 60): T[] =>
  (Array.isArray(v) ? v : []).slice(0, n).map((x) => f((x ?? {}) as Record<string, unknown>)).filter((x): x is T => x != null);

/** Only what a block can hold, trimmed, so a saved page can't carry anything the page can't draw. */
function clean(b: Record<string, unknown>): InfoContentBlock | null {
  const as = SHAPES.includes(b.as as InfoBlockAs) ? (b.as as InfoBlockAs) : undefined;
  const block: InfoContentBlock = {
    title: t(b.title, 120) || undefined,
    as,
    tone: b.tone === "navy" ? "navy" : undefined,
    span: b.span === "full" || b.span === "tall" ? b.span : undefined,
    rows: arr(b.rows, (r) => (t(r.k) || t(r.v) ? { k: t(r.k, 120), v: t(r.v), note: t(r.note, 200) || undefined, href: /^(tel:|mailto:|https:\/\/)/.test(t(r.href)) ? t(r.href) : undefined } : null)),
    people: arr(b.people, (p) => (t(p.name) ? { name: t(p.name, 80), role: t(p.role, 80), detail: t(p.detail, 300) } : null)),
    chips: arr(b.chips, (c) => t(c) || null),
    list: arr(b.list, (c) => t(c, 500) || null),
    body: arr(b.body, (c) => t(c, 3000) || null, 20),
  };
  for (const k of ["rows", "people", "chips", "list", "body"] as const) if (!block[k]?.length) delete block[k];
  return block.title || block.rows || block.people || block.chips || block.list || block.body ? block : null;
}

export async function saveInfo(slug: string, input: { intro?: string; blocks: unknown[] }): Promise<{ ok: boolean; error?: string }> {
  const me = await getPortalUser();
  if (!me || !canEditStandards(me)) return { ok: false, error: "Only the owner can change Information." };
  if (!INFO_SECTIONS.some((s) => s.slug === slug)) return { ok: false, error: "There's no such page." };
  const blocks = (Array.isArray(input.blocks) ? input.blocks : []).slice(0, 40).map((b) => clean((b ?? {}) as Record<string, unknown>)).filter((b): b is InfoContentBlock => b != null);
  const r = await saveInfoSection(slug, { intro: t(input.intro, 300), blocks, by: me.name.split(" ")[0], at: new Date().toISOString() });
  if (!r.ok) return { ok: false, error: "Couldn't save it." };
  revalidatePath(`/portal/information/${slug}`);
  return { ok: true };
}

/** Back to the page as first written. */
export async function resetInfo(slug: string): Promise<{ ok: boolean; error?: string }> {
  const me = await getPortalUser();
  if (!me || !canEditStandards(me)) return { ok: false, error: "Only the owner can change Information." };
  const r = await saveInfoSection(slug, null);
  if (!r.ok) return { ok: false, error: "Couldn't put it back." };
  revalidatePath(`/portal/information/${slug}`);
  return { ok: true };
}
