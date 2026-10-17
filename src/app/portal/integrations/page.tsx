import { PageHead } from "@/components/portal/kit/PageHead";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { listIntegrations, type IntegrationState } from "@/lib/portal/integrations";
import { Locked } from "@/components/portal/Locked";

export const dynamic = "force-dynamic";
export const metadata = { title: "Integrations · Team portal" };

const TONE: Record<IntegrationState, string> = { working: "ok", attention: "warn", off: "none" };

/** "4 min ago", "3 hours ago", "2 Oct" — the resolution somebody checking a connection wants. */
function ago(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const m = Math.round((Date.now() - t) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 24 * 60) return `${Math.round(m / 60)} hour${Math.round(m / 60) === 1 ? "" : "s"} ago`;
  return new Date(t).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Melbourne" });
}

/**
 * Every outside system the portal and the board run on, in one place.
 *
 * Before this, finding out whether ServiceTitan was syncing meant the Supply
 * connection check, Xero meant Finance, the board meant the dot in its own
 * header, and Instagram meant noticing the feed had gone quiet.
 */
export default async function IntegrationsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Integrations" forWhom="managers" />;

  const rows = await listIntegrations();
  const count = (s: IntegrationState) => rows.filter((r) => r.state === s).length;
  // Worst first: the one that needs a person is the reason anyone opens this.
  const order: Record<IntegrationState, number> = { attention: 0, working: 1, off: 2 };
  const sorted = [...rows].sort((a, b) => order[a.state] - order[b.state]);

  return (
    <PortalShell user={user}>
      <div className="sx">
      <PageHead hi="Settings" title="Integrations" kpis={[
        { icon: "check", fig: String(count("working")), label: "Working" },
        { icon: "alert", fig: String(count("attention")), label: count("attention") ? "Need a look, listed first" : "Need a look", ...(count("attention") ? { badge: "Look", tone: "down" as const } : {}) },
        { icon: "plug", fig: String(count("off")), label: "Not connected yet" },
      ]} line="Every outside system the business runs on, and whether it's working."
        info={<p>Read from what each one last sent; opening this page doesn&rsquo;t call any of them. Keys and passwords live in the hosting settings, never here.</p>} />

      <div className="pt-integ">
        {sorted.map((r) => (
          <section key={r.k} className={`pt-panel pt-integ__row is-${r.state}`}>
            <div className="pt-integ__main">
              <div className="pt-integ__top">
                <h2 className="pt-panel__h">{r.name}</h2>
                <span className={`pt-vstat pt-vstat--${TONE[r.state]}`}>{r.status}</span>
              </div>
              <p className="pt-integ__does">{r.does}</p>
              <ul className="pt-integ__facts">
                {r.facts.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </div>
            <div className="pt-integ__side">
              <div>
                <span className="pt-integ__k">Last heard from</span>
                <strong>{ago(r.at) ?? ""}</strong>
              </div>
              <div>
                <span className="pt-integ__k">Shows up in</span>
                <span className="pt-integ__feeds">
                  {r.feeds.map((f) => <Link key={f.href} href={f.href}>{f.label}</Link>)}
                </span>
              </div>
              {r.action && (
                r.action.external
                  ? <a href={r.action.href} target="_blank" rel="noreferrer" className="pt-btn pt-btn--ghost pt-btn--sm">{r.action.label} ↗</a>
                  : <Link href={r.action.href} className="pt-btn pt-btn--ghost pt-btn--sm">{r.action.label} →</Link>
              )}
            </div>
          </section>
        ))}
      </div>

      <p className="pt-panel__sub" style={{ marginTop: 18 }}>
        Keys and passwords live in the hosting settings, never here. This page only knows whether each one is set.
      </p>
    </div>
    </PortalShell>
  );
}
