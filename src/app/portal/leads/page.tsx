import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { Bars } from "@/components/portal/marketingParts";
import { Figs } from "@/components/portal/Figs";
import { dbConfigured, listWebLeads } from "@/lib/portal/db";
import { q, sbSelect } from "@/lib/dashboard/db";
import { classifyLead } from "@/lib/portal/leadSource";
import { startOfMonthMelbourne } from "@/lib/dashboard/dates";
import { serviceLabel } from "@/lib/dashboard/metrics";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leads — Team portal" };

const MEL = "Australia/Melbourne";
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { timeZone: MEL, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Counts by key, biggest first. */
function tally(keys: string[]): Array<{ label: string; n: number }> {
  const m = new Map<string, number>();
  for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n);
}

/**
 * Who's asking, and from where: every enquiry for the month, from the website
 * and from ServiceTitan. No names or numbers here — the enquiry itself still
 * goes to the inbox and into ServiceTitan; this is where they come from.
 */
export default async function LeadsPage({ searchParams }: { searchParams: { m?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Leads" forWhom="managers" />;

  const last = searchParams?.m === "last";
  const thisStart = startOfMonthMelbourne(new Date());
  // The day before the 1st is in last month; its month start is last month's.
  const from = last ? startOfMonthMelbourne(new Date(thisStart.getTime() - 86_400_000)) : thisStart;
  const to = last ? thisStart : null;
  const monthLabel = new Date(from.getTime() + 12 * 3_600_000).toLocaleDateString("en-AU", { timeZone: MEL, month: "long" });

  const ready = dbConfigured();
  const inRange = (iso: string) => !to || Date.parse(iso) < to.getTime();
  const [web, st, calls] = ready
    ? await Promise.all([
      listWebLeads(from.toISOString()).catch(() => []),
      sbSelect<{ id: number; campaign: string | null; status: string | null; created_on: string }>(
        "st_leads", [q.select("id,campaign,status,created_on"), q.gte("created_on", from.toISOString())].join("&"),
      ).catch(() => []),
      sbSelect<{ id: number; campaign: string | null; received_on: string }>(
        "st_calls", [q.select("id,campaign,received_on"), q.gte("received_on", from.toISOString()), q.eq("direction", "Inbound")].join("&"),
      ).catch(() => []),
    ])
    : [[], [], []];
  const webIn = web.filter((l) => inRange(l.createdAt));
  const stIn = st.filter((l) => inRange(l.created_on));
  const callsIn = calls.filter((c) => inRange(c.received_on));

  const forms = webIn.filter((l) => l.kind === "quote").length;
  const taps = webIn.filter((l) => l.kind === "call").length;

  const bySource = tally([
    ...webIn.map((l) => `Website · ${classifyLead(l.utm).label}`),
    ...stIn.map((l) => `ServiceTitan · ${l.campaign?.trim() || "no campaign"}`),
  ]);
  const byService = tally(webIn.map((l) => (l.service?.trim() ? serviceLabel(l.service.trim()) : "Not said")));
  const bySuburb = tally(webIn.map((l) => l.suburb?.trim() || l.postcode?.trim() || "Not given")).slice(0, 10);

  const rows = [
    ...webIn.map((l) => ({ at: l.createdAt, src: l.kind === "call" ? "Website · phone tap" : "Website · quote form", what: l.service?.trim() ? serviceLabel(l.service.trim()) : "—", where: l.suburb || l.postcode || "—" })),
    ...stIn.map((l) => ({ at: l.created_on, src: `ServiceTitan${l.campaign ? ` · ${l.campaign}` : ""}`, what: "—", where: "—" })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 60);

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />
      <div className="pt-head pt-head--split">
        <div>
          <h1>Leads</h1>
          <p>Who&rsquo;s asking, and from where — every enquiry in {monthLabel}, from the website and ServiceTitan.</p>
        </div>
        <nav className="pt-win" aria-label="Month">
          <Link href="/portal/leads" className={`pt-win__opt${!last ? " is-on" : ""}`} aria-current={!last ? "page" : undefined}>This month</Link>
          <Link href="/portal/leads?m=last" className={`pt-win__opt${last ? " is-on" : ""}`} aria-current={last ? "page" : undefined}>Last month</Link>
        </nav>
      </div>

      <Figs
        cols={4}
        items={[
          { label: "Enquiries", feature: true, value: (webIn.length + stIn.length).toLocaleString("en-AU"), sub: "website and ServiceTitan together" },
          { label: "Website", value: webIn.length.toLocaleString("en-AU"), sub: `${forms} quote ${forms === 1 ? "form" : "forms"} · ${taps} phone ${taps === 1 ? "tap" : "taps"}`, href: "/portal/website" },
          { label: "ServiceTitan leads", value: stIn.length.toLocaleString("en-AU"), sub: "entered in ServiceTitan" },
          {
            label: "Inbound calls", value: callsIn.length.toLocaleString("en-AU"),
            sub: "counted apart: a call is as often an existing customer as a new one",
          },
        ]}
      />

      <div className="pt-two">
        <Bars title="Where they came from" rows={bySource.map((r) => ({ label: r.label, n: r.n }))} empty="No enquiries yet this month." />
        <Bars title="What they asked for" rows={byService.map((r) => ({ label: r.label, n: r.n }))} empty="No website enquiries yet this month." />
      </div>
      <div className="pt-two">
        <Bars title="Where they are" rows={bySuburb.map((r) => ({ label: r.label, n: r.n }))} empty="No suburbs yet this month." />
        <section className="pt-panel">
          <h2 className="pt-panel__h">Go deeper</h2>
          <p className="pt-panel__sub">Drive time, the hour of day and the page each website enquiry started on are on the website&rsquo;s enquiry board.</p>
          <Link href="/portal/finance/leads" className="pt-btn pt-btn--ghost">Every website enquiry →</Link>
        </section>
      </div>

      <section className="pt-panel">
        <h2 className="pt-panel__h">This month&rsquo;s enquiries</h2>
        {rows.length === 0 ? (
          <p className="pt-rep__empty">Nothing yet{last ? " last month" : " this month"}.</p>
        ) : (
          <div className="pt-fleet__wrap">
            <table className="pt-fleet pt-otab">
              <thead><tr><th>When</th><th>From</th><th>Asked about</th><th>Where</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.at}-${i}`}>
                    <td>{when(r.at)}</td><td>{r.src}</td><td>{r.what}</td><td>{r.where}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PortalShell>
  );
}
