import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { leadFromFields, type MetaEvent, type MetaLeadFields } from "./metaTypes";

/**
 * Facebook's side of the lead feed: the token, the two Graph reads, and the
 * write into `portal_leads`.
 *
 * A lead that lands here is the same row the website's quote form writes, with
 * a different `source`. That is the whole design: the board, the portal's lead
 * pages, the suburb counts and the month's lead total all read one table and
 * none of them had to learn what Facebook is.
 *
 * **No credential and nothing derived from one leaves this file.** The page
 * token is read from the environment at the point of use and never returned,
 * logged, or put in an error message — a Graph error can quote the request
 * back at you, query string and all, which is why nothing here echoes a
 * response body.
 */

const GRAPH = "https://graph.facebook.com/v23.0";

export const metaConfigured = () => Boolean(process.env.META_APP_SECRET?.trim() && process.env.META_VERIFY_TOKEN?.trim());
/** The form answers need a page token. Without one a lead still lands, with no detail on it. */
export const metaTokenSet = () => Boolean(process.env.META_PAGE_TOKEN?.trim());

/** What a webhook event turns into, before it is a row. */
export type IncomingLead = {
  externalId: string;
  source: "facebook" | "facebook-message" | "instagram-message" | "website-chat";
  at: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  headline: string;
  suburb: string | null;
  postcode: string | null;
  summary: string | null;
  details: Record<string, unknown>;
};

/**
 * A lead form's answers from the Graph API.
 *
 * Returns null rather than throwing, and the caller writes the lead anyway: an
 * enquiry nobody can see the details of still has to reach the wall, and the
 * details are two clicks away in Meta. A lead dropped because a token expired
 * is a lead nobody ever knew about.
 */
async function fetchLeadFields(leadgenId: string): Promise<MetaLeadFields | null> {
  const token = process.env.META_PAGE_TOKEN?.trim();
  if (!token) return null;
  try {
    const url = new URL(`${GRAPH}/${encodeURIComponent(leadgenId)}`);
    url.searchParams.set("fields", "field_data,created_time");
    url.searchParams.set("access_token", token);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { field_data?: unknown };
    return leadFromFields(json.field_data);
  } catch {
    // Never the message: a fetch failure can carry the URL, and the URL has
    // the page token in it.
    return null;
  }
}

/** Who sent a message, if the page's permissions stretch that far. */
async function fetchSenderName(psid: string): Promise<string | null> {
  const token = process.env.META_PAGE_TOKEN?.trim();
  if (!token) return null;
  try {
    const url = new URL(`${GRAPH}/${encodeURIComponent(psid)}`);
    url.searchParams.set("fields", "first_name,last_name");
    url.searchParams.set("access_token", token);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { first_name?: string; last_name?: string };
    const name = [json.first_name, json.last_name].filter(Boolean).join(" ").trim();
    return name || null;
  } catch {
    return null;
  }
}

/** One webhook event, as the lead it should become. */
export async function leadFrom(event: MetaEvent): Promise<IncomingLead> {
  if (event.kind === "leadgen") {
    const f = await fetchLeadFields(event.leadgenId);
    return {
      externalId: event.id,
      source: "facebook",
      at: event.at,
      name: f?.name ?? null,
      phone: f?.phone ?? null,
      email: f?.email ?? null,
      // Says which form, where we know, because a business running two ad sets
      // wants to know which one is working without opening Meta.
      headline: "Facebook lead form",
      suburb: f?.suburb ?? null,
      postcode: f?.postcode ?? null,
      summary: f?.summary ?? (f ? null : "Open Meta to see what they answered"),
      details: { leadgenId: event.leadgenId, formId: event.formId, pageId: event.pageId },
    };
  }

  /*
   * Every message that gets this far becomes a lead row, and the unique index
   * on external_id decides whether it is a new one: the key is the sender and
   * the day, so the second and third messages of a conversation resolve to the
   * row the first one wrote and nothing more happens. One fewer round trip
   * than asking first, and no window where two messages a second apart both
   * find nothing and both write.
   */
  return {
    externalId: event.id,
    source: "facebook-message",
    at: event.at,
    // Asked for on every message, including the second and third of a
    // conversation whose row will be ignored on the way in. One small Graph
    // call against knowing in advance, which would cost a database round trip
    // on every message instead.
    name: await fetchSenderName(event.senderId),
    phone: null,
    email: null,
    headline: "Facebook message",
    suburb: null,
    postcode: null,
    summary: event.text ? `“${event.text.slice(0, 300)}”` : null,
    details: { senderId: event.senderId, mid: event.mid, pageId: event.pageId },
  };
}

/** How each kind is tagged, so the portal's channel counts file it with the platform it came through. */
const UTM: Record<IncomingLead["source"], Record<string, string>> = {
  facebook: { source: "facebook", medium: "lead-form" },
  "facebook-message": { source: "facebook", medium: "messenger" },
  "instagram-message": { source: "instagram", medium: "direct-message" },
  "website-chat": { source: "website", medium: "chat" },
};

/**
 * Write it, once.
 *
 * Meta retries anything it did not get a 200 for, and it retries generously:
 * the same enquiry can arrive four times in a minute. `external_id` is unique
 * and carries the lead's own Meta id — or, for a message, the person and the
 * day — so the second write is refused by the database rather than becoming a
 * second full-screen alert for somebody the office has already rung.
 *
 * **The duplicate is caught rather than ignored in SQL.** The obvious version
 * is `on_conflict=external_id` with `resolution=ignore-duplicates`, which
 * PostgREST turns into `on conflict (external_id) do nothing` — and that
 * matches a plain unique index only. Against the partial one on this column it
 * fails with 42P10 on every single insert, which would have meant a 500 to
 * every delivery Facebook ever made. A refused insert comes back as 409, and
 * 409 here means exactly what the ignore would have meant: we already have it.
 *
 * Throws on anything else, so the route answers 500 and Meta tries again,
 * which is safe precisely because of the above.
 */
export async function storeIncoming(lead: IncomingLead): Promise<void> {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("database not configured");

  const res = await fetch(`${url}/rest/v1/portal_leads`, {
    method: "POST",
    cache: "no-store",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      external_id: lead.externalId,
      source: lead.source,
      kind: "quote",
      // Meta's own time for the enquiry, not the time the webhook arrived.
      created_at: lead.at,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      headline: lead.headline,
      suburb: lead.suburb,
      postcode: lead.postcode,
      summary: lead.summary,
      details: lead.details,
      utm: UTM[lead.source],
    }),
  });

  // Already have it: a retry, or the second message of a conversation.
  if (res.status === 409) return;
  // Never the body: it can quote the row back, and the row has a customer on it.
  if (!res.ok) throw new Error(`insert failed (${res.status})`);
}

/** When Facebook last sent us anything, for the integrations page. */
export async function lastMetaLead(): Promise<string | null> {
  const rows = await sbSelect<{ created_at: string }>(
    "portal_leads",
    [q.select("created_at"), "source=in.(facebook,facebook-message)", q.order("created_at", "desc"), "limit=1"].join("&"),
  ).catch(() => []);
  return rows[0]?.created_at ?? null;
}
