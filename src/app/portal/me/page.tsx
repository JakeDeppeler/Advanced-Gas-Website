import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { ROLE_LABELS } from "@/lib/portal/caps";
import Link from "next/link";
import { getUser, listGoals, listReviews, dbConfigured } from "@/lib/portal/db";
import { PersonVan } from "@/components/portal/PersonVan";
import { personVan } from "@/lib/portal/personVan";
import { PortalShell } from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "My file — Team portal" };

const money2 = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
        <div className="pt-head__eyebrow">My file</div>
        <h1>Where you&rsquo;re at, {me.name.split(" ")[0]}.</h1>
        <p>What&rsquo;s expected of you, your goals and targets, and your reviews. Set by your manager.</p>
      </div>

      {!record?.id && (
        <div className="pt-note">Your file isn&rsquo;t set up yet. Once a manager adds goals or a review, they&rsquo;ll show here.</div>
      )}

      <PersonVan {...vanView} mine />

      {c && (
        <section className="pt-panel">
          <h2 className="pt-panel__h">Your year</h2>
          <p className="pt-panel__sub">What you&rsquo;re allowed and what you&rsquo;re paid outside normal hours. Set by your manager in Costs &amp; capacity.</p>
          <div className="pt-pl__heads">
            <div className="pt-pl__head"><span className="pt-pl__headlabel">Annual leave</span><strong className="pt-pl__headval">{c.leaveDays} days</strong></div>
            <div className="pt-pl__head"><span className="pt-pl__headlabel">RDOs</span><strong className="pt-pl__headval">{c.rdoDays} days</strong></div>
            <div className="pt-pl__head"><span className="pt-pl__headlabel">Sick leave</span><strong className="pt-pl__headval">{c.sickDays} days</strong></div>
            <div className="pt-pl__head"><span className="pt-pl__headlabel">Public holidays</span><strong className="pt-pl__headval">{c.phDays} days</strong></div>
            <div className="pt-pl__head"><span className="pt-pl__headlabel">Overtime</span><strong className="pt-pl__headval">{c.otMult}×<em> {money2(c.wage * c.otMult)}/hr</em></strong></div>
            <div className="pt-pl__head"><span className="pt-pl__headlabel">Nights</span><strong className="pt-pl__headval">{c.nightMult}×<em> {money2(c.wage * c.nightMult)}/hr</em></strong></div>
            <div className="pt-pl__head"><span className="pt-pl__headlabel">Call-backs</span><strong className="pt-pl__headval">{c.callbackPct ?? 0}%</strong></div>
          </div>
        </section>
      )}

      <section className="pt-panel">
        <h2 className="pt-panel__h">What&rsquo;s expected</h2>
        <p className="pf-readonly">{expectations || "Nothing set yet."}</p>
      </section>

      <section className="pt-panel">
        <h2 className="pt-panel__h">Goals &amp; targets <span className="pt-tm__count">{goals.length}</span></h2>
        <div className="pf-goals">
          {goals.length === 0 && <div className="pf-empty">No goals set yet.</div>}
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
      </section>

      <section className="pt-panel">
        <h2 className="pt-panel__h">Your reviews <span className="pt-tm__count">{reviews.length}</span></h2>
        <div className="pf-reviews">
          {reviews.length === 0 && <div className="pf-empty">No reviews yet.</div>}
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
      </section>
    </PortalShell>
  );
}
