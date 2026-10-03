import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell } from "@/components/portal/TradeShell";
import { getUser, listGoals, listReviews, dbConfigured } from "@/lib/portal/db";
import { getTimesheet, listLeave } from "@/lib/portal/people";
import { hrs, leaveLabel, weekTotals } from "@/lib/portal/peopleParts";
import { LeaveForm } from "@/components/portal/LeaveForm";
import { mondayOf } from "@/components/portal/fleetStatus";
import { localToday } from "@/lib/portal/xero";
import { LEVEL_LABEL, type CrewLevel } from "@/lib/portal/crew";
import { ROLE_LABELS } from "@/lib/portal/caps";
import { money2 } from "@/lib/portal/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "My file — Trade portal" };

const when = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

/**
 * Your own file: what you're allowed, your timesheet, what's expected, your
 * goals and reviews — and asking for time off, which lands on the office's
 * Home until somebody answers it.
 */
export default async function TradeMe() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const record = dbConfigured() ? await getUser(user.email).catch(() => null) : null;
  const weekOf = mondayOf(localToday()).toISOString().slice(0, 10);
  const lastWeek = mondayOf(new Date(localToday().getTime() - 7 * 86_400_000)).toISOString().slice(0, 10);
  const [goals, reviews, leave, sheetNow, sheetLast] = await Promise.all([
    record?.id ? listGoals(record.id).catch(() => []) : [],
    record?.id ? listReviews(record.id).catch(() => []) : [],
    user.id ? listLeave({ userId: user.id, limit: 6 }) : [],
    user.id ? getTimesheet(user.id, weekOf) : null,
    user.id ? getTimesheet(user.id, lastWeek) : null,
  ]);
  const c = record?.costing;
  const level = record?.level ? LEVEL_LABEL[record.level as CrewLevel] : ROLE_LABELS[user.role];
  // The week to nag about: last week if it never went in, otherwise this one.
  const due = sheetLast && !sheetLast.submittedAt ? { s: sheetLast, week: lastWeek, label: "Last week to send" } : { s: sheetNow, week: weekOf, label: sheetNow?.submittedAt ? "This week · sent" : "This week" };
  const dueHrs = due.s ? weekTotals(due.s.days).total : 0;

  return (
    <TradeShell user={user} active="home" title={user.name} sub={`${level} · your file`}>
      <div className="tr-split" style={{ ["--tr-side" as string]: "340px" }}>
        <div className="tr-stack">
          {c ? (
            <div className="tr-grid tr-grid--4">
              <div className="tr-card tr-fig"><span>Annual leave</span><strong>{c.leaveDays} days</strong><em>a year</em></div>
              <div className="tr-card tr-fig"><span>RDOs</span><strong>{c.rdoDays} days</strong><em>a year</em></div>
              <div className="tr-card tr-fig"><span>Sick leave</span><strong>{c.sickDays} days</strong><em>a year</em></div>
              <div className="tr-card tr-fig"><span>Public holidays</span><strong>{c.phDays} days</strong><em>a year</em></div>
            </div>
          ) : (
            <p className="tr-note tr-note--grey">
              {dbConfigured() ? "Your file isn’t set up yet. Leave, pay rates and goals show here once a manager adds them." : "The database isn’t connected yet."}
            </p>
          )}

          <Link href={`/trade/me/timesheet?week=${due.week}`} className="tr-card tr-row" style={{ padding: "14px 22px" }}>
            <span className="tr-row__k">
              <strong style={{ fontFamily: "var(--f-display)", fontSize: 20 }}>Your timesheet</strong>
              <span>{due.label} · {hrs(dueHrs)}</span>
            </span>
            <span className="tr-link">Open →</span>
          </Link>

          <section className="tr-card tr-stack" style={{ gap: 6 }}>
            <h2>What&rsquo;s expected</h2>
            {record?.expectations
              ? <p className="tr-prose" style={{ whiteSpace: "pre-wrap", fontSize: 16 }}>{record.expectations}</p>
              : <p className="tr-empty">Nothing set yet. Your manager adds this.</p>}
          </section>

          <section className="tr-card tr-stack" style={{ gap: 6 }}>
            <h2>Goals &amp; targets</h2>
            {goals.length ? (
              <div className="tr-rows">
                {goals.map((g) => (
                  <div className="tr-row" key={g.id} style={{ minHeight: 0 }}>
                    <span className={`tr-step__c${g.status === "done" ? " is-done" : ""}`} aria-hidden="true">{g.status === "done" ? "✓" : ""}</span>
                    <span className="tr-row__k">
                      <strong style={{ fontSize: 16.5, ...(g.status === "done" ? { textDecoration: "line-through", color: "var(--tr-ink-2)" } : {}) }}>{g.title}</strong>
                      {(g.target || g.due) && <span>{[g.target && `Target: ${g.target}`, g.due && `by ${when(g.due)}`].filter(Boolean).join(" · ")}</span>}
                    </span>
                  </div>
                ))}
              </div>
            ) : <p className="tr-empty">No goals set yet.</p>}
          </section>

          <section className="tr-card tr-stack" style={{ gap: 6 }}>
            <h2>Reviews</h2>
            {reviews.length ? reviews.map((r) => (
              <article key={r.id} className="tr-note tr-note--grey">
                <strong style={{ display: "block" }}>{r.period || "Review"}{r.rating ? ` · ${r.rating} of 5` : ""} · {when(r.createdAt)}</strong>
                <span style={{ whiteSpace: "pre-wrap", fontWeight: 500 }}>{r.body}</span>
                <span className="tr-small" style={{ display: "block", marginTop: 6 }}>— {r.authorName || "Manager"}</span>
              </article>
            )) : <p className="tr-empty">No reviews yet.</p>}
          </section>
        </div>

        <div className="tr-stack">
          <LeaveForm />
          {leave.length > 0 && (
            <section className="tr-card">
              <h2 style={{ paddingBottom: 4 }}>Your leave</h2>
              <div className="tr-rows">
                {leave.map((l) => (
                  <div className="tr-row" key={l.id} style={{ minHeight: 0 }}>
                    <span className="tr-row__k">
                      <strong style={{ fontSize: 16 }}>{leaveLabel(l.kind)}</strong>
                      <span>{when(l.from)}{l.to !== l.from ? ` – ${when(l.to)}` : ""}</span>
                    </span>
                    <span className={`tr-chip ${l.status === "approved" ? "tr-chip--good" : l.status === "declined" ? "tr-chip--bad" : "tr-chip--info"}`}>
                      {l.status === "asked" ? "With the office" : l.status === "approved" ? "Approved" : "Declined"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
          {c && (
            <section className="tr-card">
              <h2 style={{ paddingBottom: 4 }}>Pay rates</h2>
              <div className="tr-rows">
                <div className="tr-row" style={{ minHeight: 48 }}><span className="tr-row__k"><span>Overtime</span></span><span className="tr-row__v">{c.otMult}× · {money2(c.wage * c.otMult)}/hr</span></div>
                <div className="tr-row" style={{ minHeight: 48 }}><span className="tr-row__k"><span>Nights</span></span><span className="tr-row__v">{c.nightMult}× · {money2(c.wage * c.nightMult)}/hr</span></div>
                <div className="tr-row" style={{ minHeight: 48 }}><span className="tr-row__k"><span>Call-backs</span></span><span className="tr-row__v">{c.callbackPct ?? 0}%</span></div>
              </div>
            </section>
          )}
          <Link href="/trade/take5" className="tr-card tr-row" style={{ padding: "12px 20px" }}>
            <span className="tr-row__k"><strong style={{ fontSize: 17 }}>Take 5</strong><span>Your safety checks and incident reports</span></span>
            <span className="tr-link">→</span>
          </Link>
        </div>
      </div>
    </TradeShell>
  );
}
