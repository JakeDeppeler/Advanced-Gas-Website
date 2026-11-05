import "server-only";
import { randomBytes } from "node:crypto";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { site } from "@/lib/site";
import { graph, GraphError, outlookMailboxes } from "./graph";

/**
 * Graph's change notifications: Microsoft calls /api/email/outlook the moment
 * an email lands in either Inbox, which is what has the draft there before
 * anybody opens the email, and the moment a reply lands in Sent Items.
 *
 * A subscription expires after a few days, and nothing renews it but us, so
 * the sweep calls ensureSubscriptions() every run. A mailbox whose
 * subscription has lapsed still gets drafts, from the sweep, just later.
 *
 * Each subscription gets its own random clientState, kept in portal_settings.
 * Microsoft sends it back with every notification and that is how a
 * notification is known to be real: the URL is public, and anyone can POST
 * to it.
 */

const KEY = "outlook_subscriptions";
/** Under the documented limit for mail, with room to spare. */
const LIFETIME_MIN = 4000;
/** Renew when less than this is left, so one missed sweep day doesn't let it lapse. */
const RENEW_BELOW_MS = 40 * 3600 * 1000;

/**
 * Which folder a subscription watches. The Inbox is what gets drafts; Sent
 * Items is how a reply going out is noticed, to take Needs a person off the
 * email it answered. Records made before Sent Items was watched have no
 * folder and are the Inbox's.
 */
export type Folder = "inbox" | "sent";
export type SubRecord = { mailbox: string; clientState: string; folder?: Folder };
export const folderOf = (r: SubRecord): Folder => r.folder ?? "inbox";
type SubMap = Record<string, SubRecord>;
type GraphSub = { id: string; notificationUrl: string; expirationDateTime: string };

export const notificationUrl = () => `${site.url.replace(/\/$/, "")}/api/email/outlook`;
const FOLDERS: Folder[] = ["inbox", "sent"];
const resourceFor = (mailbox: string, folder: Folder) => `users/${mailbox}/mailFolders('${folder === "sent" ? "SentItems" : "Inbox"}')/messages`;
const expiry = () => new Date(Date.now() + LIFETIME_MIN * 60_000).toISOString();

export async function knownSubscriptions(): Promise<SubMap> {
  return (await getSettings<SubMap>(KEY)) ?? {};
}

export type SubStatus = { mailbox: string; folder?: Folder; action: "kept" | "renewed" | "created" | "failed"; expires?: string; error?: string };

export async function ensureSubscriptions(): Promise<SubStatus[]> {
  const url = notificationUrl();
  const known = await knownSubscriptions();
  // Subscriptions this app made, wherever they point. Only ours (this URL)
  // are touched; a preview deployment's are left for it.
  const live = (await graph<{ value: GraphSub[] }>("/subscriptions")).value.filter((s) => s.notificationUrl === url);

  const next: SubMap = {};
  const out: SubStatus[] = [];

  for (const [mailbox, folder] of outlookMailboxes().flatMap((m) => FOLDERS.map((f) => [m, f] as const))) {
    // Matched on our own record of which mailbox and folder each id is for,
    // not on the resource string: Graph may hand that back with the user's id
    // in place of the address it was created with.
    const mine = live.filter((s) => known[s.id]?.mailbox === mailbox && folderOf(known[s.id]) === folder);
    const keep = mine.sort((a, b) => Date.parse(b.expirationDateTime) - Date.parse(a.expirationDateTime))[0];
    try {
      if (keep && Date.parse(keep.expirationDateTime) - Date.now() > RENEW_BELOW_MS) {
        next[keep.id] = known[keep.id];
        out.push({ mailbox, folder, action: "kept", expires: keep.expirationDateTime });
        continue;
      }
      if (keep) {
        try {
          const r = await graph<GraphSub>(`/subscriptions/${encodeURIComponent(keep.id)}`, { method: "PATCH", body: { expirationDateTime: expiry() } });
          next[keep.id] = known[keep.id];
          out.push({ mailbox, folder, action: "renewed", expires: r.expirationDateTime });
          continue;
        } catch (e) {
          // Gone between the list and the renew: make a new one below.
          if (!(e instanceof GraphError && e.status === 404)) throw e;
        }
      }
      const clientState = randomBytes(32).toString("hex");
      // Microsoft calls the URL with a validation token before this returns,
      // so the route must already be deployed and answering.
      const r = await graph<GraphSub>("/subscriptions", {
        method: "POST",
        body: { changeType: "created", notificationUrl: url, resource: resourceFor(mailbox, folder), expirationDateTime: expiry(), clientState },
      });
      next[r.id] = { mailbox, clientState, folder };
      out.push({ mailbox, folder, action: "created", expires: r.expirationDateTime });
    } catch (e) {
      if (keep && known[keep.id]) next[keep.id] = known[keep.id];
      out.push({ mailbox, folder, action: "failed", error: (e as Error).message });
    }
  }

  // Ours but not wanted any more (a mailbox taken off the list, a duplicate
  // from two sweeps racing, one whose secret was lost): delete, so a mailbox
  // never gets two drafts per email from two subscriptions.
  for (const s of live) {
    if (next[s.id]) continue;
    await graph(`/subscriptions/${encodeURIComponent(s.id)}`, { method: "DELETE" }).catch(() => undefined);
  }

  const saved = await saveSettings(KEY, next);
  if (!saved.ok) out.push({ mailbox: "*", action: "failed", error: `couldn't save subscriptions: ${saved.error}` });
  return out;
}
