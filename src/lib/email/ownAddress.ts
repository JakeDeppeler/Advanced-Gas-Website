/**
 * Whether an email address is someone's own mailbox, not their work's or an
 * agency's. Every automatic email to a customer (quote follow-ups, the
 * after-the-quote emails, review requests) goes only to one of these.
 *
 * Why so strict: a "Domestic" job in ServiceTitan is often billed to a real
 * estate agency, a retirement village or a builder, and the email on the
 * customer is then the property manager's (Barry Plant, Ray White, Neilson
 * Partners, Peake, Cardinia Waters on 8 Nov's overdue invoices). An email
 * saying "Hi June" about June's quote, sent to her agent, is worse than no
 * email. About 7 in 10 household customers use a personal mailbox; the few
 * homeowners who gave a work address get a phone call instead.
 *
 * Pure, for the check script and the browser.
 */

const EXACT = new Set([
  "gmail.com", "googlemail.com", "icloud.com", "me.com", "mac.com", "aol.com", "msn.com", "ymail.com", "rocketmail.com",
  "protonmail.com", "proton.me", "pm.me", "fastmail.com", "fastmail.fm", "gmx.com", "zoho.com", "mail.com",
  // Australian internet providers' mailboxes.
  "bigpond.com", "bigpond.net.au", "optusnet.com.au", "tpg.com.au", "iinet.net.au", "internode.on.net", "westnet.com.au",
  "dodo.com.au", "aapt.net.au", "ozemail.com.au", "adam.com.au", "skymesh.com.au", "exetel.com.au", "netspace.net.au",
  "iprimus.com.au", "people.net.au",
]);
/** The big free mailboxes, in any country's form: hotmail.co.uk, outlook.com.au, yahoo.com.au, live.com.au. */
const FAMILIES = /^(hotmail|outlook|live|yahoo|gmx)\.(com|net|co|fr|de|it|es)(\.[a-z]{2})?$/;

export function personalAddress(email: string | null | undefined): boolean {
  const domain = (email ?? "").trim().toLowerCase().split("@")[1] ?? "";
  return EXACT.has(domain) || FAMILIES.test(domain);
}
