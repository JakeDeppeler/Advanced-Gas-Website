import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { dbConfigured, listWebLeads } from "@/lib/portal/db";
import { classifyLead } from "@/lib/portal/leadSource";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marketing — Team portal" };

/**
 * Marketing, as its own section rather than a page inside Finance.
 *
 * The design draws thirteen screens here. Two of them are answerable from what
 * the business records; the rest would need stores that do not exist, and this
 * page says which rather than drawing eleven charts of nothing. The note at the
 * bottom is the honest version of a roadmap: what each one needs before it can
 * be more than a picture.
 */
export default async function MarketingPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) redirect("/portal?denied=1");

  // A year back, so the all-time figure is a real count rather than a cap.
  const yearAgo = new Date(Date.now() - 365 * 86_400_000).toISOString();
  const leads = dbConfigured() ? await listWebLeads(yearAgo).catch(() => []) : [];
  const cutoff = Date.now() - 30 * 86_400_000;
  const recent = leads.filter((l) => Date.parse(l.createdAt) >= cutoff);

  // Classified off the UTM tags the link carried. `label` is what the function
  // decided to call it, which already reads for a person.
  const bySource = new Map<string, number>();
  for (const l of recent) {
    const label = classifyLead(l.utm).label;
    bySource.set(label, (bySource.get(label) ?? 0) + 1);
  }
  const sources = [...bySource.entries()].sort((a, b) => b[1] - a[1]);
  const topSource = Math.max(1, ...sources.map((x) => x[1]));

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />
      <PortalTabs set="marketing" />

      <div className="pt-head">
        <h1>What the website brings in</h1>
        <p>
          Every quote request and phone tap — where they came from and when. No customer details here; the enquiry
          still goes to the inbox.
        </p>
      </div>

      <div className="pt-alerts">
        <div className="pt-alert">
          <span>{recent.length}</span>
          <strong>Enquiries</strong>
          <em>Last 30 days</em>
        </div>
        <div className="pt-alert">
          <span>{leads.length}</span>
          <strong>This year</strong>
          <em>The last twelve months</em>
        </div>
        <div className="pt-alert">
          <span>{sources.length}</span>
          <strong>Sources</strong>
          <em>Search, ads, direct and the rest</em>
        </div>
      </div>

      {sources.length > 0 && (
        <section className="pt-panel">
          <h2 className="pt-panel__h">Where they came from</h2>
          <p className="pt-panel__sub">Classified off the UTM tags the link carried, over the last 30 days.</p>
          <div className="pt-bars">
            {sources.map(([s, n]) => (
              <div className="pt-bars__row" key={s}>
                <span className="pt-bars__name">{s}</span>
                <span className="pt-bars__track">
                  <span style={{ width: `${(n / topSource) * 100}%` }} />
                </span>
                <span className="pt-bars__n">{n}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="pt-panel">
        <h2 className="pt-panel__h">The rest of this section, and what it needs</h2>
        <p className="pt-panel__sub">
          The design draws ten more screens here. Each one below is missing a source rather than missing a page — none
          of them can show a true figure until the thing underneath it is recorded somewhere.
        </p>
        <div className="pt-needs">
          {[
            ["On the site", "How long people stay on each page and which buttons they press. The lead form records the page an enquiry came from, which is why Website leads works — but nothing records a visit that didn't become one."],
            ["Drop-off", "Every step from landing to sending a quote. Needs the same page-event store, plus a named funnel to measure against."],
            ["Reviews", "The table exists and is empty. It fills from the review feed once that's connected."],
            ["Ads", "Spend and return per campaign. Needs the Google Ads account linked; none of it is in the database."],
            ["Social", "Posts and reach. Needs the Instagram and Facebook accounts linked."],
            ["Campaigns", "What's running and what each one brought in. Needs somewhere to define a campaign before anything can be attributed to it."],
            ["Blog & the editor", "Posts are static files in the codebase today, so an editor would be writing to a deploy. Needs posts in the database first."],
            ["Brand assets", "Logos and photography for the crew to use. Needs a file store; the artifact asset store or Supabase storage would both do it."],
          ].map(([title, why]) => (
            <div className="pt-needs__row" key={title}>
              <strong>{title}</strong>
              <span>{why}</span>
            </div>
          ))}
        </div>
      </section>
    </PortalShell>
  );
}
