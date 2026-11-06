import type { PackStatus } from "@/lib/installpack/facts";
import { dayTimeLabel } from "@/lib/ordering/plan";

const short = (s: string) => (s.length > 140 ? `${s.slice(0, 140)}…` : s);

/** Where the pack stands, in words. */
function packSays(p: PackStatus): string {
  if (p.last_error && !p.version) return `Couldn’t be made: ${short(p.last_error)}`;
  if (!p.version) return "Waiting its turn to be made";
  const made = p.attached_at ? `, put on ${dayTimeLabel(p.attached_at)}` : "";
  if (p.last_error) return `v${p.version} on the job${made}. Last try failed: ${short(p.last_error)}`;
  return p.current ? `v${p.version} on the job${made}` : `v${p.version} on the job${made}. Being redone in the new layout`;
}

/**
 * Every upcoming install and its pack, each with a link to see the pack as
 * it would be made now (/api/portal/install-pack). A plain link, not <Link>:
 * Link prefetches, and each prefetch would build a PDF and pull the job's
 * photos from ServiceTitan.
 */
export function PackList({ packs }: { packs: PackStatus[] }) {
  if (!packs.length) return <p className="au-sub">No installs booked with a visit still to come.</p>;
  return (
    <div className="au-rules" aria-label="Install packs on upcoming installs">
      {packs.map((p) => (
        <div key={p.job_id} className="au-item">
          <div>
            <b>Job {p.job_number ?? p.job_id} · {dayTimeLabel(p.appointment_start)}</b>
            <p className="au-meta">{[p.job_type, p.customer_name, p.estimate_id == null ? "no sold quote" : null].filter(Boolean).join(" · ")}</p>
            <p className="au-meta">{packSays(p)}</p>
          </div>
          <a className="pk-btn g" href={`/api/portal/install-pack?job=${encodeURIComponent(p.job_number ?? String(p.job_id))}`} target="_blank" rel="noopener">View pack</a>
        </div>
      ))}
    </div>
  );
}
