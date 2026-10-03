"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { answerOrder, answerReport, answerTool, decideLeave, readIncident, removeTool, saveTool } from "@/app/portal/vehicles/vanActions";
import {
  NEEDED_BY, PART_STATUS, REPORT_STATUS, TOOL_KINDS, TOOL_REQUEST, monthYear, partChip, reportChip, toolChip, toolState,
  type PartOrder, type PartStatus, type ReportStatus, type ToolKind, type VanReport, type VanTool,
} from "@/lib/portal/vanParts";
import { leaveLabel, type LeaveRequest, type Take5 } from "@/lib/portal/peopleParts";

/**
 * The office's side of the van screens: answering what the crew sent in.
 * Each answer is what the tech reads back on their own screen, so the
 * buttons are the words they'll see — "Booked in", "Ready to collect".
 */

function useAct() {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [err, setErr] = useState("");
  const run = (f: () => Promise<{ ok: boolean; error?: string }>) => start(async () => {
    setErr("");
    const r = await f();
    if (!r.ok) { setErr(r.error || "Couldn't save."); return; }
    router.refresh();
  });
  return { busy, err, run };
}

const Chip = ({ c }: { c: { label: string; tone: string } }) => <span className={`tr-chip tr-chip--${c.tone}`}>{c.label}</span>;

/* ---------------------------------------------------------------- reports */

export function ReportAnswer({ r, photos, canAnswer }: { r: VanReport; photos: { url: string | null; label: string | null }[]; canAnswer: boolean }) {
  const { busy, err, run } = useAct();
  const [note, setNote] = useState(r.statusNote ?? "");
  const set = (status: Exclude<ReportStatus, null>) => run(() => answerReport({ id: r.id, vehicleId: r.vehicleId, status, note }));
  const day = new Date(`${r.on}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
  return (
    <div className="tr-row" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
      <span className="tr-row__k" style={{ flex: "1 1 280px" }}>
        <span className="tr-kicker" style={{ fontSize: 12.5 }}>{r.kind === "damage" ? "Damage" : "Service"}{r.source === "weekly" ? " · from the weekly check" : ""}</span>
        <strong>{r.title}</strong>
        {r.detail && !r.detail.includes(r.title) && <span>{r.detail}</span>}
        <span>
          {[day, r.createdBy, r.area, r.drivable === false ? "NOT DRIVABLE" : r.drivable ? "still drivable" : null, r.thirdParty ? "someone else involved" : null].filter(Boolean).join(" · ")}
        </span>
        {photos.length > 0 && (
          <span style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {photos.map((p, i) => p.url
              // A signed storage link that expires in an hour: nothing for
              // next/image to cache or resize, so a plain thumbnail.
              // eslint-disable-next-line @next/next/no-img-element
              ? <a key={i} href={p.url} target="_blank" rel="noopener"><img src={p.url} alt={p.label ?? `Photo ${i + 1}`} style={{ width: 96, height: 72, objectFit: "cover", borderRadius: 10 }} /></a>
              : <span key={i} className="tr-chip">{p.label ?? "Photo"}</span>)}
          </span>
        )}
      </span>
      <span className="tr-stack tr-stack--sm" style={{ flex: "0 1 500px", alignItems: "flex-end" }}>
        {!canAnswer && <Chip c={reportChip(r)} />}
        {canAnswer && (
          <>
            <span className="tr-answer" role="group" aria-label="The office's answer">
              {REPORT_STATUS.map((s) => (
                <button key={s.k} type="button" disabled={busy} aria-pressed={r.status === s.k} className={r.status === s.k ? "is-on" : undefined} onClick={() => set(s.k)}>{s.label}</button>
              ))}
            </span>
            <input className="tr-input tr-answer__note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note they'll see, e.g. 14 Oct at Pakenham Tyres" aria-label="Note the tech sees" />
          </>
        )}
        {err && <span className="tr-note tr-note--warn">{err}</span>}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- orders */

export function OrderAnswer({ o, van, canAnswer }: { o: PartOrder; van?: string | null; canAnswer: boolean }) {
  const { busy, err, run } = useAct();
  const [note, setNote] = useState(o.statusNote ?? "");
  const set = (status: PartStatus) => run(() => answerOrder({ id: o.id, vehicleId: o.vehicleId, status, note }));
  return (
    <div className="tr-row" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
      <span className="tr-row__k" style={{ flex: "1 1 280px" }}>
        <strong>{o.lines.map((l) => `${l.item} ×${l.qty}`).join(", ")}</strong>
        <span>
          {[o.requestedBy, van, o.forWhat === "job" ? `for ${o.job}` : "restocking the van", o.deliver === "pickup" ? "they'll pick up from Reece" : "deliver to the factory",
            `needed ${NEEDED_BY.find((n) => n.k === o.neededBy)?.label.toLowerCase()}`].filter(Boolean).join(" · ")}
        </span>
        {o.note && <span style={{ fontStyle: "italic" }}>&ldquo;{o.note}&rdquo;</span>}
      </span>
      <span className="tr-stack tr-stack--sm" style={{ flex: "0 1 560px", alignItems: "flex-end" }}>
        {!canAnswer && <Chip c={partChip(o)} />}
        {canAnswer && (
          <>
            <span className="tr-answer" role="group" aria-label="The office's answer">
              {PART_STATUS.map((s) => (
                <button key={s.k} type="button" disabled={busy} aria-pressed={o.status === s.k} className={o.status === s.k ? "is-on" : undefined} onClick={() => set(s.k)}>{s.label}</button>
              ))}
            </span>
            <input className="tr-input tr-answer__note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note they'll see, e.g. Reece, Thursday" aria-label="Note the tech sees" />
          </>
        )}
        {err && <span className="tr-note tr-note--warn">{err}</span>}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- tools */

type ToolForm = { name: string; model: string; kind: ToolKind; boughtOn: string; lifeYears: string; lastDoneOn: string; lastDone: string; nextDueOn: string; nextDue: string };
const blank: ToolForm = { name: "", model: "", kind: "power", boughtOn: "", lifeYears: "", lastDoneOn: "", lastDone: "", nextDueOn: "", nextDue: "Test & tag" };
const toForm = (t: VanTool): ToolForm => ({
  name: t.name, model: t.model ?? "", kind: t.kind, boughtOn: t.boughtOn ?? "", lifeYears: t.lifeYears?.toString() ?? "",
  lastDoneOn: t.lastDoneOn ?? "", lastDone: t.lastDone ?? "", nextDueOn: t.nextDueOn ?? "", nextDue: t.nextDue ?? "",
});

function ToolFields({ f, set }: { f: ToolForm; set: (p: Partial<ToolForm>) => void }) {
  const field = (k: keyof ToolForm, label: string, type = "text", ph = "") => (
    <label className="tr-field" style={{ fontSize: 14 }}>
      {label}
      <input type={type} value={f[k]} onChange={(e) => set({ [k]: e.target.value })} placeholder={ph} style={{ minHeight: 44, fontSize: 16 }} />
    </label>
  );
  return (
    <div className="tr-grid tr-grid--3" style={{ gap: 10 }}>
      {field("name", "Tool", "text", "Vacuum pump")}
      {field("model", "Make & model", "text", "Navac NP6DLM")}
      <label className="tr-field" style={{ fontSize: 14 }}>
        Kind
        <select value={f.kind} onChange={(e) => set({ kind: e.target.value as ToolKind })} style={{ minHeight: 44, fontSize: 16 }}>
          {TOOL_KINDS.map((k) => <option key={k.k} value={k.k}>{k.label}</option>)}
        </select>
      </label>
      {field("boughtOn", "Bought", "date")}
      {field("lifeYears", "Lasts about (years)", "text", "6")}
      {field("lastDoneOn", "Last serviced or tagged", "date")}
      {field("nextDue", "Next due — what", "text", "Test & tag")}
      {field("nextDueOn", "Next due — when", "date")}
      {field("lastDone", "Last done — what", "text", "Serviced")}
    </div>
  );
}

export function ToolRegister({ vehicleId, tools, canEdit }: { vehicleId: string; tools: VanTool[]; canEdit: boolean }) {
  const { busy, err, run } = useAct();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [f, setF] = useState<ToolForm>(blank);
  const [reply, setReply] = useState<Record<string, string>>({});
  const today = new Date();

  const open = (t: VanTool | null) => { setEditing(t ? t.id : "new"); setF(t ? toForm(t) : blank); };
  const save = () => run(async () => {
    const r = await saveTool({
      vehicleId, id: editing && editing !== "new" ? editing : undefined,
      tool: { ...f, lifeYears: f.lifeYears.trim() ? Number(f.lifeYears) : null, boughtOn: f.boughtOn || null, lastDoneOn: f.lastDoneOn || null, nextDueOn: f.nextDueOn || null },
    });
    if (r.ok) setEditing(null);
    return r;
  });

  const asked = tools.filter((t) => t.request);

  return (
    <div className="tr-stack">
      {asked.length > 0 && (
        <section className="tr-card">
          <h2 style={{ paddingBottom: 4 }}>Asked about</h2>
          <div className="tr-rows">
            {asked.map((t) => (
              <div key={t.id} className="tr-row" style={{ flexWrap: "wrap" }}>
                <span className="tr-row__k" style={{ flex: "1 1 260px" }}>
                  <strong>{t.name} · {TOOL_REQUEST.find((r) => r.k === t.request)?.label}</strong>
                  <span>{[t.requestedBy, t.requestNote].filter(Boolean).join(" · ") || "No note"}</span>
                </span>
                {canEdit && (
                  <span style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <input className="tr-input" style={{ minHeight: 42, width: 220 }} value={reply[t.id] ?? t.reply ?? ""} onChange={(e) => setReply((s) => ({ ...s, [t.id]: e.target.value }))} placeholder="e.g. Booked 14 Oct" aria-label={`Answer about ${t.name}`} />
                    <button type="button" className="tr-btn tr-btn--sm" disabled={busy} onClick={() => run(() => answerTool({ id: t.id, vehicleId, reply: reply[t.id] ?? t.reply ?? "", done: false }))}>Send answer</button>
                    <button type="button" className="tr-btn tr-btn--sm tr-btn--navy" disabled={busy} onClick={() => run(() => answerTool({ id: t.id, vehicleId, reply: "", done: true }))}>Sorted</button>
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="tr-card">
        <div className="tr-card__h">
          <h2>On the van · {tools.length}</h2>
          {canEdit && editing === null && <button type="button" className="tr-btn tr-btn--sm tr-btn--go" onClick={() => open(null)}>+ Add a tool</button>}
        </div>
        {editing === "new" && (
          <div className="tr-stack tr-stack--sm" style={{ padding: "8px 0 16px" }}>
            <ToolFields f={f} set={(p) => setF((s) => ({ ...s, ...p }))} />
            <span style={{ display: "flex", gap: 8 }}>
              <button type="button" className="tr-btn tr-btn--sm tr-btn--go" disabled={busy} onClick={save}>Add it</button>
              <button type="button" className="tr-btn tr-btn--sm" onClick={() => setEditing(null)}>Cancel</button>
            </span>
          </div>
        )}
        <div className="tr-rows">
          {tools.map((t) => {
            const s = toolState(t, today);
            return editing === t.id ? (
              <div key={t.id} className="tr-stack tr-stack--sm" style={{ padding: "12px 0", borderTop: "1px solid var(--tr-line)" }}>
                <ToolFields f={f} set={(p) => setF((x) => ({ ...x, ...p }))} />
                <span style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="tr-btn tr-btn--sm tr-btn--go" disabled={busy} onClick={save}>Save</button>
                  <button type="button" className="tr-btn tr-btn--sm" onClick={() => setEditing(null)}>Cancel</button>
                  <button type="button" className="tr-btn tr-btn--sm" style={{ marginLeft: "auto" }} disabled={busy} onClick={() => { if (window.confirm(`Take ${t.name} off the register?`)) run(() => removeTool({ id: t.id, vehicleId })); }}>Remove</button>
                </span>
              </div>
            ) : (
              <div key={t.id} className="tr-row">
                <span className="tr-row__k">
                  <strong style={{ fontSize: 16.5 }}>{t.name}</strong>
                  <span>{[t.model, s.age, t.nextDueOn ? `${t.nextDue || "Due"} ${monthYear(t.nextDueOn)}` : null].filter(Boolean).join(" · ") || "No details yet"}</span>
                </span>
                <Chip c={toolChip(t, s)} />
                {canEdit && <button type="button" className="tr-btn tr-btn--sm" onClick={() => open(t)}>Edit</button>}
              </div>
            );
          })}
          {tools.length === 0 && editing !== "new" && <p className="tr-empty" style={{ padding: "8px 0" }}>Nothing on the register. Add each tool once — after that the tech can report it broken or due from their iPad.</p>}
        </div>
        {err && <p className="tr-note tr-note--warn">{err}</p>}
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------- people */

export function LeaveAnswer({ l }: { l: LeaveRequest }) {
  const { busy, err, run } = useAct();
  const d = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
  return (
    <div className="tr-row" style={{ flexWrap: "wrap" }}>
      <span className="tr-row__k" style={{ flex: "1 1 260px" }}>
        <strong>{l.userName} · {leaveLabel(l.kind)}</strong>
        <span>{d(l.from)}{l.to !== l.from ? ` – ${d(l.to)}` : ""}{l.note ? ` · “${l.note}”` : ""}</span>
      </span>
      <span style={{ display: "flex", gap: 8 }}>
        <button type="button" className="tr-btn tr-btn--sm tr-btn--navy" disabled={busy} onClick={() => run(() => decideLeave({ id: l.id, status: "approved" }))}>Approve</button>
        <button type="button" className="tr-btn tr-btn--sm" disabled={busy} onClick={() => run(() => decideLeave({ id: l.id, status: "declined" }))}>Decline</button>
      </span>
      {err && <span className="tr-note tr-note--warn">{err}</span>}
    </div>
  );
}

export function IncidentRead({ t }: { t: Take5 }) {
  const { busy, err, run } = useAct();
  return (
    <div className="tr-row" style={{ flexWrap: "wrap", alignItems: "flex-start" }}>
      <span className="tr-row__k" style={{ flex: "1 1 260px" }}>
        <strong>{t.userName}{t.job ? ` · ${t.job}` : ""}</strong>
        <span style={{ whiteSpace: "pre-wrap" }}>{t.detail}</span>
        <span>{new Date(t.createdAt).toLocaleString("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
      </span>
      {t.seenAt
        ? <span className="tr-chip tr-chip--good">Read by {t.seenBy ?? "the office"}</span>
        : <button type="button" className="tr-btn tr-btn--sm tr-btn--navy" disabled={busy} onClick={() => run(() => readIncident({ id: t.id }))}>Mark read</button>}
      {err && <span className="tr-note tr-note--warn">{err}</span>}
    </div>
  );
}
