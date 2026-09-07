import Link from "next/link";
import { CHECK_KINDS, type CheckKind } from "@/lib/portal/vanChecks";

export type PersonVanView = {
  van: { id: string; name: string; rego: string | null } | null;
  checks: { id: string; kind: CheckKind; when: string; vehicleId: string; vehicleName: string; flags: number; photos: number }[];
};

/**
 * The van someone is signed to and the checks they've done on it — the same
 * block on their own file and on the one a manager opens, so what a tech sees
 * as their job is what an owner sees as the record of it.
 */
export function PersonVan({ van, checks, mine }: PersonVanView & { mine: boolean }) {
  if (!van && checks.length === 0) return null;
  const who = mine ? "you" : "them";

  return (
    <>
      {van && (
        <section className="pt-panel">
          <div className="pt-veh__edithead">
            <h2 className="pt-panel__h">{mine ? "Your van" : "Their van"} — {van.name}{van.rego ? ` · ${van.rego}` : ""}</h2>
            <Link href={`/portal/vehicles/${van.id}`} className="pt-btn pt-btn--ghost pt-btn--sm">Open the van →</Link>
          </div>
          <p className="pt-panel__sub">
            Signed to {mine ? "you" : "them"}, so its checks are {mine ? "yours" : "theirs"} to do — the weekly one and the stock
            count on a Monday, the monthly condition check with photos.
          </p>
          <div className="pt-veh__checks">
            {CHECK_KINDS.map((k) => (
              <Link key={k.k} href={`/portal/vehicles/${van.id}/checks/${k.k}`} className="pt-veh__check">
                <strong>{k.short}</strong>
                <span>{k.cadence}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {checks.length > 0 && (
        <section className="pt-panel">
          <h2 className="pt-panel__h">Checks {mine ? "you've" : "they've"} done <span className="pt-tm__count">{checks.length}</span></h2>
          <p className="pt-panel__sub">Every sheet {who} finished, newest first. Open one to see what needed doing and the photos.</p>
          <div className="pt-vc__short">
            {checks.map((c) => (
              <Link key={c.id} href={`/portal/vehicles/${c.vehicleId}/checks`} className="pt-vc__shortrow pt-vc__shortrow--plain">
                <span>
                  <strong>{CHECK_KINDS.find((k) => k.k === c.kind)?.label ?? c.kind}</strong>
                  <em>{c.vehicleName} · {c.when}</em>
                </span>
                <span className="pt-pv__tags">
                  {c.photos > 0 && <span className="pt-vc__tag">{c.photos} {c.photos === 1 ? "photo" : "photos"}</span>}
                  {c.flags > 0
                    ? <span className="pt-vc__tag pt-vc__tag--flag">{c.flags} to sort</span>
                    : <span className="pt-vc__tag pt-vc__tag--ok">All clear</span>}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
