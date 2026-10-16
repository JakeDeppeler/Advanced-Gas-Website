import Link from "next/link";
import { AGE_BANDS, oldOf, totalOf, type StuckView } from "@/lib/portal/stuckTypes";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
const count = (n: number) => n.toLocaleString("en-AU");

/**
 * One band of the page: a row of age columns with the totals above them.
 *
 * Counts and money are both optional because the three bands do not all have
 * both. Nothing finished-and-unbilled carries a value — the invoice is empty,
 * which is the whole point — so that band is counts, and saying "$0 of work
 * not billed" would be the most misleading number on the page.
 */
function Ages({ bands, withValue }: { bands: StuckView["owed"]["bands"]; withValue: boolean }) {
  const total = totalOf(bands);
  const worst = Math.max(1, ...AGE_BANDS.map((b) => bands[b.key].count));
  return (
    <div className="pt-stk__ages">
      {AGE_BANDS.map((b) => {
        const v = bands[b.key];
        const old = b.key === "d31_60" || b.key === "d60plus";
        return (
          <div key={b.key} className={`pt-stk__age${v.count === 0 ? " is-empty" : old ? " is-old" : ""}`}>
            <span className="pt-stk__agen">{count(v.count)}</span>
            {withValue && <span className="pt-stk__agev">{v.value > 0 ? money(v.value) : "—"}</span>}
            {/* A bar as well as the figure: five numbers in a row is a table,
                and the question is which column is growing. */}
            <span className="pt-stk__bar"><i style={{ width: `${Math.round((v.count / worst) * 100)}%` }} /></span>
            <span className="pt-stk__agel">{b.label}</span>
          </div>
        );
      })}
      <div className="pt-stk__age pt-stk__age--total">
        <span className="pt-stk__agen">{count(total.count)}</span>
        {withValue && <span className="pt-stk__agev">{total.value > 0 ? money(total.value) : "—"}</span>}
        <span className="pt-stk__bar" />
        <span className="pt-stk__agel">All of it</span>
      </div>
    </div>
  );
}

/**
 * Where the money is stuck between finishing a job and banking it.
 *
 * In the order the money moves: work finished and never billed, invoices out
 * and not paid, and jobs that have stopped before either. Each cut the same
 * way by how long it has been sitting, because the question the page exists to
 * answer is whether it is getting worse.
 */
export function Stuck({ v }: { v: StuckView }) {
  const unbilled = totalOf(v.unbilled.bands);
  const unbilledOld = oldOf(v.unbilled.bands);
  const owed = totalOf(v.owed.bands);
  const owedOld = oldOf(v.owed.bands);

  return (
    <>
      <div className="pt-stk__heads">
        <div className="pt-stk__head">
          <span className="pt-stk__lbl">Done, not billed</span>
          <strong>{count(unbilled.count)}</strong>
          <span className="pt-stk__sub">
            {unbilledOld.count > 0 ? `${count(unbilledOld.count)} over a month old` : "none over a month"}
          </span>
        </div>
        <div className="pt-stk__head pt-stk__head--navy">
          <span className="pt-stk__lbl">Billed, not paid</span>
          <strong>{money(owed.value)}</strong>
          <span className="pt-stk__sub">
            {count(owed.count)} {owed.count === 1 ? "invoice" : "invoices"} past due
            {v.owed.notDueYet.count > 0 ? ` · ${money(v.owed.notDueYet.value)} not due yet` : ""}
          </span>
        </div>
        <div className="pt-stk__head">
          <span className="pt-stk__lbl">On hold</span>
          <strong>{v.held ? count(v.held.jobs) : "—"}</strong>
          <span className="pt-stk__sub">
            {v.held ? `${count(v.held.onUs)} on us, ${count(v.held.onThem)} on the customer` : "nothing held"}
          </span>
        </div>
      </div>

      {/* 1 — done, not billed */}
      <section className="pt-panel">
        <div className="pt-panel__head">
          <h2 className="pt-panel__h">Done, not billed</h2>
          <span className="pt-panel__sub">
            Finished work with nothing on the invoice, by how long ago it was finished. Last {v.sinceDays} days.
          </span>
        </div>
        <Ages bands={v.unbilled.bands} withValue={false} />
        {/* No money on this band, said rather than left as a gap: an empty
            invoice has no value on it, and a zero here would read as "none of
            it is worth anything". */}
        <p className="pt-note">
          <strong>Counts only.</strong> None of these carry a value — the invoice is empty, which is exactly the
          problem. What they are worth is only known once somebody prices them.
          {v.unbilled.unknownType > 0 && (
            <>
              {" "}
              Another <strong>{count(v.unbilled.unknownType)}</strong> finished jobs have no job type on them at all and
              are left out: every one is over a month old, which is the shape of the ServiceTitan import rather than of
              a billing problem.
            </>
          )}
          {v.unbilled.quoteVisits > 0 && (
            <> {count(v.unbilled.quoteVisits)} quote visits and {count(v.unbilled.noCharge)} no-charge jobs are also
            out — neither is work anybody owes for.</>
          )}
        </p>
        {v.unbilled.oldest.length > 0 && (
          <table className="pt-table pt-stk__tbl">
            <thead>
              <tr>
                <th>Job</th>
                <th className="pt-stk__n">Finished</th>
              </tr>
            </thead>
            <tbody>
              {v.unbilled.oldest.map((j) => (
                <tr key={j.jobId}>
                  <td>
                    <strong>{j.who ?? j.what}</strong>
                    <span className="pt-stk__where">
                      {[j.jobNumber ? `#${j.jobNumber}` : null, j.what, j.where].filter(Boolean).join(" · ")}
                    </span>
                  </td>
                  <td className={`pt-stk__n${j.days > 30 ? " is-old" : ""}`}>{count(j.days)} days ago</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 2 — billed, not paid */}
      <section className="pt-panel">
        <div className="pt-panel__head">
          <h2 className="pt-panel__h">Billed, not paid</h2>
          <span className="pt-panel__sub">
            Invoices out with money still owing, by how long past their due date. ServiceTitan&rsquo;s ledger, from{" "}
            {new Date("2026-09-17").toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })} —
            anything older was a Xero invoice and is on the Money page.
          </span>
        </div>
        <Ages bands={v.owed.bands} withValue />
        {owedOld.value > 0 && (
          <p className="pt-note pt-note--warn">
            <strong>{money(owedOld.value)}</strong> of it is more than a month past due, across{" "}
            {count(owedOld.count)} {owedOld.count === 1 ? "invoice" : "invoices"}.
          </p>
        )}
        {v.owed.oldest.length > 0 && (
          <table className="pt-table pt-stk__tbl">
            <thead>
              <tr>
                <th>Invoice</th>
                <th className="pt-stk__n">Past due</th>
                <th className="pt-stk__n">Owing</th>
              </tr>
            </thead>
            <tbody>
              {v.owed.oldest.map((o) => (
                <tr key={o.jobId}>
                  <td>
                    <strong>{o.who ?? "Customer"}</strong>
                    <span className="pt-stk__where">{o.jobNumber ? `#${o.jobNumber}` : ""}</span>
                  </td>
                  <td className={`pt-stk__n${o.days > 30 ? " is-old" : ""}`}>{count(o.days)} days</td>
                  <td className="pt-stk__n">{money(o.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 3 — on hold */}
      <section className="pt-panel">
        <div className="pt-panel__head">
          <h2 className="pt-panel__h">On hold</h2>
          <span className="pt-panel__sub">
            Open jobs waiting on something, in the office&rsquo;s own tags. The wall board shows this one too.
          </span>
        </div>
        <p className="pt-note" style={{ margin: "0 0 12px" }}>
          <strong>What on hold means:</strong> the job is open but stopped — ServiceTitan has it on Hold, or it carries one of the hold tags
          (waiting on parts, on a quote to go out, on the customer, on an agent&rsquo;s approval). Until it moves, nobody can finish it, so it
          can&rsquo;t be billed and can&rsquo;t be paid: the money isn&rsquo;t late, it hasn&rsquo;t started.{" "}
          <strong>On us</strong> is a hold we can clear ourselves — order the part, send the quote, book the reattend.{" "}
          <strong>On the customer</strong> is waiting for their answer or their agent&rsquo;s.
        </p>
        {!v.held ? (
          <p className="pt-note">Nothing is held, or the tag list has not been set.</p>
        ) : (
          <>
            <table className="pt-table pt-stk__tbl">
              <thead>
                <tr>
                  <th>Waiting on</th>
                  <th className="pt-stk__n">Jobs</th>
                  <th className="pt-stk__n">Oldest</th>
                </tr>
              </thead>
              <tbody>
                {v.held.reasons.map((r) => (
                  <tr key={r.name}>
                    <td><strong>{r.name}</strong></td>
                    <td className="pt-stk__n">{count(r.jobs)}</td>
                    <td className={`pt-stk__n${r.oldestDays > 30 ? " is-old" : ""}`}>{count(r.oldestDays)} days</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="pt-note">
              <Link href="/portal/board/hold">Which tags count as held</Link> is set in the portal.
            </p>
          </>
        )}
      </section>
    </>
  );
}
