"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveWeek } from "@/app/trade/me/actions";
import { ORDINARY_DAY, dayHours, hrs, weekTotals, type TimesheetDays } from "@/lib/portal/peopleParts";

/**
 * A week of start and finish times. Hours are worked out, never typed: a
 * half-hour lunch comes off any day over five hours, and anything past the
 * award's 7.6-hour day is overtime.
 */
export function TimesheetWeek({ weekOf, dates, initial, submittedAt, otMult }: {
  weekOf: string;
  dates: string[];
  initial: TimesheetDays;
  submittedAt: string | null;
  otMult: number | null;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [days, setDays] = useState<TimesheetDays>(initial);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);
  const [sent, setSent] = useState(submittedAt);
  const t = weekTotals(days);
  const set = (d: string, k: "start" | "finish" | "note", v: string) => setDays((s) => ({ ...s, [d]: { ...s[d], [k]: v } }));

  function save(submit: boolean) {
    setMsg(null);
    start(async () => {
      const res = await saveWeek({ weekOf, days, submit });
      if (!res.ok) { setMsg({ text: res.error || "Couldn't save." }); return; }
      if (submit) setSent(new Date().toISOString());
      setMsg({ ok: true, text: submit ? "Sent to the office." : "Saved. Send it when the week's done." });
      router.refresh();
    });
  }

  const label = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", weekday: "short", day: "numeric" });

  return (
    <>
      <div className="tr-grid tr-grid--3">
        <div className="tr-card tr-fig"><span>This week</span><strong>{hrs(t.total)}</strong><em>{label(dates[0])} – {label(dates[dates.length - 1])}</em></div>
        <div className="tr-card tr-fig"><span>Ordinary</span><strong>{hrs(t.ordinary)}</strong><em>{ORDINARY_DAY} hrs a day</em></div>
        <div className={`tr-card tr-fig${t.overtime > 0 ? " is-warn" : ""}`}><span>Overtime</span><strong>{hrs(t.overtime)}</strong><em>{otMult ? `at ${otMult}×` : "rate set by your manager"}</em></div>
      </div>

      <div className="tr-split" style={{ ["--tr-side" as string]: "300px" }}>
        <section className="tr-card tr-scroll">
          <table className="tr-table">
            <thead><tr><th>Day</th><th>Start</th><th>Finish</th><th>Hours</th><th>Note</th></tr></thead>
            <tbody>
              {dates.map((d) => {
                const h = dayHours(days[d]);
                const late = h != null && h > ORDINARY_DAY;
                return (
                  <tr key={d}>
                    <td style={{ fontWeight: 800, whiteSpace: "nowrap" }}>{label(d)}</td>
                    <td><input value={days[d]?.start ?? ""} onChange={(e) => set(d, "start", e.target.value)} placeholder="7:00am" aria-label={`${label(d)} start`} /></td>
                    <td><input value={days[d]?.finish ?? ""} onChange={(e) => set(d, "finish", e.target.value)} placeholder="3:30pm" aria-label={`${label(d)} finish`} /></td>
                    <td style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{h == null ? "—" : h.toFixed(2)}</td>
                    <td>
                      <input value={days[d]?.note ?? ""} onChange={(e) => set(d, "note", e.target.value)} placeholder={late ? "Late finish" : ""} aria-label={`${label(d)} note`} style={{ width: 130, color: late ? "var(--tr-orange-ink)" : undefined }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <aside className="tr-card tr-card--navy tr-stack" style={{ gap: 12 }}>
          <h2 style={{ color: "#fff" }}>Send your week</h2>
          <p className="tr-muted">{sent ? `Sent ${new Date(sent).toLocaleString("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", hour: "numeric", minute: "2-digit" })}. Changes resend it.` : `Overtime at ${otMult ?? 1.5}× past ${ORDINARY_DAY} hrs a day.`}</p>
          {msg && <p className={msg.ok ? "tr-note tr-note--good" : "tr-note tr-note--warn"} role="status">{msg.text}</p>}
          <button type="button" className="tr-btn tr-btn--go tr-btn--block" disabled={busy} onClick={() => save(true)}>{busy ? "Saving…" : sent ? "Send the changes" : "Submit the week"}</button>
          {!sent && <button type="button" className="tr-btn tr-btn--ghost-light tr-btn--block" disabled={busy} onClick={() => save(false)}>Save for later</button>}
          <Link href="/trade/me" className="tr-btn tr-btn--ghost-light tr-btn--block">Leave and RDOs</Link>
        </aside>
      </div>
    </>
  );
}
