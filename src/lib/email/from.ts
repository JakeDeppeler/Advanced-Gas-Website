import { site } from "@/lib/site";

/** The owner's inbox: where previews go, and anything the portal has nobody else to tell. */
export const OWNER_EMAIL = "jake@advancedgas.com.au";

/**
 * A sender on our own domain, the one Resend has verified: quotes@, reviews@,
 * bookings@, each with a name in front. Anywhere else (a preview deploy on
 * Resend's onboarding sender) the configured sender goes out as it is, so a
 * send isn't refused for a domain that isn't verified.
 *
 * The name is whatever the inbox should show, usually the business, sometimes
 * "Sarah Jones via Advanced Gas" for a message passed on from a customer.
 * Quotes and commas would break the address, so they're taken out.
 */
export function fromBox(box: string, name: string = site.name): string {
  const raw = (process.env.RESEND_FROM_EMAIL ?? "").trim();
  const domain = ((raw.match(/<([^>]+)>/)?.[1] ?? raw).split("@")[1] ?? "").toLowerCase();
  if (!/^(?:[a-z0-9-]+\.)*advancedgas\.com\.au$/.test(domain)) return raw || "Advanced Gas Website <onboarding@resend.dev>";
  return `${name.replace(/["<>,]/g, "").trim() || site.name} <${box}@${domain}>`;
}
