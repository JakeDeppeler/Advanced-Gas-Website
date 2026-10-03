/**
 * The Marketing section's tabs and its time window.
 *
 * One page, nine views, one window selector that every view honours — rather
 * than nine routes each with its own idea of "recently". Pure, so the page,
 * the tab strip and the search index all read the same list.
 */

export type MarketingTab =
  | "campaigns" | "blog" | "leads" | "site" | "dropoff"
  | "reviews" | "ads" | "social" | "assets";

export const MARKETING_TABS: { k: MarketingTab; label: string; title: string; blurb: string }[] = [
  { k: "campaigns", label: "Campaigns", title: "Everything we're running",
    blurb: "Every piece of marketing in one list — who it's for, where it runs, what it costs and what it brings in." },
  { k: "blog", label: "Blog", title: "What's on the blog",
    blurb: "Every article on the site, what it's about and which part of the range it supports." },
  { k: "leads", label: "Website leads", title: "What the website brings in",
    blurb: "Every quote request and phone tap — where they came from, how far away, and when. No customer details here; the enquiry still goes to the inbox." },
  { k: "site", label: "On the site", title: "Which pages do the work",
    blurb: "Every page that has produced an enquiry, and every page that hasn't." },
  { k: "dropoff", label: "Drop-off", title: "Where people leave",
    blurb: "How far down the quote form people get before they stop." },
  { k: "reviews", label: "Reviews", title: "What customers say",
    blurb: "The Google reviews, as they come in." },
  { k: "ads", label: "Ads", title: "What the ads are doing",
    blurb: "Spend, impressions and clicks, per platform." },
  { k: "social", label: "Social", title: "What we're posting",
    blurb: "The Instagram feed, and how each post did." },
  { k: "assets", label: "Brand assets", title: "The brand kit",
    blurb: "Logos, van wrap artwork and the finished-job photos everyone draws on." },
];

export const tabDef = (k: string) => MARKETING_TABS.find((t) => t.k === k) ?? MARKETING_TABS[0];

/** The windows the whole section shares. */
export const WINDOWS = [
  { k: "30", label: "30 days", days: 30 },
  { k: "90", label: "90 days", days: 90 },
  { k: "365", label: "12 months", days: 365 },
] as const;
export type WindowKey = (typeof WINDOWS)[number]["k"];

export const windowDays = (k: string | undefined): number =>
  WINDOWS.find((w) => w.k === k)?.days ?? 30;
export const windowKey = (k: string | undefined): WindowKey =>
  (WINDOWS.find((w) => w.k === k)?.k ?? "30") as WindowKey;
export const windowLabel = (k: string | undefined): string =>
  WINDOWS.find((w) => w.k === k)?.label ?? "30 days";

/** `/portal/marketing?tab=…&win=…`, built in one place so no link drops the window. */
export const marketingHref = (tab: MarketingTab, win: WindowKey) =>
  `/portal/marketing?tab=${tab}${win === "30" ? "" : `&win=${win}`}`;
