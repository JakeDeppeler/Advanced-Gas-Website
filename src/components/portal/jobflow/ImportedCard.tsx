import Link from "next/link";
import { Card, Empty, Pill, type Status } from "@/components/portal/kit/Kit";
import { stJobUrl } from "@/lib/dashboard/toBill";
import { xeroInvoiceUrl } from "@/lib/portal/xero";
import { importedAgainstXero, type ImportedCheck, type ImportedVerdict } from "@/lib/jobflow/imported";
import { STAGE } from "@/lib/jobflow/types";

const money = (v: number) => `$${Math.round(v).toLocaleString("en-AU")}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Melbourne" });
const VERDICT: Record<ImportedVerdict, { st: Status; head: string; act: string; open: boolean }> = {
  unbilled: { st: { k: "bad", w: "Not in Xero" }, head: "Charged, not in Xero", act: "Bill it, or note why not.", open: true },
  check: { st: { k: "mid", w: "Check it" }, head: "Maybe billed", act: "Xero has invoices to this customer around then; look, then close it.", open: true },
  empty: { st: { k: "none", w: "Nothing on it" }, head: "Nothing on it", act: "Cancel it in ServiceTitan unless the work is still to do.", open: false },
  billed: { st: { k: "good", w: "Billed in Xero" }, head: "Billed in Xero", act: "Complete or cancel it in ServiceTitan.", open: false },
};

const why = (c: ImportedCheck) =>
  c.match === "reference" ? `same reference (${c.reference})`
  : c.match === "amount" ? "same customer, same amount"
  : c.match === "customer" ? "invoices to them around then"
  : c.customer ? "nothing to this customer in Xero around then"
  : "no customer on the job";

/** One old job, one line, in the same shape as the tracker's other lists. */
function Line({ c }: { c: ImportedCheck }) {
  const title = [c.jobType ?? "Job", c.suburb].filter(Boolean).join(" · ");
  return (
    <div className="jf-line">
      <span className="t">
        <b>{c.customerId != null ? <Link href={`/portal/customers/${c.customerId}`}>{title}</Link> : title}</b>
        <span>
          {[c.jobNumber ? `#${c.jobNumber}` : null, c.customer, `last visit ${day(c.doneOn)}`, why(c)].filter(Boolean).join(" · ")}
          {c.invoices.length > 0 && <>{": "}{c.invoices.map((i, n) => (
            <span key={i.id || i.number}>{n ? ", " : ""}<a href={xeroInvoiceUrl(i.id)} target="_blank" rel="noreferrer">{i.number}</a> {money(i.total)}</span>
          ))}</>}
        </span>
      </span>
      <Pill st={VERDICT[c.verdict].st} />
      <span className="v">{c.sold != null ? money(c.sold) : ""}</span>
      <a className="pk-btn g jf-line__go" href={stJobUrl(c.id)} target="_blank" rel="noreferrer" aria-label={`Open job ${c.jobNumber ?? c.id} in ServiceTitan`}>Open ↗</a>
    </div>
  );
}

/**
 * The jobs the old system left open, each against Xero. Its own server
 * component inside a Suspense, so the rest of the tracker never waits on Xero.
 */
export async function ImportedCard({ nowMs }: { nowMs: number }) {
  return <ImportedList checks={await importedAgainstXero(nowMs).catch(() => null)} />;
}

/**
 * The list itself, in four groups by what Xero says, each with its one thing
 * to do. The two that need a decision are open; the two that only need
 * closing in ServiceTitan are folded, so the money is what's read first.
 * Null when Xero didn't answer.
 */
export function ImportedList({ checks }: { checks: ImportedCheck[] | null }) {
  const def = STAGE.imported;
  const of = (v: ImportedVerdict) => (checks ?? []).filter((c) => c.verdict === v);
  const owed = of("unbilled").reduce((a, c) => a + (c.sold ?? 0), 0);
  return (
    <Card title={def.label} aside={checks == null ? "Xero didn’t answer" : `${checks.length}${owed ? ` · ${money(owed)} not in Xero` : ""}`}>
      <p className="jf-do"><b>To do:</b> {def.act}</p>
      {checks == null ? <Empty>Xero didn&rsquo;t answer, so these can&rsquo;t be checked just now. Nothing is called unbilled on a guess.</Empty>
        : checks.length === 0 ? <Empty>Every job from the old system is closed. ✓</Empty>
        : (["unbilled", "check", "empty", "billed"] as const).filter((v) => of(v).length).map((v) => (
          <details key={v} className="jf-group" open={VERDICT[v].open}>
            <summary><b>{VERDICT[v].head}</b> <span className="jf-group__n">{of(v).length}</span> <span className="jf-group__act">{VERDICT[v].act}</span></summary>
            <div className="jf-lines">{of(v).map((c) => <Line key={c.id} c={c} />)}</div>
          </details>
        ))}
      <div className="jf-foot">
        <details className="jf-why"><summary>How a job ends up here</summary><p>{def.rule} Each is looked up in Xero by reference, then by customer and amount, then by customer around the date.</p></details>
      </div>
    </Card>
  );
}
