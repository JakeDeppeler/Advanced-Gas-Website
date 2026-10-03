/**
 * What the top-bar search looks through.
 *
 * Built from the same content modules the pages render, so a clause added to
 * the handbook is searchable the moment it is written — there is no separate
 * index to remember to update, which is the usual way a search like this rots.
 *
 * Pure and small: a few hundred short rows, serialised into the shell once per
 * page load. Anything bigger would want a real index; this does not.
 */

import { HANDBOOK, INFO_SECTIONS, LEARNING_TRACKS, PORTAL_TOOLS, VIDEOS } from "@/lib/portal/content";
import { SOPS, type Sop } from "@/lib/portal/sops";
import { FAULT_CODES, FAULT_SYSTEM_LABELS, faultSlug } from "@/lib/faultCodes";
import type { SearchRow } from "@/components/portal/PortalSearch";
import type { NavItem } from "@/lib/portal/nav";

/** Every word a procedure says, for the results page. */
function sopText(blocks: Sop["blocks"]): string {
  return blocks
    .map((b) => (b.kind === "note" ? b.body : b.kind === "table" ? b.rows.map((r) => r.join(" ")).join(". ") : b.items.join(". ")))
    .join(". ");
}

/**
 * The index the top bar and the results page search.
 *
 * `deep` adds the full text of every procedure, which only the results page
 * asks for: it is what lets "drain" find a procedure that mentions drains,
 * and it is too much to ship to every page for the bar's dropdown.
 */
export function buildSearchIndex(nav: NavItem[], deep = false): SearchRow[] {
  const rows: SearchRow[] = [];

  // The destinations themselves, so typing a section name still works. `where`
  // is the facet the results page groups on, so it has to be a kind — putting
  // the blurb here gave every section its own one-result category.
  for (const n of nav) {
    rows.push({ href: n.href, label: n.label, where: "Section", terms: `${n.blurb} ${(n.also ?? []).join(" ")}` });
  }

  // Procedures, by code and by title — people quote these as "A3".
  for (const sec of SOPS) {
    rows.push({ href: `/portal/sops/${sec.slug}`, label: sec.title, where: `Processes · ${sec.letter}`, terms: sec.blurb });
    for (const sop of sec.sops) {
      rows.push({
        href: `/portal/sops/${sec.slug}/${sop.slug}`,
        label: `${sop.code} · ${sop.title}`,
        where: `Processes · ${sec.title}`,
        ...(deep ? { body: sopText(sop.blocks) } : {}),
      });
    }
  }

  // Handbook clauses. These have no anchor of their own yet, so they land on
  // the shelf — still the right page, which is what somebody searching wants.
  for (const shelf of HANDBOOK) {
    rows.push({
      href: `/portal/handbook/${shelf.letter.toLowerCase()}`,
      label: shelf.title,
      where: `Handbook · Shelf ${shelf.letter}`,
    });
    for (const item of shelf.items) {
      rows.push({
        href: `/portal/handbook/${shelf.letter.toLowerCase()}`,
        label: item.title,
        where: `Handbook · ${shelf.title}`,
        terms: item.note,
      });
    }
  }

  for (const t of LEARNING_TRACKS) {
    rows.push({ href: `/portal/learning/${t.slug}`, label: t.label, where: "Learning", terms: t.blurb });
  }
  for (const v of VIDEOS) {
    rows.push({ href: `/portal/learning/${v.track}`, label: v.title, where: "Learning · video" });
  }

  for (const s of INFO_SECTIONS) {
    rows.push({ href: `/portal/information/${s.slug}`, label: s.title, where: "Information", terms: s.intro });
    // The block headings carry the words people actually search for — "call-out
    // rates", "ARC licence" — which the section title usually doesn't.
    for (const b of s.blocks) {
      // Some blocks are a strip of figures with no heading of their own.
      if (b.title) {
        rows.push({
          href: `/portal/information/${s.slug}`,
          label: b.title,
          where: `Information · ${s.label}`,
          // The values are half of what people search for here — "split
          // service", "ARC", "after-hours" are all in the rows, not the
          // heading above them.
          terms: (b.rows ?? []).map((r) => `${r.k} ${r.v}`).join(" ") || (b.list ?? []).join(" "),
        });
      }
    }
  }

  // Fault codes. The top bar says it searches these and it didn't: typing
  // "drain" found nothing while the finder had two drain faults in it. 149
  // short rows, so they go in the one index rather than a second one.
  for (const f of FAULT_CODES) {
    rows.push({
      // A code with long-form content has its own page; the rest land on the
      // finder, which is still where somebody wants to be.
      href: f.detail ? `/tools/fault-codes/${faultSlug(f.brand)}/${faultSlug(f.code)}` : "/portal/tools/fault-codes",
      label: `${f.brand} · ${f.code} · ${f.meaning}`,
      where: "Fault code",
      terms: `${f.firstCheck} ${FAULT_SYSTEM_LABELS[f.system]}`,
      snip: f.firstCheck,
    });
  }

  for (const t of PORTAL_TOOLS) {
    rows.push({ href: t.href, label: t.label, where: "Tools", terms: t.blurb });
  }

  // Two rows can legitimately point at the same place with the same words; the
  // list is short enough that a duplicate is just noise in the dropdown.
  const seen = new Set<string>();
  return rows.filter((r) => {
    const key = `${r.href}|${r.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
