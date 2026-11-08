import { site } from "@/lib/site";
import { RATING_SUMMARY, RATING_TEXT } from "@/lib/reviews";
import type { PremiumEmail } from "./premium";

/**
 * The address, phone and rating line under every customer email. The rating
 * reads RATING_SUMMARY, the same figure the website shows, so the email can't
 * claim more reviews than Google does.
 */
export function emailContext(): Pick<PremiumEmail, "base" | "footer" | "proof"> {
  const a = site.address;
  return {
    base: site.url,
    footer: { name: site.name, phone: site.phone, phoneHref: `tel:${site.phoneE164}`, address: `${a.street}, ${a.suburb} ${a.state} ${a.postcode}`, site: site.url },
    proof: `**★ ${RATING_TEXT}** on Google from ${RATING_SUMMARY.count} reviews · Family owned in ${a.suburb}`,
  };
}
