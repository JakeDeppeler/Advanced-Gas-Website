"use client";

import { useState, useTransition } from "react";
import { saveSettingsAction } from "@/app/portal/chats/actions";
import type { ChatSettings } from "@/lib/chat/chatTypes";

export function ChatSettingsForm({ initial }: { initial: ChatSettings }) {
  const [s, setS] = useState<ChatSettings>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  const set = <K extends keyof ChatSettings>(k: K, v: ChatSettings[K]) => {
    setS((x) => ({ ...x, [k]: v }));
    setMsg(null);
  };

  return (
    <form
      className="ch-settings"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveSettingsAction(s);
          setMsg(r.ok ? { ok: true, text: "Saved. The website picks up the chat switch within a minute." } : { ok: false, text: r.error ?? "Couldn't save." });
        });
      }}
    >
      <label className="ch-switch">
        <input type="checkbox" checked={s.widget} onChange={(e) => set("widget", e.target.checked)} />
        <span>
          <strong>Show the chat on the website</strong>
          <em>
            Every message needs a person to answer it, and the wall board rings for the first one from each visitor each day. Turn it on when
            the office is ready to watch the inbox.
          </em>
        </span>
      </label>

      <label className="pt-field">
        <span>
          Online booking link <em>· ServiceTitan&rsquo;s booking page, once it&rsquo;s set up</em>
        </span>
        <input type="url" inputMode="url" value={s.bookingUrl} onChange={(e) => set("bookingUrl", e.target.value)} placeholder="https://" />
        <small className="ch-hint">With a link here the assistant offers it to anyone ready to book. Without one it takes their preferred times and says the office will confirm.</small>
      </label>

      <label className="pt-field">
        <span>
          Notes for the assistant <em>· what the website doesn&rsquo;t say</em>
        </span>
        <textarea
          rows={7}
          value={s.notes}
          onChange={(e) => set("notes", e.target.value)}
          maxLength={6000}
          placeholder={"e.g. We're booked about two weeks out for installs.\nWe don't service evaporative coolers.\nThe office closes at 1pm on 24 December."}
        />
      </label>

      <label className="pt-field">
        <span>
          Never say <em>· one per line; this wins over everything else</em>
        </span>
        <textarea
          rows={5}
          value={s.neverSay}
          onChange={(e) => set("neverSay", e.target.value)}
          maxLength={3000}
          placeholder={"e.g. Any price that isn't on the website\nSame-day installs\nThat we'll match another quote"}
        />
      </label>

      <div className="ch-settings__save">
        <button type="submit" className="pt-btn pt-btn--orange" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
        {msg && (
          <span role="status" className={msg.ok ? "ch-reply__done" : "ch-reply__err"}>
            {msg.text}
          </span>
        )}
      </div>
    </form>
  );
}
