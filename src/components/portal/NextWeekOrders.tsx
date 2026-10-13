"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addStock, approve, approveAll, cancel, choosePickup, findStock, holdForNextWeek, linesOrdered, orderHeldNow, orderedManually, redraft, removeStock, saveCc, saveDelivery, testSend, type ActionResult } from "@/app/portal/supply/next-week/actions";
import type { Hold, PoLine, StockItem } from "@/lib/ordering/db";
import type { PoWithLines } from "@/lib/ordering/db";
import { byJob, dayLabel, dayTimeLabel, neededBy, nextWeek, deliveryInstructionsFor, linesTotal, modelLooksLikeName, orderDelivery, todayMelbourne, workRef, type Problem, type Supplier } from "@/lib/ordering/plan";

/**
 * Supply › Next week: each supplier's draft order and each electrician visit,
 * to check and send. The button says what will actually happen — "Email
 * Mitsubishi with their form", "Mark ordered in maX" — because the office
 * should never be guessing whether pressing it sent something.
 */

const money = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const qty = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2))));
const when = (iso: string) => dayTimeLabel(iso);

function useAct() {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (f: () => Promise<ActionResult>) => start(async () => {
    setMsg(null);
    const r = await f();
    setMsg(r.ok ? (r.note ? { ok: true, text: r.note } : null) : { ok: false, text: r.error || "Couldn't do that." });
    router.refresh();
  });
  return { busy, msg, run };
}

function Status({ po }: { po: PoWithLines }) {
  if (po.status === "sent") return <span className="pt-vstat pt-vstat--ok">Sent{po.sent_at ? ` ${when(po.sent_at)}` : ""}</span>;
  if (po.status === "approved") return <span className="pt-vstat pt-vstat--warn">Sending…</span>;
  if (po.status === "cancelled") return <span className="pt-vstat pt-vstat--none">Cancelled</span>;
  return <span className="pt-vstat pt-vstat--bad">Draft — not sent</span>;
}

const sendLabel = (s: Supplier | undefined, pickup = false) => {
  if (!s) return "Approve";
  if (s.method === "reece_cart") return "Mark ordered in maX";
  if (s.method === "work_order") return "Email the work order";
  const how = pickup ? " — pick up" : "";
  if (s.method === "email_form") return `Email ${s.name} with their form${how}`;
  return `Email ${s.name}${how}`;
};

const howItGoes = (s: Supplier | undefined) => {
  if (!s) return "";
  // Nothing can put lines into a maX cart from outside — carts only come back
  // from Reece's site — so this one is entered by hand and ticked off here.
  if (s.method === "reece_cart") return "Enter these in Reece maX, then mark it ordered here.";
  const one = s.combine_orders ? " Every job from today to the end of next week is on this one order, so it comes in one delivery." : "";
  if (s.method === "email_form") return `Emailed to ${s.email} with Mitsubishi's order form filled in and attached.${one}`;
  if (s.method === "work_order") return `Emailed to ${s.email}.`;
  return `Emailed to ${s.email}.${one}`;
};

type DeliverySettings = { factoryInstructions?: string; deliveryNote?: string; pickupInstructions?: string };

/**
 * Delivered or picked up: two buttons, so it's one press either way and plain
 * which one an order is. Changes what the email, the form and the Reece list
 * say about getting it here.
 */
function PickupChoice({ po }: { po: PoWithLines }) {
  const { busy, msg, run } = useAct();
  return (
    <span className="pt-nw__seg" role="group" aria-label="Delivery or pick up">
      <button type="button" className={!po.pickup ? "is-on" : undefined} aria-pressed={!po.pickup} disabled={busy}
        onClick={() => po.pickup && run(() => choosePickup({ id: po.id, pickup: false }))}>Delivered</button>
      <button type="button" className={po.pickup ? "is-on" : undefined} aria-pressed={po.pickup} disabled={busy}
        onClick={() => !po.pickup && run(() => choosePickup({ id: po.id, pickup: true }))}>We&rsquo;ll pick up</button>
      {msg && !msg.ok && <span className="pt-inline is-err">{msg.text}</span>}
    </span>
  );
}

function Delivery({ po, delivery }: { po: PoWithLines; delivery: DeliverySettings }) {
  const { busy, msg, run } = useAct();
  const [open, setOpen] = useState(false);
  const [toSite, setToSite] = useState(po.delivery_to_site);
  const [address, setAddress] = useState(po.delivery_address ?? "");
  const [instructions, setInstructions] = useState(po.delivery_instructions ?? "");
  const editable = po.status === "draft";
  return (
    <div className="pt-nw__deliver">
      {editable && po.kind === "order" && <PickupChoice po={po} />}
      <span>
        {po.pickup
          ? <><strong>Pick up</strong> — we collect it</>
          : <><strong>Deliver to</strong> {po.delivery_address}{po.delivery_to_site && <span className="pt-nw__tag">Site delivery</span>}</>}
        {(() => {
          const said = deliveryInstructionsFor(po, delivery);
          return said ? <span className="pt-nw__muted"> · {said}</span> : null;
        })()}
        {po.kind === "order" && (() => {
          const d = orderDelivery(po.lines, todayMelbourne());
          return d ? <span> · <strong>{po.pickup ? "ready" : "by"} {d.label}</strong></span> : null;
        })()}
      </span>
      {editable && !open && !po.pickup && <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setOpen(true)}>Change</button>}
      {editable && open && (
        <div className="pt-nw__deliveredit">
          <label className="pt-nw__check">
            <input type="checkbox" checked={toSite} onChange={(e) => setToSite(e.target.checked)} /> Deliver straight to site
          </label>
          <input className="pt-nw__input" value={address} onChange={(e) => setAddress(e.target.value)} aria-label="Delivery address" />
          <input className="pt-nw__input" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder={toSite ? "Instructions, e.g. leave at side gate" : delivery.factoryInstructions || "Instructions"} aria-label="Delivery instructions" />
          {delivery.deliveryNote && <span className="pt-nw__muted">&ldquo;{delivery.deliveryNote}&rdquo; is added to every order.</span>}
          <span className="pt-nw__actions">
            <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" disabled={busy}
              onClick={() => run(async () => { const r = await saveDelivery({ id: po.id, toSite, address, instructions }); if (r.ok) setOpen(false); return r; })}>
              Save
            </button>
            <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setOpen(false)}>Close</button>
          </span>
        </div>
      )}
      {msg && <span className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`}>{msg.text}</span>}
    </div>
  );
}

/**
 * Who else gets a copy. The office address and the supplier's standing copies
 * (set on Supplier emails) always go; anyone added here is for this order only.
 */
function Cc({ po, supplier, alwaysCc }: { po: PoWithLines; supplier: Supplier | undefined; alwaysCc: string }) {
  const { busy, msg, run } = useAct();
  const [open, setOpen] = useState(false);
  const saved = (po.cc_emails ?? []).join(", ");
  const [cc, setCc] = useState(saved);
  if (!supplier || supplier.method === "reece_cart") return null;
  const fixed = [alwaysCc, ...(supplier.cc_emails ?? [])].filter(Boolean);
  const extra = po.cc_emails ?? [];
  const editable = po.status === "draft";
  return (
    <div className="pt-nw__deliver">
      <span>
        <strong>Copied to</strong> {[...fixed, ...extra].join(", ") || "nobody"}
      </span>
      {editable && !open && (
        <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setOpen(true)}>
          {extra.length ? "Change CC" : "Add CC"}
        </button>
      )}
      {editable && open && (
        <div className="pt-nw__deliveredit">
          <input className="pt-nw__input" value={cc} onChange={(e) => setCc(e.target.value)}
            placeholder="name@example.com, another@example.com" aria-label="Also copy in" />
          <span className="pt-nw__actions">
            <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" disabled={busy}
              onClick={() => run(async () => { const r = await saveCc({ id: po.id, cc }); if (r.ok) setOpen(false); return r; })}>
              Save
            </button>
            <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => { setCc(saved); setOpen(false); }}>Close</button>
          </span>
          <span className="pt-nw__muted">Just this {supplier.method === "work_order" ? "work order" : "order"}. {fixed.join(" and ")} {fixed.length === 1 ? "is" : "are"} always copied in.</span>
        </div>
      )}
      {msg && <span className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`}>{msg.text}</span>}
    </div>
  );
}

/**
 * Send this order's email — the same one, form and all — to any address, to
 * see it land. Doesn't send to the supplier or change the order.
 */
function TestSend({ po, testTo }: { po: PoWithLines; testTo: string }) {
  const { busy, msg, run } = useAct();
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(testTo);
  if (!open) {
    return (
      <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setOpen(true)}>
        Send a test
      </button>
    );
  }
  return (
    <div className="pt-nw__test">
      <label className="pt-nw__testlbl" htmlFor={`test-${po.id}`}>Send a test copy to</label>
      <input id={`test-${po.id}`} className="pt-nw__input" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@advancedgas.com.au" />
      <span className="pt-nw__actions">
        <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" disabled={busy || !to.trim()} onClick={() => run(() => testSend({ id: po.id, to }))}>
          {busy ? "Sending…" : "Send test"}
        </button>
        <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setOpen(false)}>Close</button>
      </span>
      <span className="pt-nw__muted">Marked TEST. The supplier gets nothing and the order stays as it is.</span>
      {msg && <span className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`}>{msg.text}</span>}
    </div>
  );
}

/** Already ordered by phone, online or over the counter: recorded, nothing emailed. */
function OrderedElsewhere({ po }: { po: PoWithLines }) {
  const { busy, msg, run } = useAct();
  const [open, setOpen] = useState(false);
  const [how, setHow] = useState("");
  if (!open) {
    return <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setOpen(true)}>Ordered another way</button>;
  }
  return (
    <div className="pt-nw__test">
      <label className="pt-nw__testlbl" htmlFor={`how-${po.id}`}>How was it ordered? (optional)</label>
      <input id={`how-${po.id}`} className="pt-nw__input" value={how} onChange={(e) => setHow(e.target.value)} placeholder="e.g. rang Rinnai, ref 44812" />
      <span className="pt-nw__actions">
        <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" disabled={busy} onClick={() => run(() => orderedManually({ id: po.id, how }))}>
          {busy ? "Saving…" : "Mark as ordered"}
        </button>
        <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setOpen(false)}>Close</button>
      </span>
      <span className="pt-nw__muted">Nothing is emailed. These lines count as ordered, so they won&rsquo;t be drafted again.</span>
      {msg && <span className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`}>{msg.text}</span>}
    </div>
  );
}

function Buttons({ po, supplier, testTo, label }: { po: PoWithLines; supplier: Supplier | undefined; testTo: string; label: string }) {
  const { busy, msg, run } = useAct();
  if (po.status !== "draft") {
    return po.status === "cancelled" ? null : <div className="pt-nw__foot"><span className="pt-nw__actions"><TestSend po={po} testTo={testTo} /></span></div>;
  }
  return (
    <div className="pt-nw__foot">
      {po.send_error && <p className="pt-note pt-note--warn" style={{ margin: 0 }}><strong>Last try didn&rsquo;t send:</strong> {po.send_error}</p>}
      <span className="pt-nw__actions">
        <button type="button" className="pt-btn pt-btn--orange" disabled={busy} onClick={() => run(() => approve(po.id))}>
          {busy ? "Working…" : sendLabel(supplier, po.pickup)}
        </button>
        <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" disabled={busy}
          onClick={() => { if (confirm(`Cancel ${label}? Nothing has been sent.`)) run(() => cancel(po.id)); }}>
          Cancel
        </button>
        <TestSend po={po} testTo={testTo} />
        {supplier?.method !== "reece_cart" && <OrderedElsewhere po={po} />}
      </span>
      {msg && <span className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`}>{msg.text}</span>}
    </div>
  );
}

/**
 * Under a line (or a whole job on the Reece list): it was already ordered
 * another way — it comes off the draft and counts as ordered — or leave it
 * for next week's order. One press each; the rest of the order stays as is.
 */
function LineActions({ po, lines, what }: { po: PoWithLines; lines: PoLine[]; what?: string }) {
  const { busy, msg, run } = useAct();
  const ids = lines.map((l) => l.id);
  const jobLines = lines.filter((l) => l.job_id != null && !l.manual);
  // Held until next week's ordering — say so if that's too late for the install.
  const until = nextWeek(new Date()).start;
  const late = jobLines.some((l) => l.install_date && neededBy(l.install_date) < until);
  return (
    <span className="pt-nw__lineacts">
      <button type="button" className="pt-nw__linkbtn" disabled={busy}
        onClick={() => run(() => linesOrdered({ id: po.id, lineIds: ids }))}>
        {what ? `${what} already ordered` : "Already ordered"}
      </button>
      {jobLines.length > 0 && (
        <button type="button" className="pt-nw__linkbtn" disabled={busy}
          title={late ? `Next week's ordering starts ${dayLabel(until)} — after this is needed` : `Drafted again on ${dayLabel(until)}`}
          onClick={() => run(() => holdForNextWeek({ id: po.id, lineIds: jobLines.map((l) => l.id) }))}>
          Order next week{late ? " (late)" : ""}
        </button>
      )}
      {msg && <span className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`}>{msg.text}</span>}
    </span>
  );
}

/** What's been left for next week's order, with a way to order it now after all. */
function HeldList({ holds, which, byId }: { holds: Hold[]; which: "next" | "this"; byId: Map<string, Supplier> }) {
  const { busy, msg, run } = useAct();
  if (!holds.length) return null;
  return (
    <section className="pt-panel pt-nw__held">
      <h2 className="pt-panel__h">Held for next week&rsquo;s order</h2>
      <p className="pt-panel__sub">Taken off this week&rsquo;s orders on purpose. Each is drafted again when next week&rsquo;s ordering starts.</p>
      <ul>
        {holds.map((h) => {
          const late = h.install_date && neededBy(h.install_date) < h.until;
          return (
            <li key={h.id}>
              <span>
                <strong>Job {h.job_number}</strong>
                {h.customer_name && <span> · {h.customer_name}</span>}
                <span> · {h.qty != null && `${qty(Number(h.qty))} × `}{h.sku_name}</span>
                <span className="pt-nw__muted"> · {byId.get(h.supplier_id)?.name ?? h.supplier_id} · drafted {dayLabel(h.until)}{h.install_date && `, install ${dayLabel(h.install_date)}`}</span>
                {late && <span className="pt-nw__flag">Needed by {dayLabel(neededBy(h.install_date!))} — order it now</span>}
              </span>
              <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" disabled={busy} onClick={() => run(() => orderHeldNow({ holdId: h.id, which }))}>
                Order now
              </button>
            </li>
          );
        })}
      </ul>
      {msg && <span className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`}>{msg.text}</span>}
    </section>
  );
}

function RemoveStock({ lineId }: { lineId: number }) {
  const { busy, run } = useAct();
  return (
    <button type="button" className="pt-nw__linkbtn" disabled={busy} onClick={() => run(() => removeStock(lineId))}>
      {busy ? "Taking off…" : "Take off"}
    </button>
  );
}

type StockPick = Pick<StockItem, "sku_id" | "name" | "model" | "part" | "cost" | "kind">;

/**
 * Stock for the factory onto an order: search the ServiceTitan pricebook (by
 * name, code, model or Reece part number) or type the item. On a card it goes
 * on that order; from the top of the page, on the chosen supplier's draft for
 * the week — made if there isn't one. Stock lines stay put when the order is
 * redrafted, and never count as ordered for a job.
 */
function AddStock({ po, suppliers, which }: { po?: PoWithLines; suppliers?: Supplier[]; which?: "next" | "this" }) {
  const { busy, msg, run } = useAct();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [found, setFound] = useState<StockItem[]>([]);
  const [picked, setPicked] = useState<StockPick | null>(null);
  const [n, setN] = useState("1");
  const [supplierId, setSupplierId] = useState(suppliers?.[0]?.id ?? "");

  useEffect(() => {
    if (!open || picked || text.trim().length < 2) { setFound([]); return; }
    let live = true;
    const t = setTimeout(() => { findStock(text).then((r) => { if (live) setFound(r); }).catch(() => undefined); }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [text, open, picked]);

  if (!open) {
    return (
      <div className="pt-nw__addstock">
        <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setOpen(true)}>+ Add stock</button>
      </div>
    );
  }
  const item: StockPick | null = picked ?? (text.trim() ? { sku_id: null, name: text.trim(), model: null, part: null, cost: null, kind: null } : null);
  const reset = () => { setPicked(null); setText(""); setN("1"); setFound([]); };
  return (
    <div className="pt-nw__addstock is-open">
      {suppliers && (
        <label className="pt-nw__testlbl">
          Supplier{" "}
          <select className="pt-nw__input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      )}
      <div className="pt-nw__stockrow">
        {picked ? (
          <span className="pt-nw__picked">
            <strong>{picked.name}</strong>
            {(picked.model || picked.part) && <span className="pt-nw__muted"> · {[picked.model, picked.part && `Reece # ${picked.part}`].filter(Boolean).join(" · ")}</span>}
            <button type="button" className="pt-nw__linkbtn" onClick={() => setPicked(null)}>change</button>
          </span>
        ) : (
          <input className="pt-nw__input pt-nw__stocksearch" value={text} onChange={(e) => setText(e.target.value)} autoFocus
            placeholder="Search the pricebook — name, code, model or Reece #" aria-label="Stock item" />
        )}
        <input className="pt-nw__input pt-nw__qty" type="number" min={1} step={1} value={n} onChange={(e) => setN(e.target.value)} aria-label="Quantity" />
        <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" disabled={busy || !item || !(Number(n) > 0) || (!!suppliers && !supplierId)}
          onClick={() => item && run(async () => {
            const r = await addStock(po ? { id: po.id, item, qty: Number(n) } : { supplierId, which, item, qty: Number(n) });
            if (r.ok) reset();
            return r;
          })}>
          {busy ? "Adding…" : "Add"}
        </button>
        <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => { reset(); setOpen(false); }}>Close</button>
      </div>
      {!picked && found.length > 0 && (
        <ul className="pt-nw__found" role="listbox" aria-label="Pricebook matches">
          {found.map((f) => (
            <li key={`${f.kind}-${f.sku_id}`}>
              <button type="button" onClick={() => { setPicked(f); setFound([]); }}>
                <strong>{f.name}</strong>
                <span>{[f.kind, f.model, f.code, f.part && `Reece # ${f.part}`, f.vendor].filter(Boolean).join(" · ")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!picked && text.trim().length >= 2 && found.length === 0 && (
        <span className="pt-nw__muted">Nothing in the pricebook matches — Add puts &ldquo;{text.trim()}&rdquo; on as typed.</span>
      )}
      {msg && <span className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`}>{msg.text}</span>}
    </div>
  );
}

/**
 * Send every draft on the page in one go, after saying exactly what will go
 * where. Reece is never in it — those lines have to be keyed into maX first.
 */
function OrderAll({ drafts, byId }: { drafts: PoWithLines[]; byId: Map<string, Supplier> }) {
  const { busy, msg, run } = useAct();
  const [open, setOpen] = useState(false);
  const sendable = drafts.filter((p) => byId.get(p.supplier_id)?.method !== "reece_cart");
  const reece = drafts.length - sendable.length;
  if (!sendable.length) return reece ? <span className="pt-nw__muted">Only Reece left — enter it in maX and mark it ordered.</span> : null;
  const goods = sendable.filter((p) => p.kind === "order").map((p) => `${byId.get(p.supplier_id)?.name ?? p.supplier_id}${p.pickup ? " (pick up)" : ""}`);
  const work = sendable.filter((p) => p.kind === "work_order").length;
  const flagged = sendable.filter((p) => byId.get(p.supplier_id)?.method === "email_form" && p.lines.some((l) => modelLooksLikeName(l.supplier_model ?? l.sku_name))).length;
  return (
    <>
      {!open && (
        <button type="button" className="pt-btn pt-btn--orange" onClick={() => setOpen(true)} disabled={busy}>
          Order all ({sendable.length})
        </button>
      )}
      {open && (
        <div className="pt-nw__orderall" role="group" aria-label="Order all">
          <p>
            <strong>Send {sendable.length} now?</strong>{" "}
            {goods.length > 0 && <>Email {goods.join(", ")}</>}
            {goods.length > 0 && work > 0 && " and "}
            {work > 0 && <>{work} work order{work === 1 ? "" : "s"} to the electrician</>}.
            {reece > 0 && " Reece isn't included — enter it in maX, then mark it ordered."}
            {flagged > 0 && <span className="pt-nw__flag">A Mitsubishi line has no model number</span>}
          </p>
          <span className="pt-nw__actions">
            <button type="button" className="pt-btn pt-btn--orange" disabled={busy}
              onClick={() => run(async () => { const r = await approveAll(sendable.map((p) => p.id)); setOpen(false); return r; })}>
              {busy ? "Sending…" : `Yes, send all ${sendable.length}`}
            </button>
            <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" disabled={busy} onClick={() => setOpen(false)}>Not yet</button>
          </span>
        </div>
      )}
      {msg && <span className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`}>{msg.text}</span>}
    </>
  );
}

/**
 * Bookings sync every ten minutes and new jobs are drafted as they arrive, so
 * the page re-reads itself every couple of minutes while it's on screen.
 * A server refresh keeps whatever is typed into an open box.
 */
function useLiveRefresh(ms: number) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => { if (document.visibilityState === "visible") router.refresh(); };
    const t = setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, [router, ms]);
}

type CardProps = { po: PoWithLines; supplier: Supplier | undefined; testTo: string; alwaysCc: string; delivery: DeliverySettings };

const installWhen = (l: { appointment_start: string | null; install_date: string | null }) =>
  l.appointment_start ? when(l.appointment_start) : l.install_date ? dayLabel(l.install_date) : "—";

/**
 * Reece goes into maX one job at a time, so its lines are shown the same way:
 * a list per job, each line with Reece's product number to search maX by.
 */
function ReeceLines({ po }: { po: PoWithLines }) {
  const groups = byJob(po.lines);
  const missing = po.lines.filter((l) => !l.supplier_part).length;
  return (
    <>
      {missing > 0 && (
        <p className="pt-nw__muted pt-nw__reecenote">
          {missing} of {po.lines.length} line{po.lines.length === 1 ? " has" : "s have"} no Reece product number yet — it comes from the
          vendor part number on the item&rsquo;s Reece vendor in the ServiceTitan pricebook.
        </p>
      )}
      {groups.map((g) => (
        <div key={g.job_id ?? "stock"} className="pt-nw__jobgroup">
          <h3 className="pt-nw__jobhead">
            {g.job_id == null ? <strong>Stock for the factory</strong> : (
              <>
                <strong>Job {g.job_number}</strong>
                {g.customer_name && <span> · {g.customer_name}</span>}
                {g.suburb && <span> · {g.suburb}</span>}
                <span className="pt-nw__muted"> — install {installWhen(g)}</span>
              </>
            )}
            {g.job_id != null && po.status === "draft" && g.lines.length > 1 && <LineActions po={po} lines={g.lines} what="Whole job" />}
          </h3>
          <div className="pt-tgt__tablewrap">
            <table className="pt-nw__table pt-nw__table--reece">
              <thead>
                <tr><th className="is-num">Qty</th><th>Reece #</th><th>Item</th><th className="is-num">Cost ex GST</th></tr>
              </thead>
              <tbody>
                {g.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="is-num">{qty(l.qty)}</td>
                    <td className="pt-nw__part">{l.supplier_part ?? <span className="pt-nw__flag">not set</span>}</td>
                    <td>
                      <strong>{l.sku_name}</strong>
                      {l.description && l.description !== l.sku_name && <span>{l.description}</span>}
                      {l.manual && po.status === "draft" && <RemoveStock lineId={l.id} />}
                      {!l.manual && po.status === "draft" && <LineActions po={po} lines={[l]} />}
                    </td>
                    <td className="is-num">{l.unit_cost == null ? "—" : money(l.unit_cost * l.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {(() => {
        const jobs = groups.filter((g) => g.job_id != null).length;
        const stock = groups.length - jobs;
        return (
          <p className="pt-nw__total">
            {po.lines.length} line{po.lines.length === 1 ? "" : "s"}
            {jobs > 0 && <> across {jobs} job{jobs === 1 ? "" : "s"}</>}
            {stock > 0 && <>{jobs > 0 ? " and" : ","} stock</>} · <strong>{money(linesTotal(po.lines))}</strong>
          </p>
        );
      })()}
    </>
  );
}

function OrderCard({ po, supplier, testTo, alwaysCc, delivery }: CardProps) {
  const total = linesTotal(po.lines);
  const needsModel = supplier?.method === "email_form";
  return (
    <section className={`pt-panel pt-nw__card${po.status === "cancelled" ? " is-muted" : ""}`}>
      <header className="pt-nw__cardhead">
        <h2 className="pt-panel__h">{supplier?.name ?? po.supplier_id}</h2>
        <Status po={po} />
        <span className="pt-nw__po">{po.po_number}</span>
      </header>
      <p className="pt-panel__sub">
        {po.status === "sent" ? `Sent to ${po.sent_to}${po.approved_by ? ` by ${po.approved_by}` : ""}.` : howItGoes(supplier)}
      </p>
      {supplier?.method === "reece_cart" ? <ReeceLines po={po} /> : (
        <div className="pt-tgt__tablewrap">
          <table className="pt-nw__table">
            <thead>
              <tr><th>Qty</th><th>{needsModel ? "Model code" : "Item"}</th><th>Job</th><th>Install</th><th className="is-num">Cost ex GST</th></tr>
            </thead>
            <tbody>
              {po.lines.map((l) => {
                const model = l.supplier_model ?? l.sku_name ?? "";
                const flag = needsModel && modelLooksLikeName(model);
                return (
                  <tr key={l.id}>
                    <td className="is-num">{qty(l.qty)}</td>
                    <td>
                      <strong>{model}</strong>
                      {l.description && l.description !== model && <span>{l.description}</span>}
                      {flag && <span className="pt-nw__flag">No model number — fill in Model on this item in the ServiceTitan pricebook</span>}
                      {l.manual && po.status === "draft" && <RemoveStock lineId={l.id} />}
                      {!l.manual && po.status === "draft" && <LineActions po={po} lines={[l]} />}
                    </td>
                    {l.job_id == null
                      ? <><td><strong>Stock</strong><span>for the factory</span></td><td>—</td></>
                      : <><td><strong>{l.job_number}</strong><span>{l.customer_name}</span></td><td>{installWhen(l)}</td></>}
                    <td className="is-num">{l.unit_cost == null ? "—" : money(l.unit_cost * l.qty)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr><td colSpan={4}>{po.lines.length} line{po.lines.length === 1 ? "" : "s"}</td><td className="is-num"><strong>{money(total)}</strong></td></tr>
            </tfoot>
          </table>
        </div>
      )}
      {po.status === "draft" && <AddStock po={po} />}
      <Delivery po={po} delivery={delivery} />
      <Cc po={po} supplier={supplier} alwaysCc={alwaysCc} />
      <Buttons po={po} supplier={supplier} testTo={testTo} label={po.po_number} />
    </section>
  );
}

function WorkOrderCard({ po, supplier, testTo, alwaysCc }: CardProps) {
  const d = po.details;
  // A work order is known by its job and address — that's what Geoff files it
  // under — so that is its heading, not the internal order number.
  const ref = d ? workRef(d) : po.po_number;
  return (
    <section className={`pt-panel pt-nw__card${po.status === "cancelled" ? " is-muted" : ""}`}>
      <header className="pt-nw__cardhead">
        <h2 className="pt-panel__h">{ref}</h2>
        <Status po={po} />
      </header>
      <p className="pt-panel__sub">
        <strong>{d?.start_at ? dayTimeLabel(d.start_at) : d ? dayLabel(d.date) : ""}</strong>
        {" · "}{supplier?.name ?? "Electrician"} · {po.status === "sent" ? `sent to ${po.sent_to}` : howItGoes(supplier)}
      </p>
      {d && (
        <dl className="pt-nw__wo">
          <dt>Site</dt><dd>{d.site_address}</dd>
          {d.all_visits && d.all_visits.includes(",") && (<><dt>Crew on site</dt><dd>{d.all_visits}</dd></>)}
          <dt>The job</dt>
          <dd>
            {d.jobs.map((j) => (
              <span key={j.job_id} className="pt-nw__job">
                <strong>Job {j.job_number}</strong> · {j.job_type}
                {j.system_installed && <span>System: {j.system_installed}</span>}
                {j.electrical_items && <span className="pt-nw__muted">On the quote: {j.electrical_items}</span>}
              </span>
            ))}
          </dd>
          <dt>Our crew</dt><dd>{d.crew.length ? d.crew.join(", ") : <span className="pt-nw__flag">No crew assigned in ServiceTitan</span>}</dd>
          <dt>Customer</dt>
          <dd>
            {[d.customer_name, d.customer_phone, d.customer_email].filter(Boolean).join(" · ") || <span className="pt-nw__flag">No contact in ServiceTitan</span>}
            {d.customer_name && !d.customer_phone && d.customer_email && <span className="pt-nw__flag">Email only — no phone number on file</span>}
          </dd>
          {d.note && (<><dt>Note to Geoff</dt><dd className="pt-nw__muted">{d.note}</dd></>)}
        </dl>
      )}
      <Cc po={po} supplier={supplier} alwaysCc={alwaysCc} />
      <Buttons po={po} supplier={supplier} testTo={testTo} label={ref} />
    </section>
  );
}

export function NextWeekOrders(props: {
  which: "next" | "this";
  dbReady: boolean;
  appointmentsSynced: boolean;
  orders: PoWithLines[];
  suppliers: Supplier[];
  problems: Problem[];
  /** Where a test copy goes unless changed: whoever is looking at the page. */
  testTo: string;
  /** The office address every emailed order is copied to. */
  alwaysCc: string;
  /** What an order says about delivery: the factory's instruction and the note every order carries. */
  delivery: DeliverySettings;
  /** Lines left for next week's order. */
  holds: Hold[];
}) {
  const { which, dbReady, appointmentsSynced, orders, suppliers, problems, testTo, alwaysCc, delivery, holds } = props;
  const { busy, msg, run } = useAct();
  const byId = new Map(suppliers.map((s) => [s.id, s]));
  useLiveRefresh(120_000);

  if (!dbReady) {
    return (
      <section className="pt-panel">
        <h2 className="pt-panel__h">Orders</h2>
        <p className="pt-panel__sub">The database isn&rsquo;t reachable from here, so this page can&rsquo;t say what&rsquo;s been ordered.</p>
      </section>
    );
  }

  const shown = orders.filter((o) => o.status !== "cancelled");
  const cancelled = orders.length - shown.length;
  const goods = shown.filter((o) => o.kind === "order").sort((a, b) => (byId.get(a.supplier_id)?.name ?? "").localeCompare(byId.get(b.supplier_id)?.name ?? ""));
  const work = shown.filter((o) => o.kind === "work_order").sort((a, b) => (a.details?.start_at ?? "").localeCompare(b.details?.start_at ?? ""));

  return (
    <div className="pt-nw">
      {!appointmentsSynced && (
        <p className="pt-note">
          <strong>Booking times are still coming across from ServiceTitan.</strong> Until they have, no install has a date, so there is
          nothing to draft. The sync runs every ten minutes.
        </p>
      )}

      <div className="pt-nw__bar">
        <OrderAll drafts={shown.filter((o) => o.status === "draft")} byId={byId} />
        <AddStock which={which} suppliers={suppliers.filter((x) => x.active && x.method !== "work_order").sort((a, b) => a.name.localeCompare(b.name))} />
        <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" disabled={busy} onClick={() => run(() => redraft(which))}>
          {busy ? "Drafting…" : shown.some((o) => o.status === "draft") ? "Redraft from the latest bookings" : "Draft now"}
        </button>
        <span className="pt-nw__muted">Redrafting only touches drafts. Anything already sent stays as it went; new jobs become a top-up order.</span>
        <a className="pt-btn pt-btn--ghost pt-btn--sm" href="/portal/supply/emails">Supplier emails &amp; samples</a>
        {msg && <span className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`}>{msg.text}</span>}
      </div>

      {problems.length > 0 && (
        <section className="pt-panel pt-nw__problems">
          <h2 className="pt-panel__h">Needs a look</h2>
          <p className="pt-panel__sub">
            Fix these in ServiceTitan and redraft, or order them by hand. A job that moved after its order went is never
            ordered twice — the supplier just needs telling the new date.
          </p>
          <ul>
            {problems.map((p, i) => (
              <li key={i}>
                <strong>{p.job_number ? `Job ${p.job_number}` : "A job"}</strong>
                {p.customer_name && <span> · {p.customer_name}</span>}
                {p.install_date && <span className="pt-nw__muted"> · {dayLabel(p.install_date)}</span>}
                <span className="pt-nw__what">{p.what}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <HeldList holds={holds} which={which} byId={byId} />

      {shown.length === 0 && (
        <section className="pt-panel">
          <h2 className="pt-panel__h">Nothing drafted for this week yet</h2>
          <p className="pt-panel__sub">
            {which === "next"
              ? "Next week is drafted from Wednesday, and again within minutes of any new booking. Press Draft now to make it from the bookings as they stand."
              : "This week is drafted every weekday, within minutes of a new booking. Press Draft now to catch anything this instant."}
          </p>
        </section>
      )}

      {goods.length > 0 && <h2 className="pt-nw__section">Supplier orders</h2>}
      {goods.map((po) => <OrderCard key={po.id} po={po} supplier={byId.get(po.supplier_id)} testTo={testTo} alwaysCc={alwaysCc} delivery={delivery} />)}

      {work.length > 0 && <h2 className="pt-nw__section">Electrician</h2>}
      {work.map((po) => <WorkOrderCard key={po.id} po={po} supplier={byId.get(po.supplier_id)} testTo={testTo} alwaysCc={alwaysCc} delivery={delivery} />)}

      {cancelled > 0 && <p className="pt-nw__muted">{cancelled} cancelled draft{cancelled === 1 ? "" : "s"} not shown.</p>}
    </div>
  );
}
