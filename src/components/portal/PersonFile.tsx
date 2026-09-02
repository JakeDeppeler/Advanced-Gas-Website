"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveExpectations, addGoal, setGoalStatus, removeGoal,
  addReview, removeReview, addNote, removeNote,
} from "@/app/portal/team/actions";

export type GoalView = { id: string; title: string; target: string | null; status: "open" | "done"; due: string | null };
export type ReviewView = { id: string; period: string | null; rating: number | null; body: string; authorName: string | null; when: string };
export type NoteView = { id: string; sentiment: string | null; body: string; authorName: string | null; when: string };

type Props = {
  userId: string;
  name: string;
  expectations: string | null;
  goals: GoalView[];
  reviews: ReviewView[];
  notes: NoteView[];
  canEdit: boolean;
  canDeleteNotes: boolean;
};

const SENTIMENT = [
  { key: "good", label: "Good" },
  { key: "bad", label: "Needs work" },
  { key: "note", label: "Note" },
];

function Stars({ n }: { n: number | null }) {
  if (!n) return null;
  return <span className="pf-stars" aria-label={`${n} out of 5`}>{"★".repeat(n)}<span className="pf-stars__off">{"★".repeat(5 - n)}</span></span>;
}

export function PersonFile({ userId, name, expectations, goals, reviews, notes, canEdit, canDeleteNotes }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const refresh = () => router.refresh();

  // Expectations
  const [exp, setExp] = useState(expectations ?? "");
  const [expMsg, setExpMsg] = useState("");
  const expDirty = exp !== (expectations ?? "");

  // Goal add form
  const [gTitle, setGTitle] = useState("");
  const [gTarget, setGTarget] = useState("");
  const [gDue, setGDue] = useState("");

  // Review add form
  const [rPeriod, setRPeriod] = useState("");
  const [rRating, setRRating] = useState<number>(0);
  const [rBody, setRBody] = useState("");

  // Note add form
  const [nSent, setNSent] = useState("good");
  const [nBody, setNBody] = useState("");

  return (
    <div className="pf">
      {/* Expectations */}
      <section className="pt-panel">
        <h2 className="pt-panel__h">What&rsquo;s expected</h2>
        <p className="pt-panel__sub">The standard for {name.split(" ")[0]}&rsquo;s role. {name.split(" ")[0]} can see this.</p>
        {canEdit ? (
          <>
            <textarea className="pf-textarea" rows={4} value={exp} onChange={(e) => setExp(e.target.value)} placeholder="e.g. On time, van stocked, front-door approach every job, quotes within the day…" />
            <div className="pf-row-end">
              {expMsg && <span className="pt-inline is-ok">{expMsg}</span>}
              <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" disabled={!expDirty || pending} onClick={() => start(async () => {
                const res = await saveExpectations({ userId, text: exp });
                if (res.ok) { setExpMsg("Saved."); refresh(); }
              })}>{pending ? "Saving…" : expDirty ? "Save" : "Saved"}</button>
            </div>
          </>
        ) : (
          <p className="pf-readonly">{expectations || "Nothing set yet."}</p>
        )}
      </section>

      {/* Goals & targets */}
      <section className="pt-panel">
        <h2 className="pt-panel__h">Goals &amp; targets <span className="pt-tm__count">{goals.length}</span></h2>
        <p className="pt-panel__sub">Set and tracked by managers. {name.split(" ")[0]} can see these.</p>

        <div className="pf-goals">
          {goals.length === 0 && <div className="pf-empty">No goals set yet.</div>}
          {goals.map((g) => (
            <div key={g.id} className={`pf-goal${g.status === "done" ? " is-done" : ""}`}>
              <button
                type="button"
                className="pf-goal__check"
                disabled={!canEdit || pending}
                aria-label={g.status === "done" ? "Mark open" : "Mark done"}
                onClick={() => start(async () => { await setGoalStatus({ id: g.id, userId, status: g.status === "done" ? "open" : "done" }); refresh(); })}
              >
                {g.status === "done" ? "✓" : ""}
              </button>
              <div className="pf-goal__txt">
                <strong>{g.title}</strong>
                {g.target && <span className="pf-goal__target">Target: {g.target}</span>}
                {g.due && <span className="pf-goal__due">by {g.due}</span>}
              </div>
              {canEdit && (
                <button type="button" className="pf-x" disabled={pending} aria-label="Remove goal" onClick={() => start(async () => { await removeGoal({ id: g.id, userId }); refresh(); })}>×</button>
              )}
            </div>
          ))}
        </div>

        {canEdit && (
          <div className="pf-add">
            <input className="pf-inp" value={gTitle} onChange={(e) => setGTitle(e.target.value)} placeholder="Goal (e.g. Lead a ducted install solo)" />
            <input className="pf-inp" value={gTarget} onChange={(e) => setGTarget(e.target.value)} placeholder="Target (e.g. by end of Q2)" />
            <input className="pf-inp pf-inp--date" type="date" value={gDue} onChange={(e) => setGDue(e.target.value)} aria-label="Due date" />
            <button type="button" className="pt-btn pt-btn--orange pt-btn--sm" disabled={pending || !gTitle.trim()} onClick={() => start(async () => {
              const res = await addGoal({ userId, title: gTitle, target: gTarget, due: gDue });
              if (res.ok) { setGTitle(""); setGTarget(""); setGDue(""); refresh(); }
            })}>Add goal</button>
          </div>
        )}
      </section>

      {/* Reviews */}
      <section className="pt-panel">
        <h2 className="pt-panel__h">Reviews <span className="pt-tm__count">{reviews.length}</span></h2>
        <p className="pt-panel__sub">Formal reviews. {name.split(" ")[0]} can see these.</p>

        <div className="pf-reviews">
          {reviews.length === 0 && <div className="pf-empty">No reviews yet.</div>}
          {reviews.map((r) => (
            <article key={r.id} className="pf-review">
              <header className="pf-review__head">
                <span>{r.period || "Review"} <Stars n={r.rating} /></span>
                <span className="pf-review__when">{r.when}</span>
              </header>
              <p className="pf-review__body">{r.body}</p>
              <footer className="pf-review__foot">
                <span>— {r.authorName || "Manager"}</span>
                {canEdit && <button type="button" className="pf-del" disabled={pending} onClick={() => start(async () => { await removeReview({ id: r.id, userId }); refresh(); })}>Delete</button>}
              </footer>
            </article>
          ))}
        </div>

        {canEdit && (
          <div className="pf-reviewform">
            <div className="pf-reviewform__row">
              <input className="pf-inp" value={rPeriod} onChange={(e) => setRPeriod(e.target.value)} placeholder="Period (e.g. Q1 2026, 6-month)" />
              <select className="pf-inp pf-inp--rating" value={rRating} onChange={(e) => setRRating(Number(e.target.value))} aria-label="Rating">
                <option value={0}>No rating</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} ★</option>)}
              </select>
            </div>
            <textarea className="pf-textarea" rows={3} value={rBody} onChange={(e) => setRBody(e.target.value)} placeholder="How they're tracking — what's going well, what to work on…" />
            <div className="pf-row-end">
              <button type="button" className="pt-btn pt-btn--orange pt-btn--sm" disabled={pending || !rBody.trim()} onClick={() => start(async () => {
                const res = await addReview({ userId, period: rPeriod, rating: rRating || null, body: rBody });
                if (res.ok) { setRPeriod(""); setRRating(0); setRBody(""); refresh(); }
              })}>Save review</button>
            </div>
          </div>
        )}
      </section>

      {/* Hidden notes */}
      <section className="pt-panel pf-hidden">
        <h2 className="pt-panel__h">Managers&rsquo; notes <span className="pf-lock">hidden</span></h2>
        <p className="pt-panel__sub">Private to managers — {name.split(" ")[0]} never sees these. Good, needs-work, or a plain note.</p>

        <div className="pf-notes">
          {notes.length === 0 && <div className="pf-empty">No notes yet.</div>}
          {notes.map((n) => (
            <div key={n.id} className={`pf-note pf-note--${n.sentiment || "note"}`}>
              <div className="pf-note__body">
                <span className={`pf-note__tag pf-note__tag--${n.sentiment || "note"}`}>{n.sentiment === "good" ? "Good" : n.sentiment === "bad" ? "Needs work" : "Note"}</span>
                {n.body}
              </div>
              <div className="pf-note__foot">
                <span>— {n.authorName || "Manager"} · {n.when}</span>
                {canDeleteNotes && <button type="button" className="pf-del" disabled={pending} onClick={() => start(async () => { await removeNote({ id: n.id, userId }); refresh(); })}>Delete</button>}
              </div>
            </div>
          ))}
        </div>

        {canEdit && (
          <div className="pf-noteform">
            <div className="pf-noteform__sent">
              {SENTIMENT.map((s) => (
                <button key={s.key} type="button" className={`pf-sentbtn pf-sentbtn--${s.key}${nSent === s.key ? " is-on" : ""}`} onClick={() => setNSent(s.key)}>{s.label}</button>
              ))}
            </div>
            <textarea className="pf-textarea" rows={2} value={nBody} onChange={(e) => setNBody(e.target.value)} placeholder="A private note about this person…" />
            <div className="pf-row-end">
              <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" disabled={pending || !nBody.trim()} onClick={() => start(async () => {
                const res = await addNote({ userId, subjectName: name, sentiment: nSent, body: nBody });
                if (res.ok) { setNBody(""); refresh(); }
              })}>Add note</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
