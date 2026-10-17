"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { receiveLine } from "@/app/portal/stock/actions";

/** "It's here": puts a sent stock line on the shelf, once. */
export function Arrived({ lineId, what }: { lineId: number; what: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <span className="pk-btns" style={{ alignItems: "center", justifyContent: "flex-end" }}>
      {msg && <span className={`pk-said${msg.ok ? "" : " bad"}`} role="status">{msg.text}</span>}
      <button type="button" className="pk-btn" disabled={busy} aria-label={`${what} has arrived, put it on the shelf`}
        onClick={() => start(async () => {
          const r = await receiveLine({ lineId });
          setMsg(r.ok ? { ok: true, text: r.note ?? "On the shelf." } : { ok: false, text: r.error ?? "Couldn’t." });
          if (r.ok) router.refresh();
        })}>
        {busy ? "Putting it away…" : "Arrived"}
      </button>
    </span>
  );
}
