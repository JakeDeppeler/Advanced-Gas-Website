/**
 * Downloadable documents for a /find product page's Resources section:
 * brochures, spec sheets, manuals and warranty booklets we host ourselves,
 * in public/docs/.
 *
 * Empty on purpose. None of these files are on the site yet (Nov 2026), and
 * a Download button that 404s, or points at a guessed manufacturer URL that
 * moves next year, is worse than none. Until a file is added, the section
 * falls back to the manufacturer's own site and the warranties we can state.
 *
 * Keyed "<system>/<tier>", as in /find/<system>/<tier>.
 */
export type DocKind = "Brochure" | "Specification" | "Operation manual" | "Warranty";
export type Doc = { kind: DocKind; title: string; href: string };

export const PRODUCT_DOCS: Record<string, Doc[]> = {
  // "split-system/premium": [
  //   { kind: "Brochure", title: "MSZ-AP brochure", href: "/docs/mitsubishi-msz-ap-brochure.pdf" },
  // ],
};

export const docsFor = (system: string, tier: string): Doc[] => PRODUCT_DOCS[`${system}/${tier}`] ?? [];
