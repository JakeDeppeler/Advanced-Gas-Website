"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSound, playOnTv, renameSound, saveSounds, uploadSound, type SoundResult } from "@/app/portal/board/sounds/actions";
import { previewSound } from "@/components/screen/cheer";
import { BUILTINS, MAX_VOLUME, pct, SOUND_KINDS, type SoundKind, type SoundPlan } from "@/lib/board/soundTypes";

export type ListedSound = { id: string; name: string; bytes: number; seconds: number | null; addedBy: string | null; addedAt: string };

/** What the board measured each built-in clip at. Kept beside them in public/sounds/README.md. */
const BUILTIN_SECONDS: Record<string, number> = { "builtin:quote": 0.7, "builtin:sold": 6.5 };

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** How long an MP3 runs, worked out in the browser before it's sent, so the page can warn about one that outlasts its pop-up. */
async function measure(file: File): Promise<number | null> {
  try {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    const ctx = new C();
    const buf = await ctx.decodeAudioData(await file.arrayBuffer());
    void ctx.close();
    return buf.duration;
  } catch {
    return null;
  }
}

export function BoardSounds({ plan: saved, files }: { plan: SoundPlan; files: ListedSound[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [plan, setPlan] = useState<SoundPlan>(saved);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; at: "plan" | "files" } | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const dirty = JSON.stringify(plan) !== JSON.stringify(saved);
  // When what's saved changes underneath — a used sound deleted — the page follows it.
  const savedKey = JSON.stringify(saved);
  useEffect(() => { setPlan(JSON.parse(savedKey) as SoundPlan); }, [savedKey]);

  const run = (at: "plan" | "files", fn: () => Promise<SoundResult>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: r.ok ? r.note ?? "Done." : r.error ?? "Couldn't do that.", at });
      if (r.ok) after?.();
      router.refresh();
    });

  const secondsOf = (ref: string) => (ref.startsWith("file:") ? files.find((f) => `file:${f.id}` === ref)?.seconds ?? null : BUILTIN_SECONDS[ref] ?? null);
  const nameOf = (ref: string) =>
    ref === "off" ? "No sound" : ref === "notes" ? "Short beeps" : BUILTINS.find((b) => b.ref === ref)?.name ?? files.find((f) => `file:${f.id}` === ref)?.name ?? "—";
  const usedBy = (id: string) => SOUND_KINDS.filter((k) => saved[k.kind].sound === `file:${id}`).map((k) => k.label);

  const hear = (kind: SoundKind, ref: string, volume: number) => {
    stopRef.current?.();
    stopRef.current = previewSound(kind, ref, volume);
  };

  /* ------------------------------------------------------------- upload */
  const fileRef = useRef<HTMLInputElement>(null);
  const [upName, setUpName] = useState("");
  const [picked, setPicked] = useState<{ file: File; seconds: number | null } | null>(null);
  const pick = async (f: File | null) => {
    if (!f) return setPicked(null);
    setPicked({ file: f, seconds: await measure(f) });
    if (!upName) setUpName(f.name.replace(/\.mp3$/i, ""));
  };

  return (
    <div className="pt-snd">
      <section className="pt-panel" aria-labelledby="snd-pop-h">
        <h2 id="snd-pop-h" className="pt-panel__h">The pop-ups</h2>
        <p className="pt-panel__sub">
          Pick what each one plays and how loud. Recordings come in at different loudness, so turn the loud ones down
          and the quiet ones up until they sit together. 100% is the file as recorded.
        </p>
        <div className="pt-snd__cards">
          {SOUND_KINDS.map(({ kind, label, when, holdSec }) => {
            const c = plan[kind];
            const secs = secondsOf(c.sound);
            const long = secs != null && secs > holdSec;
            return (
              <section key={kind} className="pt-snd__card" aria-labelledby={`snd-${kind}`}>
                <h3 id={`snd-${kind}`}>{label}</h3>
                <p className="pt-snd__when">{when} · on screen {holdSec} seconds</p>
                <label className="pt-field"><span>Sound</span>
                  <select id={`snd-${kind}-sound`} value={c.sound} onChange={(e) => setPlan((p) => ({ ...p, [kind]: { ...p[kind], sound: e.target.value } }))}>
                    <optgroup label="Built in">
                      {BUILTINS.map((b) => <option key={b.ref} value={b.ref}>{b.name}</option>)}
                    </optgroup>
                    {files.length > 0 && (
                      <optgroup label="Uploaded">
                        {files.map((f) => <option key={f.id} value={`file:${f.id}`}>{f.name}</option>)}
                      </optgroup>
                    )}
                    <optgroup label="Other">
                      <option value="notes">Short beeps</option>
                      <option value="off">No sound</option>
                    </optgroup>
                  </select>
                </label>
                <div className="pt-field">
                  <span className="pt-snd__volhead">
                    <label htmlFor={`snd-${kind}-vol`}>Volume</label>
                    <strong>{c.sound === "off" ? "—" : pct(c.volume)}</strong>
                  </span>
                  <input
                    id={`snd-${kind}-vol`} type="range" min={0} max={MAX_VOLUME * 100} step={5}
                    value={Math.round(c.volume * 100)} disabled={c.sound === "off"}
                    onChange={(e) => setPlan((p) => ({ ...p, [kind]: { ...p[kind], volume: Number(e.target.value) / 100 } }))}
                    aria-valuetext={pct(c.volume)}
                  />
                  <span className="pt-snd__scale" aria-hidden="true"><span>Off</span><span>100%</span><span>{pct(MAX_VOLUME)}</span></span>
                </div>
                {c.volume > 1 && c.sound !== "off" && <p className="pt-snd__warn">Above 100% is louder than the file — a loud clip can crackle.</p>}
                {long && <p className="pt-snd__warn">This clip runs {secs?.toFixed(1)}s and the pop-up shows for {holdSec}s, so the end is cut off.</p>}
                <div className="pt-snd__play">
                  <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" disabled={c.sound === "off"} onClick={() => hear(kind, c.sound, c.volume)}>
                    ▶ Play here
                  </button>
                  <button
                    type="button" className="pt-btn pt-btn--ghost pt-btn--sm" disabled={pending || dirty}
                    title={dirty ? "Save first — the TV plays what's saved" : undefined}
                    onClick={() => run("plan", () => playOnTv(kind))}
                  >
                    Play on the TV
                  </button>
                </div>
              </section>
            );
          })}
        </div>
        <div className="pt-snd__save">
          <button type="button" className="pt-btn pt-btn--orange" disabled={pending || !dirty} onClick={() => run("plan", () => saveSounds(plan))}>
            {pending ? "Saving…" : "Save"}
          </button>
          {dirty && <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setPlan(saved)}>Undo changes</button>}
          {msg?.at === "plan" && <p className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`} role="status">{msg.text}</p>}
          {!msg && dirty && <p className="pt-inline">Not saved yet — the TV still plays the old choice.</p>}
        </div>
      </section>

      <section className="pt-panel" aria-labelledby="snd-files-h">
        <h2 id="snd-files-h" className="pt-panel__h">Your sounds</h2>
        <p className="pt-panel__sub">
          Upload an MP3 and it&rsquo;s ready to pick above. Keep it shorter than the pop-up it&rsquo;s for, and use something
          you have the right to use — a royalty-free clip, or one you recorded.
        </p>
        <form
          className="pt-snd__up"
          onSubmit={(e) => {
            e.preventDefault();
            if (!picked) return;
            const fd = new FormData();
            fd.set("file", picked.file);
            fd.set("name", upName);
            if (picked.seconds != null) fd.set("seconds", String(picked.seconds));
            run("files", () => uploadSound(fd), () => { setPicked(null); setUpName(""); if (fileRef.current) fileRef.current.value = ""; });
          }}
        >
          <label className="pt-field"><span>MP3 file</span>
            <input ref={fileRef} id="snd-file" type="file" accept=".mp3,audio/mpeg" onChange={(e) => void pick(e.target.files?.[0] ?? null)} />
          </label>
          <label className="pt-field"><span>Call it</span>
            <input id="snd-name" value={upName} onChange={(e) => setUpName(e.target.value)} maxLength={80} placeholder="Air horn" />
          </label>
          <button type="submit" className="pt-btn pt-btn--navy pt-btn--sm" disabled={pending || !picked}>Upload</button>
          {picked && (
            <p className="pt-snd__picked">
              {kb(picked.file.size)}{picked.seconds != null ? ` · ${picked.seconds.toFixed(1)} seconds` : " · couldn't read its length"}
            </p>
          )}
        </form>
        {msg?.at === "files" && <p className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`} role="status">{msg.text}</p>}

        {files.length ? (
          <ul className="pt-snd__files">
            {files.map((f) => <FileRow key={f.id} f={f} usedBy={usedBy(f.id)} pending={pending} run={run} hear={() => hear("sold", `file:${f.id}`, 1)} />)}
          </ul>
        ) : (
          <p className="pt-todo__empty">Nothing uploaded yet. The pop-ups play the built-in sounds until you pick something else.</p>
        )}
        <p className="pt-snd__now">
          Playing now: {SOUND_KINDS.map((k) => `${k.label} — ${nameOf(saved[k.kind].sound)}${saved[k.kind].sound === "off" ? "" : ` at ${pct(saved[k.kind].volume)}`}`).join(" · ")}
        </p>
      </section>
    </div>
  );
}

function FileRow({ f, usedBy, pending, run, hear }: {
  f: ListedSound; usedBy: string[]; pending: boolean;
  run: (at: "plan" | "files", fn: () => Promise<SoundResult>, after?: () => void) => void;
  hear: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(f.name);
  return (
    <li className="pt-snd__file">
      <div className="pt-snd__fileinfo">
        {renaming ? (
          <form className="pt-snd__rename" onSubmit={(e) => { e.preventDefault(); run("files", () => renameSound(f.id, name), () => setRenaming(false)); }}>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-label="Name" autoFocus />
            <button type="submit" className="pt-btn pt-btn--navy pt-btn--sm" disabled={pending}>Save</button>
            <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => { setName(f.name); setRenaming(false); }}>Cancel</button>
          </form>
        ) : (
          <strong>{f.name}</strong>
        )}
        <span className="pt-snd__meta">
          {f.seconds != null ? `${f.seconds.toFixed(1)}s` : "length unknown"} · {kb(f.bytes)}
          {f.addedBy ? ` · added by ${f.addedBy.split(" ")[0]}` : ""}
        </span>
        {usedBy.length > 0 && <span className="pt-snd__used">Plays on {usedBy.join(", ")}</span>}
      </div>
      {!renaming && (
        <div className="pt-snd__fileacts">
          <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={hear}>▶ Play</button>
          <button type="button" className="pt-todo__editbtn" onClick={() => setRenaming(true)}>Rename</button>
          <button
            type="button" className="pt-todo__remove" disabled={pending}
            onClick={() => {
              const warn = usedBy.length ? ` ${usedBy.join(" and ")} will go back to the built-in sound.` : "";
              if (confirm(`Delete "${f.name}"?${warn}`)) run("files", () => deleteSound(f.id));
            }}
          >
            Delete
          </button>
        </div>
      )}
    </li>
  );
}
