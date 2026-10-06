"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Loc = { id: number; name: string; status: string | null; tags: string[] };

/**
 * Tick units, mark them serviced (or due, or vacant). Reads and writes
 * ServiceTitan's own tags, so what it shows is what the office sees there, and
 * a status set in ServiceTitan directly shows up here too.
 */
export function LocationStatusBoard({
  customerId, statuses, locations,
}: {
  customerId: number;
  statuses: { label: string; tag: string }[];
  locations: Loc[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [find, setFind] = useState("");
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const l of locations) c.set(l.status ?? "", (c.get(l.status ?? "") ?? 0) + 1);
    return c;
  }, [locations]);

  const shown = locations.filter(
    (l) =>
      (filter === "all" || (filter === "" ? !l.status : l.status === filter)) &&
      (!find.trim() || l.name.toLowerCase().includes(find.trim().toLowerCase())),
  );
  const allShownPicked = shown.length > 0 && shown.every((l) => picked.has(l.id));

  function toggle(id: number) {
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function mark(label: string) {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/portal/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", customerId, ids: [...picked], label }),
      });
      const r = (await res.json().catch(() => ({}))) as { ok?: boolean; changed?: number; failed?: { name: string; error?: string }[]; error?: string };
      if (!res.ok || !r.ok) throw new Error(r.error || "Couldn’t update.");
      const failed = r.failed ?? [];
      setMsg({
        ok: failed.length === 0,
        text: `${r.changed ?? 0} marked ${label.toLowerCase()}${failed.length ? ` · ${failed.length} failed: ${failed.slice(0, 3).map((f) => `${f.name} (${f.error})`).join("; ")}` : ""}.`,
      });
      setPicked(new Set());
      // ServiceTitan takes a moment to show its own writes; refreshing straight
      // away would show the old status and look like nothing happened.
      setTimeout(() => router.refresh(), 4000);
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="pt-panel">
      <h2 className="pt-panel__h">Service status</h2>
      <div className="pt-loc__bar">
        <div className="pt-seg" role="group" aria-label="Show">
          <button type="button" className={`pt-seg__b${filter === "all" ? " is-on" : ""}`} onClick={() => setFilter("all")}>All {locations.length}</button>
          {statuses.map((s) => (
            <button key={s.label} type="button" className={`pt-seg__b${filter === s.label ? " is-on" : ""}`} onClick={() => setFilter(s.label)}>
              {s.label} {counts.get(s.label) ?? 0}
            </button>
          ))}
          {(counts.get("") ?? 0) > 0 && (
            <button type="button" className={`pt-seg__b${filter === "" ? " is-on" : ""}`} onClick={() => setFilter("")}>No status {counts.get("")}</button>
          )}
        </div>
        <label className="pt-field pt-loc__find"><input type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a unit" aria-label="Find a unit" /></label>
      </div>

      <div className="pt-loc__bar pt-loc__actions">
        <span className="pt-loc__muted">{picked.size} ticked</span>
        {statuses.map((s) => (
          <button key={s.label} type="button" className="pt-btn pt-btn--sm pt-btn--navy" disabled={busy || picked.size === 0} onClick={() => void mark(s.label)}>
            Mark {s.label.toLowerCase()}
          </button>
        ))}
        {picked.size > 0 && <button type="button" className="pt-btn pt-btn--sm pt-btn--ghost" disabled={busy} onClick={() => setPicked(new Set())}>Clear</button>}
      </div>
      {msg && <p className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`} role="status">{msg.text}</p>}

      <div className="pt-fleet__wrap pt-loc__scroll">
        <table className="pt-fleet pt-otab">
          <thead>
            <tr>
              <th className="pt-loc__tick">
                <input
                  type="checkbox"
                  aria-label="Tick every unit shown"
                  checked={allShownPicked}
                  onChange={() => setPicked((p) => {
                    const n = new Set(p);
                    for (const l of shown) { if (allShownPicked) n.delete(l.id); else n.add(l.id); }
                    return n;
                  })}
                />
              </th>
              <th>Location</th><th>Status</th><th>Tags</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((l) => (
              <tr key={l.id} className={picked.has(l.id) ? "is-picked" : undefined}>
                <td className="pt-loc__tick"><input type="checkbox" checked={picked.has(l.id)} onChange={() => toggle(l.id)} aria-label={`Tick ${l.name}`} /></td>
                <td><strong>{l.name}</strong></td>
                <td>{l.status ?? <span className="pt-loc__muted">—</span>}</td>
                <td className="pt-loc__muted">{l.tags.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
