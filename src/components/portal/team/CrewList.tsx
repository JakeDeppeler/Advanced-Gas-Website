import Link from "next/link";
import type { CrewNow } from "@/lib/portal/home/crewNow";

/** One person on the crew list, gathered by the Team page. */
export type CrewRow = {
  id: string; name: string; level: string; field: boolean;
  van: string | null;
  /** Where they are right now from today's appointments; null when they have none today. */
  now: CrewNow | null;
  /** On-site hours this week so far, and their rostered week; null when nothing to say. */
  week: { on: number; of: number | null } | null;
};

const initials = (n: string) => n.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });

/**
 * Where someone is, as a word on a pill and a line under it. The pill's
 * word carries it; the colour only repeats what it says.
 */
function rightNow(r: CrewRow): { k: string; w: string; line: string } {
  const c = r.now;
  const where = c?.job ? [c.job.suburb, c.job.type?.toLowerCase(), c.job.number ? `job ${c.job.number}` : null].filter(Boolean).join(" · ") : "";
  if (!c || c.bookedToday === 0) return r.field ? { k: "off", w: "Nothing booked", line: "no visits today" } : { k: "off", w: "In the office", line: "" };
  if (c.state === "working") return { k: "on", w: "On a job", line: where };
  if (c.state === "dispatched") return { k: "drive", w: "Driving", line: where ? `to ${where}` : "" };
  if (c.doneToday >= c.bookedToday) return { k: "off", w: "Done for the day", line: `all ${c.bookedToday} ${c.bookedToday === 1 ? "visit" : "visits"} done` };
  return { k: "off", w: "Between jobs", line: c.nextAt ? `next at ${time(c.nextAt)}${where ? ` · ${where}` : ""}` : where };
}

const Bar = ({ f, tone }: { f: number; tone?: string }) => (
  <span className={`cl-bar${tone ? ` ${tone}` : ""}`} aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(1, f)) * 100}%` }} /></span>
);

function Rows({ rows }: { rows: CrewRow[] }) {
  return (
    <>
      {rows.map((r) => {
        const n = rightNow(r);
        const c = r.now;
        return (
          <tr key={r.id}>
            <th scope="row">
              <span className="cl-who">
                <span className="cl-av" aria-hidden="true">{initials(r.name)}</span>
                <span><b>{r.name}</b><span>{[r.level, r.van].filter(Boolean).join(" · ")}</span></span>
              </span>
            </th>
            <td className="cl-van">{r.van ?? "—"}</td>
            <td><span className="cl-now"><span className={`cl-pill ${n.k}`}>{n.w}</span>{n.line && <span>{n.line}</span>}</span></td>
            <td>
              {c && c.bookedToday > 0
                ? <span className="cl-fig"><span>{c.doneToday} of {c.bookedToday} {c.bookedToday === 1 ? "visit" : "visits"}</span><Bar f={c.doneToday / c.bookedToday} /></span>
                : <span className="cl-fig"><span className="cl-dim">No visits</span>{r.field && <Bar f={0} />}</span>}
            </td>
            <td>
              {/* The office's week isn't on site, so its hours aren't held against a roster. */}
              {r.week && r.field
                ? <span className="cl-fig"><span>{Math.round(r.week.on)}{r.week.of ? ` of ${r.week.of}` : ""} hours</span><Bar f={r.week.of ? r.week.on / r.week.of : 0} tone="hrs" /></span>
                : r.week && r.week.on >= 0.05 ? <span className="cl-fig"><span>{r.week.on.toFixed(1)} hrs on a visit</span></span>
                : <span className="cl-dim">—</span>}
            </td>
            <td className="cl-open"><Link href={`/portal/team/${r.id}`} className="pk-btn g" aria-label={`Open ${r.name}'s file`}>Open</Link></td>
          </tr>
        );
      })}
    </>
  );
}

/**
 * The crew, as the mock has it: everyone on the tools, then the office.
 * Their van, where they are right now from today's ServiceTitan
 * appointments, today's visits, and this week's hours on site against their
 * rostered week. Each opens their file.
 */
export function CrewList({ rows, synced }: { rows: CrewRow[]; synced: boolean }) {
  const field = rows.filter((r) => r.field);
  const office = rows.filter((r) => !r.field);
  return (
    <section className="pk-card cl" aria-label="The crew">
      <div className="cl-wrap">
        <table className="cl-t">
          <thead>
            <tr><th scope="col">Who</th><th scope="col">Van</th><th scope="col">Right now</th><th scope="col">Today</th><th scope="col">This week on site</th><th scope="col"><span className="wo-sr">Their file</span></th></tr>
          </thead>
          {field.length > 0 && (
            <tbody>
              <tr className="cl-gh"><th scope="rowgroup" colSpan={5}>On the tools</th><td>{field.length}</td></tr>
              <Rows rows={field} />
            </tbody>
          )}
          {office.length > 0 && (
            <tbody>
              <tr className="cl-gh"><th scope="rowgroup" colSpan={5}>In the office</th><td>{office.length}</td></tr>
              <Rows rows={office} />
            </tbody>
          )}
        </table>
      </div>
      {!synced && <p className="cl-note">Today&rsquo;s appointments couldn&rsquo;t be read just now, so &ldquo;Right now&rdquo; is blank rather than guessed.</p>}
    </section>
  );
}
