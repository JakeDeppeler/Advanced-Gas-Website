import type { ReactNode } from "react";
import { KpiRow, type Kpi } from "@/components/portal/kit/Kit";

/**
 * A settings page's header, in the Overview's clothes: where you are above the
 * title, the page's few figures beside it in round icons, one plain line under
 * it, and the long explanation behind "What does this mean?" so it's there for
 * whoever wants it without pushing the page down for everyone else.
 */
export function PageHead({ title, hi, line, info, action, kpis }: { title: ReactNode; hi?: ReactNode; line?: ReactNode; info?: ReactNode; action?: ReactNode; kpis?: Kpi[] }) {
  return (
    <header className="ph2 rp-card" style={{ ["--i" as string]: 0 }}>
      <div className="ph2-top">
        <div className="rp-title">
          {hi && <span className="rp-hi">{hi}</span>}
          <h1>{title}</h1>
        </div>
        {kpis && kpis.length > 0 && <KpiRow kpis={kpis} />}
      </div>
      {(line || info || action) && (
        <div className="ph2-sub">
          {line && <p>{line}</p>}
          <div className="ph2-acts">
            {info && (
              <details className="pk-info">
                <summary><span aria-hidden="true">i</span>What does this mean?</summary>
                <div className="pk-infop ph2-info">{info}</div>
              </details>
            )}
            {action}
          </div>
        </div>
      )}
    </header>
  );
}
