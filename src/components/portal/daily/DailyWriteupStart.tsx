import type { WriteupRow } from "@/lib/daily/summary";
import { WriteupRows } from "@/components/portal/daily/DailyTools";

/**
 * The write-up's way in, as home-screen cards: a job number to open, and the
 * latest write-ups beside it to go back to one. With a job open it's one slim
 * card, so the write-up itself sits near the top.
 */
export function DailyWriteupStart({ job, recent, compact }: { job: string; recent: WriteupRow[] | null; compact: boolean }) {
  const form = (
    <form className="dt-find" action="/portal/jobs/write-up" method="get">
      <label htmlFor="jw-job">Job number</label>
      <input id="jw-job" name="job" inputMode="numeric" defaultValue={job} placeholder="e.g. 20912" autoComplete="off" />
      <button type="submit">{job ? "Open another" : "Open"}</button>
    </form>
  );
  if (compact) return <section className="rp-panel rp-card dt-slim" style={{ ["--i" as string]: 1 }} aria-label="Open a job">{form}</section>;
  return (
    <div className="dt-grid">
      <section className="rp-panel rp-card" style={{ ["--i" as string]: 1 }} aria-labelledby="dt-open">
        <div className="rp-panel-h"><span className="rp-hh"><b id="dt-open">Open a job</b><span className="rp-note">The job summary and the labour line, written from your notes and what’s in ServiceTitan</span></span></div>
        {form}
        <p className="rp-note dt-gap">Nothing changes in ServiceTitan until you’ve read it and pressed the button, and each time can be undone.</p>
      </section>
      <section className="rp-panel rp-card" style={{ ["--i" as string]: 2 }} aria-labelledby="dt-late">
        <div className="rp-panel-h"><span className="rp-hh"><b id="dt-late">Lately</b><span className="rp-note">The last write-ups, to open again</span></span></div>
        {recent == null ? <p className="rp-empty">Couldn’t read the write-ups just now.</p> : recent.length ? <WriteupRows rows={recent} /> : <p className="rp-empty">None written yet.</p>}
      </section>
    </div>
  );
}
