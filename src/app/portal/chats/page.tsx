import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { getChatSettings, lastMessages, listThreads, type InboxFilter } from "@/lib/chat/store";
import { aiConfigured } from "@/lib/chat/draft";
import { metaConfigured, metaTokenSet } from "@/lib/leads/meta";
import { CHANNEL_LABEL, draftCurrent, isWaiting, replyWindow } from "@/lib/chat/chatTypes";
import { ago, ChannelMark } from "./parts";
import "./chats.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customer chats · Team portal" };

const FILTERS: { k: InboxFilter; label: string }[] = [
  { k: "waiting", label: "Waiting on us" },
  { k: "open", label: "All open" },
  { k: "closed", label: "Closed" },
];

/**
 * Every customer conversation in one inbox: the website chat, Messenger and
 * Instagram.
 *
 * Waiting-on-us first, because that is the only question that matters when
 * the page is opened: who has asked something and not heard back. The
 * assistant drafts each reply when the thread is opened; nothing is sent
 * until somebody here presses send.
 */
export default async function ChatsPage({ searchParams }: { searchParams: { f?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead") && !can(user, "quotes")) return <Locked user={user} what="Customer chats" forWhom="the office" />;

  const filter: InboxFilter = FILTERS.some((f) => f.k === searchParams?.f) ? (searchParams.f as InboxFilter) : "waiting";
  const ready = dashboardDbConfigured();
  const [all, settings] = ready
    ? await Promise.all([listThreads(filter).catch(() => []), getChatSettings()])
    : [[], null];
  const threads = filter === "waiting" ? all.filter(isWaiting) : all;
  const last = await lastMessages(threads.map((t) => t.id)).catch(() => new Map());
  const manager = can(user, "overhead");

  // What's switched on, said once at the top rather than discovered by a
  // reply that won't send.
  const gaps: string[] = [];
  if (!aiConfigured()) gaps.push("Drafts are off until ANTHROPIC_API_KEY is set on the server. You can still read and reply to every chat.");
  if (!metaConfigured()) gaps.push("Messenger and Instagram aren't connected yet, so only the website chat comes in here. Integrations says what's missing.");
  else if (!metaTokenSet()) gaps.push("No Facebook page token (META_PAGE_TOKEN), so Messenger and Instagram messages come in but replies can't go out.");
  if (settings && !settings.widget) gaps.push("The website chat is switched off, so visitors don't see it. Turn it on in Settings when the office is ready to answer.");

  const now = Date.now();

  return (
    <PortalShell user={user}>
      <div className="pt-head pt-head--split">
        <div>
          <PortalBack href="/portal" label="Home" />
          <h1>Customer chats</h1>
          <p>The website chat, Messenger and Instagram in one place. Open one to see the assistant&rsquo;s draft, change anything you like, then send it.</p>
        </div>
        {manager && <Link href="/portal/chats/settings" className="pt-btn pt-btn--ghost pt-head__act">Settings</Link>}
      </div>

      {!ready && <div className="pt-note pt-note--warn"><strong>Database not connected.</strong> Nothing can come in until it is.</div>}
      {gaps.length > 0 && (
        <div className="pt-note">
          {gaps.map((g) => (
            <p key={g} className="ch-gap">{g}</p>
          ))}
        </div>
      )}

      <nav className="pt-tabs" aria-label="Which chats">
        {FILTERS.map((f) => (
          <Link key={f.k} href={f.k === "waiting" ? "/portal/chats" : `/portal/chats?f=${f.k}`} className={filter === f.k ? "is-on" : undefined}>
            {f.label}
            {f.k === "waiting" && filter === "waiting" && threads.length > 0 ? ` · ${threads.length}` : ""}
          </Link>
        ))}
      </nav>

      {threads.length === 0 ? (
        <div className="ch-empty">
          <strong>{filter === "waiting" ? "Nobody's waiting on a reply." : filter === "closed" ? "No closed chats." : "No open chats."}</strong>
          <span>{filter === "waiting" ? "New messages show up here, and the wall board rings for the first one from each person each day." : "Chats land here as they come in."}</span>
        </div>
      ) : (
        <ul className="ch-list">
          {threads.map((t) => {
            const m = last.get(t.id);
            const waiting = isWaiting(t);
            const win = replyWindow(t.channel, t.last_in_at, now);
            const closesSoon = win.kind === "open" && win.closesAt && Date.parse(win.closesAt) - now < 6 * 3_600_000;
            return (
              <li key={t.id}>
                <Link href={`/portal/chats/${t.id}`} className={`ch-row${waiting ? " is-waiting" : ""}`}>
                  <ChannelMark channel={t.channel} />
                  <span className="ch-row__main">
                    <span className="ch-row__top">
                      <strong>{t.name ?? `Someone on ${CHANNEL_LABEL[t.channel]}`}</strong>
                      {t.topic && <span className="ch-row__topic">{t.topic}</span>}
                    </span>
                    <span className="ch-row__last">
                      {m ? `${m.direction === "out" ? "You: " : ""}${m.body}` : "No messages"}
                    </span>
                  </span>
                  <span className="ch-row__side">
                    <span className="ch-row__when">{t.last_in_at ? ago(t.last_in_at, now) : ""}</span>
                    <span className="ch-row__tags">
                      {waiting && <span className="ch-tag ch-tag--wait">Waiting</span>}
                      {t.draft_flag && <span className="ch-tag ch-tag--flag">Needs a person</span>}
                      {waiting && draftCurrent(t) && !t.draft_flag && <span className="ch-tag">Draft ready</span>}
                      {waiting && closesSoon && <span className="ch-tag ch-tag--flag">Reply window closing</span>}
                      {waiting && win.kind === "tagged" && <span className="ch-tag ch-tag--flag">Past 24 h</span>}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PortalShell>
  );
}
