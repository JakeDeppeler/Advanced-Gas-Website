import { Card, Empty, Pill, type Status } from "@/components/portal/kit/Kit";
import { oldJobsAgainstXero, type XeroCheck } from "@/lib/portal/run/xeroBilled";
import { stJobUrl } from "@/lib/dashboard/toBill";
import { xeroInvoiceUrl } from "@/lib/portal/xero";

const money = (v: number) => `$${Math.round(v).toLocaleString("en-AU")}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Melbourne" });

const VERDICT: Record<XeroCheck["match"], Status> = {
  none: { k: "bad", w: "Not in Xero" },
  customer: { k: "mid", w: "Check it" },
  amount: { k: "good", w: "Billed in Xero" },
  reference: { k: "good", w: "Billed in Xero" },
};

const why = (c: XeroCheck) =>
  c.match === "reference" ? `same reference as the job (${c.reference})`
  : c.match === "amount" ? "same customer, same amount"
  : c.match === "customer" ? "invoices to this customer around then — nothing ties one to this job"
  : c.customer ? "no invoice to this customer from three months before to six weeks after"
  : "no customer on the job to look up in Xero";

/**
 * Jobs finished before ServiceTitan took over invoicing, each against Xero.
 * Its own server component inside a Suspense, so the To bill list above it
 * never waits on Xero.
 */
export async function XeroBilledCard() {
  const r = await oldJobsAgainstXero().catch(() => null);
  if (!r) {
    return <Card title="Before 17 September — checked against Xero"><Empty>Xero didn&rsquo;t answer, so the older jobs can&rsquo;t be checked just now.</Empty></Card>;
  }
  const none = r.checks.filter((c) => c.match === "none");
  const maybe = r.checks.filter((c) => c.match === "customer");
  const ok = r.checks.filter((c) => c.match === "amount" || c.match === "reference");
  const shown = [...none, ...maybe];

  return (
    <Card title="Before 17 September — checked against Xero" aside={`${none.length} not found · ${maybe.length} to check · ${ok.length} billed`}>
      <p className="pk-note" style={{ margin: "0 0 10px" }}>
        Jobs finished between 1 July and 16 September were invoiced in Xero, so ServiceTitan shows them all at $0. Each one with a $0 invoice is
        looked up in Xero: by the agent&rsquo;s reference where the job has one, then by customer and amount, then by customer around the date.
        {" "}<b>Not in Xero</b> means no invoice to that customer at all from three months before the job to six weeks after — those are the ones to chase.
      </p>
      {shown.length === 0 ? <Empty>Every older job has its invoice in Xero.</Empty> : shown.map((c) => (
        <div className="pk-kv pk-kv--act" key={c.id}>
          <span className="t">
            <b>{[c.jobType ?? "Job", c.suburb].filter(Boolean).join(" · ")}</b>
            <span>{[c.jobNumber ? `#${c.jobNumber}` : null, c.customer, `finished ${day(c.doneOn)}`, c.sold ? `sold ${money(c.sold)}` : null].filter(Boolean).join(" · ")}</span>
            <span>
              {why(c)}
              {c.invoices.length > 0 && <>{": "}{c.invoices.map((i, n) => (
                <span key={i.id || i.number}>{n ? ", " : ""}<a href={xeroInvoiceUrl(i.id)} target="_blank" rel="noreferrer">{i.number}</a> {day(i.date)} {money(i.total)}</span>
              ))}</>}
            </span>
          </span>
          <Pill st={VERDICT[c.match]} />
          <a className="pk-btn g" href={stJobUrl(c.id)} target="_blank" rel="noreferrer" aria-label={`Open job ${c.jobNumber ?? c.id} in ServiceTitan`}>Open in ServiceTitan ↗</a>
        </div>
      ))}
      {ok.length > 0 && (
        <details className="pk-more" style={{ marginTop: 10 }}>
          <summary>{ok.length} found in Xero</summary>
          {ok.map((c) => (
            <div className="pk-kv" key={c.id}>
              <span className="t">
                <b>{[c.jobType ?? "Job", c.suburb].filter(Boolean).join(" · ")}</b>
                <span>{[c.jobNumber ? `#${c.jobNumber}` : null, c.customer, `finished ${day(c.doneOn)}`].filter(Boolean).join(" · ")} · {why(c)}: {c.invoices.map((i, n) => (
                  <span key={i.id || i.number}>{n ? ", " : ""}<a href={xeroInvoiceUrl(i.id)} target="_blank" rel="noreferrer">{i.number}</a></span>
                ))}</span>
              </span>
              <Pill st={VERDICT[c.match]} />
            </div>
          ))}
        </details>
      )}
    </Card>
  );
}
