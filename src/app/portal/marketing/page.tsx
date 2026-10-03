import Link from "next/link";
import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { dbConfigured, listWebLeads, listCampaigns, listBrandAssets } from "@/lib/portal/db";
import { withLeads, tally } from "@/lib/portal/campaigns";
import {
  MARKETING_TABS, MOVED_TABS, marketingHref, tabDef, windowDays, windowKey, windowLabel,
  type MarketingTab,
} from "@/lib/portal/marketingTabs";
import { getReviews } from "@/lib/googleReviews";
import { getInstagramFeed } from "@/lib/instagram";
import { CampaignBoard } from "@/components/portal/CampaignBoard";
import { BrandAssets } from "@/components/portal/BrandAssets";
import { Heads, Needs, SectionTabs, WindowPicker } from "@/components/portal/marketingParts";
import { Locked } from "@/components/portal/Locked";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marketing — Team portal" };

/**
 * Marketing: what we put out into the world — campaigns, reviews, ads, social,
 * and the brand kit they all draw on.
 *
 * It used to be nine tabs. The website's half — enquiries, pages, drop-off —
 * is its own section now, and so is the Blog; both are linked from the home
 * page beside this one. The old tab addresses forward to where they went.
 */
export default async function MarketingPage({
  searchParams,
}: {
  searchParams: { tab?: string; win?: string; audience?: string; new?: string };
}) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Marketing" forWhom="managers" />;

  const moved = searchParams.tab ? MOVED_TABS[searchParams.tab] : undefined;
  if (moved) redirect(moved);

  const tab = (MARKETING_TABS.find((t) => t.k === searchParams.tab)?.k ?? "campaigns") as MarketingTab;
  const win = windowKey(searchParams.win);
  const days = windowDays(searchParams.win);
  const def = tabDef(tab);

  const ready = dbConfigured();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  // Only Campaigns reads the leads — to credit each campaign with what it
  // brought in. The other four tabs shouldn't wait on a query they don't use.
  const leads = ready && tab === "campaigns" ? await listWebLeads(since).catch(() => []) : [];

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />

      <div className="pt-head pt-head--split">
        <div>
          <h1>{def.title}</h1>
          <p>{def.blurb}</p>
        </div>
        {/* The add button is the head's one action, as in the mock. It is a
            link rather than a toggle so the open form survives a refresh. */}
        {tab === "campaigns" && (
          <Link href={`${marketingHref("campaigns", win)}&new=1`} className="pt-btn pt-btn--orange pt-mkadd">+ New campaign</Link>
        )}
      </div>

      <SectionTabs
        label="Marketing"
        current={tab}
        tabs={MARKETING_TABS.map((t) => ({ k: t.k, label: t.label, href: marketingHref(t.k, win) }))}
      />

      {!ready && (
        <div className="pt-note pt-note--warn">
          <strong>Database not connected.</strong> Nothing here can be read until the Supabase keys are set.
        </div>
      )}

      {tab === "campaigns" && (
        <Campaigns
          leads={leads}
          win={win}
          audience={searchParams.audience}
          adding={searchParams.new === "1"}
          // Only Campaigns reads against a window; on the other tabs it would
          // be a control that changes nothing.
          picker={<WindowPicker win={win} hrefFor={(w) => marketingHref("campaigns", w)} />}
        />
      )}
      {tab === "reviews" && <Reviews />}
      {tab === "ads" && <Ads />}
      {tab === "social" && <Social />}
      {tab === "assets" && <Assets user={user.name} />}
    </PortalShell>
  );
}

/* ------------------------------------------------------------- Campaigns */
async function Campaigns({
  leads, win, audience, adding, picker,
}: {
  leads: Awaited<ReturnType<typeof listWebLeads>>; win: string; audience?: string; adding: boolean; picker: React.ReactNode;
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
      adding={adding}
      picker={picker}
    />
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

/* ------------------------------------------------- the one with no source yet */
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
