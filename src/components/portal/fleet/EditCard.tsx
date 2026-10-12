"use client";

import type { ReactNode } from "react";

/**
 * The head of a card that reads until you choose to change it: the title,
 * a line under it, and Edit — or Cancel while the form is open. Keeping the
 * figures shut behind a button stops a stray tap on a phone changing a van.
 */
export function EditHead({ title, sub, editing, canEdit, onEdit, onCancel }: {
  title: string; sub?: ReactNode; editing: boolean; canEdit: boolean; onEdit: () => void; onCancel: () => void;
}) {
  return (
    <div className="pk-card-h pk-edit-h">
      <b>{title}</b>
      <span className="pk-edit-a">
        {sub && <span>{sub}</span>}
        {canEdit && (editing
          ? <button type="button" className="pk-btn g" onClick={onCancel}>Cancel</button>
          : <button type="button" className="pk-btn g" onClick={onEdit}>Edit</button>)}
      </span>
    </div>
  );
}

/** One read-only line: what it is, and its value or "not set". */
export function Fact({ t, v, sub }: { t: string; v: ReactNode; sub?: string }) {
  const empty = v == null || v === "";
  return (
    <div className="pk-kv">
      <span className="t"><b style={{ fontWeight: 600 }}>{t}</b>{sub && <span>{sub}</span>}</span>
      <span className="v" style={empty ? { color: "var(--ink3)", fontWeight: 500 } : undefined}>{empty ? "not set" : v}</span>
    </div>
  );
}
