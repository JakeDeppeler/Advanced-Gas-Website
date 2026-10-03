/**
 * The Marketing section's tabs and its time window.
 *
 * One page per section, one window selector that every view honours — rather
 * than a route per view each with its own idea of "recently". Pure, so the
 * pages, the tab strips and the search index all read the same lists.
 */

export type MarketingTab = "campaigns" | "reviews" | "ads" | "social" | "assets";

export const MARKETING_TABS: { k: MarketingTab; label: string; title: string; blurb: string }[] = [
  { k: "campaigns", label: "Campaigns", title: "Everything we're running",
    blurb: "Every piece of marketing in one list — who it's for, where it runs, what it costs and what it brings in." },
  { k: "reviews", label: "Reviews", title: "What customers say",
    blurb: "The Google reviews, as they come in." },
  { k: "ads", label: "Ads", title: "What the ads are doing",
    blurb: "Spend, impressions and clicks, per platform." },
  { k: "social", label: "Social", title: "What we're posting",
    blurb: "The Instagram feed, and how each post did." },
  { k: "assets", label: "Brand assets", title: "The brand kit",
    blurb: "Logos, van wrap artwork and the finished-job photos everyone draws on." },
];

/**
 * The website's own section, split out of Marketing.
 *
 * Marketing had nine tabs answering two different questions: what we put out
 * into the world, and what the website does with the people it brings in. The
 * second half is its own place now, beside the Blog, which is the third.
 */
export type WebsiteTab = "leads" | "pages" | "dropoff";

export const WEBSITE_TABS: { k: WebsiteTab; label: string; title: string; blurb: string }[] = [
  { k: "leads", label: "Enquiries", title: "What the website brings in",
    blurb: "Every quote request and phone tap — where they came from, how far away, and when. No customer details here; the enquiry still goes to the inbox." },
  { k: "pages", label: "Pages", title: "Which pages do the work",
    blurb: "Which pages people read, and which of them turn a reader into an enquiry." },
  { k: "dropoff", label: "Drop-off", title: "Where people leave",
    blurb: "How far down the quote form people get before they stop." },
];

export const websiteTabDef = (k: string | undefined) => WEBSITE_TABS.find((t) => t.k === k) ?? WEBSITE_TABS[0];

/** Marketing's old tab keys, and where each one lives now. */
export const MOVED_TABS: Record<string, string> = {
  blog: "/portal/blog",
  leads: "/portal/website",
  site: "/portal/website?tab=pages",
  dropoff: "/portal/website?tab=dropoff",
};

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

/** The same, for the Website section. */
export const websiteHref = (tab: WebsiteTab, win: WindowKey) =>
  `/portal/website${tab === "leads" ? (win === "30" ? "" : `?win=${win}`) : `?tab=${tab}${win === "30" ? "" : `&win=${win}`}`}`;
