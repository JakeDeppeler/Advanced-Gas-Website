import "server-only";
import { isTrouble, type EmailKind } from "./eventTypes";

/**
 * The one place this business talks to Resend.
 *
 * There were seven: the quote form, the sign-in link, the pairing code, the
 * reports, the supplier orders, the journal alert and the newsletter, each
 * with its own copy of the same fetch and its own idea of what to do when it
 * failed. Six of them returned the failure to a caller who logged it, and one
 * swallowed it — and none of them told anybody, so a key that had expired
 * would have been invisible until somebody noticed they hadn't had a report
 * in a fortnight.
 *
 * Now every send writes a row, which is what lets the wall say so, and what
 * gives a bounce something to attach itself to when it arrives an hour later.
 *
 * **The recording never breaks the sending.** A database that is down is not a
 * reason to fail an email that Resend has already accepted, so every write in
 * here is caught and dropped. The cost of losing one is that a later bounce
 * cannot name what it was; the cost of the other way round is a customer who
 * never gets their quote because a logging table was unavailable.
 */

export type ResendMessage = {
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string | string[];
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{ filename: string; content: string }>;
  headers?: Record<string, string>;
};

export type SendOutcome = { ok: true; id: string | null } | { ok: false; error: string };

const url = () => process.env.SUPABASE_URL?.replace(/\/$/, "");

/** Fire-and-forget: a row that doesn't land must not take an email down with it. */
async function record(row: Record<string, unknown>): Promise<void> {
  const base = url();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return;
  try {
    await fetch(`${base}/rest/v1/portal_email_events`, {
      method: "POST",
      cache: "no-store",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
  } catch {
    /* Nothing to do about it here, and nothing worth failing a send over. */
  }
}

/**
 * Send it, and write down what happened.
 *
 * Returns the same shape the callers already handled, so nothing above this
 * had to learn anything new: an error string they can show, and now an id
 * they can ignore.
 */
export async function sendEmail(kind: EmailKind, msg: ResendMessage, about: Record<string, unknown> = {}): Promise<SendOutcome> {
  const key = process.env.RESEND_API_KEY;
  const to = msg.to.join(", ");

  const failed = async (error: string): Promise<SendOutcome> => {
    await record({ kind, to_email: to, subject: msg.subject, status: "failed", detail: error.slice(0, 500), about });
    return { ok: false, error };
  };

  if (!key) return failed("RESEND_API_KEY isn't set");
  if (!msg.to.length) return failed("nobody to send it to");

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      cache: "no-store",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });
  } catch (e) {
    return failed((e as Error).message || "send failed");
  }

  if (!res.ok) {
    /*
     * Resend's own words, trimmed. They are the useful half of this — "domain
     * is not verified" and "rate limit exceeded" want different people doing
     * different things — and the body carries no key of ours to leak.
     */
    const body = await res.text().catch(() => "");
    return failed(`Resend ${res.status}${body ? `: ${body.slice(0, 300)}` : ""}`);
  }

  const id = await res
    .json()
    .then((j: { id?: unknown }) => (typeof j.id === "string" ? j.id : null))
    .catch(() => null);

  await record({ kind, to_email: to, subject: msg.subject, status: "sent", provider_id: id, about });
  return { ok: true, id };
}

/**
 * A provider event about a message we sent earlier.
 *
 * Updates the send row where there is one and writes a standalone row where
 * there isn't — a message sent before this table existed, or one whose send
 * row didn't land. A bounce is worth knowing about even when we can no longer
 * say what it was, and "we don't know what this was" is itself the thing to
 * put in front of somebody.
 */
export async function recordProviderEvent(e: {
  providerId: string | null;
  status: string;
  to: string | null;
  subject: string | null;
  detail: string | null;
}): Promise<void> {
  const base = url();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  if (e.providerId) {
    try {
      const res = await fetch(
        `${base}/rest/v1/portal_email_events?provider_id=eq.${encodeURIComponent(e.providerId)}`,
        {
          method: "PATCH",
          cache: "no-store",
          headers,
          body: JSON.stringify({ status: e.status, detail: e.detail?.slice(0, 500) ?? null }),
        },
      );
      // An empty array back means there was no send row to update, so the
      // event falls through to a row of its own below.
      const rows = res.ok ? ((await res.json().catch(() => [])) as unknown[]) : [];
      if (rows.length > 0) return;
    } catch {
      /* Fall through and write a standalone row. */
    }
  }

  // Only worth a row of its own when it is trouble: a "delivered" for a
  // message we have no record of is not news.
  if (!isTrouble(e.status)) return;
  await record({
    kind: "other",
    to_email: e.to,
    subject: e.subject,
    status: e.status,
    provider_id: e.providerId,
    detail: e.detail?.slice(0, 500) ?? null,
  });
}
