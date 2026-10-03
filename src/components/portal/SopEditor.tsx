"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProcedure, revertProcedure } from "@/app/portal/sops/edit/actions";
import { SOP_AUDIENCES, SOP_FLAGS, nextCode, type SopStep, type StoredSop } from "@/lib/portal/sopEdits";

export type SectionView = { letter: string; title: string; codes: { code: string; title: string }[] };

type Draft = {
  section: string;
  code: string;
  title: string;
  happens: string;
  flag: string;
  audience: string;
  steps: SopStep[];
  changed: string;
  /** Null for a procedure that only exists in the manual, not in the store. */
  status: "draft" | "published" | null;
};

/**
 * Three panes: the sections, that section's procedures, and the one you're
 * editing.
 *
 * A procedure that has never been edited here is loaded from the manual and
 * shown with its steps, so editing it starts from what the crew can see today
 * rather than from an empty form. Saving writes an override; publishing is a
 * separate press, because the crew sees a published change on the next page
 * load and there is no taking it back quietly.
 */
export function SopEditor({
  sections, stored, fromManual,
}: {
  sections: SectionView[];
  stored: StoredSop[];
  /** The manual's own steps, by code, for procedures nobody has edited yet. */
  fromManual: Record<string, { title: string; steps: SopStep[]; happens: string }>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [section, setSection] = useState(sections[0]?.letter ?? "A");
  const storedBy = useMemo(() => new Map(stored.map((s) => [s.code, s])), [stored]);

  const blank = (letter: string): Draft => ({
    section: letter, code: nextCode(letter, stored), title: "", happens: "",
    flag: "", audience: "everyone", steps: [{ do: "", note: "" }], changed: "", status: null,
  });

  const load = (code: string): Draft => {
    const row = storedBy.get(code);
    if (row) {
      return {
        section: row.section, code: row.code, title: row.title, happens: row.happens ?? "",
        flag: row.flag ?? "", audience: row.audience,
        steps: row.steps.length ? row.steps : [{ do: "", note: "" }],
        changed: row.changed ?? "", status: row.status,
      };
    }
    const m = fromManual[code];
    return {
      section, code, title: m?.title ?? code, happens: m?.happens ?? "",
      flag: "", audience: "everyone",
      steps: m?.steps.length ? m.steps : [{ do: "", note: "" }],
      changed: "", status: null,
    };
  };

  const first = sections.find((s) => s.letter === section)?.codes[0]?.code;
  const [d, setD] = useState<Draft>(() => (first ? load(first) : blank(section)));
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setD((p) => ({ ...p, [k]: v })); setMsg(null); };

  const here = sections.find((s) => s.letter === section);

  function step(i: number, patch: Partial<SopStep>) {
    setD((p) => ({ ...p, steps: p.steps.map((s, k) => (k === i ? { ...s, ...patch } : s)) }));
    setMsg(null);
  }
  function move(i: number, by: -1 | 1) {
    setD((p) => {
      const to = i + by;
      if (to < 0 || to >= p.steps.length) return p;
      const steps = [...p.steps];
      [steps[i], steps[to]] = [steps[to], steps[i]];
      return { ...p, steps };
    });
  }

  const save = (publish: boolean) =>
    start(async () => {
      const res = await saveProcedure({ ...d, publish });
      if (!res.ok) return setMsg({ ok: false, text: res.error ?? "Couldn't save." });
      setD((p) => ({ ...p, status: publish ? "published" : "draft" }));
      setMsg({ ok: true, text: publish ? "Published. The crew sees it now." : "Saved as a draft." });
      router.refresh();
    });

  return (
    <div className="pt-se">
      {/* Sections */}
      <nav className="pt-panel pt-se__sections" aria-label="Sections">
        {sections.map((s) => (
          <button
            key={s.letter}
            type="button"
            className={`pt-se__sec${s.letter === section ? " is-on" : ""}`}
            onClick={() => {
              setSection(s.letter);
              const c = s.codes[0]?.code;
              setD(c ? { ...load(c), section: s.letter } : blank(s.letter));
              setMsg(null);
            }}
          >
            <span className="pt-se__letter">{s.letter}</span>
            <strong>{s.title}</strong>
            <em>{s.codes.length}</em>
          </button>
        ))}
        {/* A–F is the structure agreed at the training day. Adding a seventh
            section is a decision somebody makes in a room, so there is no
            button for it here. */}
        <p className="pt-se__note">A–F is the manual&rsquo;s own structure. Changing it is a conversation, not a button.</p>
      </nav>

      {/* Procedures in this section */}
      <div className="pt-panel pt-se__list">
        {/* The section's name is the manual's, like its letter, so it reads
            as a field here but isn't one you can change. */}
        <label className="pt-field pt-se__secname"><span>Section name</span>
          <input value={here?.title ?? ""} readOnly title="Section names are the manual’s own structure" />
        </label>
        {here?.codes.map((c) => {
          const row = storedBy.get(c.code);
          return (
            <button
              key={c.code}
              type="button"
              className={`pt-se__proc${c.code === d.code ? " is-on" : ""}`}
              onClick={() => { setD(load(c.code)); setMsg(null); }}
            >
              <span className="pt-se__code">{c.code}</span>
              <strong>{c.title}</strong>
              {row && <em className={row.status === "draft" ? "is-draft" : "is-live"}>{row.status === "draft" ? "Draft" : "Edited"}</em>}
            </button>
          );
        })}
        <button type="button" className="pt-se__new" onClick={() => { setD(blank(section)); setMsg(null); }}>
          + New procedure
        </button>
      </div>

      {/* The one being edited */}
      <div className="pt-panel pt-se__form">
        <div className="pt-se__two">
          <label className="pt-field pt-se__code-f"><span>Code</span>
            <input value={d.code} onChange={(e) => set("code", e.target.value.toUpperCase())} />
          </label>
          <label className="pt-field"><span>Title</span>
            <input value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="If you suspect asbestos" />
          </label>
        </div>

        <div className="pt-se__two">
          <label className="pt-field"><span>When it happens</span>
            <input value={d.happens} onChange={(e) => set("happens", e.target.value)} placeholder="The moment you think it might be" />
          </label>
          <label className="pt-field"><span>Flag</span>
            <select value={d.flag} onChange={(e) => set("flag", e.target.value)}>
              {SOP_FLAGS.map((f) => <option key={f.k} value={f.k}>{f.label}</option>)}
            </select>
          </label>
        </div>

        <div className="pt-field">
          <span>Who sees it</span>
          <div className="pt-se__who" role="radiogroup" aria-label="Who sees it">
            {SOP_AUDIENCES.map((a) => (
              <button
                key={a.k}
                type="button"
                role="radio"
                aria-checked={d.audience === a.k}
                className={`pt-se__aud${d.audience === a.k ? " is-on" : ""}`}
                onClick={() => set("audience", a.k)}
              >{a.label}</button>
            ))}
          </div>
        </div>

        <h3 className="pt-se__h3">Steps</h3>
        <div className="pt-se__steps">
          {d.steps.map((s, i) => (
            <div key={i} className="pt-se__step">
              <span className="pt-se__n">{i + 1}</span>
              <input value={s.do} onChange={(e) => step(i, { do: e.target.value })} placeholder="Stop work straight away" aria-label={`Step ${i + 1}`} />
              <input value={s.note} onChange={(e) => step(i, { note: e.target.value })} placeholder="Tools down." aria-label={`Step ${i + 1} note`} />
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move step ${i + 1} up`}>↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === d.steps.length - 1} aria-label={`Move step ${i + 1} down`}>↓</button>
              <button
                type="button"
                className="pt-se__x"
                onClick={() => setD((p) => ({ ...p, steps: p.steps.filter((_, k) => k !== i) }))}
                aria-label={`Remove step ${i + 1}`}
              >×</button>
            </div>
          ))}
        </div>
        <button type="button" className="pt-se__add" onClick={() => setD((p) => ({ ...p, steps: [...p.steps, { do: "", note: "" }] }))}>
          + Add a step
        </button>

        <label className="pt-field pt-se__changed">
          <span>What changed</span>
          <em className="pt-se__hint">Shown to the crew under the procedure, so nobody has to diff two versions in their head.</em>
          <textarea
            rows={3}
            value={d.changed}
            onChange={(e) => set("changed", e.target.value)}
            placeholder="e.g. Added: call Gas Emergencies if it's from the meter side."
          />
        </label>

        <div className="pt-se__foot">
          <span className={`pt-se__state${d.status === "published" ? " is-live" : ""}`}>
            {d.status === "published"
              ? "Published. The crew can see this."
              : d.status === "draft"
                ? "Draft. Only people who can edit see it."
                : "From the manual. Saving writes a version here."}
          </span>
          {msg && <span className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`}>{msg.text}</span>}
          {d.status && (
            <button type="button" className="pt-btn pt-btn--ghost" disabled={pending}
              onClick={() => start(async () => {
                const res = await revertProcedure(d.code);
                if (!res.ok) return setMsg({ ok: false, text: res.error ?? "Couldn't remove it." });
                setMsg({ ok: true, text: "Back to what the manual says." });
                setD(load(d.code));
                router.refresh();
              })}>
              Back to the manual
            </button>
          )}
          <button type="button" className="pt-btn pt-btn--ghost" disabled={pending} onClick={() => save(false)}>
            {pending ? "Saving…" : "Save draft"}
          </button>
          <button type="button" className="pt-btn pt-btn--orange" disabled={pending} onClick={() => save(true)}>
            Publish to the crew
          </button>
        </div>
      </div>
    </div>
  );
}
