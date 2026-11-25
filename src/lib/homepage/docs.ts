/**
 * Downloadable documents for a /find product page's Resources section:
 * brochures, spec sheets, manuals and warranty booklets we host ourselves,
 * in public/docs/.
 *
 * Only files we actually host go here. A Download button that 404s, or
 * points at a guessed manufacturer URL that moves next year, is worse than
 * none; without an entry the section falls back to the manufacturer's own
 * site and the warranties we can state. The Dominator's two came from Jake
 * (Nov 2026), straight from Braemar.
 *
 * Keyed "<system>/<tier>", as in /find/<system>/<tier>.
 */
export type DocKind = "Brochure" | "Specification" | "Operation manual" | "Warranty";
export type Doc = { kind: DocKind; title: string; href: string };

export const PRODUCT_DOCS: Record<string, Doc[]> = {
  "dominator/essential": [
    { kind: "Brochure", title: "Braemar Dominator Series 3 brochure", href: "/docs/braemar-dominator-series-3-brochure.pdf" },
    { kind: "Specification", title: "Dominator Series 3 technical data", href: "/docs/braemar-dominator-series-3-tech-data.pdf" },
  ],
};

export const docsFor = (system: string, tier: string): Doc[] => PRODUCT_DOCS[`${system}/${tier}`] ?? [];
