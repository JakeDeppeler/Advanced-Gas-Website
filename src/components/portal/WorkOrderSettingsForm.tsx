"use client";

import { useState, useTransition } from "react";
import { saveWorkOrderSettingsAction } from "@/app/portal/work-orders/actions";
import { BOOKINGS_ADDRESS, DEFAULT_TENANT_BODY, DEFAULT_TENANT_SUBJECT, PLACEHOLDERS, type WorkOrderSettings } from "@/lib/outlook/workOrderTypes";

export function WorkOrderSettingsForm({ initial, canEdit }: { initial: WorkOrderSettings; canEdit: boolean }) {
  const [s, setS] = useState<WorkOrderSettings>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  const set = <K extends keyof WorkOrderSettings>(k: K, v: WorkOrderSettings[K]) => {
    setS((x) => ({ ...x, [k]: v }));
    setMsg(null);
  };

  return (
    <form
      className="ch-settings"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveWorkOrderSettingsAction(s);
          setMsg(r.ok ? { ok: true, text: "Saved. The next work order uses it." } : { ok: false, text: r.error ?? "Couldn't save." });
        });
      }}
    >
      <label className="ch-switch">
        <input type="checkbox" checked={s.tenantEmail} disabled={!canEdit} onChange={(e) => set("tenantEmail", e.target.checked)} />
        <span>
          <strong>Email the tenant once a work order is booked</strong>
          <em>
            Sent by itself, from bookings@, asking them to call or reply with times that suit. Replies go to {BOOKINGS_ADDRESS}. Only when the
            work order gives the tenant&rsquo;s own email address; never to the agent.
          </em>
        </span>
      </label>

      <label className="pt-field">
        <span>Subject</span>
        <input type="text" value={s.subject} disabled={!canEdit} maxLength={200} onChange={(e) => set("subject", e.target.value)} />
      </label>

      <label className="pt-field">
        <span>
          The email <em>· {PLACEHOLDERS.map((p) => `{${p}}`).join(" ")} are filled in from the work order</em>
        </span>
        <textarea rows={12} value={s.body} disabled={!canEdit} maxLength={4000} onChange={(e) => set("body", e.target.value)} />
        <small className="ch-hint">
          {"{tenant}"} is their first name, {"{agency}"} the real estate, {"{address}"} the property, {"{job}"} what&rsquo;s to be done, {"{number}"} the work
          order number and {"{phone}"} the office number.
        </small>
      </label>

      {canEdit && (
        <div className="ch-settings__save">
          <button type="submit" className="pt-btn pt-btn--orange" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="pt-btn"
            disabled={busy}
            onClick={() => {
              set("subject", DEFAULT_TENANT_SUBJECT);
              set("body", DEFAULT_TENANT_BODY);
            }}
          >
            Back to the standard wording
          </button>
          {msg && (
            <span role="status" className={msg.ok ? "ch-reply__done" : "ch-reply__err"}>
              {msg.text}
            </span>
          )}
        </div>
      )}
    </form>
  );
}
