import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { listSyncRuns, type SyncRun } from "@/lib/pricebook/supply";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sync history — Team portal" };

const MEL = "Australia/Melbourne";
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { timeZone: MEL, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const count = (s: Record<string, unknown>, k: string): number | null => {
  const v = s[k];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};
const show = (v: number | null) => (v == null ? "—" : v.toLocaleString("en-AU"));

function took(run: SyncRun): string {
  if (!run.finishedAt) return "didn’t finish";
  const ms = Date.parse(run.finishedAt) - Date.parse(run.startedAt);
  if (!Number.isFinite(ms) || ms < 0) return "—";
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export default async function SupplySyncsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) redirect("/portal?denied=1");

  let runs: SyncRun[] = [];
  let dbReady = true;
  try {
    runs = await listSyncRuns(60);
  } catch {
    dbReady = false;
  }

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/supply" label="Supply" />
      <div className="pt-head">
        <div className="pt-head__eyebrow">Sync history</div>
        <h1>Every pricebook run<span className="pt-stop">.</span></h1>
        <p>
          A <strong>dry run</strong> works out what it would change and writes nothing. An <strong>apply</strong>{" "}
          writes it, one material at a time, and reads each one back — ServiceTitan returns a success for several
          fields it quietly ignores, so only the read-back proves anything.
        </p>
      </div>

      {!dbReady ? (
        <section className="pt-panel">
          <h2 className="pt-panel__h">Sync history</h2>
          <p className="pt-panel__sub">The database isn&rsquo;t reachable from here, so this page can&rsquo;t list the runs.</p>
        </section>
      ) : runs.length === 0 ? (
        <section className="pt-panel">
          <h2 className="pt-panel__h">Nothing has run yet</h2>
          <p className="pt-panel__sub">
            The nightly schedule only ever dry-runs. The first real run is the <em>Pricebook sync</em> workflow on the
            Actions tab — without <em>apply</em> ticked it is safe, and its summary page tables what it would change.
          </p>
        </section>
      ) : (
        <section className="pt-panel">
          <h2 className="pt-panel__h">Last {runs.length} runs</h2>
          <div className="pt-tgt__tablewrap">
            <table className="pt-tgt__table pt-sup__runs">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Matched</th>
                  <th>Updated</th>
                  <th>Created</th>
                  <th>Unchanged</th>
                  <th>Errors</th>
                  <th>Took</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => {
                  const errs = count(r.summary, "errors") ?? r.errors.length;
                  return (
                    <tr key={r.id} className={errs > 0 ? "is-key" : undefined}>
                      <th scope="row">
                        <strong>{when(r.startedAt)}</strong>
                        <span>
                          {r.mode === "apply" ? "Applied" : "Dry run"}
                          {r.changes.length > 0 ? ` · ${r.changes.length} change${r.changes.length === 1 ? "" : "s"} listed` : ""}
                        </span>
                      </th>
                      <td>{show(count(r.summary, "matched"))}</td>
                      <td>{show(count(r.summary, "updated"))}</td>
                      <td>{show(count(r.summary, "created"))}</td>
                      <td>{show(count(r.summary, "unchanged"))}</td>
                      <td>{errs > 0 ? errs : "—"}</td>
                      <td>{took(r)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {runs.some((r) => r.errors.length > 0) && (
            <div className="pt-sup__errs">
              <h3>What failed</h3>
              {runs
                .filter((r) => r.errors.length > 0)
                .slice(0, 5)
                .map((r) => (
                  <details key={r.id}>
                    <summary>
                      {when(r.startedAt)} — {r.errors.length} error{r.errors.length === 1 ? "" : "s"}
                    </summary>
                    <pre>{JSON.stringify(r.errors, null, 2)}</pre>
                  </details>
                ))}
            </div>
          )}
        </section>
      )}
    </PortalShell>
  );
}
