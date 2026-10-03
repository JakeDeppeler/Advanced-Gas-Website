import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { ROLE_LABELS } from "@/lib/portal/caps";
import Link from "next/link";
import { getUser, listGoals, listReviews, dbConfigured } from "@/lib/portal/db";
import { PersonVan } from "@/components/portal/PersonVan";
import { personVan } from "@/lib/portal/personVan";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { money2 } from "@/lib/portal/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "My file — Team portal" };


function when(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export default async function MyFile() {
  const me = await getPortalUser();
  if (!me) redirect("/portal/login");

  const record = dbConfigured() ? await getUser(me.email) : null;
  const goals = record?.id ? await listGoals(record.id) : [];
  const reviews = record?.id ? await listReviews(record.id) : [];
  const expectations = record?.expectations ?? null;
  const vanView = record?.id ? await personVan(record.id, me.name) : { van: null, checks: [] };
  const c = record?.costing;

  return (
    <PortalShell user={me}>
      <div className="pt-head">
        <PortalBack href="/portal" label="Home" />
        <h1>Where you&rsquo;re at, {me.name.split(" ")[0]}.</h1>
        <p>What&rsquo;s expected of you, your goals and your reviews. Set by your manager.</p>
      </div>

      {!record?.id && (
        <div className="pt-note">Your file isn&rsquo;t set up yet. Once a manager adds goals or a review, they&rsquo;ll show here.</div>
      )}

      {c && (
        <section className="pt-myyear" aria-labelledby="my-year">
          <h2 id="my-year">Your year</h2>
          <div className="pt-myyear__days">
            {[
              ["Annual leave", c.leaveDays], ["RDOs", c.rdoDays], ["Sick leave", c.sickDays], ["Public holidays", c.phDays],
            ].map(([k, v]) => (
              <div key={k as string} className="pt-myyear__tile">
                <span>{k}</span>
                <strong>{v}<em> days</em></strong>
              </div>
            ))}
          </div>
          <div className="pt-myyear__rates">
            <div><span>Overtime</span><strong>{c.otMult}× · {money2(c.wage * c.otMult)}/hr</strong></div>
            <div><span>Nights</span><strong>{c.nightMult}× · {money2(c.wage * c.nightMult)}/hr</strong></div>
            <div><span>Call-backs</span><strong>{c.callbackPct ?? 0}%</strong></div>
          </div>
        </section>
      )}

      {/* The three things a manager sets, side by side as in the mock. */}
      <div className="pt-mythree">
        <section className="pt-panel">
          <h2 className="pt-panel__h">What&rsquo;s expected</h2>
          {expectations
            ? <p className="pf-readonly">{expectations}</p>
            : <div className="pt-myempty">Nothing set yet. Your manager adds this.</div>}
        </section>

        <section className="pt-panel">
          <h2 className="pt-panel__h">Goals &amp; targets</h2>
          {goals.length === 0 ? <div className="pt-myempty">No goals set yet.</div> : (
            <div className="pf-goals">
              {goals.map((g) => (
                <div key={g.id} className={`pf-goal is-readonly${g.status === "done" ? " is-done" : ""}`}>
                  <span className="pf-goal__check" aria-hidden="true">{g.status === "done" ? "✓" : ""}</span>
                  <div className="pf-goal__txt">
                    <strong>{g.title}</strong>
                    {g.target && <span className="pf-goal__target">Target: {g.target}</span>}
                    {g.due && <span className="pf-goal__due">by {g.due}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="pt-panel">
          <h2 className="pt-panel__h">Reviews</h2>
          {reviews.length === 0 ? <div className="pt-myempty">No reviews yet.</div> : (
            <div className="pf-reviews">
              {reviews.map((r) => (
                <article key={r.id} className="pf-review">
                  <header className="pf-review__head">
                    <span>{r.period || "Review"} {r.rating ? <span className="pf-stars">{"★".repeat(r.rating)}<span className="pf-stars__off">{"★".repeat(5 - r.rating)}</span></span> : null}</span>
                    <span className="pf-review__when">{when(r.createdAt)}</span>
                  </header>
                  <p className="pf-review__body">{r.body}</p>
                  <footer className="pf-review__foot"><span>— {r.authorName || "Manager"}</span></footer>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* The van they're signed to, and the checks they've done on it. Not in
          the mock, which predates the van checks; it sits under the file
          rather than above it. */}
      <PersonVan {...vanView} mine />
    </PortalShell>
  );
}
