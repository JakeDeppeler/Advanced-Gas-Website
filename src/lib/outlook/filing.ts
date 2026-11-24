import "server-only";
import { q, sbDelete, sbSelect, sbUpsert } from "@/lib/dashboard/db";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { graph, GraphError, outlookConfigured, outlookMailboxes, userPath } from "./graph";
import { addressOf, plainText, type GraphMessage } from "./outlookTypes";
import {
  NOTIFICATIONS_FOLDER,
  SENDER_MIN,
  SENDER_SHARE,
  domainOf,
  filingSettingsFrom,
  flaggedWord,
  isNever,
  learnHomes,
  pickFolder,
  waitReason,
  type DraftRecord,
  type FilingSettings,
  type Folder,
  type Home,
} from "./filingTypes";

/**
 * Filing admin@ into its own folders (rules in filingTypes.ts), run every ten
 * minutes with the Outlook catch-up.
 *
 * Each run looks at the last fortnight of the Inbox, and for each email works
 * out whether it's done with and, if so, which folder it belongs in. In trial
 * that's only written down, for the Email filing page to show; switched on,
 * the email is moved there. Nothing is ever deleted, and the app can't send.
 *
 * Moving keeps an email's id (every Graph call asks for immutable ids), so the
 * drafts, the work orders and the job links that point at it still find it.
 *
 * Once a day the folders are read again: their names, and a sample of who
 * each one's email is from, which is how a sender's folder is learned.
 */

const SETTINGS = "mail_filing";
const FOLDERS = "mail_folders";
const HOMES = "mail_folder_homes";
const TABLE = "mail_filing";

const WINDOW_DAYS = 14;
const LEARN_EVERY_MS = 20 * 3600 * 1000;
/** The most recent this many emails of each folder stand for it. */
const SAMPLE = 200;
const PAGE = 50;
const MAX_PAGES = 6;
const BUDGET_MS = 45_000;
/** Each needs the email's text read, for the flagged words; the rest wait for the next run. */
const READS_PER_RUN = 40;
const MOVES_PER_RUN = 40;
/** Ids are long; this many fit in one lookup's URL. */
const CHUNK = 20;

type StoredFolders = Record<string, { at: string; folders: (Folder & { total: number })[] }>;

export async function loadFilingSettings(): Promise<FilingSettings> {
  return filingSettingsFrom(await getSettings<unknown>(SETTINGS).catch(() => null));
}

export async function saveFilingSettings(next: Partial<FilingSettings>, by: string): Promise<{ ok: boolean; error?: string }> {
  const cur = await loadFilingSettings();
  const merged: FilingSettings = { ...cur, ...next };
  if (next.mode && next.mode !== cur.mode) {
    merged.since = new Date().toISOString();
    merged.by = by;
  }
  return saveSettings(SETTINGS, merged);
}

export async function storedFolders(): Promise<StoredFolders> {
  return (await getSettings<StoredFolders>(FOLDERS).catch(() => null)) ?? {};
}

/* ------------------------------------------------------------- the folders */

type GraphFolder = { id: string; displayName: string; childFolderCount?: number; totalItemCount?: number };
type Page<T> = { value: T[]; "@odata.nextLink"?: string };
const nextOf = (link?: string) => link?.replace(/^https:\/\/graph\.microsoft\.com\/v1\.0/, "");

/** Every folder under the Inbox, three levels down, with its path ("Admin Team/Quotes"). */
async function folderTree(box: string): Promise<(Folder & { total: number })[]> {
  const out: (Folder & { total: number })[] = [];
  const walk = async (parent: string, prefix: string, depth: number) => {
    let next: string | undefined = `${box}/mailFolders/${parent}/childFolders?$top=200&$select=id,displayName,childFolderCount,totalItemCount`;
    while (next) {
      const res: Page<GraphFolder> = await graph(next);
      for (const f of res.value) {
        const path = prefix ? `${prefix}/${f.displayName}` : f.displayName;
        out.push({ id: f.id, name: f.displayName, path, total: f.totalItemCount ?? 0 });
        if ((f.childFolderCount ?? 0) > 0 && depth < 3) await walk(encodeURIComponent(f.id), path, depth + 1);
      }
      next = nextOf(res["@odata.nextLink"]);
    }
  };
  await walk("inbox", "", 1);
  return out;
}

/**
 * Read the folders again and relearn where each sender's email goes. The
 * never-list folders are listed (so the page can offer them) but not read.
 */
export async function learnFolders(mailbox: string): Promise<{ folders: number; read: number; senders: number; domains: number }> {
  const box = userPath(mailbox);
  const s = await loadFilingSettings();
  const folders = await folderTree(box);
  const all = await storedFolders();
  all[mailbox] = { at: new Date().toISOString(), folders };
  await saveSettings(FOLDERS, all);

  const learnFrom = folders.filter((f) => f.total > 0 && !isNever(f.path, s.neverFolders));
  const samples: { folderId: string; from: string }[] = [];
  for (let i = 0; i < learnFrom.length; i += 6) {
    const got = await Promise.all(
      learnFrom.slice(i, i + 6).map((f) =>
        graph<Page<GraphMessage>>(`${box}/mailFolders/${encodeURIComponent(f.id)}/messages?$select=from,sender&$top=${SAMPLE}&$orderby=receivedDateTime%20desc`)
          .then((r) => r.value.map((m) => ({ folderId: f.id, from: addressOf(m.from) || addressOf(m.sender) })))
          .catch(() => []),
      ),
    );
    samples.push(...got.flat());
  }

  const { senders, domains } = learnHomes(samples);
  const at = new Date().toISOString();
  const rows = [
    ...[...senders].map(([key, h]) => ({ mailbox, kind: "sender", key, folder_id: h.folderId, n: h.n, total: h.total, learned_at: at })),
    ...[...domains].map(([key, h]) => ({ mailbox, kind: "domain", key, folder_id: h.folderId, n: h.n, total: h.total, learned_at: at })),
  ];
  for (let i = 0; i < rows.length; i += 500) await sbUpsert(HOMES, rows.slice(i, i + 500), "mailbox,kind,key");
  // What wasn't seen this time (a folder emptied, a sender gone quiet) is forgotten.
  await sbDelete(HOMES, [q.eq("mailbox", mailbox), q.lt("learned_at", at)].join("&"));
  return { folders: folders.length, read: learnFrom.length, senders: senders.size, domains: domains.size };
}

/* ----------------------------------------------------------------- the run */

type InboxMessage = GraphMessage & { categories?: string[]; flag?: { flagStatus?: string } | null };
type FilingRow = {
  mailbox: string; message_id: string; status: string; folder_id: string | null; folder_name: string | null; why: string | null; words_key: string | null;
};

/** A short fingerprint of the flagged-word list, so an edited list gets every email checked again. */
const keyOf = (list: string[]) => {
  let h = 5381;
  for (const ch of list.join("|").toLowerCase()) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
  return `${list.length}:${h.toString(36)}`;
};

async function inboxSince(box: string, since: string): Promise<InboxMessage[]> {
  const f = encodeURIComponent(`receivedDateTime ge ${since}`);
  let next: string | undefined = `${box}/mailFolders('Inbox')/messages?$filter=${f}&$orderby=receivedDateTime%20desc&$select=id,from,sender,subject,categories,flag,receivedDateTime&$top=${PAGE}`;
  const out: InboxMessage[] = [];
  for (let page = 0; next && page < MAX_PAGES; page++) {
    const res: Page<InboxMessage> = await graph(next);
    out.push(...res.value);
    next = nextOf(res["@odata.nextLink"]);
  }
  return out;
}

const inIds = (ids: string[]) => `message_id=in.(${ids.map((x) => `"${encodeURIComponent(x)}"`).join(",")})`;

async function byIds<T>(table: string, cols: string, mailbox: string | null, ids: string[]): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const part = ids.slice(i, i + CHUNK);
    out.push(...(await sbSelect<T>(table, [q.select(cols), ...(mailbox ? [q.eq("mailbox", mailbox)] : []), inIds(part)].join("&"))));
  }
  return out;
}

async function ensureFolder(box: string, name: string, folders: Folder[]): Promise<Folder> {
  const have = folders.find((f) => !f.path.includes("/") && f.name.toLowerCase() === name.toLowerCase());
  if (have) return have;
  try {
    const made = await graph<GraphFolder>(`${box}/mailFolders/inbox/childFolders`, { method: "POST", body: { displayName: name } });
    const f = { id: made.id, name, path: name };
    folders.push(f);
    return f;
  } catch (e) {
    if (!(e instanceof GraphError && e.status === 409)) throw e;
    const res = await graph<Page<GraphFolder>>(`${box}/mailFolders/inbox/childFolders?$filter=${encodeURIComponent(`displayName eq '${name.replace(/'/g, "''")}'`)}&$select=id,displayName`);
    const hit = res.value[0];
    if (!hit) throw e;
    const f = { id: hit.id, name, path: name };
    folders.push(f);
    return f;
  }
}

export type FilingDecision = { id: string; received: string | null; from: string; subject: string; status: "stays" | "would" | "moved" | "kept" | "back" | "failed"; folder: string | null; why: string };
export type MailboxRun = {
  mailbox: string;
  learned?: Awaited<ReturnType<typeof learnFolders>> | { error: string };
  seen: number;
  would: number;
  moved: number;
  kept: number;
  stays: number;
  waiting: number;
  error?: string;
  sample?: FilingDecision[];
};

/**
 * One pass over each mailbox's Inbox. `dry` works everything out and writes
 * nothing, whatever the switch says (for checking by hand); `learn` reads the
 * folders again first.
 */
export async function runFiling(opts: { dry?: boolean; learn?: boolean } = {}): Promise<{ mode: FilingSettings["mode"]; mailboxes: MailboxRun[] }> {
  const s = await loadFilingSettings();
  if ((s.mode === "off" && !opts.dry) || !outlookConfigured()) return { mode: s.mode, mailboxes: [] };
  const started = Date.now();
  const allowed = new Set(outlookMailboxes());
  const out: MailboxRun[] = [];
  for (const mailbox of s.mailboxes.filter((m) => allowed.has(m))) {
    out.push(await runMailbox(mailbox, s, started, opts).catch((e: Error) => ({ mailbox, seen: 0, would: 0, moved: 0, kept: 0, stays: 0, waiting: 0, error: e.message.slice(0, 300) })));
  }
  return { mode: s.mode, mailboxes: out };
}

async function runMailbox(mailbox: string, s: FilingSettings, started: number, opts: { dry?: boolean; learn?: boolean }): Promise<MailboxRun> {
  const box = userPath(mailbox);
  const run: MailboxRun = { mailbox, seen: 0, would: 0, moved: 0, kept: 0, stays: 0, waiting: 0 };

  let stored = (await storedFolders())[mailbox];
  if (opts.learn || !stored || Date.now() - Date.parse(stored.at) > LEARN_EVERY_MS) {
    run.learned = await learnFolders(mailbox).catch((e: Error) => ({ error: e.message.slice(0, 300) }));
    stored = (await storedFolders())[mailbox];
  }
  const folders: Folder[] = (stored?.folders ?? []).map(({ id, name, path }) => ({ id, name, path }));
  const homes = await sbSelect<{ kind: string; key: string; folder_id: string; n: number; total: number }>(HOMES, [q.select("kind,key,folder_id,n,total"), q.eq("mailbox", mailbox), "limit=20000"].join("&")).catch(() => []);
  const senderHome = new Map<string, Home>();
  const domainHome = new Map<string, Home>();
  for (const h of homes) (h.kind === "domain" ? domainHome : senderHome).set(h.key, { folderId: h.folder_id, n: h.n, total: h.total });

  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
  const inbox = await inboxSince(box, since);
  run.seen = inbox.length;
  const ids = inbox.map((m) => m.id);
  const [drafts, orders, had] = await Promise.all([
    byIds<DraftRecord & { message_id: string }>("mail_drafts", "message_id,status,reason,handoff,handoff_cleared_at,sent_at,callback_at,callback_done_at", mailbox, ids),
    byIds<{ message_id: string; agency: string | null }>("work_orders", "message_id,agency", mailbox, ids).catch(() => []),
    byIds<FilingRow>(TABLE, "mailbox,message_id,status,folder_id,folder_name,why,words_key", mailbox, ids),
  ]);
  const draftOf = new Map(drafts.map((d) => [d.message_id, d]));
  const agencyOf = new Map(orders.filter((o) => o.agency).map((o) => [o.message_id, o.agency as string]));
  const prior = new Map(had.map((r) => [r.message_id, r]));
  const wordsKey = keyOf(s.protectedWords);
  const moving = s.mode === "on" && !opts.dry;

  let reads = 0;
  let moves = 0;
  const writes: Record<string, unknown>[] = [];
  const sample: FilingDecision[] = [];

  // Oldest first, so a backlog is worked through in the order it arrived.
  for (const m of [...inbox].reverse()) {
    if (Date.now() - started > BUDGET_MS) break;
    const from = addressOf(m.from) || addressOf(m.sender);
    const facts = {
      from,
      subject: m.subject ?? "",
      categories: m.categories ?? [],
      flagged: m.flag?.flagStatus === "flagged",
      draft: draftOf.get(m.id) ?? null,
      agency: agencyOf.get(m.id) ?? null,
    };
    const before = prior.get(m.id);
    let next: { status: FilingDecision["status"]; folder_id: string | null; folder_name: string | null; why: string; words_key?: string | null; moved_at?: string; error?: string | null };

    const wait = waitReason(facts, s);
    if (before?.status === "moved" || before?.status === "back") {
      // Filed, and somebody has put it back: that's their call, and it stays.
      next = { status: "back", folder_id: null, folder_name: null, why: "put back in the Inbox by hand, so it's left alone" };
    } else if (wait) {
      next = { status: "stays", folder_id: null, folder_name: null, why: wait };
      run.waiting++;
    } else if (before?.status === "kept" && before.words_key === wordsKey) {
      // A flagged word was found in it against this same list: never touched.
      next = { status: "kept", folder_id: null, folder_name: null, why: before.why ?? "has a flagged word", words_key: wordsKey };
    } else {
      // The flagged words are looked for in its own text, read once per list.
      let hit: string | null = null;
      if (before?.words_key !== wordsKey) {
        if (reads >= READS_PER_RUN) continue;
        reads++;
        const full = await graph<GraphMessage>(`${box}/messages/${encodeURIComponent(m.id)}?$select=subject,uniqueBody`, { text: true }).catch(() => null);
        if (!full) continue;
        hit = flaggedWord(full.subject ?? facts.subject, plainText(full.uniqueBody), s.protectedWords);
      }
      if (hit) {
        next = { status: "kept", folder_id: null, folder_name: null, why: `has the flagged word “${hit}”`, words_key: wordsKey };
      } else {
        const pick = pickFolder(facts, { folders, never: s.neverFolders, sender: senderHome.get(from) ?? null, domain: domainHome.get(domainOf(from)) ?? null });
        const name = pick.folder?.path ?? pick.create ?? null;
        if (!name) {
          next = { status: "stays", folder_id: null, folder_name: null, why: pick.why, words_key: wordsKey };
        } else if (!moving) {
          next = { status: "would", folder_id: pick.folder?.id ?? null, folder_name: name, why: pick.why, words_key: wordsKey };
        } else if (moves >= MOVES_PER_RUN) {
          continue;
        } else {
          moves++;
          try {
            const to = pick.folder ?? (await ensureFolder(box, pick.create!, folders));
            await graph(`${box}/messages/${encodeURIComponent(m.id)}/move`, { method: "POST", body: { destinationId: to.id } });
            next = { status: "moved", folder_id: to.id, folder_name: to.path, why: pick.why, words_key: wordsKey, moved_at: new Date().toISOString(), error: null };
          } catch (e) {
            next = { status: "failed", folder_id: pick.folder?.id ?? null, folder_name: name, why: pick.why, words_key: wordsKey, error: (e as Error).message.slice(0, 300) };
          }
        }
      }
    }

    run[next.status === "would" ? "would" : next.status === "moved" ? "moved" : next.status === "kept" ? "kept" : "stays"]++;
    if (sample.length < 60) sample.push({ id: m.id, received: m.receivedDateTime ?? null, from, subject: facts.subject, status: next.status, folder: next.folder_name, why: next.why });

    const changed = !before || before.status !== next.status || before.folder_name !== next.folder_name || before.why !== next.why || (next.words_key !== undefined && before.words_key !== next.words_key);
    if (changed) {
      writes.push({
        mailbox, message_id: m.id, received_at: m.receivedDateTime ?? null, from_address: from || null, subject: facts.subject.slice(0, 300),
        status: next.status, folder_id: next.folder_id, folder_name: next.folder_name, why: next.why.slice(0, 300),
        words_key: next.words_key ?? before?.words_key ?? null, decided_at: new Date().toISOString(),
        ...(next.moved_at ? { moved_at: next.moved_at } : {}), error: next.error ?? null,
      });
    }
  }

  if (opts.dry) return { ...run, sample };
  for (let i = 0; i < writes.length; i += 200) await sbUpsert(TABLE, writes.slice(i, i + 200), "mailbox,message_id");
  // A fortnight's window, kept for two months so the page can show what was filed.
  await sbDelete(TABLE, [q.eq("mailbox", mailbox), q.lt("received_at", new Date(Date.now() - 60 * 86_400_000).toISOString())].join("&")).catch(() => undefined);
  return run;
}

/* -------------------------------------------------------------- the page */

export type FilingListRow = {
  message_id: string; mailbox: string; received_at: string | null; from_address: string | null; subject: string | null;
  status: FilingDecision["status"]; folder_name: string | null; why: string | null; moved_at: string | null; error: string | null;
};

export async function listFiling(mailbox: string): Promise<FilingListRow[]> {
  return sbSelect<FilingListRow>(TABLE, [
    q.select("message_id,mailbox,received_at,from_address,subject,status,folder_name,why,moved_at,error"),
    q.eq("mailbox", mailbox),
    q.gte("received_at", new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString()),
    q.order("received_at", "desc", "last"),
    "limit=500",
  ].join("&"));
}

/** How many senders each folder has been learned for, for the page. */
export async function learnedCounts(mailbox: string): Promise<Map<string, number>> {
  const rows = await sbSelect<{ folder_id: string; n: number; total: number }>(HOMES, [q.select("folder_id,n,total"), q.eq("mailbox", mailbox), q.eq("kind", "sender"), "limit=20000"].join("&")).catch(() => []);
  const out = new Map<string, number>();
  for (const r of rows) if (r.n >= SENDER_MIN && r.n / Math.max(1, r.total) >= SENDER_SHARE) out.set(r.folder_id, (out.get(r.folder_id) ?? 0) + 1);
  return out;
}

export { NOTIFICATIONS_FOLDER };
