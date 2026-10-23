import { notFound, redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { getThread, threadMessages } from "@/lib/chat/store";
import { aiConfigured } from "@/lib/chat/draft";
import { CHANNEL_LABEL, draftCurrent, isWaiting, replyWindow } from "@/lib/chat/chatTypes";
import { phonePretty } from "@/lib/leads/newLeadTypes";
import { ChatReply } from "@/components/portal/ChatReply";
import { setThreadStatus } from "../actions";
import { ChannelMark, stamp } from "../parts";
import "../chats.css";

export const dynamic = "force-dynamic";
// A draft is one model call; give it room on a slow afternoon.
export const maxDuration = 60;
export const metadata = { title: "Chat · Team portal" };

export default async function ChatThreadPage({ params }: { params: { id: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead") && !can(user, "quotes")) return <Locked user={user} what="Customer chats" forWhom="the office" />;

  const thread = await getThread(params.id).catch(() => null);
  if (!thread) notFound();
  const messages = await threadMessages(thread.id).catch(() => []);
  const now = Date.now();
  const win = replyWindow(thread.channel, thread.last_in_at, now);
  const phone = phonePretty(thread.phone);
  const onPage = thread.channel === "web" && thread.web_seen_at && now - Date.parse(thread.web_seen_at) < 2 * 60_000;

  // Where the reply will land, said before somebody writes it.
  let landing: string;
  if (thread.channel === "web") {
    landing = onPage
      ? "They're on the website now, so your reply shows up in their chat straight away."
      : thread.email
        ? `They've left the website. Your reply waits in their chat and is emailed to ${thread.email}.`
        : `They've left the website and gave a phone number, not an email. Your reply waits in their chat for when they come back. Ringing ${phone ?? "them"} is quicker.`;
  } else if (win.kind === "open") {
    landing = `Goes to their ${CHANNEL_LABEL[thread.channel]}. Meta takes replies until ${stamp(win.closesAt as string)}.`;
  } else if (win.kind === "tagged") {
    landing = `It's been over 24 hours. Meta only takes a reply marked as from a person, which needs Human Agent approval on the Meta app. If it bounces, ring them${phone ? ` on ${phone}` : ""}.`;
  } else {
    landing = `It's been over 7 days since they wrote, so Meta won't deliver a reply. ${phone ? `Ring them on ${phone}.` : "Wait for them to message again."}`;
  }

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href="/portal/chats" label="Customer chats" />
        <h1>{thread.name ?? `Someone on ${CHANNEL_LABEL[thread.channel]}`}</h1>
        <p>
          {CHANNEL_LABEL[thread.channel]} · started {stamp(thread.created_at)}
          {thread.topic ? ` · ${thread.topic}` : ""}
          {thread.status === "closed" ? " · closed" : ""}
        </p>
      </div>

      <div className="ch-thread">
        <section className="ch-convo" aria-label="Conversation">
          <ol className="ch-msgs">
            {messages.map((m) => (
              <li key={m.id} className={`ch-msg ch-msg--${m.direction}${m.status === "failed" ? " is-failed" : ""}`}>
                <div className="ch-msg__bubble">
                  {m.body}
                  {m.attachments?.length > 0 && (
                    <span className="ch-msg__files">
                      {m.attachments.map((a, i) => (
                        <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
                          Open {a.type === "image" ? "photo" : a.type} {m.attachments.length > 1 ? i + 1 : ""}
                        </a>
                      ))}
                    </span>
                  )}
                </div>
                <div className="ch-msg__meta">
                  {stamp(m.created_at)}
                  {m.direction === "out" && m.sent_by ? ` · ${m.sent_by}` : ""}
                  {m.from_draft ? (m.edited ? " · edited draft" : " · draft as written") : ""}
                  {m.status === "failed" && <strong className="ch-msg__err"> · Didn&rsquo;t send: {m.error}</strong>}
                </div>
              </li>
            ))}
          </ol>

          <ChatReply
            threadId={thread.id}
            draft={draftCurrent(thread) ? thread.draft : null}
            flag={draftCurrent(thread) ? thread.draft_flag : null}
            autoDraft={aiConfigured() && isWaiting(thread) && !draftCurrent(thread)}
            aiOn={aiConfigured()}
            landing={landing}
            blocked={win.kind === "closed"}
          />
        </section>

        <aside className="ch-side" aria-label="Customer">
          <ChannelMark channel={thread.channel} />
          <dl className="ch-facts">
            <dt>Name</dt>
            <dd>{thread.name ?? "Not given yet"}</dd>
            <dt>Phone</dt>
            <dd>{phone ? <a href={`tel:${(thread.phone ?? "").replace(/[^0-9+]/g, "")}`}>{phone}</a> : "Not given yet"}</dd>
            <dt>Email</dt>
            <dd>{thread.email ? <a href={`mailto:${thread.email}`}>{thread.email}</a> : "Not given yet"}</dd>
            <dt>Suburb</dt>
            <dd>{thread.suburb ?? "Not given yet"}</dd>
            <dt>After</dt>
            <dd>{thread.topic ?? "Not clear yet"}</dd>
          </dl>
          <p className="ch-side__note">Details the customer gives in the chat are filled in here as the assistant reads them. Anything typed into the website form is kept as they typed it.</p>
          <form action={setThreadStatus.bind(null, thread.id, thread.status === "open" ? "closed" : "open")}>
            <button type="submit" className="pt-btn pt-btn--ghost pt-btn--sm">{thread.status === "open" ? "Mark done" : "Reopen"}</button>
          </form>
        </aside>
      </div>
    </PortalShell>
  );
}
