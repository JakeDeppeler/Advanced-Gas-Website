/**
 * A drawing for each section of the commercial page.
 *
 * The page was winning its argument entirely in words: six headings, a
 * schedule, a table and a program, all of it set. Correct, and flat — and
 * the right-hand third of every section header was empty while it happened.
 * These go there.
 *
 * They are drawn from the trade rather than from an icon set. A duct run
 * with a branch and a diffuser, a program with a milestone on it, a
 * certificate with a stamp: nobody reading this page needs a lightbulb
 * explaining what a fit-out is, and a generic glyph would say we do not
 * know what the work looks like.
 *
 * Every stroke carries `pathLength={1}`, so one `stroke-dashoffset` draws
 * the whole thing. Dash offset is an INHERITED SVG property, which is the
 * useful part: the scroll position sets it once on the `<svg>` and every
 * path inside inherits the computed value, so a mark draws itself from a
 * single number without a per-path animation. See `.cx-mark` in
 * commercial.css.
 *
 * Two strokes per mark are `cx-mark__hi`, which takes the section's accent
 * rather than its ink — the part of each drawing that is the point of it.
 */

const S = {
  fill: "none" as const,
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  pathLength: 1,
};

export function CommercialMark({ kind }: { kind: string }) {
  switch (kind) {
    /* Who already lets us on site: a street of tenancies, with plant on
       the roof of the one that has been done. */
    case "refs":
      return (
        <svg className="cx-mark__svg" viewBox="0 0 200 132" role="presentation" aria-hidden="true">
          <g {...S} stroke="currentColor">
            <path d="M8 122h184" />
            <path d="M20 122V74h44v48" />
            <path d="M64 122V50h52v72" />
            <path d="M116 122V86h34v36" />
            <path d="M150 122V64h30v58" />
            <path d="M30 90h10M30 104h10M126 98h12M160 80h10M160 96h10" />
          </g>
          <g {...S} className="cx-mark__hi">
            <path d="M74 50V38h32v12" />
            <path d="M80 38v-8h20v8" />
            <path d="M86 30v-6" />
          </g>
        </svg>
      );

    /* What we take on: a trunk, a branch, a reducer and a diffuser. */
    case "works":
      return (
        <svg className="cx-mark__svg" viewBox="0 0 200 132" role="presentation" aria-hidden="true">
          <g {...S} stroke="currentColor">
            <path d="M10 42h96" />
            <path d="M10 74h96" />
            <path d="M106 42l22 10v12l-22 10" />
            <path d="M128 52h30" />
            <path d="M128 64h30" />
            <path d="M40 74v26h40V74" />
            <path d="M30 42V28M62 42V28M94 42V28" />
          </g>
          <g {...S} className="cx-mark__hi">
            <rect x="44" y="100" width="32" height="16" rx="2" />
            <path d="M50 104v8M58 104v8M66 104v8" />
            <path d="M158 44v28" />
          </g>
        </svg>
      );

    /* How a job runs: bars against a program, and the milestone at the end. */
    case "program":
      return (
        <svg className="cx-mark__svg" viewBox="0 0 200 132" role="presentation" aria-hidden="true">
          <g {...S} stroke="currentColor">
            <path d="M12 18v104h176" />
            <path d="M26 36h58" />
            <path d="M52 58h62" />
            <path d="M84 80h54" />
            <path d="M110 102h48" />
            <path d="M26 30v12M52 52v12M84 74v12M110 96v12" />
          </g>
          <g {...S} className="cx-mark__hi">
            <path d="M158 92l10 10-10 10-10-10z" />
            <path d="M168 18v74" />
          </g>
        </svg>
      );

    /* Everything procurement asks for: the certificate and the stamp. */
    case "compliance":
      return (
        <svg className="cx-mark__svg" viewBox="0 0 200 132" role="presentation" aria-hidden="true">
          <g {...S} stroke="currentColor">
            <path d="M40 14h84l20 20v84H40z" />
            <path d="M124 14v20h20" />
            <path d="M56 50h56M56 64h56M56 78h34" />
          </g>
          <g {...S} className="cx-mark__hi">
            <circle cx="124" cy="92" r="20" />
            <path d="M115 92l7 7 14-15" />
          </g>
        </svg>
      );

    /* Based in Pakenham, on site anywhere in Victoria. */
    case "area":
      return (
        <svg className="cx-mark__svg" viewBox="0 0 200 132" role="presentation" aria-hidden="true">
          <g {...S} stroke="currentColor">
            <path d="M22 96c14-26 30-40 56-44 30-5 52 4 74 22 16 13 24 26 24 26" />
            <path d="M40 112c10-18 24-28 46-31 24-4 42 3 60 17" />
            <path d="M8 120h184" />
          </g>
          <g {...S} className="cx-mark__hi">
            <path d="M100 74c-9 0-16-7-16-16s7-16 16-16 16 7 16 16-7 16-16 16z" />
            <path d="M100 74v22" />
            <path d="M100 52v10" />
          </g>
        </svg>
      );

    /* Before you put us on a site: the questions, on a clipboard. */
    case "faq":
      return (
        <svg className="cx-mark__svg" viewBox="0 0 200 132" role="presentation" aria-hidden="true">
          <g {...S} stroke="currentColor">
            <path d="M46 22h108v98H46z" />
            <path d="M82 22v-8h36v8" />
            <path d="M84 50h52M84 72h52M84 94h34" />
          </g>
          <g {...S} className="cx-mark__hi">
            <path d="M62 46l5 5 9-10" />
            <path d="M62 68l5 5 9-10" />
            <path d="M62 90l5 5 9-10" />
          </g>
        </svg>
      );

    default:
      return null;
  }
}
