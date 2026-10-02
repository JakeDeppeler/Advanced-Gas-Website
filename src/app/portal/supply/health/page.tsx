import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { checkServiceTitan, type CheckReport } from "@/lib/dashboard/stCheck";
import { serviceTitanConfigured } from "@/lib/dashboard/servicetitan";

// The check calls ServiceTitan for real, which is the point of it — so this
// page is never cached and is slower than the rest of the portal.
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "Connection check — Team portal" };

function Mark({ status }: { status: "ok" | "failed" | "skipped" }) {
  const label = status === "ok" ? "Working" : status === "failed" ? "Failed" : "Not checked";
  return <span className={`pt-sup__badge pt-sup__badge--chk-${status}`}>{label}</span>;
}

export default async function SupplyHealthPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) redirect("/portal?denied=1");

  const configured = serviceTitanConfigured();
  let report: CheckReport | null = null;
  let failure: string | null = null;
  if (configured) {
    try {
      report = await checkServiceTitan();
    } catch (e) {
      // Never echo an upstream body here: a ServiceTitan auth error can carry
      // the client id, and this page is read by the whole office.
      failure = e instanceof Error ? e.message : "The check could not be run.";
    }
  }

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/supply" label="Supply" />
      <div className="pt-head">
        <div className="pt-head__eyebrow">Connection check</div>
        <h1>Is ServiceTitan answering?</h1>
        <p>
          Run fresh every time you open this page. It walks the stages in order — credentials present, credentials
          well-formed, token exchange, then one real call per scope — and stops at the first failure, because
          everything after it would fail for the same reason.
        </p>
      </div>

      {!configured && (
        <section className="pt-panel">
          <h2 className="pt-panel__h">No credentials set</h2>
          <p className="pt-panel__sub">
            The four <code>ST_*</code> values aren&rsquo;t on the server, so there is nothing to check. Where each one
            comes from is step 4 of <code>DASHBOARD.md</code>. Until they&rsquo;re set the pricebook sync and every
            ServiceTitan tile on the wall board sit idle; the Reece price file and item search still work.
          </p>
        </section>
      )}

      {failure && (
        <div className="pt-note">
          <strong>The check couldn&rsquo;t complete.</strong> {failure}
        </div>
      )}

      {report && (
        <>
          <section className="pt-panel">
            <h2 className="pt-panel__h">
              {report.linked ? "Linked" : "Not linked"}
              <Mark status={report.linked ? "ok" : "failed"} />
            </h2>
            <p className="pt-panel__sub">
              {report.linked
                ? "Every endpoint answered. The counts below are what the tenant actually holds."
                : "At least one stage failed. The first failure is the one to fix — the rest follow from it."}
            </p>
            <dl className="pt-sup__dl">
              <dt>Auth host</dt>
              <dd>{report.environment.authUrl}</dd>
              <dt>API host</dt>
              <dd>{report.environment.apiBase}</dd>
              <dt>Credentials present</dt>
              <dd>
                {Object.entries(report.credentials)
                  .map(([k, v]) => `${k} ${v ? "✓" : "✗"}`)
                  .join(" · ")}
              </dd>
            </dl>
          </section>

          <section className="pt-panel">
            <h2 className="pt-panel__h">Stages</h2>
            <div className="pt-tgt__tablewrap">
              <table className="pt-tgt__table pt-sup__chk">
                <thead>
                  <tr>
                    <th>Stage</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {report.stages.map((s) => (
                    <tr key={s.stage} className={s.status === "failed" ? "is-key" : undefined}>
                      <th scope="row">
                        <strong>{s.stage}</strong>
                        {(s.detail || s.fix) && <span>{s.fix ?? s.detail}</span>}
                      </th>
                      <td>
                        <Mark status={s.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="pt-panel">
            <h2 className="pt-panel__h">What each scope is holding up</h2>
            <p className="pt-panel__sub">
              A missing scope shows as a bare 403 on whichever call runs first, which is why these are probed one at a
              time. <strong>Pricebook</strong> is the one the Reece sync needs.
            </p>
            <div className="pt-tgt__tablewrap">
              <table className="pt-tgt__table pt-sup__chk">
                <thead>
                  <tr>
                    <th>Resource</th>
                    <th>Records</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {report.resources.map((r) => (
                    <tr key={r.resource} className={r.status === "failed" ? "is-key" : undefined}>
                      <th scope="row">
                        <strong>{r.resource}</strong>
                        <span>
                          {r.scope} · {r.usedFor}
                          {r.fix ? ` — ${r.fix}` : ""}
                        </span>
                      </th>
                      <td>{r.records == null ? "—" : r.records.toLocaleString("en-AU")}</td>
                      <td>
                        <Mark status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </PortalShell>
  );
}
