import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { Figs, ago } from "@/components/portal/Figs";
import { JournalRecipients } from "@/components/portal/JournalRecipients";
import { dbConfigured } from "@/lib/portal/db";
import { journalErrors, journalSyncState, journalsWaiting, latestJournals, syncedSince, WAITING_AFTER_HOURS, type JournalEntry } from "@/lib/journals/read";
import { alertRecipients } from "@/lib/journals/alerts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Journal entries — Team portal" };

const day = (iso: string | null) =>
  iso ? new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—";

/** ServiceTitan's sync statuses in words, each with the chip that backs them up. */
const STATUS: Record<string, { label: string; tone: "ok" | "bad" | "warn" | "none" }> = {
  Synced: { label: "In Xero", tone: "ok" },
  Error: { label: "Didn't sync", tone: "bad" },
  NotSynced: { label: "Not synced", tone: "warn" },
  InProgress: { label: "Syncing", tone: "none" },
  OutOfSync: { label: "Changed since it synced", tone: "warn" },
  Excluded: { label: "Left out of syncing", tone: "none" },
  Missing: { label: "Gone from ServiceTitan", tone: "none" },
};

function Status({ s }: { s: string | null }) {
  const st = (s && STATUS[s]) || { label: s ?? "Unknown", tone: "none" as const };
  return <span className={`pt-vstat pt-vstat--${st.tone}`}>{st.label}</span>;
}

function EntryRow({ e, waiting }: { e: JournalEntry; waiting?: boolean }) {
  return (
    <li className="pt-jrn__row">
      <span className="pt-jrn__what">
        <strong>#{e.number ?? "—"} · {e.name || "Journal entry"}</strong>
        <em>Posted {day(e.postDate)}{e.modifiedOn ? ` · last changed ${ago(e.modifiedOn)}` : ""}</em>
        {!waiting && <span className="pt-jrn__msg">{e.message || "ServiceTitan gave no reason."}</span>}
      </span>
      {e.url
        ? <a className="pt-btn pt-btn--sm pt-btn--ghost" href={e.url} target="_blank" rel="noreferrer">Open in ServiceTitan</a>
        : <Status s={e.syncStatus} />}
    </li>
  );
}

/**
 * ServiceTitan's journal entries and whether each reached Xero.
 *
 * ServiceTitan does the posting; this page is its word on each entry, read on
 * every ServiceTitan sync. One that fails is on the wall board and Home, and
 * emailed to the list at the foot of this page — once, and again only if the
 * error changes.
 */
export default async function JournalsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Journal entries" forWhom="managers" />;

  const ready = dbConfigured();
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [state, errors, waiting, latest, synced, recipients] = ready
    ? await Promise.all([
        journalSyncState(),
        journalErrors().catch(() => [] as JournalEntry[]),
        journalsWaiting().catch(() => [] as JournalEntry[]),
        latestJournals(30).catch(() => [] as JournalEntry[]),
        syncedSince(monthAgo).catch(() => null),
        alertRecipients(),
      ])
    : [null, [], [], [], null, await alertRecipients().catch(() => [])] as const;

  const read = !!state?.last_success_at;
  const denied = state?.last_status === "error" && /\b403\b/.test(state.last_error ?? "");

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />
      <div className="pt-head">
        <h1>Journal entries</h1>
        <p>
          ServiceTitan posts each journal entry to Xero. This is its word on every one, checked each time the portal
          syncs with ServiceTitan. Anything that doesn&rsquo;t go through goes on the wall board and Home, and is emailed to
          the list below.
        </p>
      </div>

      {denied ? (
        <div className="pt-note pt-note--warn">
          <strong>ServiceTitan hasn&rsquo;t given the portal its journal entries.</strong> In the ServiceTitan developer
          portal, tick <b>Accounting › Journal Entries (read)</b> on the portal&rsquo;s API app and have the account
          re-authorise it. Nothing else needs changing — the next sync picks them up.
        </div>
      ) : state?.last_status === "error" ? (
        <div className="pt-note pt-note--warn">
          <strong>The last read of journal entries failed</strong> ({state.last_error}). The figures below are from the
          last good read{state.last_success_at ? `, ${ago(state.last_success_at)}` : ""}.
        </div>
      ) : !read ? (
        <div className="pt-note">
          <strong>Not read yet.</strong> Journal entries come in with the next ServiceTitan sync, which runs through the
          day and every couple of minutes while the wall board is on.
        </div>
      ) : null}

      <Figs
        cols={4}
        items={[
          { label: "Didn't reach Xero", feature: errors.length > 0, value: read ? String(errors.length) : null, sub: errors.length ? "fix in ServiceTitan, then sync again" : "nothing in error", needs: "Waiting on the first read" },
          { label: "Waiting to sync", value: read ? String(waiting.length) : null, sub: `closed and still not in Xero after ${WAITING_AFTER_HOURS} hours`, needs: "Waiting on the first read" },
          { label: "Synced in 30 days", value: read && synced != null ? String(synced) : null, sub: "journal entries now in Xero", needs: "Waiting on the first read" },
          { label: "Last checked", value: state?.last_success_at ? ago(state.last_success_at) : null, sub: "the portal's last read from ServiceTitan", needs: "Not yet" },
        ]}
      />

      <section className="pt-panel" id="errors">
        <h2 className="pt-panel__h">Didn&rsquo;t reach Xero {read && <span className="pt-tm__count">{errors.length}</span>}</h2>
        {errors.length === 0 ? (
          <p className="pt-rep__empty">{read ? "Nothing in error. Every journal entry is in Xero or waiting its turn." : "Nothing read yet."}</p>
        ) : (
          <>
            <p className="pt-panel__sub">ServiceTitan&rsquo;s own message on each. Fix the cause in ServiceTitan and sync it again; it leaves this list on the next read after it goes through.</p>
            <ul className="pt-jrn">{errors.map((e) => <EntryRow key={e.id} e={e} />)}</ul>
          </>
        )}
      </section>

      {waiting.length > 0 && (
        <section className="pt-panel">
          <h2 className="pt-panel__h">Waiting to sync <span className="pt-tm__count">{waiting.length}</span></h2>
          <p className="pt-panel__sub">
            Closed, with transactions in them, and not in Xero after {WAITING_AFTER_HOURS} hours. If these pile up, ServiceTitan
            isn&rsquo;t syncing on its own — turn on real-time sync in its Xero integration settings, or sync them by hand there.
          </p>
          <ul className="pt-jrn">{waiting.slice(0, 50).map((e) => <EntryRow key={e.id} e={e} waiting />)}</ul>
        </section>
      )}

      <section className="pt-panel">
        <h2 className="pt-panel__h">Latest journal entries</h2>
        {latest.length === 0 ? (
          <p className="pt-rep__empty">None read yet.</p>
        ) : (
          <div className="pt-fleet__wrap">
            <table className="pt-fleet pt-otab">
              <thead><tr><th>Entry</th><th>Posted</th><th>Xero</th><th>Sent</th></tr></thead>
              <tbody>
                {latest.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <strong>#{e.number ?? "—"} · {e.name || "Journal entry"}</strong>
                      <span className="pt-fleet__sub">{e.status === "Open" ? "Still open in ServiceTitan" : e.isEmpty ? "Nothing in it" : "Closed"}</span>
                    </td>
                    <td>{day(e.postDate)}</td>
                    <td><Status s={e.syncStatus} /></td>
                    <td>{e.exportedOn ? `${ago(e.exportedOn)}${e.exportedBy ? ` · ${e.exportedBy}` : ""}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="pt-panel" id="emails">
        <h2 className="pt-panel__h">Who gets the emails</h2>
        <p className="pt-panel__sub">
          One email per sync that finds a new error, listing every entry that didn&rsquo;t go, with ServiceTitan&rsquo;s reason and a
          link to each. The same error isn&rsquo;t sent twice; if it changes, it is.
        </p>
        <JournalRecipients initial={recipients} />
      </section>
    </PortalShell>
  );
}
