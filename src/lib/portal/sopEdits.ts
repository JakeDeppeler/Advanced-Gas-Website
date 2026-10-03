/**
 * Procedures the office has written, over the ones in `sops.ts`.
 *
 * The constant is the version agreed at the training day and stays the source
 * for everything nobody has touched. A stored row overrides one procedure by
 * its code; a draft is only ever shown to the people who can edit.
 *
 * Pure — no database, no React — so the merge can be reasoned about and
 * tested on its own.
 */

import { SOPS, type Sop, type SopBlock, type SopSection } from "@/lib/portal/sops";

export type SopStep = { do: string; note: string };

export type StoredSop = {
  id: string;
  section: string;
  code: string;
  slug: string;
  title: string;
  happens: string | null;
  flag: string | null;
  audience: string;
  steps: SopStep[];
  changed: string | null;
  status: "draft" | "published";
  updatedBy: string | null;
  updatedAt: string;
};

/** What a procedure can be flagged as. The first is "nothing special". */
export const SOP_FLAGS = [
  { k: "", label: "No flag" },
  { k: "stop", label: "Stop work" },
  { k: "office", label: "Call the office" },
  { k: "cert", label: "Needs a certificate" },
] as const;

/** Who a procedure is for. Keys match the crew levels. */
export const SOP_AUDIENCES = [
  { k: "everyone", label: "Everyone" },
  { k: "tradesman", label: "Tradesman" },
  { k: "lead", label: "Lead hand" },
  { k: "apprentice", label: "Apprentice" },
  { k: "office", label: "Office" },
] as const;

export const flagLabel = (k: string | null | undefined) =>
  SOP_FLAGS.find((f) => f.k === (k ?? ""))?.label ?? "";
export const audienceLabel = (k: string | null | undefined) =>
  SOP_AUDIENCES.find((a) => a.k === (k ?? "everyone"))?.label ?? "Everyone";

/** Turn a stored row into the shape the reader already renders. */
export function toSop(row: StoredSop): Sop {
  const blocks: SopBlock[] = [];
  if (row.steps.length > 0) {
    blocks.push({
      kind: "steps",
      title: "Steps",
      // The reader draws a step as one line, so a step's note joins it there
      // rather than being dropped — the editor keeps them apart because that
      // is how somebody writes them, not because they display apart.
      items: row.steps.map((s) => (s.note.trim() ? `${s.do.trim()} — ${s.note.trim()}` : s.do.trim())),
    });
  }
  if (row.changed?.trim()) {
    blocks.push({ kind: "note", title: "What changed", body: row.changed.trim() });
  }
  const meta = [
    row.happens?.trim() ? { k: "When", v: row.happens.trim() } : null,
    { k: "Who", v: audienceLabel(row.audience) },
    row.flag ? { k: "Flag", v: flagLabel(row.flag) } : null,
  ].filter(Boolean) as { k: string; v: string }[];

  return { code: row.code, slug: row.slug, title: row.title, meta, blocks };
}

/**
 * The sections as the reader should show them.
 *
 * `canSeeDrafts` is the whole difference between the admin's view and the
 * crew's: a draft replaces nothing for the crew, so a half-written procedure
 * can never reach a van.
 */
export function mergeSops(stored: StoredSop[], canSeeDrafts: boolean): SopSection[] {
  const live = stored.filter((s) => s.status === "published" || canSeeDrafts);
  // Last write wins when a draft and a published row share a code, which the
  // unique index means cannot happen — but the reader should not depend on
  // an index for correctness.
  const byCode = new Map(live.map((s) => [s.code, s]));
  const used = new Set<string>();

  const out = SOPS.map((sec) => {
    const sops = sec.sops.map((sop) => {
      const row = byCode.get(sop.code);
      if (!row || row.section !== sec.letter) return sop;
      used.add(sop.code);
      return toSop(row);
    });
    // Procedures written here that the constant has never heard of.
    const extra = live
      .filter((s) => s.section === sec.letter && !used.has(s.code) && !sec.sops.some((x) => x.code === s.code))
      .sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true }))
      .map(toSop);
    for (const e of extra) used.add(e.code);
    return { ...sec, sops: [...sops, ...extra] };
  });

  // A stored procedure whose section letter matches nothing would otherwise
  // vanish silently, which is the worst outcome for somebody who wrote it.
  const orphans = live.filter((s) => !used.has(s.code) && !SOPS.some((sec) => sec.letter === s.section));
  if (orphans.length > 0) {
    out.push({
      letter: "?",
      slug: "unfiled",
      title: "Unfiled",
      blurb: "Written here, but filed under a section that doesn’t exist. Move them or the crew won’t find them.",
      sops: orphans.map(toSop),
    });
  }
  return out;
}

/** The next free code in a section — A1, A2, … — for a new procedure. */
export function nextCode(letter: string, stored: StoredSop[]): string {
  const sec = SOPS.find((s) => s.letter === letter);
  const taken = new Set<number>();
  for (const s of sec?.sops ?? []) {
    const n = Number(s.code.slice(letter.length));
    if (Number.isFinite(n)) taken.add(n);
  }
  for (const s of stored) {
    if (s.section !== letter) continue;
    const n = Number(s.code.slice(letter.length));
    if (Number.isFinite(n)) taken.add(n);
  }
  let n = 1;
  while (taken.has(n)) n += 1;
  return `${letter}${n}`;
}

/** A URL-safe slug from a title, so a new procedure gets an anchor. */
export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "procedure";
