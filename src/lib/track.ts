/**
 * Website conversions.
 *
 * Two places need to know a lead happened: Google Analytics, because that is
 * where campaign and channel reporting lives, and our own database, because a
 * lead is the business's own record and shouldn't only exist inside somebody
 * else's product.
 *
 * Everything here fails quietly. An analytics call must never be the reason a
 * customer's enquiry doesn't go through.
 */

type Gtag = (...args: unknown[]) => void;

/** The five UTM keys, kept from the first page of the visit. */
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
const UTM_STORE = "ag_utm";

/**
 * Remember what brought someone here. They usually land on one page and enquire
 * from another, so reading the query string at submit time would credit almost
 * every paid click to "direct".
 */
export function captureUtm(): void {
  if (typeof window === "undefined") return;
  try {
    const q = new URLSearchParams(window.location.search);
    const found: Record<string, string> = {};
    for (const k of UTM_KEYS) {
      const v = q.get(k);
      if (v) found[k] = v.slice(0, 120);
    }
    if (Object.keys(found).length === 0) return;
    if (!found.referrer && document.referrer) found.referrer = document.referrer.slice(0, 200);
    sessionStorage.setItem(UTM_STORE, JSON.stringify(found));
  } catch { /* private mode, or storage full, not worth breaking a page over */ }
}

export function readUtm(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(UTM_STORE);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch { return {}; }
}

function gtag(...args: unknown[]): void {
  try {
    const w = window as unknown as { gtag?: Gtag };
    w.gtag?.(...args);
  } catch { /* ignore */ }
}

/** A quote request went through. */
export function trackLead(service: string, summary?: string): void {
  gtag("event", "generate_lead", { currency: "AUD", value: 1, service, summary });
}

/**
 * Somebody tapped the phone number. For a trade this is often the bigger half
 * of the enquiries and it has never been counted, so the site has been judged
 * on form fills alone.
 */
export function trackCall(where: string): void {
  gtag("event", "contact", { method: "phone", where });
  try {
    const body = JSON.stringify({
      kind: "call",
      pagePath: window.location.pathname,
      where,
      utm: readUtm(),
    });
    // keepalive so the record survives the browser leaving for the dialler.
    void fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
  } catch { /* ignore */ }
}
