import Link from "next/link";
import { PHOTO_ANGLES } from "@/lib/portal/vanChecks";

export type WeeklyPhoto = { angle: string; url: string | null };
export type WeeklyRow = { id: string; when: string; by: string | null; photos: number; missing: string[] };

type Props = {
  vehicleId: string;
  /** The most recent weekly check, or null if there has never been one. */
  last: { id: string; when: string; by: string | null; photos: WeeklyPhoto[]; stockDone: boolean } | null;
  /** Whether this week's has been done — drives the pill, not the colour alone. */
  overdue: boolean;
  history: WeeklyRow[];
};

/**
 * The weekly clean, as the design shows it: the last one's six angles across
 * the top, then every one before it.
 *
 * An angle with no photo is drawn as an empty slot rather than left out, so a
 * missing one reads as missing instead of as a shorter row — which is the
 * whole reason the office looks at this page.
 */
export function VanWeekly({ vehicleId, last, overdue, history }: Props) {
  if (!last) {
    return (
      <section className="pt-panel">
        <h2 className="pt-panel__h">Weekly clean &amp; photos</h2>
        <p className="pt-panel__sub">Nothing has been done on this van yet.</p>
        <div className="pf-empty">No weekly clean has ever been logged for this van.</div>
        <p style={{ marginTop: 16 }}>
          <Link href={`/portal/vehicles/${vehicleId}/checks/weekly`} className="pt-btn pt-btn--orange pt-btn--sm">Do the first one</Link>
        </p>
      </section>
    );
  }

  const got = new Map(last.photos.map((p) => [p.angle, p]));

  return (
    <section className="pt-panel">
      <div className="pt-veh__edithead">
        <div>
          <h2 className="pt-panel__h">Last weekly clean · {last.when}</h2>
          <p className="pt-panel__sub">
            {last.by ? `By ${last.by}` : "Nobody named"} · {last.photos.length} photo{last.photos.length === 1 ? "" : "s"}
            {last.stockDone ? " · stock count done" : " · stock not counted"}
          </p>
        </div>
        {overdue && <span className="pt-vw__due">This week&rsquo;s is overdue</span>}
      </div>

      <div className="pt-vw__strip">
        {PHOTO_ANGLES.map((a) => {
          const p = got.get(a);
          return (
            <figure key={a} className={`pt-vw__shot${p?.url ? "" : " is-empty"}`}>
              {p?.url
                // eslint-disable-next-line @next/next/no-img-element -- a signed Supabase URL that expires; the optimiser would cache a dead link.
                ? <img src={p.url} alt={`${a} of the van, ${last.when}`} />
                : <span className="pt-vw__none" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
                      <circle cx="12" cy="13" r="3.2" />
                    </svg>
                  </span>}
              {/* Three states, not two: taken, never taken, and taken but the
                  link has expired. Collapsing the last into "not taken" would
                  send somebody out to re-photograph a van that is fine. */}
              <figcaption>{a}{p?.url ? "" : p ? " — won't load" : " — not taken"}</figcaption>
            </figure>
          );
        })}
      </div>

      <div className="pt-vw__hist">
        {history.map((h) => (
          <Link key={h.id} href={`/portal/vehicles/${vehicleId}/checks/weekly`} className="pt-vw__row">
            <strong>{h.when}</strong>
            <span>
              {h.by ?? "Unnamed"} · {h.photos} photo{h.photos === 1 ? "" : "s"}
              {h.missing.length > 0 && ` — ${h.missing.join(", ").toLowerCase()} missing`}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
