import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { dbConfigured, listWebLeads, pageViews, type PageViews } from "@/lib/portal/db";
import { classifyLead } from "@/lib/portal/leadSource";
import { groupByArea, BANDS } from "@/lib/portal/leadArea";
import { pageReport, titleFor } from "@/lib/portal/leadPages";
import { WEBSITE_TABS, websiteHref, websiteTabDef, windowDays, windowKey, type WebsiteTab } from "@/lib/portal/marketingTabs";
import { Bars, Heads, Needs, SectionTabs, WindowPicker } from "@/components/portal/marketingParts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Website — Team portal" };

/**
 * The website: who it brings in, which pages do the work, and where people
 * give up.
 *
 * Split out of Marketing, which had nine tabs answering two questions. What we
 * put out into the world stays there; what the site does with the people it
 * gets is here, beside the Blog.
 */
export default async function WebsitePage({ searchParams }: { searchParams: { tab?: string; win?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) redirect("/portal?denied=1");

  const def = websiteTabDef(searchParams.tab);
  const tab: WebsiteTab = def.k;
  const win = windowKey(searchParams.win);
  const days = windowDays(searchParams.win);

  const ready = dbConfigured();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const sinceDay = new Date(Date.now() - (days - 1) * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
  // Both at once: the reads only matter on Pages, but they're one small query
  // and fetching them alongside the leads costs no extra round trip.
  const [leads, views] = await Promise.all([
    ready ? listWebLeads(since).catch(() => []) : Promise.resolve([]),
    ready && tab === "pages" ? pageViews(sinceDay).catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />

      <div className="pt-head pt-head--split">
        <div>
          <h1>{def.title}</h1>
          <p>{def.blurb}</p>
        </div>
        <WindowPicker win={win} hrefFor={(w) => websiteHref(tab, w)} />
      </div>

      <SectionTabs
        label="Website"
        current={tab}
        tabs={[
          ...WEBSITE_TABS.map((t) => ({ k: t.k, label: t.label, href: websiteHref(t.k, win) })),
          // The full enquiry board, with the map and the hour-by-hour, is its
          // own page; it belongs to this section rather than to Finance.
          { k: "all", label: "Every enquiry", href: `/portal/finance/leads${win === "30" ? "" : `?d=${win}`}` },
        ]}
      />

      {!ready && (
        <div className="pt-note pt-note--warn">
          <strong>Database not connected.</strong> Nothing here can be read until the Supabase keys are set.
        </div>
      )}

      {tab === "leads" && <WebsiteLeads leads={leads} days={days} win={win} />}
      {tab === "pages" && <OnTheSite leads={leads} days={days} views={views} />}
      {tab === "dropoff" && <DropOff />}
    </PortalShell>
  );
}

/* --------------------------------------------------------- Website leads */
async function WebsiteLeads({
  leads, days, win,
}: {
  leads: Awaited<ReturnType<typeof listWebLeads>>; days: number; win: string;
}) {
  const quotes = leads.filter((l) => l.kind === "quote").length;
  const calls = leads.filter((l) => l.kind === "call").length;
  const weeks = Math.max(1, days / 7);

  // Outside the hours anyone is at a desk — the enquiries that sit until
  // morning unless somebody picks them up.
  const outside = leads.filter((l) => {
    const h = Number(new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", hour: "numeric", hour12: false }).format(new Date(l.createdAt)));
    return h < 7 || h >= 16;
  }).length;

  const bySource = new Map<string, number>();
  for (const l of leads) {
    const label = classifyLead(l.utm).label;
    bySource.set(label, (bySource.get(label) ?? 0) + 1);
  }

  const area = groupByArea(leads.map((l) => ({ suburb: l.suburb, postcode: l.postcode, kind: l.kind })));
  const report = await pageReport(leads);

  return (
    <>
      <Heads
        items={[
          { label: "Enquiries", value: String(leads.length), sub: `${(leads.length / weeks).toFixed(1)} a week on average`, feature: true },
          { label: "Quote requests", value: String(quotes), sub: "filled in the form" },
          { label: "Phone taps", value: String(calls), sub: "tapped the number" },
          {
            label: "Outside 7am–4pm", value: String(outside),
            sub: leads.length ? `${Math.round((outside / leads.length) * 100)}% — nobody on the tools` : "none yet",
          },
        ]}
      />

      <div className="pt-two">
        <Bars
          title="Where they came from"
          rows={[...bySource.entries()].sort((a, b) => b[1] - a[1]).map(([label, n]) => ({ label, n }))}
          empty="No enquiries in this window."
        />
        <Bars
          title="When and how far"
          rows={[
            ...BANDS.filter((b) => area.byBand[b.key] > 0).map((b) => ({ label: b.label, n: area.byBand[b.key] })),
            { label: "Outside 7am–4pm", n: outside },
          ]}
          empty="No enquiries in this window."
        />
      </div>

      <Link href={websiteHref("pages", windowKey(win))} className="pt-panel pt-linkpanel">
        <span>
          <strong>
            Only {report.earningPages} of {report.totalPages} pages bring in enquiries
          </strong>
          <em>
            {report.rows[0]
              ? `“${report.rows[0].title}” is the busiest, with ${report.rows[0].n} of the ${leads.length}.`
              : "Nothing has produced an enquiry in this window."}
          </em>
        </span>
        <span className="pt-linkpanel__go">See every page →</span>
      </Link>
    </>
  );
}

/* ----------------------------------------------------------- On the site */
async function OnTheSite({
  leads, days, views,
}: {
  leads: Awaited<ReturnType<typeof listWebLeads>>; days: number; views: PageViews | null;
}) {
  const r = await pageReport(leads);
  const enquiriesOn = new Map(r.rows.map((p) => [p.path, p.n + p.landed]));
  const read = views ? [...views.byPath.entries()].sort((a, b) => b[1] - a[1]) : [];
  // Reads only began being counted on one day; enquiries go back the whole
  // window. A rate from a fortnight of reads over a year of enquiries would be
  // fiction, so the rate is only worked out once the reads cover the window.
  const windowStart = new Date(Date.now() - (days - 1) * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
  const fullWindow = Boolean(views?.since && views.since <= windowStart);
  return (
    <>
      <Heads
        items={[
          { label: "Pages that earn", value: String(r.earningPages), sub: `of ${r.totalPages} on the site`, feature: true },
          { label: "Silent", value: String(r.silentCount), sub: "no enquiry in this window" },
          {
            label: "Reads", value: views?.since ? views.total.toLocaleString("en-AU") : "—",
            sub: views?.since ? `pages opened, counted since ${new Date(`${views.since}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}` : "counting starts with the next reader",
          },
        ]}
      />
      <section className="pt-panel">
        <h2 className="pt-panel__h">Most read</h2>
        <p className="pt-panel__sub">
          {fullWindow
            ? "Reads in this window, and how many of those readers ended up enquiring."
            : "Reads since counting began. Enquiries go back the whole window, so no rate is worked out until the reads do too."}
        </p>
        {read.length === 0 ? (
          <p className="pt-rep__empty">
            {views?.since ? "Nothing read in this window." : "No reads counted yet — the site started counting with this release, and the list fills in as people open pages."}
          </p>
        ) : (
          <div className="pt-fleet__wrap">
            <table className="pt-fleet">
              <thead><tr><th>Page</th><th className="pt-blogl__num">Reads</th><th className="pt-blogl__num">Enquiries</th>{fullWindow && <th className="pt-blogl__num">Rate</th>}</tr></thead>
              <tbody>
                {read.slice(0, 25).map(([path, n]) => {
                  const e = enquiriesOn.get(path) ?? 0;
                  return (
                    <tr key={path}>
                      <td><strong>{titleFor(path)}</strong><span className="pt-fleet__sub">{path}</span></td>
                      <td className="pt-blogl__num"><strong>{n.toLocaleString("en-AU")}</strong></td>
                      <td className="pt-blogl__num">{e}</td>
                      {fullWindow && <td className="pt-blogl__num">{n ? `${((e / n) * 100).toFixed(1)}%` : "—"}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="pt-panel">
        <h2 className="pt-panel__h">Pages that brought something in</h2>
        {r.rows.length === 0 ? (
          <p className="pt-rep__empty">No page produced an enquiry in this window.</p>
        ) : (
          <div className="pt-fleet__wrap">
            <table className="pt-fleet">
              <thead><tr><th>Page</th><th>Section</th><th>Enquiries</th><th>Share</th></tr></thead>
              <tbody>
                {r.rows.slice(0, 25).map((p) => (
                  <tr key={p.path}>
                    <td><strong>{p.title}</strong><span className="pt-fleet__sub">{p.path}</span></td>
                    <td>{p.sectionLabel}</td>
                    <td><strong>{p.n}</strong></td>
                    <td>{Math.round(p.share * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="pt-panel">
        <h2 className="pt-panel__h">By section</h2>
        <Bars
          rows={r.sections.filter((s) => s.n > 0).map((s) => ({ label: `${s.label} · ${s.pages} ${s.pages === 1 ? "page" : "pages"}`, n: s.n }))}
          empty="Nothing to split by section yet."
        />
      </section>
    </>
  );
}

/* -------------------------------------------------------------- Drop-off */
function DropOff() {
  return (
    <Needs
      title="Nothing records a page view yet"
      body="Drop-off is the share of people who start the quote form and stop at each step. The portal only ever sees an enquiry that was finished and sent, so the people who left are, by definition, not in the data. It needs the form to post a step event as each field is completed — a small table and a beacon from the form, and this becomes a real funnel."
      bullets={[
        "A portal_form_events table: session, step, at",
        "The quote form posting a step event as it goes",
        "Nothing personal in it — a step number and a timestamp",
      ]}
    />
  );
}

