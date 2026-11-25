import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { recentAnswers, type AnswerFilter, type AnswerRow } from "@/lib/assistant/log";
import { aiConfigured } from "@/lib/chat/draft";
import { stamp } from "../parts";
import "../chats.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chat answers · Team portal" };

const DAYS = 30;

const FILTERS: { k: AnswerFilter; label: string }[] = [
  { k: "all", label: "Every conversation" },
  { k: "unsure", label: "Couldn't answer" },
];

const BY: Record<AnswerRow["kind"], string> = { answer: "Answered", unsure: "Couldn't answer", emergency: "Gas safety" };

/**
 * What people asked "Ask us anything" on the website, and what it told them.
 *
 * The chat has no person behind it (Jake, Nov 2026), so this is the only
 * place anyone sees it. Two uses: reading a conversation to see what a
 * visitor wanted, and "Couldn't answer", the questions the site has nothing
 * on, which is the list of what to write next.
 *
 * Conversations, not single questions: rows from one browser tab share a
 * session id, so a follow-up sits under the question it follows.
 */
export default async function ChatAnswersPage({ searchParams }: { searchParams: { f?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead") && !can(user, "quotes")) return <Locked user={user} what="Chat answers" forWhom="the office" />;

  const filter: AnswerFilter = searchParams?.f === "unsure" ? "unsure" : "all";
  const ready = dashboardDbConfigured();
  let failed = false;
  const rows = ready ? await recentAnswers(filter, DAYS).catch(() => { failed = true; return [] as AnswerRow[]; }) : [];

  // Newest conversation first; inside one, the order it was asked.
  const convos = new Map<string, AnswerRow[]>();
  for (const r of rows) (convos.get(r.session) ?? convos.set(r.session, []).get(r.session)!).push(r);
  const list = [...convos.values()].map((qs) => qs.slice().reverse());
  const unsure = rows.filter((r) => r.kind === "unsure").length;

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href="/portal/chats" label="Customer chats" />
        <h1>Chat answers</h1>
        <p>What people asked &ldquo;Ask us anything&rdquo; on the website in the last {DAYS} days, and the answer they got. Nobody replies to these; it answers on its own from the website.</p>
      </div>

      {!ready && <div className="pt-note pt-note--warn"><strong>Database not connected.</strong> Nothing is being logged until it is.</div>}
      {failed && <div className="pt-note pt-note--warn"><strong>Couldn&rsquo;t load the answers.</strong> Try again in a minute.</div>}
      {!aiConfigured() && <div className="pt-note"><p className="ch-gap">AI answers are off until ANTHROPIC_API_KEY is set, so every answer below came from the website&rsquo;s own FAQ text.</p></div>}

      <nav className="pt-tabs" aria-label="Which answers">
        {FILTERS.map((f) => (
          <Link key={f.k} href={f.k === "all" ? "/portal/chats/answers" : `/portal/chats/answers?f=${f.k}`} className={filter === f.k ? "is-on" : undefined}>
            {f.label}
          </Link>
        ))}
      </nav>

      {rows.length > 0 && (
        <p className="ca-sum">
          {filter === "all"
            ? <>{rows.length} question{rows.length === 1 ? "" : "s"} in {list.length} conversation{list.length === 1 ? "" : "s"} · <strong>{unsure}</strong> it couldn&rsquo;t answer</>
            : <>{rows.length} question{rows.length === 1 ? "" : "s"} the website had no answer for. Each one is something worth adding to a page.</>}
        </p>
      )}

      {list.length === 0 ? (
        <div className="ch-empty">
          <strong>{filter === "unsure" ? "Nothing it couldn't answer." : "No questions yet."}</strong>
          <span>{filter === "unsure" ? `Every question in the last ${DAYS} days got an answer from the site.` : "Questions asked in the website chat show up here as they come in."}</span>
        </div>
      ) : (
        <ul className="ca-list">
          {list.map((qs) => (
            <li key={qs[0].session} className="ca-convo">
              <div className="ca-convo__head">
                <span>{stamp(qs[0].created_at)}{qs.length > 1 ? ` · ${qs.length} questions` : ""}</span>
                {qs[0].page && <span className="ca-convo__page">From {qs[0].page}</span>}
              </div>
              <ol className="ca-turns">
                {qs.map((r) => (
                  <li key={r.id} className={`ca-turn${r.kind === "unsure" ? " is-unsure" : r.kind === "emergency" ? " is-alert" : ""}`}>
                    <p className="ca-q"><span>Asked</span>{r.question}</p>
                    <p className="ca-a">
                      <span>
                        {BY[r.kind]} · {r.answered_by === "ai" ? "AI" : "Site FAQ"}
                        {r.link && <> · <a href={r.link}>{r.link}</a></>}
                      </span>
                      {r.answer}
                    </p>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      )}
    </PortalShell>
  );
}
