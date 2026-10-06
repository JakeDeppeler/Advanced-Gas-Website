"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildLocations, EMPTY_DEFAULTS, FIELDS, guessColumns, parseCsv, statusValues,
  type ColumnMap, type Defaults, type FieldKey,
} from "@/lib/locations/csv";
import type { ImportLocation, StatusTag } from "@/lib/locations/stLocations";

type Row = { name: string; state: "new" | "exists" | "double"; match?: { id: number; name: string } };
type Preview = { customer: { name: string }; existing: number; rows: Row[]; missingTags: string[]; forList?: ImportLocation[] };
type Failure = { name: string; error?: string };

async function call<T>(body: Record<string, unknown>): Promise<T & { ok: boolean; error?: string }> {
  const res = await fetch("/api/portal/locations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const r = (await res.json().catch(() => ({ ok: false, error: "The server didn’t answer properly." }))) as T & { ok: boolean; error?: string };
  if (!res.ok || !r.ok) throw new Error(r.error || `Failed (${res.status}).`);
  return r;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Upload a CSV of units, map its columns, preview it against the customer's
 * live locations, then save it and run the import: create → contacts → notes →
 * tags → a second tag pass 30 s later as the check. Every step is safe to run
 * again, so "Run again" finishes anything a failure stopped.
 */
export function LocationImporter({
  customerId, tagNames, saved,
}: {
  customerId: number;
  tagNames: string[];
  saved: { count: number; savedAt: string | null; savedBy: string | null } | null;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<string | null>(null);
  const [header, setHeader] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [map, setMap] = useState<ColumnMap>({});
  const [d, setD] = useState<Defaults>(EMPTY_DEFAULTS);
  const [statusTag, setStatusTag] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Preview | null>(null);
  const [adopt, setAdopt] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [failures, setFailures] = useState<Failure[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const statuses = useMemo(() => statusValues(rows, map), [rows, map]);
  const built = useMemo(() => buildLocations(rows, map, d, statusTag), [rows, map, d, statusTag]);
  // ServiceTitan won't take a location without a street, suburb and postcode;
  // saying so before the preview beats a refusal at the end.
  const noAddress = built.locations.filter((l) => !l.address.street || !l.address.city || !l.address.zip).length;

  async function load(f: File) {
    setErr(null); setPreview(null); setLog([]); setFailures([]);
    const all = parseCsv(await f.text());
    if (all.length < 2) { setErr("That file has no rows under its header."); return; }
    const [h, ...rest] = all;
    const guess = guessColumns(h);
    setFile(f.name); setHeader(h); setRows(rest); setMap(guess);
    const st: Record<string, string> = {};
    for (const v of statusValues(rest, guess)) st[v.toLowerCase()] = "";
    setStatusTag(st);
  }

  async function doPreview() {
    setErr(null); setBusy(true);
    try {
      const statusTags: StatusTag[] = built.statusTags;
      const p = await call<Preview>({ action: "preview", customerId, locations: built.locations, statusTags });
      // Tied to the exact list it was made from: change a mapping afterwards and
      // the preview disappears rather than describing a list that isn't the one
      // that would be saved.
      setPreview({ ...p, forList: built.locations });
      // Default: a unit that already has a location under another name takes
      // that one over, so its history stays with it.
      setAdopt(Object.fromEntries(p.rows.filter((r) => r.state === "double").map((r) => [r.name, true])));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const say = (line: string) => setLog((l) => [...l, line]);

  async function paged(action: "contacts" | "notes" | "tags", label: string): Promise<{ changed: number; failed: Failure[] }> {
    let from: number | null = 0;
    let changed = 0;
    const failed: Failure[] = [];
    while (from != null) {
      const r: { changed: number; failed: Failure[]; next: number | null } = await call({ action, customerId, from, limit: 50 });
      changed += r.changed;
      failed.push(...r.failed);
      from = r.next;
      setLog((l) => [...l.slice(0, -1), `${label}: ${from ?? "all"} checked, ${changed} changed`]);
    }
    return { changed, failed };
  }

  async function run(saveFirst: boolean) {
    setErr(null); setBusy(true); setLog([]); setFailures([]);
    const failed: Failure[] = [];
    try {
      if (saveFirst) {
        const byName = new Map((current?.rows ?? []).map((r) => [r.name, r]));
        const locations: ImportLocation[] = built.locations.map((l) => {
          const r = byName.get(l.name);
          return r?.state === "double" && adopt[l.name] && r.match ? { ...l, adoptId: r.match.id } : l;
        });
        say("Saving the list…");
        await call({ action: "save", customerId, locations, statusTags: built.statusTags });
        setLog((l) => [...l.slice(0, -1), `Saved ${locations.length} locations.`]);
      }

      say("Creating locations…");
      let created = 0;
      for (let round = 0; round < 60; round++) {
        const r: { done: number; remaining: number; failed: Failure[] } = await call({ action: "create", customerId, limit: 50 });
        created += r.done;
        failed.push(...r.failed);
        setLog((l) => [...l.slice(0, -1), `Created or took over ${created}; ${r.remaining} to go.`]);
        if (r.failed.length) throw new Error("Stopped creating: fix the failures below, then Run again.");
        if (r.remaining === 0) break;
      }

      say("Contacts…");
      failed.push(...(await paged("contacts", "Contacts")).failed);
      say("Notes…");
      failed.push(...(await paged("notes", "Notes")).failed);
      say("Tags…");
      failed.push(...(await paged("tags", "Tags")).failed);

      // ServiceTitan's reads lag its writes, so the tags are checked by a
      // second pass once it has caught up rather than read back straight away.
      say("Waiting 30 s, then checking the tags…");
      await sleep(30_000);
      setLog((l) => l.slice(0, -1));
      say("Check…");
      const check = await paged("tags", "Check");
      failed.push(...check.failed);
      say(check.changed === 0 ? "Check: every location has the right tags." : `Check still changed ${check.changed} — run again; if it keeps happening, tell Jake.`);
      say(failed.length ? `Finished with ${failed.length} failures.` : "Done.");
      setPreview(null);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setFailures(failed);
      setBusy(false);
    }
  }

  const current = preview && preview.forList === built.locations ? preview : null;
  const counts = current
    ? {
      new: current.rows.filter((r) => r.state === "new").length,
      exists: current.rows.filter((r) => r.state === "exists").length,
      double: current.rows.filter((r) => r.state === "double").length,
    }
    : null;

  return (
    <section className="pt-panel">
      <h2 className="pt-panel__h">Load a list</h2>
      <p className="pt-loc__lede">
        A CSV with one row per unit — in Excel, <em>File → Save As → CSV</em>. Colour coding doesn’t survive that, so put
        service status in a column of its own.
      </p>

      <input ref={input} type="file" accept=".csv,text/csv" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void load(f); e.target.value = ""; }} />
      <div className="pt-loc__bar">
        <button type="button" className="pt-btn pt-btn--ghost" disabled={busy} onClick={() => input.current?.click()}>
          {file ? "Choose a different file" : "Choose a CSV"}
        </button>
        {file && <span className="pt-loc__muted">{file} · {rows.length} rows</span>}
        {saved && !file && (
          <button type="button" className="pt-btn pt-btn--navy" disabled={busy} onClick={() => void run(false)}>
            Run again on the saved list ({saved.count})
          </button>
        )}
      </div>

      {file && (
        <>
          <h3 className="pt-loc__h">Which column is which</h3>
          <div className="pt-veh__addgrid pt-loc__grid">
            {FIELDS.map((f) => (
              <label key={f.key} className="pt-field">
                <span>{f.label}</span>
                <select
                  value={map[f.key as FieldKey] ?? ""}
                  onChange={(e) => setMap((m) => ({ ...m, [f.key]: e.target.value === "" ? undefined : Number(e.target.value) }))}
                >
                  <option value="">—</option>
                  {header.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                </select>
                {"hint" in f && f.hint ? <small className="pt-loc__hint">{f.hint}</small> : null}
              </label>
            ))}
          </div>

          <h3 className="pt-loc__h">The same for every row <em>(used where the column is empty or not mapped)</em></h3>
          <div className="pt-veh__addgrid pt-loc__grid">
            <label className="pt-field"><span>Street</span><input value={d.street} onChange={(e) => setD({ ...d, street: e.target.value })} placeholder="e.g. 12 Example Road" /></label>
            <label className="pt-field"><span>Suburb</span><input value={d.city} onChange={(e) => setD({ ...d, city: e.target.value })} placeholder="e.g. Pakenham" /></label>
            <label className="pt-field"><span>State</span><input value={d.state} onChange={(e) => setD({ ...d, state: e.target.value })} /></label>
            <label className="pt-field"><span>Postcode</span><input value={d.zip} onChange={(e) => setD({ ...d, zip: e.target.value })} inputMode="numeric" /></label>
            <label className="pt-field"><span>Contact name / role</span><input value={d.contactName} onChange={(e) => setD({ ...d, contactName: e.target.value })} placeholder="e.g. Village office" /></label>
            <label className="pt-field"><span>Contact email</span><input value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} type="email" /></label>
            <label className="pt-field"><span>Contact phone</span><input value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} type="tel" /></label>
            <label className="pt-field"><span>Name prefix</span><input value={d.namePrefix} onChange={(e) => setD({ ...d, namePrefix: e.target.value })} /><small className="pt-loc__hint">Before the unit number: Unit 001</small></label>
            <label className="pt-field pt-loc__check"><input type="checkbox" checked={d.pad} onChange={(e) => setD({ ...d, pad: e.target.checked })} /><span>Pad unit numbers (7 → 007)</span></label>
          </div>

          {statuses.length > 0 && (
            <>
              <h3 className="pt-loc__h">Service status → ServiceTitan tag <em>(blank for no tag)</em></h3>
              <datalist id="pt-loc-tags">{tagNames.map((t) => <option key={t} value={t} />)}</datalist>
              <div className="pt-veh__addgrid pt-loc__grid">
                {statuses.map((s) => (
                  <label key={s} className="pt-field">
                    <span>“{s}”</span>
                    <input list="pt-loc-tags" value={statusTag[s.toLowerCase()] ?? ""} onChange={(e) => setStatusTag((m) => ({ ...m, [s.toLowerCase()]: e.target.value }))} placeholder="Tag name, exactly as in ServiceTitan" />
                  </label>
                ))}
              </div>
            </>
          )}

          <div className="pt-loc__bar">
            <button type="button" className="pt-btn pt-btn--navy" disabled={busy || !built.locations.length || noAddress > 0} onClick={() => void doPreview()}>
              Preview {built.locations.length} locations
            </button>
            {noAddress > 0 && (
              <span className="pt-inline is-err">
                {noAddress} {noAddress === 1 ? "has" : "have"} no street, suburb or postcode — map those columns or fill them in above.
              </span>
            )}
            {built.skipped > 0 && <span className="pt-loc__muted">{built.skipped} rows have no name or unit and are left out.</span>}
          </div>
        </>
      )}

      {current && counts && (
        <>
          <h3 className="pt-loc__h">Preview — {current.customer.name}</h3>
          <p className="pt-loc__muted">
            {counts.new} new · {counts.exists} already there (left as they are, tags and notes updated) · {counts.double} look like a unit
            the customer already has under another name. {current.existing} locations on the customer now.
          </p>
          {current.missingTags.length > 0 && (
            <div className="pt-note pt-note--warn">
              ServiceTitan has no tag called <strong>{current.missingTags.join("”, “")}</strong>. Create it under Settings → Tag Types,
              spelled exactly the same, before importing — the tag step stops otherwise.
            </div>
          )}
          <div className="pt-fleet__wrap pt-loc__scroll">
            <table className="pt-fleet pt-otab">
              <thead><tr><th>Location</th><th>Address</th><th>Tags</th><th>Notes</th><th>What happens</th></tr></thead>
              <tbody>
                {current.rows.map((r, i) => {
                  const l = built.locations[i];
                  return (
                    <tr key={r.name}>
                      <td><strong>{r.name}</strong></td>
                      <td>{[l?.address.street, l?.address.city, l?.address.zip].filter(Boolean).join(", ")}</td>
                      <td>{l?.tags?.join(", ") || "—"}</td>
                      <td className="pt-loc__note">{l?.notes?.[0] || ""}</td>
                      <td>
                        {r.state === "new" && "Create"}
                        {r.state === "exists" && <span className="pt-loc__muted">Already there</span>}
                        {r.state === "double" && r.match && (
                          <select value={adopt[r.name] ? "adopt" : "new"} onChange={(e) => setAdopt((a) => ({ ...a, [r.name]: e.target.value === "adopt" }))}>
                            <option value="adopt">Use “{r.match.name}” (rename it)</option>
                            <option value="new">Create a new one anyway</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="pt-loc__bar pt-loc__go">
            <button type="button" className="pt-btn pt-btn--orange" disabled={busy} onClick={() => void run(true)}>
              Save and import into ServiceTitan
            </button>
          </div>
        </>
      )}

      {err && <p className="pt-inline is-err" role="alert">{err}</p>}
      {log.length > 0 && (
        <ol className="pt-loc__log" aria-live="polite">{log.map((l, i) => <li key={i}>{l}</li>)}</ol>
      )}
      {failures.length > 0 && (
        <div className="pt-fleet__wrap">
          <table className="pt-fleet pt-otab">
            <thead><tr><th>Location</th><th>What went wrong</th></tr></thead>
            <tbody>{failures.map((f, i) => <tr key={i}><td>{f.name}</td><td>{f.error}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
