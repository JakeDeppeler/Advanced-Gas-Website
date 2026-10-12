"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { START_COOKIE, type Business, type BusinessHas, type ThemeChoice } from "@/lib/portal/businessTypes";
import { saveBusinessSettings } from "@/app/portal/settings/actions";
import { applyTheme } from "@/components/portal/shell/ThemeButton";

const THEMES: { key: ThemeChoice; label: string; bg: string; side: string; card: string }[] = [
  { key: "light", label: "Light", bg: "#f5f5f7", side: "#ebebee", card: "#ffffff" },
  { key: "dark", label: "Dark", bg: "#111113", side: "#1c1c1e", card: "#2c2c2e" },
  { key: "system", label: "Match my computer", bg: "linear-gradient(135deg,#f5f5f7 50%,#111113 50%)", side: "transparent", card: "transparent" },
];

const HAS: { key: keyof BusinessHas; label: string; what: string }[] = [
  { key: "wall", label: "An office TV (wall board)", what: "The live board, the remote, sounds and screens. Off hides the Wall board section; the numbers still live on Home and the Scoreboard." },
  { key: "vans", label: "Vans with drivers", what: "Vehicles under Crew & vans." },
  { key: "ipad", label: "Techs on a trade iPad", what: "The link to the trade iPad under Crew & vans." },
  { key: "agents", label: "Real estate and agency work", what: "The real estate split on money owed, once that page is rebuilt." },
];

/** Appearance and start page: this device only, kept in cookies like the side bar's width. */
export function DeviceSettings({ theme: initialTheme, start: initialStart, starts }: { theme: ThemeChoice; start: string; starts: { key: string; label: string }[] }) {
  const [theme, setTheme] = useState(initialTheme);
  const [start, setStart] = useState(initialStart);
  const pickTheme = (t: ThemeChoice) => {
    setTheme(t);
    applyTheme(t);
  };
  const pickStart = (k: string) => {
    setStart(k);
    try {
      document.cookie = `${START_COOKIE}=${k}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* Not remembered on this device. */
    }
  };
  return (
    <>
      <div className="ps-card">
        <div className="ps-h"><b>Appearance</b><span>saved on this device</span></div>
        <div className="ps-opt" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => (
            <button key={t.key} type="button" role="radio" aria-checked={theme === t.key} className={theme === t.key ? "on" : ""} onClick={() => pickTheme(t.key)}>
              <span className="ps-sw" style={{ background: t.bg }} aria-hidden="true">
                <span style={{ background: t.side }} />
                <span><i style={{ height: 8, width: "60%", background: t.card }} /><i style={{ height: 22, background: t.card }} /></span>
              </span>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="ps-card">
        <div className="ps-h"><b>Start page</b><span>what opens when you open the portal, on this device</span></div>
        <div className="ps-kv">
          <span className="t"><b>Open on</b><span>Home is still one click away in the side bar.</span></span>
          <select id="set-start" className="ps-in" value={start} onChange={(e) => pickStart(e.target.value)} aria-label="Start page">
            {starts.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      </div>
    </>
  );
}

/** The business's name and what it has. Shared by everyone, so only an admin changes it. */
export function BusinessSettings({ initial, canEdit }: { initial: Business; canEdit: boolean }) {
  const [b, setB] = useState(initial);
  const [said, setSaid] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  const router = useRouter();
  const dirty = JSON.stringify(b) !== JSON.stringify(initial);

  const save = () =>
    start(async () => {
      const res = await saveBusinessSettings(b);
      setSaid(res.ok ? { ok: true, text: "Saved. The side bar has changed for everyone." } : { ok: false, text: res.error ?? "Couldn't save." });
      if (res.ok) router.refresh();
    });

  return (
    <>
      <div className="ps-card">
        <div className="ps-h"><b>The business</b><span>what shows at the top of the side bar</span></div>
        <div className="ps-kv">
          <span className="t"><b>Name</b></span>
          <input id="biz-name" className="ps-in" value={b.name} maxLength={40} disabled={!canEdit} onChange={(e) => setB({ ...b, name: e.target.value })} aria-label="Business name" />
        </div>
        <div className="ps-kv">
          <span className="t"><b>Second line</b><span>leave blank if the name is one line</span></span>
          <input id="biz-name2" className="ps-in" value={b.name2} maxLength={40} disabled={!canEdit} onChange={(e) => setB({ ...b, name2: e.target.value })} aria-label="Second line" />
        </div>
        <div className="ps-kv">
          <span className="t"><b>Short badge</b><span>two or three letters</span></span>
          <input id="biz-short" className="ps-in xs" value={b.short} maxLength={3} disabled={!canEdit} onChange={(e) => setB({ ...b, short: e.target.value })} aria-label="Badge" />
        </div>
      </div>
      <div className="ps-card">
        <div className="ps-h"><b>What the business has</b><span>turn off what you don’t use and it goes from the portal</span></div>
        {HAS.map((h) => {
          const on = b.has[h.key];
          return (
            <div key={h.key} className="ps-kv">
              <span className="t"><b>{h.label}</b><span>{h.what}</span></span>
              <button
                type="button" role="switch" aria-checked={on} aria-label={h.label} id={`has-${h.key}`}
                className={`ps-toggle${on ? " on" : ""}`} disabled={!canEdit}
                onClick={() => setB({ ...b, has: { ...b.has, [h.key]: !on } })}
              >
                <i />
              </button>
            </div>
          );
        })}
        {canEdit ? (
          <div className="ps-foot">
            <button type="button" className="ps-btn" onClick={save} disabled={!dirty || busy}>{busy ? "Saving…" : "Save"}</button>
            {said && <span className={`ps-said${said.ok ? "" : " bad"}`} role="status">{said.text}</span>}
          </div>
        ) : (
          <p className="ps-lock">Only an admin can change these.</p>
        )}
      </div>
    </>
  );
}
