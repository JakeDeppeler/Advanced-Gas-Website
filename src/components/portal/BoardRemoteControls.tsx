"use client";

import { useEffect, useState, useTransition } from "react";
import { keepLive, reloadBoard, rotate, setTheme, showDemo, showPage, type RemoteResult } from "@/app/portal/board/remote/actions";
import { BOARD_PAGES, type BoardRemote, type DemoKind } from "@/lib/board/remoteTypes";

const DEMOS: { kind: DemoKind; label: string; what: string }[] = [
  { kind: "sold", label: "SOLD!", what: "A sale, with the rocket" },
  { kind: "quote", label: "New quote", what: "A quote going out" },
  { kind: "done", label: "Time to bill", what: "A job finished, to invoice" },
];

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });

/**
 * The remote: a page to show or hold, a demo alert, light or dark, and a
 * reload. Each press is saved and the boards pick it up — every few seconds
 * while this page is open, which it keeps telling them by renewing a short
 * window once a minute.
 */
export function BoardRemoteControls({ initial }: { initial: BoardRemote }) {
  const [remote, setRemote] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [, tick] = useState(0);

  // Keep the boards listening closely while this page is open and in view.
  useEffect(() => {
    const wake = () => { if (document.visibilityState === "visible") void keepLive(); };
    wake();
    const t = setInterval(wake, 60_000);
    const clock = setInterval(() => tick((n) => n + 1), 15_000);
    document.addEventListener("visibilitychange", wake);
    return () => { clearInterval(t); clearInterval(clock); document.removeEventListener("visibilitychange", wake); };
  }, []);

  function run(fn: () => Promise<RemoteResult>, said: string) {
    start(async () => {
      const res = await fn();
      if (!res.ok || !res.remote) return setMsg({ ok: false, text: res.error ?? "Couldn't send that." });
      setRemote(res.remote);
      setMsg({ ok: true, text: said });
    });
  }

  const held = remote.view?.hold ? remote.view.page : null;
  const demoUntil = remote.demo ? Date.parse(remote.demo.until) : 0;
  const demo = remote.demo && demoUntil > Date.now() ? remote.demo : null;

  return (
    <div className="pt-wb__controls">
      <section className="pt-wb__group">
        <div className="pt-wb__gh">
          <h2>On the wall</h2>
          <span className={`pt-vstat ${held ? "pt-vstat--warn" : "pt-vstat--ok"}`}>
            {held ? `Holding on ${held}` : "Turning the pages"}
          </span>
        </div>
        <p className="pt-wb__note">
          {held
            ? `Stays on ${held} until somebody sets it turning again${remote.by && remote.at ? ` · ${remote.by}, ${time(remote.at)}` : ""}.`
            : "Each page shows for 30 seconds. Pick one to put it up now and keep it there."}
        </p>
        <div className="pt-wb__pages" role="group" aria-label="Show a page">
          {BOARD_PAGES.map((p) => (
            <button
              key={p}
              type="button"
              className={`pt-wb__page${held === p ? " is-on" : ""}`}
              aria-pressed={held === p}
              disabled={pending}
              onClick={() => run(() => showPage(p, true), `${p} is going up on the wall.`)}
            >
              {p}
            </button>
          ))}
        </div>
        {held && (
          <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" disabled={pending} onClick={() => run(rotate, "The wall is turning its pages again.")}>
            Turn the pages again
          </button>
        )}
      </section>

      <section className="pt-wb__group">
        <div className="pt-wb__gh">
          <h2>Put a demo up</h2>
          {demo && <span className="pt-vstat pt-vstat--warn">Up until {time(demo.until)}</span>}
        </div>
        <p className="pt-wb__note">
          One of the board&rsquo;s alerts on sample figures, over and over for two minutes — marked as a sample on the
          screen, so nobody takes it for a real sale.
        </p>
        <div className="pt-wb__demos">
          {DEMOS.map((d) => (
            <button
              key={d.kind}
              type="button"
              className={`pt-wb__demo pt-wb__demo--${d.kind}${demo?.kind === d.kind ? " is-on" : ""}`}
              aria-pressed={demo?.kind === d.kind}
              disabled={pending}
              onClick={() => run(() => showDemo(d.kind), `The ${d.label} demo is going up.`)}
            >
              <strong>{d.label}</strong>
              <span>{d.what}</span>
            </button>
          ))}
        </div>
        {demo && (
          <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" disabled={pending} onClick={() => run(() => showDemo(null), "The demo is coming down.")}>
            Take it down
          </button>
        )}
      </section>

      <section className="pt-wb__group pt-wb__row">
        <div>
          <h2>Light or dark</h2>
          <p className="pt-wb__note">Dark suits a dim room. &ldquo;As set&rdquo; leaves it to the TV&rsquo;s own address.</p>
        </div>
        <div className="pt-seg" role="group" aria-label="Light or dark">
          {([["light", "Light"], ["dark", "Dark"], [null, "As set"]] as const).map(([t, l]) => (
            <button
              key={l}
              type="button"
              className={`pt-seg__b${remote.theme === t ? " is-on" : ""}`}
              aria-pressed={remote.theme === t}
              disabled={pending}
              onClick={() => run(() => setTheme(t), t ? `The wall is going ${t}.` : "The wall is back to how the TV is set.")}
            >
              {l}
            </button>
          ))}
        </div>
      </section>

      <section className="pt-wb__group pt-wb__row">
        <div>
          <h2>Reload the TV</h2>
          <p className="pt-wb__note">For a screen that has stuck or looks wrong. It comes back where the remote has it.</p>
        </div>
        <button type="button" className="pt-btn pt-btn--ghost" disabled={pending} onClick={() => run(reloadBoard, "The TV is reloading.")}>
          Reload
        </button>
      </section>

      {msg && <p className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`} role="status">{msg.text}</p>}
      <p className="pt-wb__fine">
        While this page is open the TV checks for a press every few seconds; the first one can take up to half a minute
        to land. Somebody at the TV can still skip or hold with its own buttons.
      </p>
    </div>
  );
}
