/**
 * The six grounds a benefit tile can sit on.
 *
 * One list, imported, because there were four identical copies of it and a
 * fifth that had drifted. The drifted one passed the words "sky", "sand",
 * "navy" and "orange" instead of colours. Two of those happen to be CSS
 * keywords, so those tiles rendered — in the wrong colours, `orange` being a
 * bright amber and `navy` a pure blue-black, neither of them ours. The other
 * two are not keywords at all, so `background: var(--tint)` resolved to
 * nothing and the tiles came out transparent: white text on a cream page,
 * invisible, along with the explanatory panel underneath them.
 *
 * Hex rather than `var(--navy)` and friends, because these are passed through
 * an inline style attribute into a custom property and a var() chain there is
 * one indirection too many to debug from a screenshot.
 */
export const TILE_TINTS = [
  "#0B1450", // navy
  "#00699A", // deep sky
  "#2E7D6B", // green
  "#C2540F", // burnt orange
  "#5A5F7A", // slate
] as const;
