import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell } from "@/components/portal/TradeShell";
import { getUser, listGoals, listReviews, dbConfigured } from "@/lib/portal/db";
import { LEVEL_LABEL, type CrewLevel } from "@/lib/portal/crew";
import { ROLE_LABELS } from "@/lib/portal/caps";
import { money2 } from "@/lib/portal/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "My file — Trade portal" };

const when = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

/**
 * Your own file: what you're allowed, what's expected, your goals and reviews.
 *
 * The design has an "Ask for leave" form on this screen. Nothing in here stores
 * a leave request and nothing in the office shows one, so the form is left out
 * and the entitlements say who to ask instead — a button that silently files
 * a request nobody ever reads is worse than a sentence that tells you to ring
 * Kellie.
 */
export default async function TradeMe() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const record = dbConfigured() ? await getUser(user.email).catch(() => null) : null;
  const goals = record?.id ? await listGoals(record.id).catch(() => []) : [];
  const reviews = record?.id ? await listReviews(record.id).catch(() => []) : [];
  const c = record?.costing;
  const level = record?.level ? LEVEL_LABEL[record.level as CrewLevel] : ROLE_LABELS[user.role];

  return (
    <TradeShell user={user} active="/trade/me" title={user.name} sub={`${level} · your file`}>
      <div className="tr-split" style={{ ["--tr-cols" as string]: "minmax(0, 1fr) 360px" }}>
        <div className="tr-stack">
          {c ? (
            <div className="tr-facts">
              <div className="tr-fact"><span className="tr-fact__k">Annual leave</span><strong className="tr-fact__v">{c.leaveDays}</strong><span className="tr-foot">days a year</span></div>
              <div className="tr-fact"><span className="tr-fact__k">RDOs</span><strong className="tr-fact__v">{c.rdoDays}</strong><span className="tr-foot">days a year</span></div>
              <div className="tr-fact"><span className="tr-fact__k">Sick leave</span><strong className="tr-fact__v">{c.sickDays}</strong><span className="tr-foot">days a year</span></div>
              <div className="tr-fact"><span className="tr-fact__k">Public holidays</span><strong className="tr-fact__v">{c.phDays}</strong><span className="tr-foot">days a year</span></div>
            </div>
          ) : (
            <div className="tr-note">
              {dbConfigured()
                ? "Your file isn’t set up yet. Your leave, pay rates and goals show here once a manager adds them."
                : "The database isn’t connected yet, so there’s nothing to read."}
            </div>
          )}

          <section className="tr-card tr-stack" style={{ gap: 8 }}>
            <h2>What&rsquo;s expected</h2>
            {record?.expectations
              ? <p className="tr-prose" style={{ margin: 0, whiteSpace: "pre-wrap" }}>{record.expectations}</p>
              : <p className="tr-empty" style={{ margin: 0 }}>Nothing set yet. Your manager adds this.</p>}
            <span className="tr-foot">
              What the role asks of everyone is in <Link href="/trade/processes?sec=people">Processes, section D</Link>.
            </span>
          </section>

          <section className="tr-card tr-stack" style={{ gap: 8 }}>
            <h2>Goals &amp; targets</h2>
            {goals.length ? (
              <div className="tr-rows">
                {goals.map((g) => (
                  <div className="tr-row" key={g.id}>
                    <span className={`tr-tick${g.status === "done" ? " is-on" : ""}`} style={{ width: 28, height: 28, borderRadius: 8 }} aria-hidden="true">
                      {g.status === "done" ? "✓" : ""}
                    </span>
                    <span className="tr-row__k" style={{ flex: "1 1 auto" }}>
                      <strong style={g.status === "done" ? { textDecoration: "line-through", color: "var(--pt-ink-2)" } : undefined}>{g.title}</strong>
                      {(g.target || g.due) && <span>{[g.target && `Target: ${g.target}`, g.due && `by ${when(g.due)}`].filter(Boolean).join(" · ")}</span>}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="tr-empty" style={{ margin: 0 }}>No goals set yet.</p>
            )}
          </section>

          <section className="tr-card tr-stack" style={{ gap: 8 }}>
            <h2>Reviews</h2>
            {reviews.length ? (
              reviews.map((r) => (
                <article key={r.id} className="tr-note" style={{ background: "var(--pt-bg)" }}>
                  <strong style={{ display: "block" }}>
                    {r.period || "Review"}
                    {r.rating ? ` · ${"★".repeat(r.rating)}` : ""}
                    <span className="tr-foot" style={{ float: "right" }}>{when(r.createdAt)}</span>
                  </strong>
                  <span style={{ whiteSpace: "pre-wrap" }}>{r.body}</span>
                  <span className="tr-foot" style={{ display: "block", marginTop: 6 }}>— {r.authorName || "Manager"}</span>
                </article>
              ))
            ) : (
              <p className="tr-empty" style={{ margin: 0 }}>No reviews yet.</p>
            )}
          </section>
        </div>

        <div className="tr-stack">
          {c && (
            <section className="tr-card tr-stack" style={{ gap: 8 }}>
              <h2>Pay rates</h2>
              <div className="tr-rows">
                <div className="tr-row"><span className="tr-row__k"><strong>Overtime</strong></span><span className="tr-row__v">{c.otMult}× · {money2(c.wage * c.otMult)}/hr</span></div>
                <div className="tr-row"><span className="tr-row__k"><strong>Nights</strong></span><span className="tr-row__v">{c.nightMult}× · {money2(c.wage * c.nightMult)}/hr</span></div>
                <div className="tr-row"><span className="tr-row__k"><strong>Call-backs</strong></span><span className="tr-row__v">{c.callbackPct ?? 0}%</span></div>
              </div>
              <span className="tr-foot">Set by your manager on the costs &amp; capacity page.</span>
            </section>
          )}

          <section className="tr-card tr-stack" style={{ gap: 8 }}>
            <h2>Time off</h2>
            <p style={{ margin: 0 }}>
              Leave and RDOs go through the office. Ring or text Kellie with the dates and she puts it in the
              roster — asking in here isn&rsquo;t built yet, so it would go nowhere.
            </p>
            <Link href="/trade/info?section=contact" className="tr-btn" style={{ alignSelf: "flex-start" }}>Who to ring</Link>
          </section>

          <Link href="/trade/van" className="tr-card tr-link">
            <span className="tr-link__k">Your van</span>
            <strong className="tr-link__v">Readings, checks and history</strong>
            <span className="tr-sub">Everything you&rsquo;ve logged on it.</span>
          </Link>
        </div>
      </div>
    </TradeShell>
  );
}
