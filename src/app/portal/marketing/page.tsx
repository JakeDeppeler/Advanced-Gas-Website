import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { dbConfigured, listWebLeads, listCampaigns, listBrandAssets } from "@/lib/portal/db";
import { classifyLead } from "@/lib/portal/leadSource";
import { groupByArea, BANDS } from "@/lib/portal/leadArea";
import { pageReport } from "@/lib/portal/leadPages";
import { withLeads, tally } from "@/lib/portal/campaigns";
import {
  MARKETING_TABS, marketingHref, tabDef, windowDays, windowKey, windowLabel, WINDOWS,
  type MarketingTab,
} from "@/lib/portal/marketingTabs";
import { blogPosts } from "@/lib/blogPosts";
import { getReviews } from "@/lib/googleReviews";
import { getInstagramFeed } from "@/lib/instagram";
import { CampaignBoard } from "@/components/portal/CampaignBoard";
import { BrandAssets } from "@/components/portal/BrandAssets";
import { Bars, Heads, Needs } from "@/components/portal/marketingParts";
import { money } from "@/lib/portal/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marketing — Team portal" };

/**
 * Marketing: nine views over one window.
 *
 * One route, not nine. Every tab answers a question about the same stretch of
 * time, and the window selector is shared — nine routes would each have grown
 * their own idea of "recently" and the numbers would have stopped agreeing.
 *
 * Six of the nine run on data the business already has. Two need a source
 * nobody is recording yet and say exactly which; one is a store the office
 * fills itself.
 */
export default async function MarketingPage({
  searchParams,
}: {
  searchParams: { tab?: string; win?: string; audience?: string };
}) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) redirect("/portal?denied=1");

  const tab = (MARKETING_TABS.find((t) => t.k === searchParams.tab)?.k ?? "campaigns") as MarketingTab;
  const win = windowKey(searchParams.win);
  const days = windowDays(searchParams.win);
  const def = tabDef(tab);

  const ready = dbConfigured();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const leads = ready ? await listWebLeads(since).catch(() => []) : [];

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />

      <div className="pt-head pt-head--split">
        <div>
          <h1>{def.title}</h1>
          <p>{def.blurb}</p>
        </div>
        {/* The window the whole section reads against. */}
        <nav className="pt-win" aria-label="Time window">
          {WINDOWS.map((w) => (
            <Link
              key={w.k}
              href={marketingHref(tab, w.k)}
              aria-current={w.k === win ? "page" : undefined}
              className={`pt-win__opt${w.k === win ? " is-on" : ""}`}
            >
              {w.label}
            </Link>
          ))}
        </nav>
      </div>

      <nav className="pt-tabs" aria-label="Marketing">
        {MARKETING_TABS.map((t) => (
          <Link
            key={t.k}
            href={marketingHref(t.k, win)}
            aria-current={t.k === tab ? "page" : undefined}
            className={`pt-tab${t.k === tab ? " is-on" : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {!ready && (
        <div className="pt-note pt-note--warn">
          <strong>Database not connected.</strong> Nothing here can be read until the Supabase keys are set.
        </div>
      )}

      {tab === "campaigns" && <Campaigns leads={leads} win={win} audience={searchParams.audience} />}
      {tab === "blog" && <Blog />}
      {tab === "leads" && <WebsiteLeads leads={leads} days={days} win={win} />}
      {tab === "site" && <OnTheSite leads={leads} />}
      {tab === "dropoff" && <DropOff />}
      {tab === "reviews" && <Reviews />}
      {tab === "ads" && <Ads />}
      {tab === "social" && <Social />}
      {tab === "assets" && <Assets user={user.name} />}
    </PortalShell>
  );
}

/* ------------------------------------------------------------- Campaigns */
async function Campaigns({
  leads, win, audience,
}: {
  leads: Awaited<ReturnType<typeof listWebLeads>>; win: string; audience?: string;
}) {
  const rows = withLeads(dbConfigured() ? await listCampaigns().catch(() => []) : [], leads);
  const t = tally(rows, leads.length);

  return (
    <CampaignBoard
      rows={rows}
      tally={t}
      audience={audience ?? "all"}
      win={win}
      windowLabel={windowLabel(win)}
    />
  );
}

/* ------------------------------------------------------------------ Blog */
function Blog() {
  const posts = [...blogPosts].sort((a, b) => (b.iso ?? "").localeCompare(a.iso ?? ""));
  const byCategory = new Map<string, number>();
  for (const p of posts) byCategory.set(p.category, (byCategory.get(p.category) ?? 0) + 1);

  return (
    <>
      <Heads
        items={[
          { label: "Articles", value: String(posts.length), sub: "on the site", feature: true },
          { label: "Topics", value: String(byCategory.size), sub: "categories covered" },
          { label: "Newest", value: posts[0]?.date ?? "—", sub: posts[0]?.title ?? "nothing published" },
        ]}
      />
      <section className="pt-panel">
        <h2 className="pt-panel__h">Every article</h2>
        <div className="pt-fleet__wrap">
          <table className="pt-fleet">
            <thead><tr><th>Article</th><th>Topic</th><th>Published</th><th /></tr></thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.slug}>
                  <td><strong>{p.title}</strong>{p.excerpt && <span className="pt-fleet__sub">{p.excerpt}</span>}</td>
                  <td>{p.categoryShort || p.category}</td>
                  <td>{p.date}</td>
                  <td><a href={`/blog/${p.slug}`} target="_blank" rel="noopener" className="pt-fleet__open">Open ↗</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {/* The editor the design draws writes to files in the repo, which is a
          deploy rather than a save. Said plainly instead of drawn. */}
      <Needs
        title="Writing a post still goes through a deploy"
        body="Articles live as files in the codebase, so the blog-post editor in the design would be writing to something it can't reach from a browser. Moving them into the database is the change that makes the editor possible."
      />
    </>
  );
}

/* --------------------------------------------------------- Website leads */
function WebsiteLeads({
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
  const report = pageReport(leads);

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

      <Link href={marketingHref("site", windowKey(win))} className="pt-panel pt-linkpanel">
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
function OnTheSite({ leads }: { leads: Awaited<ReturnType<typeof listWebLeads>> }) {
  const r = pageReport(leads);
  return (
    <>
      <Heads
        items={[
          { label: "Pages that earn", value: String(r.earningPages), sub: `of ${r.totalPages} on the site`, feature: true },
          { label: "Silent", value: String(r.silentCount), sub: "no enquiry in this window" },
          { label: "Sections", value: String(r.sections.length), sub: "parts of the site" },
        ]}
      />
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
          rows={r.sections.filter((s) => s.n > 0).map((s) => ({ label: `${s.label} · ${s.pages} pages`, n: s.n }))}
          empty="Nothing to split by section yet."
        />
      </section>
    </>
  );
}

/* --------------------------------------------------------------- Reviews */
async function Reviews() {
  const payload = await getReviews(12).catch(() => null);
  const reviews = payload?.reviews ?? [];
  const sum = payload?.summary;
  return (
    <>
      <Heads
        items={[
          { label: "Rating", value: sum ? sum.value.toFixed(1) : "—", sub: `out of ${sum?.best ?? 5} on Google`, feature: true },
          {
            label: "Reviews", value: sum ? String(sum.count) : "—",
            // Google's own count or an estimate from the curated list — and
            // which it is matters enough that the card says so.
            sub: sum?.verifiedCount ? "Google's own count" : "estimated — not Google's count",
          },
          { label: "Where from", value: payload?.source === "google" ? "Google" : payload?.source === "curated" ? "Curated" : "Both", sub: "live feed or the stored copy" },
        ]}
      />
      <section className="pt-panel">
        <h2 className="pt-panel__h">What they said</h2>
        {reviews.length === 0 ? (
          <p className="pt-rep__empty">
            No reviews came back. They are read live from Google, so this is the connection rather than the reviews.
          </p>
        ) : (
          <div className="pt-revs">
            {reviews.map((rv, i) => (
              <article className="pt-rev" key={`${rv.who}-${i}`}>
                <header>
                  <strong>{rv.who}</strong>
                  <span aria-label={`${rv.rating} out of 5`}>{"★".repeat(rv.rating)}</span>
                </header>
                {rv.title && <h3>{rv.title}</h3>}
                <p>{rv.txt}</p>
                <footer>{rv.what}</footer>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/* ---------------------------------------------------------------- Social */
async function Social() {
  const posts = await getInstagramFeed(18).catch(() => []);
  return (
    <>
      <Heads
        items={[
          { label: "Posts", value: String(posts.length), sub: "pulled from Instagram", feature: true },
        ]}
      />
      <section className="pt-panel">
        <h2 className="pt-panel__h">The feed</h2>
        {posts.length === 0 ? (
          <p className="pt-rep__empty">
            Nothing came back from Instagram. The feed needs a valid access token on the server — that is the
            thing to check, not the posting.
          </p>
        ) : (
          <div className="pt-grid-social">
            {posts.map((p) => (
              <a key={p.id} href={p.permalink} target="_blank" rel="noopener" className="pt-social">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt={p.caption?.slice(0, 80) || "Instagram post"} loading="lazy" />
                <span>{p.caption?.slice(0, 90) ?? ""}</span>
              </a>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/* --------------------------------------------------------- Brand assets */
async function Assets({ user }: { user: string }) {
  const assets = dbConfigured() ? await listBrandAssets().catch(() => []) : [];
  return <BrandAssets assets={assets} who={user} />;
}

/* ------------------------------------------- the two with no source yet */
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

function Ads() {
  return (
    <Needs
      title="No ad account is connected"
      body="Spend, impressions and clicks live inside Meta and Google, and nothing in here talks to either. Until one is connected, what the ads produced is the lead count on the Campaigns tab — which is real, because it comes from the utm on the link rather than from the platform."
      bullets={[
        "A Meta Marketing API app, or the Google Ads API",
        "Read-only credentials on the server, like ServiceTitan's",
        "A nightly pull into a spend table, the way Reece's price file works",
      ]}
      alt={{ href: marketingHref("campaigns", "30"), label: "What the campaigns brought in →" }}
    />
  );
}
