import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { dbConfigured } from "@/lib/portal/db";
import { Card, Head, Say } from "@/components/portal/kit/Kit";
import { EmailFilingForm } from "@/components/portal/EmailFilingForm";
import { EmailFilingList } from "@/components/portal/EmailFilingList";
import { learnedCounts, listFiling, loadFilingSettings, storedFolders, type FilingListRow } from "@/lib/outlook/filing";
import { isNever } from "@/lib/outlook/filingTypes";
import "../chats/chats.css";
import "./email-filing.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email filing · Team portal" };

const MAILBOX = "admin@advancedgas.com.au";

const when = (iso: string | null) => {
  const t = Date.parse(iso ?? "");
  return Number.isFinite(t) ? new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(t) : "";
};

/**
 * Filing admin@ into its own folders (lib/outlook/filing.ts): the switch, the
 * flagged words that keep an email in the Inbox, the folders never filed
 * into, and where each of the fortnight's emails went or would go.
 */
export default async function EmailFilingPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead") && !can(user, "quotes")) return <Locked user={user} what="Email filing" forWhom="the office" />;

  const s = await loadFilingSettings();
  const [rows, stored, learned] = dbConfigured()
    ? await Promise.all([listFiling(MAILBOX).catch(() => [] as FilingListRow[]), storedFolders().catch(() => ({}) as Awaited<ReturnType<typeof storedFolders>>), learnedCounts(MAILBOX).catch(() => new Map<string, number>())])
    : [[] as FilingListRow[], {} as Awaited<ReturnType<typeof storedFolders>>, new Map<string, number>()];
  const box = stored[MAILBOX];
  const folders = box?.folders ?? [];
  const topLevel = [...new Set(folders.map((f) => f.path.split("/")[0]))];

  const filed = rows.filter((r) => r.status === "would" || r.status === "moved").length;
  const kept = rows.filter((r) => r.status === "kept").length;
  const stays = rows.length - filed - kept;

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/work-orders" label="Work orders" />
      <div className="pk">
        <Head
          title="Email filing"
          sub="admin@ into its own folders, so the Inbox only holds what someone has to do"
          info={[
            ["What moves", "Only an email that needs nothing more: machine notifications, work orders already in ServiceTitan, and, if it's switched on, an email whose reply has gone out."],
            ["Which folder", "Where that sender's email has always gone, learned from your folders once a day. A work order goes to its agency's folder; machine mail with no folder of its own to Notifications."],
            ["What stays", "Anything that needs a person, anything flagged or given a category by hand, any email with a flagged word, supplier invoices and receipts still to be entered, Tapi jobs (Tapi is updated by hand), meeting invites, and anything from a sender with no folder yet."],
            ["Putting one back", "Drag it back to the Inbox and it's left there for good."],
          ]}
        />
        <Say>
          {s.mode === "off" ? (
            <>Switched off. Nothing is read or moved.</>
          ) : (
            <>
              {s.mode === "trial" ? "Trial: nothing is moved. " : "On. "}
              Of the <b>{rows.length}</b> Inbox emails from the last fortnight looked at, <b>{filed}</b> {s.mode === "trial" ? "would be" : "were"} filed,{" "}
              <b>{kept}</b> kept by a flagged word, and <b>{stays}</b> stay in the Inbox.
            </>
          )}
          {s.since && s.by ? ` Set to ${s.mode} by ${s.by} on ${when(s.since)}.` : ""}
        </Say>

        <Card title="How it files">
          <EmailFilingForm
            initial={{ mode: s.mode, fileAfterReply: s.fileAfterReply, words: s.protectedWords.join("\n"), never: s.neverFolders }}
            folders={topLevel}
            canEdit={can(user, "overhead")}
          />
        </Card>

        <EmailFilingList rows={rows} mode={s.mode} />

        <details className="ef-more">
          <summary>
            Learned from your folders <b>{folders.length}</b>
            <span>{box ? `Read ${when(box.at)}, again every day` : "Read on the first run after switching to Trial"}</span>
          </summary>
          <Card flush>
            <ul className="ef-learned">
              {folders.map((f) => {
                const never = isNever(f.path, s.neverFolders);
                const n = learned.get(f.id) ?? 0;
                return (
                  <li key={f.id}>
                    <span>{f.path}</span>
                    <em>{never ? "Never filed into" : n ? `${n} sender${n === 1 ? "" : "s"} learned` : "No sender learned yet"}</em>
                  </li>
                );
              })}
            </ul>
          </Card>
        </details>
      </div>
    </PortalShell>
  );
}
