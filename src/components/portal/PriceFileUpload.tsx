"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * "Upload a price file": pick the maX export, load it, say what happened.
 *
 * Vercel takes request bodies up to about 4.5 MB, which is a contractor price
 * file several times over in CSV; a bigger one says so rather than failing
 * silently.
 */
export function PriceFileUpload() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function send(file: File) {
    if (file.size > 4.4 * 1024 * 1024) {
      setMsg({ ok: false, text: "That file is over 4.4 MB — too big to send from a browser. Export it as CSV, or ask for it to be loaded on the scheduled import." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/portal/price-file", { method: "POST", body });
      const r = (await res.json().catch(() => ({}))) as { ok?: boolean; stored?: number; skipped?: number; error?: string };
      if (!res.ok || !r.ok) setMsg({ ok: false, text: r.error || "Couldn’t load that file." });
      else {
        setMsg({ ok: true, text: `Loaded ${(r.stored ?? 0).toLocaleString("en-AU")} items${r.skipped ? ` · ${r.skipped} rows skipped` : ""}.` });
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: "Couldn’t reach the server. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".csv,.txt,.json,text/csv,application/json"
        hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void send(f); e.target.value = ""; }}
      />
      <button type="button" className="pt-btn pt-btn--orange" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? "Loading…" : "Upload a price file"}
      </button>
      {msg && <p className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`} role="status">{msg.text}</p>}
    </>
  );
}
