import "server-only";
import { dashboardDbConfigured, q, sbCount, sbSelect, sbSelectOne } from "@/lib/dashboard/db";
import { serviceTitanConfigured } from "@/lib/dashboard/servicetitan";
import { xeroConfigured } from "@/lib/portal/xero";
import { getIntegration } from "@/lib/portal/db";
import { reeceConfigured, reeceConnection } from "@/lib/pricebook/reece";
import { getReviews } from "@/lib/googleReviews";
import { getInstagramFeed } from "@/lib/instagram";

/**
 * Every outside system the business runs on, and whether it is working.
 *
 * Read from what is already stored — sync state, the last snapshot, token
 * timestamps — rather than by calling each service, so the page opens in the
 * time a database read takes and can't itself trip a rate limit. The one
 * exception is the two public feeds (Google reviews, Instagram), which are read
 * through the same cached fetch the site uses, so asking costs nothing new.
 *
 * Xero is read and never refreshed. The portal's Finance pages own the token
 * loop, and Xero kills the old refresh token the moment a new one is issued: a
 * second refresher here would race it and break the live connection.
 *
 * No credential, and nothing derived from one, leaves this file. Presence is a
 * boolean; the value is never read into anything that renders.
 */

export type IntegrationState = "working" | "attention" | "off";

export type IntegrationRow = {
  k: string;
  name: string;
  /** What it does for the business, in one line. */
  does: string;
  state: IntegrationState;
  /** The state in words — the pill says it, the colour only agrees. */
  status: string;
  /** When it was last heard from, if that's known. */
  at: string | null;
  /** Facts worth seeing, each one line. */
  facts: string[];
  /** Where in the portal its data turns up. */
  feeds: { label: string; href: string }[];
  /** The one thing to do about it, where there's something to do. */
  action?: { label: string; href: string; external?: boolean };
};

const has = (...keys: string[]) => keys.every((k) => Boolean(process.env[k]?.trim()));

async function safe<T>(f: () => Promise<T>, fallback: T): Promise<T> {
  try { return await f(); } catch { return fallback; }
}

const MIN = 60_000;

export async function listIntegrations(): Promise<IntegrationRow[]> {
  const db = dashboardDbConfigured();

  const [stRows, xero, reece, snapshot, catalogue, lastRun, reviews, insta, viewsFirst, viewsLast, quoteLeads] = await Promise.all([
    db ? safe(() => sbSelect<{ resource: string; last_success_at: string | null; last_status: string | null; records_synced: number | null }>(
      "portal_sync_state",
      [q.select("resource,last_success_at,last_status,records_synced"), q.eq("provider", "servicetitan")].join("&"),
    ), []) : Promise.resolve([]),
    db ? safe(() => getIntegration("xero"), null) : Promise.resolve(null),
    safe(reeceConnection, { status: "not-configured" } as Awaited<ReturnType<typeof reeceConnection>>),
    db ? safe(() => sbSelectOne<{ computed_at: string; sources: Record<string, { state: string; at?: string }> }>(
      "portal_metrics_snapshot", [q.select("computed_at,sources"), q.order("computed_at", "desc")].join("&"),
    ), null) : Promise.resolve(null),
    db ? safe(() => sbSelectOne<{ seen_at: string }>("supplier_items", [q.select("seen_at"), q.order("seen_at", "desc")].join("&")), null) : Promise.resolve(null),
    db ? safe(() => sbSelectOne<{ started_at: string; errors: unknown[] | null }>("pricebook_sync_runs", [q.select("started_at,errors"), q.order("started_at", "desc")].join("&")), null) : Promise.resolve(null),
    has("GOOGLE_PLACES_API_KEY", "GOOGLE_PLACE_ID") ? safe(() => getReviews(1), null) : Promise.resolve(null),
    has("INSTAGRAM_ACCESS_TOKEN") ? safe(() => getInstagramFeed(1), []) : Promise.resolve([]),
    db ? safe(() => sbSelectOne<{ day: string }>("portal_page_views", [q.select("day"), q.order("day", "asc")].join("&")), null) : Promise.resolve(null),
    db ? safe(() => sbSelectOne<{ day: string }>("portal_page_views", [q.select("day"), q.order("day", "desc")].join("&")), null) : Promise.resolve(null),
    db ? safe(() => sbSelectOne<{ created_at: string }>("portal_leads", [q.select("created_at"), q.eq("kind", "quote"), q.order("created_at", "desc")].join("&")), null) : Promise.resolve(null),
  ]);
  const items = db ? await safe(() => sbCount("supplier_items", "", "code"), null as number | null) : null;

  const out: IntegrationRow[] = [];
  const now = Date.now();

  /* ---- ServiceTitan */
  {
    const lastOk = Math.max(0, ...stRows.map((r) => (r.last_success_at ? Date.parse(r.last_success_at) : 0)));
    const failing = stRows.filter((r) => r.last_status === "error").map((r) => r.resource);
    const configured = serviceTitanConfigured();
    const stale = lastOk > 0 && now - lastOk > 45 * MIN;
    out.push({
      k: "servicetitan", name: "ServiceTitan",
      does: "Jobs, invoices, quotes, calls and leads — the work itself.",
      state: !configured ? "off" : !lastOk || stale || failing.length ? "attention" : "working",
      status: !configured ? "Not set up" : !lastOk ? "Never synced" : stale ? "Behind" : failing.length ? "Partly syncing" : "Syncing",
      at: configured && lastOk ? new Date(lastOk).toISOString() : null,
      facts: !configured
        ? ["The four ServiceTitan keys aren't on the server, so nothing is being copied"]
        : [
            `${stRows.length} kinds of record kept in step${failing.length ? ` — ${failing.join(", ")} failing` : ""}`,
            stale ? "Nothing new in over 45 minutes; the board is showing older figures" : "Copied into the database every few minutes while the board is on",
          ],
      feeds: [{ label: "Wall board", href: "/portal/board" }, { label: "Supply", href: "/portal/supply" }],
      action: configured ? { label: "Run the connection check", href: "/portal/supply/health" } : undefined,
    });
  }

  /* ---- Xero */
  {
    const configured = xeroConfigured();
    const connected = Boolean(xero?.refreshToken);
    const exp = xero?.expiresAt ? Date.parse(xero.expiresAt) : 0;
    // The access token lasts thirty minutes and is renewed the next time
    // Finance reads Xero. Lapsed is normal; it's the refresh token's 60 days
    // that end a connection, and those run from the last renewal.
    const lastRenew = exp ? exp - 30 * MIN : 0;
    const dormant = lastRenew > 0 && now - lastRenew > 50 * 24 * 60 * MIN;
    out.push({
      k: "xero", name: "Xero",
      does: "The accounts — profit, receivables and what's overdue.",
      state: !configured || !connected ? "off" : dormant ? "attention" : "working",
      status: !configured ? "Not set up" : !connected ? "Not connected" : dormant ? "Reconnect soon" : exp > now ? "Connected" : "Connected · renews on next read",
      at: lastRenew ? new Date(lastRenew).toISOString() : null,
      facts: [
        connected && xero?.tenantName ? `Organisation: ${xero.tenantName}` : "No organisation linked",
        dormant
          ? "Unused for over 50 days — Xero drops a connection at 60. Opening Finance renews it"
          : "Read-only. The sign-in renews itself whenever Finance reads it",
      ],
      feeds: [{ label: "Finance", href: "/portal/finance" }, { label: "Wall board", href: "/portal/board" }],
      action: !connected && configured ? { label: "Connect Xero", href: "/portal/finance" } : { label: "Open Finance", href: "/portal/finance" },
    });
  }

  /* ---- Reece */
  {
    const configured = reeceConfigured();
    const errs = Array.isArray(lastRun?.errors) ? lastRun!.errors.length : 0;
    out.push({
      k: "reece", name: "Reece",
      does: "Trade prices, the item catalogue, orders and invoices.",
      state: !configured ? (items ? "attention" : "off") : reece.status !== "ready" ? "attention" : errs ? "attention" : "working",
      status: !configured ? (items ? "Price file only" : "Not set up") : reece.status === "no-customer" ? "No account linked" : errs ? "Last sync had errors" : "Connected",
      at: catalogue?.seen_at ?? null,
      facts: [
        items !== null ? `${items.toLocaleString("en-AU")} items in the catalogue` : "Catalogue couldn't be read",
        lastRun ? `Pricebook last synced ${new Date(lastRun.started_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}${errs ? `, ${errs} error${errs === 1 ? "" : "s"}` : ""}` : "The pricebook has never been synced",
      ],
      feeds: [{ label: "Supply", href: "/portal/supply" }, { label: "Trade pricebook", href: "/trade/pricebook" }],
      action: { label: "Open Supply", href: "/portal/supply" },
    });
  }

  /* ---- Google reviews */
  {
    const configured = has("GOOGLE_PLACES_API_KEY", "GOOGLE_PLACE_ID");
    const live = reviews?.source === "google" || reviews?.source === "google+curated";
    out.push({
      k: "google-reviews", name: "Google reviews",
      does: "The star rating and reviews on the website and in Marketing.",
      state: !configured ? "off" : live ? "working" : "attention",
      status: !configured ? "Not set up" : live ? "Live" : "Showing the stored list",
      at: null,
      facts: [
        live && reviews ? `${reviews.summary.value.toFixed(1)} stars from ${reviews.summary.count} reviews, Google's own count` : "The site falls back to a stored list of reviews",
      ],
      feeds: [{ label: "Marketing · Reviews", href: "/portal/marketing?tab=reviews" }],
    });
  }

  /* ---- Instagram */
  {
    const configured = has("INSTAGRAM_ACCESS_TOKEN");
    out.push({
      k: "instagram", name: "Instagram",
      does: "The feed on the website and in Marketing.",
      state: !configured ? "off" : insta.length ? "working" : "attention",
      status: !configured ? "Not set up" : insta.length ? "Live" : "Not answering",
      at: insta[0]?.timestamp ?? null,
      facts: [insta.length ? "The feed is coming through" : configured ? "The token is set but nothing comes back — it has likely expired" : "No access token on the server"],
      feeds: [{ label: "Marketing · Social", href: "/portal/marketing?tab=social" }],
    });
  }

  /* ---- The quote form's email */
  {
    const configured = has("RESEND_API_KEY", "RESEND_FROM_EMAIL", "LEAD_NOTIFICATION_EMAIL");
    out.push({
      k: "email", name: "Quote form email",
      does: "Sends each website enquiry to the office inbox.",
      state: configured ? "working" : "attention",
      status: configured ? "Set up" : "Not set up",
      // The last enquiry is the last time this had something to send.
      at: quoteLeads?.created_at ?? null,
      facts: [configured ? "Every enquiry is emailed as well as saved" : "Enquiries are saved to the portal but not emailed to anyone"],
      feeds: [{ label: "Website · Enquiries", href: "/portal/website" }],
    });
  }

  /* ---- Analytics */
  {
    const ga = has("NEXT_PUBLIC_GA_ID");
    out.push({
      k: "analytics", name: "Page reads",
      does: "Counts how often each public page is read, for Website and the Blog.",
      state: viewsLast ? "working" : "attention",
      status: viewsLast ? "Counting" : "Waiting for the first reader",
      // Counted by the day, so there's no time of day to give: the day says it.
      at: null,
      facts: [
        viewsFirst
          ? `Counting since ${new Date(`${viewsFirst.day}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}, last read counted ${new Date(`${viewsLast!.day}T00:00:00`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}`
          : "Started with this release",
        `Vercel Analytics on${ga ? ", Google Analytics on" : "; Google Analytics not set up"} — those live in their own dashboards`,
      ],
      feeds: [{ label: "Website · Pages", href: "/portal/website?tab=pages" }, { label: "Blog", href: "/portal/blog" }],
    });
  }

  /* ---- The wall board */
  {
    const at = snapshot?.computed_at ?? null;
    const age = at ? now - Date.parse(at) : Infinity;
    const token = has("SCREEN_TOKEN");
    out.push({
      k: "board", name: "Wall board",
      does: "The office TV: today, pace, quotes, team, performance and areas.",
      state: !token ? "off" : age < 15 * MIN ? "working" : "attention",
      status: !token ? "Not set up" : age < 15 * MIN ? "Up to date" : at ? "Not refreshed lately" : "Never run",
      at,
      facts: [
        !token ? "No screen key on the server, so the board can't be opened"
          : age < 15 * MIN ? "Recomputed while the screen is on" : "Recomputes whenever the screen is open; it hasn't been lately",
      ],
      feeds: [{ label: "How the board works", href: "/portal/board" }],
      action: token ? { label: "Open the live board", href: "/portal/finance/board/open", external: true } : undefined,
    });
  }

  /* ---- Ads */
  out.push({
    k: "ads", name: "Meta & Google Ads",
    does: "Spend, impressions and clicks per platform.",
    state: "off", status: "Not connected", at: null,
    facts: ["Campaign results are counted from the link each ad carries instead"],
    feeds: [{ label: "Marketing · Campaigns", href: "/portal/marketing" }],
  });

  return out;
}
