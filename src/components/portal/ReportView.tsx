import type { Report } from "@/lib/reports/types";

/** A report's sections, as the email lays them out: label, figure, the line under it. */
export function ReportView({ r }: { r: Report }) {
  return (
    <div className="pt-rpt__sections">
      {r.sections.map((s) => (
        <section key={s.title} className="pt-panel pt-rpt__sec">
          <h2 className="pt-panel__h">{s.title}</h2>
          <dl className="pt-rpt__lines">
            {s.lines.map((l) => (
              <div key={l.label} className="pt-rpt__line">
                <dt>
                  {l.label}
                  {l.sub && <span>{l.sub}</span>}
                </dt>
                <dd className={l.tone === "bad" ? "is-bad" : l.tone === "good" ? "is-good" : undefined}>{l.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
