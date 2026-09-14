/**
 * Where a website enquiry came from.
 *
 * The lead record carries whatever the first page of the visit could see: the
 * UTM tags if the link was tagged, the ad platforms' own click IDs whether it
 * was or not, and the referring host. This turns that into one channel, in the
 * order of what is most reliable.
 *
 * The click ID is checked before the UTM tags on purpose. A tag is something a
 * person remembered to add and can be wrong; fbclid is added by Facebook at
 * the moment of the click and cannot be there for any other reason.
 */

export type Channel =
  | "facebook-ad" | "facebook" | "instagram"
  | "google-ad" | "google" | "search"
  | "referral" | "campaign" | "direct";

export type LeadSource = {
  channel: Channel;
  /** What it says on the page. */
  label: string;
  /** Somebody was paid for this click. */
  paid: boolean;
  /** The campaign, when the link carried one. */
  campaign: string | null;
  /** How the call was made, for the ones that are a guess rather than a fact. */
  certain: boolean;
};

const SOCIAL_HOSTS = /(^|\.)(facebook|fb|instagram|messenger)\.com$|^l\.facebook|^lm\.facebook|^m\.facebook/i;
const GOOGLE_HOSTS = /(^|\.)google\./i;
const SEARCH_HOSTS = /(^|\.)(bing|duckduckgo|yahoo|ecosia|brave)\./i;
const PAID_MEDIUM = /(cpc|ppc|paid|ads?$|paid_social|paidsocial)/i;
const FB_SOURCE = /^(facebook|fb|meta|ig|instagram)$/i;

export function classifyLead(utm: Record<string, string> | null | undefined): LeadSource {
  const u = utm ?? {};
  const src = (u.utm_source ?? "").trim();
  const medium = (u.utm_medium ?? "").trim();
  const ref = (u.referrer ?? "").trim();
  const campaign = (u.utm_campaign ?? "").trim() || null;
  const paidMedium = PAID_MEDIUM.test(medium);

  // Click IDs first: the platform put them there itself.
  if (u.fbclid) {
    return { channel: "facebook-ad", label: "Facebook or Instagram ad", paid: true, campaign, certain: true };
  }
  if (u.gclid || u.gbraid || u.wbraid) {
    return { channel: "google-ad", label: "Google Ads", paid: true, campaign, certain: true };
  }

  // Then the tags, which are only as good as whoever set the ad up.
  if (FB_SOURCE.test(src)) {
    return paidMedium
      ? { channel: "facebook-ad", label: "Facebook or Instagram ad", paid: true, campaign, certain: true }
      : { channel: /^(ig|instagram)$/i.test(src) ? "instagram" : "facebook", label: "Facebook or Instagram post", paid: false, campaign, certain: true };
  }
  if (/^google$/i.test(src) && paidMedium) {
    return { channel: "google-ad", label: "Google Ads", paid: true, campaign, certain: true };
  }
  if (src || campaign) {
    return { channel: "campaign", label: campaign ? `Campaign: ${campaign}` : `Tagged link: ${src}`, paid: paidMedium, campaign, certain: true };
  }

  // Then where the browser says they came from. An untagged social click lands
  // here, which is why it is worth saying on the page that it may be an ad.
  if (ref) {
    if (SOCIAL_HOSTS.test(ref)) {
      return { channel: "facebook", label: "Facebook or Instagram, untagged", paid: false, campaign: null, certain: false };
    }
    if (GOOGLE_HOSTS.test(ref)) {
      return { channel: "google", label: "Google search", paid: false, campaign: null, certain: true };
    }
    if (SEARCH_HOSTS.test(ref)) {
      return { channel: "search", label: "Another search engine", paid: false, campaign: null, certain: true };
    }
    return { channel: "referral", label: `Link from ${ref}`, paid: false, campaign: null, certain: true };
  }

  return { channel: "direct", label: "Direct or unknown", paid: false, campaign: null, certain: false };
}

/** The order channels are listed in, most worth knowing about first. */
export const CHANNEL_ORDER: Channel[] = [
  "facebook-ad", "google-ad", "campaign", "facebook", "instagram", "google", "search", "referral", "direct",
];
