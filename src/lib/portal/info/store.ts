import "server-only";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { INFO_SECTIONS, type InfoContentBlock, type InfoSection } from "@/lib/portal/content";

/**
 * An Information section as the owner last saved it, else as written in
 * content.ts. A saved copy is the whole section (its line and every block),
 * kept under "info:<slug>", so putting it back to the original is just
 * forgetting the copy.
 */
type Saved = { intro?: string; blocks: InfoContentBlock[]; by?: string; at?: string };
const key = (slug: string) => `info:${slug}`;

export async function loadInfoSection(slug: string): Promise<(InfoSection & { edited: { by?: string; at?: string } | null }) | null> {
  const base = INFO_SECTIONS.find((s) => s.slug === slug);
  if (!base) return null;
  const saved = await getSettings<Saved>(key(slug)).catch(() => null);
  if (!saved || !Array.isArray(saved.blocks)) return { ...base, edited: null };
  return { ...base, intro: saved.intro ?? base.intro, blocks: saved.blocks, edited: { by: saved.by, at: saved.at } };
}

/** null forgets the saved copy: stored as {} because the settings value can't be empty. */
export async function saveInfoSection(slug: string, v: Saved | null) {
  return saveSettings(key(slug), v ?? {});
}
