"use client";

import { useState, useTransition } from "react";
import { CAPS, type Cap } from "@/lib/portal/caps";
import { CREW_LEVELS } from "@/lib/portal/crew";
import { saveAccess } from "@/app/portal/admin/access/actions";

export function AccessEditor({ initial }: { initial: Record<string, string[]> }) {
  const [map, setMap] = useState<Record<string, string[]>>(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");

  const has = (level: string, cap: Cap) => (map[level] ?? []).includes(cap);
  const toggle = (level: string, cap: Cap) =>
    setMap((m) => {
      const cur = new Set(m[level] ?? []);
      if (cur.has(cap)) cur.delete(cap); else cur.add(cap);
      return { ...m, [level]: [...cur] };
    });

  function save() {
    setMsg("");
    start(async () => {
      const res = await saveAccess(map);
      setMsg(res.ok ? "Saved." : res.error || "Couldn't save.");
    });
  }

  return (
    <div className="pt-acc">
      <div className="pt-acc__scroll">
        <table className="pt-acc__table">
          <thead>
            <tr>
              <th>Level</th>
              {CAPS.map((c) => <th key={c.key} title={c.desc}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {CREW_LEVELS.map((l) => (
              <tr key={l.key}>
                <th scope="row">
                  <strong>{l.label}</strong>
                  <span>{l.blurb}</span>
                </th>
                {CAPS.map((c) => (
                  <td key={c.key}>
                    <label className={`pt-switch pt-switch--sm${has(l.key, c.key) ? " is-on" : ""}`}>
                      <input type="checkbox" checked={has(l.key, c.key)} disabled={pending} onChange={() => toggle(l.key, c.key)} />
                      <span className="pt-switch__track" aria-hidden="true"><span className="pt-switch__thumb" /></span>
                      <span className="pt-switch__label pt-acc__srlabel">{c.label}</span>
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pf-row-end">
        {msg && <span className={`pt-inline ${msg === "Saved." ? "is-ok" : "is-err"}`}>{msg}</span>}
        <button type="button" className="pt-btn pt-btn--orange" disabled={pending} onClick={save}>{pending ? "Saving…" : "Save access"}</button>
      </div>

      <p className="pt-calc__note" style={{ color: "var(--pt-ink-3)" }}>
        Everyone signed in always gets the everyday sections — Handbook, Learning, Information, Tools, Job calculator and their own file.
        These switches control the gated areas on top. The owner always has full access, and a per-person override in Team &amp; access beats whatever is set here.
      </p>
    </div>
  );
}
