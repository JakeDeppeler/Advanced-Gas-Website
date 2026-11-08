"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Change = { id: number; name: string; group: string; target: number; cost: number; setCost?: number; was: number; price: number };
type Done = Record<string, { at: string; ok: boolean; detail?: string }>;
type Result = { id: number; ok: boolean; detail?: string };

const SLICE = 10;
const money = (n: number) => `$${n.toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
const cents = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (price: number, cost: number) => `${Math.round((price / cost - 1) * 100)}%`;

/**
 * Equipment price changes worked out from each brand's markup on cost ex GST,
 * shown brand by brand before anything moves, then written to the ServiceTitan
 * pricebook a slice at a time. What's already done is skipped, so pressing
 * again after a stop carries on.
 */
export function EquipmentPricePlan({ title, changes, done: initial }: { title: string; changes: Change[]; done: Done }) {
  const router = useRouter();
  const [done, setDone] = useState<Done>(initial);
  const [busy, setBusy] = useState<{ n: number; of: number } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; lines?: string[] } | null>(null);

  const todo = changes.filter((c) => !done[String(c.id)]?.ok);
  const failed = changes.filter((c) => done[String(c.id)] && !done[String(c.id)].ok);
  const groups = useMemo(() => {
    const m = new Map<string, Change[]>();
    for (const c of changes) (m.get(c.group) ?? m.set(c.group, []).get(c.group)!).push(c);
    return [...m.entries()];
  }, [changes]);
  const added = changes.reduce((t, c) => t + c.price - c.was, 0);

  async function go() {
    if (!todo.length) return;
    if (!confirm(`Change ${todo.length} equipment price${todo.length === 1 ? "" : "s"} in the ServiceTitan pricebook? New quotes use them straight away; quotes already sent keep their prices.`)) return;
    setMsg(null);
    const results: Result[] = [];
    setBusy({ n: 0, of: todo.length });
    try {
      for (let i = 0; i < todo.length; i += SLICE) {
        const res = await fetch("/api/portal/pricebook/equipment-plan", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: todo.slice(i, i + SLICE).map((c) => c.id) }),
        });
        const r = (await res.json().catch(() => ({}))) as { ok?: boolean; results?: Result[]; error?: string };
        if (!res.ok || !r.ok) throw new Error(r.error || "ServiceTitan didn’t answer.");
        results.push(...(r.results ?? []));
        const at = new Date().toISOString();
        setDone((d) => ({ ...d, ...Object.fromEntries((r.results ?? []).map((x) => [String(x.id), { at, ok: x.ok, detail: x.detail }])) }));
        setBusy({ n: Math.min(todo.length, i + SLICE), of: todo.length });
        // Every one of the first slice failing is one cause (a permission); stop rather than repeat it.
        if (i === 0 && results.length && results.every((x) => !x.ok)) break;
      }
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
    setBusy(null);
    const bad = results.filter((r) => !r.ok);
    if (results.length) setMsg((m) => m ?? {
      ok: !bad.length,
      text: `${results.length - bad.length} price${results.length - bad.length === 1 ? "" : "s"} updated${bad.length ? ` · ${bad.length} didn’t` : ""}.`,
      lines: bad.slice(0, 4).map((b) => `${changes.find((c) => c.id === b.id)?.name}: ${b.detail ?? ""}`),
    });
    router.refresh();
  }

  return (
    <section className="pt-panel rb">
      <h2 className="pt-panel__h">Equipment prices: {title}</h2>
      <p className="pt-loc__lede">
        {changes.length} items change, each to its brand&rsquo;s markup on cost ex GST, rounded up to $10. Nothing goes down;
        Reclaim splits are left as they are. About {money(added)} more if one of each sold.
        {Object.values(done).some((d) => d.ok) ? <> <b>{changes.filter((c) => done[String(c.id)]?.ok).length} done so far.</b></> : null} Nothing changes until you press the button.
      </p>
      <div className="rb-bar">
        <button type="button" className="pk-btn" disabled={!!busy || !todo.length} onClick={go}>
          {busy ? `Updating… ${busy.n} of ${busy.of}` : todo.length ? `Update ${todo.length} price${todo.length === 1 ? "" : "s"} in ServiceTitan` : "All updated"}
        </button>
        {failed.length > 0 && !busy && <span className="rb-bad">{failed.length} didn&rsquo;t update: press again to retry</span>}
      </div>
      {msg && (
        <div className={`pt-note${msg.ok ? "" : " pt-note--warn"}`} role="status">
          {msg.text}
          {msg.lines?.map((l) => <div key={l}>{l}</div>)}
        </div>
      )}
      <div className="rb-days">
        {groups.map(([g, list]) => (
          <details key={g} className="rb-day">
            <summary><b>{g}</b><span>{list[0].target}% · {list.length} item{list.length === 1 ? "" : "s"}</span></summary>
            <table className="rb-t">
              <tbody>
                {list.map((c) => {
                  const st = done[String(c.id)];
                  return (
                    <tr key={c.id}>
                      <td><b>{c.name}</b>{c.setCost != null ? <div className="was">cost fixed to {cents(c.setCost)} ex GST</div> : null}</td>
                      <td className="ep-p">{money(c.was)} → <b>{money(c.price)}</b><div className="was">{pct(c.price, c.cost)} on {cents(c.cost)}</div></td>
                      <td className="st">{st ? (st.ok ? <span title={st.detail}>✓ updated</span> : <span className="rb-bad" title={st.detail}>didn&rsquo;t update</span>) : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </details>
        ))}
      </div>
    </section>
  );
}
