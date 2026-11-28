import Link from "next/link";
import type { NextTalk, Writeups, WriteupRow } from "@/lib/daily/summary";
import { inDays } from "@/lib/daily/summary";

/**
 * Daily tools, opened: a card per tool in the home screen's clothes (Jake,
 * 28 Nov), each with what's live in it and a ↗ into it, so the box you pick
 * from also says where each tool is up to. Only the tools this person can
 * open are passed in; a tool that isn't gets no card.
 */
export type ToolLinks = { writeup?: string; ducted?: string; trade?: string; toolbox?: string };

const KIND: Record<string, string> = { estimate: "Quote", invoice: "Invoice" };
const STATE: Record<string, { w: string; c?: "good" | "bad" }> = {
  done: { w: "Put on", c: "good" }, started: { w: "Started" }, restored: { w: "Put back", c: "bad" }, undone: { w: "Undone" }, failed: { w: "Didn’t go on", c: "bad" },
};
const shortDay = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Melbourne" });

export function WriteupRows({ rows }: { rows: WriteupRow[] }) {
  return (
    <ul className="dt-list">
      {rows.map((r, i) => {
        const st = STATE[r.status] ?? { w: r.status };
        return (
          <li key={i}>
            <Link className="dt-row" href={r.job_number ? `/portal/jobs/write-up?job=${encodeURIComponent(r.job_number)}` : "/portal/jobs/write-up"}>
              <span className="t"><b>Job {r.job_number ?? "—"} · {KIND[r.doc_kind] ?? r.doc_kind}</b><span>{r.created_by ? `${r.created_by.split(/\s+/)[0]} · ` : ""}{shortDay(r.created_at)}</span></span>
              <span className={`dt-tag${st.c ? ` ${st.c}` : ""}`}>{st.w}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function DailyTools({ links, writeups, talk, faults }: { links: ToolLinks; writeups: Writeups | null; talk: NextTalk | null; faults: { codes: number; brands: number } }) {
  return (
    <div className="dt-grid">
      <div className="dt-col">
        {links.writeup && (
          <section className="rp-panel rp-card" style={{ ["--i" as string]: 1 }} aria-labelledby="dt-wu">
            <div className="rp-panel-h">
              <span className="rp-hh"><b id="dt-wu">Job write-up</b><span className="rp-note">The summary and one labour price for a job’s quote or invoice</span></span>
              <Link href={links.writeup} className="rp-round" aria-label="Open the write-up">↗</Link>
            </div>
            <form className="dt-find" action={links.writeup} method="get">
              <label htmlFor="dt-job">Job number</label>
              <input id="dt-job" name="job" inputMode="numeric" placeholder="e.g. 20912" autoComplete="off" />
              <button type="submit">Write it up</button>
            </form>
            {writeups == null ? (
              <p className="rp-empty">Couldn’t read the write-ups just now.</p>
            ) : writeups.recent.length ? (
              <>
                <div className="rp-big sm"><span className="rp-num">{writeups.month}</span><span>put on in {writeups.monthName}{writeups.putBack ? <> · <b>{writeups.putBack}</b> put back or undone</> : null}</span></div>
                <WriteupRows rows={writeups.recent} />
              </>
            ) : (
              <p className="rp-empty">None written yet. Put in a job number to write its first.</p>
            )}
          </section>
        )}
        {links.ducted && (
          <section className="rp-panel rp-card" style={{ ["--i" as string]: 3 }} aria-labelledby="dt-dq">
            <div className="rp-panel-h">
              <span className="rp-hh"><b id="dt-dq">Ducted quote</b><span className="rp-note">A ducted system priced from the duct plan, onto the job in ServiceTitan</span></span>
              <Link href={links.ducted} className="rp-round" aria-label="Open the ducted quote">↗</Link>
            </div>
            <ol className="dt-steps">
              <li>Drop in the designer’s plan drawing or materials CSV, with what you know about the job.</li>
              <li>Check what it read: the outlets, zones, dampers and runs.</li>
              <li>Put the quote on the job by its number. It goes on unsent, in its groups.</li>
            </ol>
          </section>
        )}
      </div>
      <div className="dt-col">
        {links.toolbox && (
          <section className="rp-panel rp-year rp-card" style={{ ["--i" as string]: 2 }} aria-labelledby="dt-tb">
            <div className="rp-panel-h"><b id="dt-tb">Next toolbox talk</b><Link href={links.toolbox} className="rp-round" aria-label="Open toolbox talks">↗</Link></div>
            {talk ? (
              <>
                <div className="dt-talk-day">{talk.day}</div>
                <p className="dt-talk-line">{inDays(talk.days)[0].toUpperCase() + inDays(talk.days).slice(1)}{talk.time ? ` at ${talk.time}` : ""} · <b>{talk.topics ? `${talk.topics} ${talk.topics === 1 ? "topic" : "topics"}` : "no topics yet"}</b>{talk.held ? ` · ${talk.held} more on hold` : ""}</p>
              </>
            ) : (
              <p className="dt-talk-line">No talk on the schedule. Set how often in Toolbox talks.</p>
            )}
          </section>
        )}
        {links.trade && (
          <section className="rp-panel rp-card" style={{ ["--i" as string]: 4 }} aria-labelledby="dt-tt">
            <div className="rp-panel-h">
              <span className="rp-hh"><b id="dt-tt">Trade tools</b><span className="rp-note">For on site and for the quote</span></span>
              <Link href={links.trade} className="rp-round" aria-label="Open the trade tools">↗</Link>
            </div>
            <ul className="dt-list">
              {[
                ["Fault codes", `${faults.codes} codes across ${faults.brands} brands`, "/portal/tools/fault-codes"],
                ["Heat pump sizing", "Size a tank off shower draw-off, not bedroom count", "/portal/tools/heat-pump-sizing"],
                ["VEU rebate", "Ballpark the rebate before a site visit", "/portal/tools/veu-rebate-estimator"],
                ["Running cost", "Heat pump against gas, for the quote", "/portal/tools/running-cost-calculator"],
              ].map(([t, s, h]) => (
                <li key={h}><Link className="dt-row" href={h}><span className="t"><b>{t}</b><span>{s}</span></span><span className="rp-round" aria-hidden="true">↗</span></Link></li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
