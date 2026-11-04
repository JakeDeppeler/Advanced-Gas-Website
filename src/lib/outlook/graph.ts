import "server-only";
import { mailboxesFrom } from "./outlookTypes";

/**
 * Microsoft Graph, as this app: the client-credentials grant, no user signed in.
 *
 * The Entra app is granted Mail.ReadWrite and **not** Mail.Send. ReadWrite is
 * what reading a message and saving a draft reply need; without Send there is
 * no API call this code could make that puts an email in front of a customer.
 * The person reading the draft is the only way one goes out, whatever a
 * model writes and whatever bug is in here.
 *
 * Mail.ReadWrite as an application permission covers every mailbox in the
 * tenant until Exchange is told otherwise, so setup (docs/outlook-drafts.md)
 * scopes the app to the two mailboxes. mailboxesFrom() refusing anything
 * outside our own domain is a second fence, not the first.
 */

const GRAPH = "https://graph.microsoft.com/v1.0";

export const outlookMailboxes = () => mailboxesFrom(process.env.OUTLOOK_DRAFT_MAILBOXES);

export function outlookConfigured(): boolean {
  return Boolean(
    process.env.MS_GRAPH_TENANT_ID?.trim() &&
      process.env.MS_GRAPH_CLIENT_ID?.trim() &&
      process.env.MS_GRAPH_CLIENT_SECRET?.trim() &&
      outlookMailboxes().length,
  );
}

export class GraphError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

let cached: { token: string; until: number } | null = null;

async function token(): Promise<string> {
  if (cached && cached.until > Date.now() + 60_000) return cached.token;
  const tenant = process.env.MS_GRAPH_TENANT_ID?.trim() ?? "";
  const res = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MS_GRAPH_CLIENT_ID?.trim() ?? "",
      client_secret: process.env.MS_GRAPH_CLIENT_SECRET?.trim() ?? "",
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });
  // Only the status, never the body: Entra's error text names the client id
  // and the tenant, and this message ends up in logs and API responses.
  if (!res.ok) throw new GraphError(`Microsoft sign-in refused (${res.status}). Check MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_ID and MS_GRAPH_CLIENT_SECRET.`, res.status);
  const j = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!j.access_token) throw new GraphError("Microsoft sign-in gave no token.", 500);
  cached = { token: j.access_token, until: Date.now() + (j.expires_in ?? 3000) * 1000 };
  return j.access_token;
}

/**
 * One Graph call. Every call asks for immutable ids, so a message keeps the id
 * it arrived with when somebody files it into a folder — the id is what a
 * notification names and what the record of drafts is keyed on.
 */
export async function graph<T>(path: string, init: { method?: string; body?: unknown; text?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${await token()}`, Prefer: 'IdType="ImmutableId"' };
  // Text bodies for reading; the draft itself is HTML, so writes leave this off.
  if (init.text) headers.Prefer += ', outlook.body-content-type="text"';
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${GRAPH}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  if (!res.ok) {
    // Graph's error code (ErrorItemNotFound, ErrorAccessDenied) is the useful
    // part and carries nothing secret; the message beside it can quote the
    // request, so it is left out.
    const code = await res.json().then((j: { error?: { code?: string } }) => j.error?.code ?? "", () => "");
    throw new GraphError(`Graph ${init.method ?? "GET"} ${path.split("?")[0]} answered ${res.status}${code ? ` ${code}` : ""}`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const userPath = (mailbox: string) => `/users/${encodeURIComponent(mailbox)}`;
