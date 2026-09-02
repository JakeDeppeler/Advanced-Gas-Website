"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { REPORT_CATEGORIES, categoryLabel } from "@/lib/portal/caps";
import { writeReport, removeReport } from "@/app/portal/reports/actions";

export type ReportView = {
  id: string;
  subjectId: string | null;
  subjectName: string;
  authorName: string | null;
  authorEmail: string;
  category: string;
  title: string | null;
  body: string;
  when: string;
};

type Member = { id: string; name: string };

export function ReportsBoard({
  reports,
  members,
  canWrite,
  canDelete,
  dbReady,
}: {
  reports: ReportView[];
  members: Member[];
  canWrite: boolean;
  canDelete: boolean;
  dbReady: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [subjectId, setSubjectId] = useState("");
  const [category, setCategory] = useState("note");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [filter, setFilter] = useState("");

  const subjects = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of reports) if (r.subjectId) map.set(r.subjectId, r.subjectName);
    for (const m of members) map.set(m.id, m.name);
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [reports, members]);

  const shown = filter ? reports.filter((r) => r.subjectId === filter) : reports;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const member = members.find((m) => m.id === subjectId);
    if (!member) {
      setMsg({ ok: false, text: "Pick who the report is about." });
      return;
    }
    startTransition(async () => {
      const res = await writeReport({ subjectId, subjectName: member.name, category, title, body });
      if (res.ok) {
        setTitle("");
        setBody("");
        setCategory("note");
        setMsg({ ok: true, text: `Report on ${member.name} saved.` });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error || "Couldn't save." });
      }
    });
  }

  function del(id: string) {
    startTransition(async () => {
      const res = await removeReport({ id });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="pt-rep">
      {!dbReady && (
        <div className="pt-note pt-note--warn">
          <strong>Database not connected.</strong> Reports need the Supabase keys set on the server. Until then nothing
          here will save.
        </div>
      )}

      {canWrite && (
        <section className="pt-panel pt-rep__write">
          <h2 className="pt-panel__h">Write a report</h2>
          <p className="pt-panel__sub">A note on a crew member — coaching, how they&rsquo;re tracking, a handover, or anything the leads and admins should know. It&rsquo;s recorded so no one has to chase it up in person.</p>
          <form onSubmit={submit} className="pt-rep__form">
            <div className="pt-rep__formrow">
              <label className="pt-field">
                <span>About</span>
                <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required>
                  <option value="" disabled>Choose a person…</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </label>
              <label className="pt-field">
                <span>Type</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {REPORT_CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="pt-field">
              <span>Heading <em>(optional)</em></span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Great work on the Officer ducted job" />
            </label>
            <label className="pt-field">
              <span>Report</span>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="What happened, what was said, what's next…" required />
            </label>
            <div className="pt-rep__submit">
              {msg && <span className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`}>{msg.text}</span>}
              <button type="submit" className="pt-btn pt-btn--orange" disabled={pending}>
                {pending ? "Saving…" : "Save report"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="pt-rep__list">
        <div className="pt-rep__listhead">
          <h2 className="pt-panel__h">Reports <span className="pt-tm__count">{shown.length}</span></h2>
          {subjects.length > 0 && (
            <label className="pt-field pt-field--inline">
              <span>About</span>
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="">Everyone</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        {shown.length === 0 ? (
          <div className="pt-rep__empty">No reports yet{filter ? " for this person" : ""}.</div>
        ) : (
          <div className="pt-rep__cards">
            {shown.map((r) => (
              <article key={r.id} className="pt-rep__card">
                <header className="pt-rep__cardhead">
                  <div>
                    <span className="pt-rep__subject">{r.subjectName}</span>
                    <span className={`pt-rep__cat pt-rep__cat--${r.category}`}>{categoryLabel(r.category)}</span>
                  </div>
                  <span className="pt-rep__when">{r.when}</span>
                </header>
                {r.title && <h3 className="pt-rep__title">{r.title}</h3>}
                <p className="pt-rep__body">{r.body}</p>
                <footer className="pt-rep__cardfoot">
                  <span className="pt-rep__author">— {r.authorName || r.authorEmail}</span>
                  {canDelete && (
                    <button type="button" className="pt-rep__del" onClick={() => del(r.id)} disabled={pending} aria-label="Delete report">
                      Delete
                    </button>
                  )}
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
