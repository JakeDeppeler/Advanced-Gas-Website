import Link from "next/link";
import { Card, Empty, Pill, type Status } from "@/components/portal/kit/Kit";
import { stJobUrl } from "@/lib/dashboard/toBill";
import { xeroInvoiceUrl } from "@/lib/portal/xero";
import { importedAgainstXero, type ImportedCheck, type ImportedVerdict } from "@/lib/jobflow/imported";
import { STAGE } from "@/lib/jobflow/types";

const money = (v: number) => `$${Math.round(v).toLocaleString("en-AU")}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Melbourne" });
const SHOW = 10;

const VERDICT: Record<ImportedVerdict, { st: Status; act: string }> = {
  unbilled: { st: { k: "bad", w: "Not in Xero" }, act: "There's a charge on it and no invoice to this customer in Xero around then. Bill it, or note why not." },
  check: { st: { k: "mid", w: "Check it" }, act: "Xero has invoices to this customer around then, but none ties to this job. Look, then close it." },
  empty: { st: { k: "none", w: "Nothing on it" }, act: "No charge on it and nothing in Xero. Cancel it in ServiceTitan unless the work is still to do." },
  billed: { st: { k: "good", w: "Billed in Xero" }, act: "Billed. Complete or cancel it in ServiceTitan so it stops showing as open." },
};

const why = (c: ImportedCheck) =>
  c.match === "reference" ? `same reference (${c.reference})`
  : c.match === "amount" ? "same customer, same amount"
  : c.match === "customer" ? "invoices to this customer around then"
  : c.customer ? "no invoice to this customer from three months before to six weeks after"
  : "no customer on the job to look up";

function Line({ c }: { c: ImportedCheck }) {
  return (
    <div className="pk-kv pk-kv--act jf-row">
      <span className="t">
        <b>{[c.jobType ?? "Job", c.suburb].filter(Boolean).join(" · ")}</b>
        <span>{[c.jobNumber ? `#${c.jobNumber}` : null, c.customer, `${c.status === "Hold" ? "on hold" : c.status === "InProgress" ? "in progress" : "scheduled"}, last visit ${day(c.doneOn)}`].filter(Boolean).join(" · ")}</span>
        <span>
          {why(c)}
          {c.invoices.length > 0 && <>{": "}{c.invoices.map((i, n) => (
            <span key={i.id || i.number}>{n ? ", " : ""}<a href={xeroInvoiceUrl(i.id)} target="_blank" rel="noreferrer">{i.number}</a> {day(i.date)} {money(i.total)}</span>
          ))}</>}
        </span>
      </span>
      <Pill st={VERDICT[c.verdict].st} />
      <span className="v">{c.sold != null ? money(c.sold) : ""}</span>
      <span className="jf-row__go">
        <a className="pk-btn g" href={stJobUrl(c.id)} target="_blank" rel="noreferrer" aria-label={`Open job ${c.jobNumber ?? c.id} in ServiceTitan`}>ServiceTitan ↗</a>
        {c.customerId != null ? <Link className="pk-btn g" href={`/portal/customers/${c.customerId}`}>Customer</Link> : null}
      </span>
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

/** The list itself: null when Xero didn't answer. */
export function ImportedList({ checks }: { checks: ImportedCheck[] | null }) {
  const def = STAGE.imported;
  const count = (v: ImportedVerdict) => (checks ?? []).filter((c) => c.verdict === v);
  const unbilled = count("unbilled");
  const owed = unbilled.reduce((a, c) => a + (c.sold ?? 0), 0);
  return (
    <section id="imported" className="jf-stage">
      <Card title={def.label} aside={checks == null ? "Xero didn’t answer" : `${checks.length} · ${unbilled.length} not in Xero${owed ? ` (${money(owed)})` : ""} · ${count("check").length} to check · ${count("billed").length} billed`}>
        <p className="pk-note jf-rule"><b>Why it’s here:</b> {def.rule} <b>What to do:</b> {def.act}</p>
        {checks == null ? <Empty>Xero didn&rsquo;t answer, so these can&rsquo;t be checked just now. Nothing is called unbilled on a guess.</Empty>
          : checks.length === 0 ? <Empty>Every job from the old system is closed. ✓</Empty>
          : (
            <>
              {(["unbilled", "check", "empty", "billed"] as const).filter((v) => count(v).length).map((v) => (
                <p key={v} className="pk-note jf-verdict"><Pill st={VERDICT[v].st} /> {count(v).length}: {VERDICT[v].act}</p>
              ))}
              {checks.slice(0, SHOW).map((c) => <Line key={c.id} c={c} />)}
              {checks.length > SHOW && (
                <details className="jf-more">
                  <summary>Show the other {checks.length - SHOW}</summary>
                  {checks.slice(SHOW).map((c) => <Line key={c.id} c={c} />)}
                </details>
              )}
            </>
          )}
      </Card>
    </section>
  );
}
