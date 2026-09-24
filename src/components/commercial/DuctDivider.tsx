/**
 * The join between two sections, as a length of duct.
 *
 * The page used to go straight from one ground to the next, and every one of
 * those joins read as the end of a page and the start of another. This is the
 * same join with a duct run through it: two walls with a flange every 160px,
 * air moving right along it, and a fan turning at the end. It carries the eye
 * across the break instead of stopping it.
 *
 * Two lines of air, at different speeds, because one line reads as a dash
 * pattern sliding and two read as flow. Sky is 1.4s a cycle, orange 2.1s.
 *
 * `on` is the ground it sits on, so the walls and the fan housing match it.
 * The label names the direction, which is the one thing a mechanical drawing
 * always says and a decorative divider never does.
 */

export function DuctDivider({
  on = "navy",
  label = "supply air",
}: {
  on?: "navy" | "cream";
  label?: string;
}) {
  return (
    <div className={`cx-duct cx-duct--${on}`} aria-hidden="true">
      <span className="cx-duct__lbl">{label} →</span>
      <div className="cx-duct__pipe" />
      <div className="cx-duct__fan">
        <i />
      </div>
    </div>
  );
}
