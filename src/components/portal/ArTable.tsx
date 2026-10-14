import { AR_BANDS, arOverdue, type ArReport } from "@/lib/portal/ar";

const money = (n: number) => (n > 0 ? `$${Math.round(n).toLocaleString("en-AU")}` : "");
const full = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;

/**
 * Accounts receivable, laid out as the ServiceTitan report lays it out: a row
 * per customer, a column per ageing band, and the summary of those bands
 * underneath.
 *
 * Empty cells are left blank rather than printed as "$0". An AR grid is read
 * by running an eye down a column for the numbers that are there, and a page of
 * zeroes is a page with nothing to find in it — which is exactly how the
 * printed report does it too.
 */
export function ArTable({
  report,
  partial,
  termsDays,
}: {
  report: ArReport;
  partial?: string | null;
  /** Past this many days a row is marked as having broken the terms. */
  termsDays?: number | null;
}) {
  const { rows, totals, total } = report;
  const overdue = arOverdue(totals);

  if (rows.length === 0) {
    return <p className="pt-note">Nothing is owed.</p>;
  }

  return (
    <>
      <div className="pt-ar__wrap">
        <table className="pt-ar">
          <caption className="pt-ar__cap">
            Accounts receivable · {report.customers} {report.customers === 1 ? "customer" : "customers"} ·{" "}
            {report.invoices} {report.invoices === 1 ? "invoice" : "invoices"}
            {partial ? ` · ${partial}` : ""}
          </caption>
          <thead>
            <tr>
              <th scope="col">Customer</th>
              {AR_BANDS.map((b) => (
                <th key={b.key} scope="col" className="pt-ar__n">
                  {b.short}
                </th>
              ))}
              <th scope="col" className="pt-ar__n pt-ar__tot">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              /* Marked on the terms first where there are terms: a domestic
                 invoice at twelve days sits in the 1–30 column and looks like
                 everything else, and the whole point of the rule is that it
                 isn't. */
              <tr
                key={r.customer}
                className={
                  r.worst === "d90" || r.worst === "d61_90"
                    ? "is-bad"
                    : termsDays != null && r.oldestDays > termsDays
                      ? "is-warn"
                      : r.worst === "d31_60"
                        ? "is-warn"
                        : undefined
                }
              >
                <th scope="row">
                  {r.customer}
                  {termsDays != null && r.oldestDays > termsDays ? (
                    <span className="pt-ar__over">{r.oldestDays} days — past {termsDays}</span>
                  ) : (
                    r.invoices > 1 && <span className="pt-ar__inv">{r.invoices} invoices</span>
                  )}
                </th>
                {AR_BANDS.map((b) => (
                  <td key={b.key} className={`pt-ar__n${r.bands[b.key] > 0 && b.key !== "current" ? " is-on" : ""}`}>
                    {money(r.bands[b.key])}
                  </td>
                ))}
                <td className="pt-ar__n pt-ar__tot">{full(r.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              {AR_BANDS.map((b) => (
                <td key={b.key} className="pt-ar__n">{money(totals[b.key])}</td>
              ))}
              <td className="pt-ar__n pt-ar__tot">{full(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* The summary band, as the report prints it at the foot: each age and
          what is in it, with the share of the whole under each — because
          "$97,362" means one thing against a $149K book and another against a
          $900K one. */}
      <section className="pt-arsum" aria-label="Accounts Receivable (Summary)">
        <div className="pt-arsum__head">
          <h3>Accounts Receivable (Summary)</h3>
          <span>
            {full(total)} owed · {overdue > 0 ? `${full(overdue)} of it past due` : "none of it past due"}
          </span>
        </div>
        <div className="pt-arsum__row">
          {AR_BANDS.map((b) => {
            const v = totals[b.key];
            const share = total > 0 ? v / total : 0;
            const bad = b.key === "d61_90" || b.key === "d90";
            return (
              <div key={b.key} className={`pt-arsum__cell${v === 0 ? " is-empty" : bad ? " is-bad" : b.key === "d31_60" ? " is-warn" : ""}`}>
                <span className="pt-arsum__lbl">{b.label}</span>
                <strong>{v > 0 ? full(v) : "—"}</strong>
                <span className="pt-arsum__bar"><i style={{ width: `${Math.round(share * 100)}%` }} /></span>
                {/* "0% of the book" against $468 is arithmetically true and
                    reads as nothing owed. Anything real that rounds to zero
                    says so as "under 1%". */}
                <span className="pt-arsum__pc">
                  {v <= 0
                    ? "nothing here"
                    : share < 0.005
                      ? "under 1% of the book"
                      : `${Math.round(share * 100)}% of the book`}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
