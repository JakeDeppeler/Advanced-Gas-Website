import Link from "next/link";
import { NUDGE, NUDGE_CAVEAT, REBATE_FACTS, type NudgeVariant } from "@/lib/upgradeAngle";

/**
 * The compact "near ten years old? price the upgrade, and here's the
 * rebate" call-out.
 *
 * Appears on service, system, suburb and brand pages. Kept short on
 * purpose — see the note in upgradeAngle.ts about not re-creating the
 * duplicate-content problem across 400 suburb pages. The long-form
 * argument lives on /upgrade-or-repair.
 */

export function UpgradeNudge({
  variant = "general",
  className = "",
}: {
  variant?: NudgeVariant;
  className?: string;
}) {
  const n = NUDGE[variant];
  return (
    <aside className={`upnudge ${className}`.trim()} aria-label="Upgrade and rebate">
      <div className="upnudge__age" aria-hidden="true">
        <span className="upnudge__agenum">{n.age.split(" ")[0]}</span>
        <span className="upnudge__agelab">years</span>
      </div>
      <div className="upnudge__body">
        <h3>{n.heading}</h3>
        <p>{n.body}</p>
        <p className="upnudge__caveat">{NUDGE_CAVEAT}</p>
        <div className="upnudge__actions">
          <Link href="/rebates" className="upnudge__cta">
            Up to ${REBATE_FACTS.maxStacked.toLocaleString()} back with the VEU rebate
          </Link>
          <Link href="/upgrade-or-repair" className="upnudge__link">
            Repair or replace? →
          </Link>
        </div>
      </div>
    </aside>
  );
}
