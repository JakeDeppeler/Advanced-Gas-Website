"use client";

import { createContext, useCallback, useContext, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addStock, approve, approveAll, cancel, choosePickup, emailList, findStock, fromStock, holdForNextWeek, linesOrdered, orderHeldNow, pullLatest, noteOnJobs, orderedManually, pushToServiceTitan, dismissProblem, removeStock, saveCc, saveDelivery, testSend, type ActionResult } from "@/app/portal/supply/next-week/actions";
import type { Hold, PoLine, StockItem } from "@/lib/ordering/db";
import type { PoWithLines } from "@/lib/ordering/db";
import { stockKey } from "@/lib/ordering/stockKey";
import { byJob, dayLabel, dayTimeLabel, neededBy, nextWeek, deliveryInstructionsFor, linesTotal, modelLooksLikeName, orderDelivery, problemKey, todayMelbourne, workRef, type Problem, type Supplier } from "@/lib/ordering/plan";

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
  return <span className="pt-vstat pt-vstat--bad">Draft, not sent</span>;
}

const sendLabel = (s: Supplier | undefined, pickup = false) => {
  if (!s) return "Approve";
  if (s.method === "reece_cart") return "Mark ordered in maX";
  if (s.method === "work_order") return "Email the work order";
  const how = pickup ? ", pick up" : "";
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

/**
 * Where an order goes, when by, and a note for the supplier. The date is
 * worked out from the first install on the order; the office can set its own
 * for one order (sooner for a long weekend, later for stock nobody's waiting
 * on), and clearing it goes back to the worked-out one.
 */
function Delivery({ po, delivery, supplierName }: { po: PoWithLines; delivery: DeliverySettings; supplierName?: string }) {
  const { busy, msg, run } = useAct();
  const [open, setOpen] = useState(false);
  const [toSite, setToSite] = useState(po.delivery_to_site);
  const [address, setAddress] = useState(po.delivery_address ?? "");
  const [instructions, setInstructions] = useState(po.delivery_instructions ?? "");
  const [by, setBy] = useState(po.deliver_by ?? "");
  const [note, setNote] = useState(po.supplier_note ?? "");
  const editable = po.status === "draft";
  const order = po.kind === "order";
  const today = todayMelbourne();
  const worked = order ? orderDelivery(po.lines, today) : null;
  const d = order ? orderDelivery(po.lines, today, po.deliver_by) : null;
  const who = supplierName ?? "the supplier";
  return (
    <div className="pt-nw__deliver">
      {editable && order && <PickupChoice po={po} />}
      <span>
        {po.pickup
          ? <><strong>Pick up</strong> , we collect it</>
          : <><strong>Deliver to</strong> {po.delivery_address}{po.delivery_to_site && <span className="pt-nw__tag">Site delivery</span>}</>}
        {(() => {
          const said = deliveryInstructionsFor(po, delivery);
          return said ? <span className="pt-nw__muted"> · {said}</span> : null;
        })()}
        {d && <span> · <strong>{po.pickup ? "ready" : "by"} {d.label}</strong>{po.deliver_by && <span className="pt-nw__tag">Your date</span>}</span>}
      </span>
      {editable && !open && order && <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setOpen(true)}>Change</button>}
      {po.supplier_note && !open && <p className="pt-nw__note"><strong>Note to {who}:</strong> {po.supplier_note}</p>}
      {editable && open && (
        <div className="pt-nw__deliveredit">
          {!po.pickup && (
            <>
              <label className="pt-nw__check">
                <input type="checkbox" checked={toSite} onChange={(e) => setToSite(e.target.checked)} /> Deliver straight to site
              </label>
              <input className="pt-nw__input" value={address} onChange={(e) => setAddress(e.target.value)} aria-label="Delivery address" />
              <input className="pt-nw__input" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder={toSite ? "Instructions, e.g. leave at side gate" : delivery.factoryInstructions || "Instructions"} aria-label="Delivery instructions" />
              {delivery.deliveryNote && <span className="pt-nw__muted">&ldquo;{delivery.deliveryNote}&rdquo; is added to every order.</span>}
            </>
          )}
          <label className="pt-nw__field" htmlFor={`nw-by-${po.id}`}>
            <span>{po.pickup ? "Ready by" : "Deliver by"}</span>
            <span className="pt-nw__dateline">
              <input id={`nw-by-${po.id}`} type="date" className="pt-nw__input" value={by} min={today} onChange={(e) => setBy(e.target.value)} />
              {by && <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setBy("")}>Use the install&rsquo;s date</button>}
            </span>
            <span className="pt-nw__muted">
              {worked
                ? <>From the first install it&rsquo;s {worked.label}{by ? ", your date goes instead" : ", which is what goes unless you pick a day"}.</>
                : "Nothing on this order has an install date, so no date goes unless you pick one."}
            </span>
          </label>
          <label className="pt-nw__field" htmlFor={`nw-note-${po.id}`}>
            <span>Note to {who}</span>
            <textarea id={`nw-note-${po.id}`} className="pt-nw__input pt-nw__textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Anything about this order alone, e.g. ring Dean on 0400 000 000 before delivering" />
            <span className="pt-nw__muted">Goes in the email under the delivery details. Only on this order.</span>
          </label>
          <span className="pt-nw__actions">
            <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" disabled={busy}
              onClick={() => run(async () => { const r = await saveDelivery({ id: po.id, toSite, address, instructions, deliverBy: by, note, pickup: po.pickup }); if (r.ok) setOpen(false); return r; })}>
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

/**
 * Reece, until there's a maX integration: the list emailed to whoever enters
 * it (the branch, or the office), PDF attached, and the order counted as gone.
 */
function EmailList({ po, to: start }: { po: PoWithLines; to: string }) {
  const { busy, msg, run } = useAct();
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(start);
  if (!open) return <button type="button" className="pt-btn pt-btn--navy" onClick={() => setOpen(true)}>Email the list</button>;
  return (
    <div className="pt-nw__test">
      <label className="pt-nw__testlbl" htmlFor={`list-${po.id}`}>Email the list to</label>
      <input id={`list-${po.id}`} className="pt-nw__input" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="the branch, or whoever enters it in maX" />
      <span className="pt-nw__actions">
        <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" disabled={busy || !to.trim()} onClick={() => run(() => emailList({ id: po.id, to }))}>
          {busy ? "Sending…" : "Send it"}
        </button>
        <a className="pt-btn pt-btn--ghost pt-btn--sm" href={`/api/portal/order-pdf?id=${po.id}`} download>Download PDF</a>
        <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setOpen(false)}>Close</button>
      </span>
      <span className="pt-nw__muted">The PDF goes with it, the office is copied in, and the order counts as ordered.</span>
      {msg && <span className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`}>{msg.text}</span>}
    </div>
  );
}

/** The order as a PDF, to save and attach to the job in ServiceTitan. */
function DownloadPdf({ po }: { po: PoWithLines }) {
  if (po.kind !== "order" || !po.lines.length) return null;
  return <a className="pt-btn pt-btn--ghost pt-btn--sm" href={`/api/portal/order-pdf?id=${po.id}`} download>Download PDF</a>;
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

/**
 * Whether a sent order is in ServiceTitan as purchase orders on its jobs, and
 * the button that puts it there. ServiceTitan's refusal is shown as it said
 * it; pressing again only makes what's missing.
 */
function InServiceTitan({ po }: { po: PoWithLines }) {
  const { busy, msg, run } = useAct();
  const made = po.st_pos ?? [];
  const jobs = po.lines.filter((l) => l.sku_id != null);
  const groups = new Set(jobs.map((l) => l.job_id)).size;
  const unsent = made.filter((m) => m.st_id != null && !m.sentTried);
  const done = groups > 0 && made.length >= groups && !unsent.length;
  // What ServiceTitan itself says, read back after asking for Sent.
  const pending = made.filter((m) => m.status === "Pending");
  const label = (m: (typeof made)[number]) => `${m.number ? (/^po\b/i.test(m.number) ? m.number : `PO ${m.number}`) : "purchase order"}${m.status ? ` (${m.status})` : ""}`;
  return (
    <div className="pt-nw__st">
      <span>
        <strong>ServiceTitan:</strong>{" "}
        {made.length ? made.map(label).join(", ") : "not in ServiceTitan yet"}
        {made.length > 0 && made.length < groups ? ` · ${groups - made.length} still to go` : ""}
      </span>
      {po.st_error && <span className="pt-nw__sterr">{po.st_error}</span>}
      {pending.length > 0 && !unsent.length && (
        <span className="pt-nw__sterr">ServiceTitan kept {pending.length === 1 ? "it" : "them"} Pending, use Mark as Sent on {pending.length === 1 ? "it" : "them"} in ServiceTitan.</span>
      )}
      {!done && (
        <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" disabled={busy} onClick={() => run(() => pushToServiceTitan(po.id))}>
          {busy ? "Putting it in…" : unsent.length && made.length >= groups ? "Mark as Sent in ServiceTitan" : made.length || po.st_error ? "Try ServiceTitan again" : "Put in ServiceTitan"}
        </button>
      )}
      {/* A refusal is already on the order (st_error); only a success needs saying here. */}
      {msg?.ok && <span className="pt-inline is-ok">{msg.text}</span>}
    </div>
  );
}

/**
 * What the order has done to its jobs in ServiceTitan: the tags swapped to
 * "ordered" (or booked) for every supplier, and for the ticked ones a note
 * with the order attached. It happens by itself on sending; the button is for
 * a refusal, or an order sent before.
 */
function OnTheJobs({ po, noted }: { po: PoWithLines; noted: boolean }) {
  const { busy, msg, run } = useAct();
  const jobs = po.kind === "work_order" ? (po.details?.jobs ?? []).map((j) => ({ id: j.job_id, n: j.job_number })) : po.lines.filter((l) => l.job_id != null).map((l) => ({ id: l.job_id as number, n: l.job_number }));
  const uniq = [...new Map(jobs.map((j) => [j.id, j])).values()];
  if (!uniq.length || po.status !== "sent") return null;
  const done = po.st_notes ?? [];
  const at = (id: number) => done.find((d) => d.job_id === id);
  const full = uniq.filter((j) => { const d = at(j.id); return !!d?.tags && (!noted || (d.note && d.file)); });
  const all = full.length === uniq.length;
  const what = po.kind === "work_order" ? "work order" : "order";
  const tags = [...new Set(done.flatMap((d) => d.tagged ?? []))];
  const nums = (js: typeof uniq) => js.map((j) => j.n ?? j.id).join(", ");
  return (
    <div className="pt-nw__st">
      <span>
        <strong>On the job:</strong>{" "}
        {all ? `${noted ? `note and ${what}` : "tags changed"} on ${nums(full)}${tags.length ? ` · tagged ${tags.join(", ")}` : ""}`
          : full.length ? `done on ${nums(full)} · ${uniq.length - full.length} still to go`
          : "not up to date in ServiceTitan yet"}
      </span>
      {po.st_note_error && <span className="pt-nw__sterr">{po.st_note_error}</span>}
      {!all && (
        <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" disabled={busy} onClick={() => run(() => noteOnJobs(po.id))}>
          {busy ? "Working…" : full.length || po.st_note_error ? "Try again" : noted ? `Add note & ${what} to the job` : "Change the job's tags"}
        </button>
      )}
      {msg?.ok && <span className="pt-inline is-ok">{msg.text}</span>}
    </div>
  );
}

function Buttons({ po, supplier, testTo, label, noted }: { po: PoWithLines; supplier: Supplier | undefined; testTo: string; label: string; noted?: boolean }) {
  const { busy, msg, run } = useAct();
  if (po.status !== "draft") {
    return po.status === "cancelled" ? null : (
      <div className="pt-nw__foot">
        {po.kind === "order" && <InServiceTitan po={po} />}
        <OnTheJobs po={po} noted={!!noted} />
        <span className="pt-nw__actions"><TestSend po={po} testTo={testTo} /><DownloadPdf po={po} /></span>
      </div>
    );
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
        {supplier?.method === "reece_cart" && <EmailList po={po} to={supplier.email || testTo} />}
        <TestSend po={po} testTo={testTo} />
        <DownloadPdf po={po} />
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
  const stocked = useContext(StockedCtx);
  const ids = lines.map((l) => l.id);
  const jobLines = lines.filter((l) => l.job_id != null && !l.manual);
  // Held until next week's ordering — say so if that's too late for the install.
  const until = nextWeek(new Date()).start;
  const late = jobLines.some((l) => l.install_date && neededBy(l.install_date) < until);
  const tagged = !what && lines.length === 1 && stocked.has(stockKey(lines[0]));
  return (
    <span className="pt-nw__lineacts">
      {tagged && <span className="nw-stocktag" title="We keep this in the factory">Factory stock</span>}
      <button type="button" className="nw-lbtn" disabled={busy}
        onClick={() => run(() => linesOrdered({ id: po.id, lineIds: ids }))}>
        {what ? `${what} already ordered` : "Already ordered"}
      </button>
      {!what && (
        <button type="button" className={`nw-lbtn${tagged ? " on" : ""}`} disabled={busy}
          title="Take it off the order: we have it in the factory. Tags it Factory stock for next time."
          onClick={() => run(() => fromStock({ id: po.id, lineIds: ids, items: lines.map((l) => ({ key: stockKey(l), name: l.supplier_model ?? l.sku_name ?? l.description ?? "" })) }))}>
          In stock
        </button>
      )}
      {jobLines.length > 0 && (
        <button type="button" className="nw-lbtn" disabled={busy}
          title={late ? `Next week's ordering starts ${dayLabel(until)}, after this is needed` : `Drafted again on ${dayLabel(until)}`}
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
                {late && <span className="pt-nw__flag">Needed by {dayLabel(neededBy(h.install_date!))} , order it now</span>}
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
            placeholder="Search the pricebook, name, code, model or Reece #" aria-label="Stock item" />
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
        <span className="pt-nw__muted">Nothing in the pricebook matches, Add puts &ldquo;{text.trim()}&rdquo; on as typed.</span>
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
  if (!sendable.length) return reece ? <span className="pt-nw__muted">Only Reece left, enter it in maX and mark it ordered.</span> : null;
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
            {reece > 0 && " Reece isn't included, enter it in maX, then mark it ordered."}
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
/** Which items carry the Factory stock tag, for every line on the page. */
const StockedCtx = createContext<Set<string>>(new Set());

/**
 * Every ten minutes while the page is showing, ask ServiceTitan for what's
 * new and redraft from it; the cheap re-read in between picks up anyone
 * else's approvals. Says when it last looked.
 */
function PullLatest({ which }: { which: "next" | "this" }) {
  const router = useRouter();
  const [at, setAt] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const go = useCallback(async (byHand = false) => {
    if (!byHand && document.visibilityState !== "visible") return;
    setBusy(true);
    const r = await pullLatest(byHand ? which : undefined).catch((e: Error) => ({ ok: false, error: e.message, note: undefined }));
    setBusy(false);
    setNote(byHand ? (r.ok ? (r.note ? { ok: true, text: r.note } : null) : { ok: false, text: r.error ?? "Couldn't check." }) : null);
    setAt(new Date().toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" }));
    router.refresh();
  }, [router, which]);
  useEffect(() => {
    go();
    const t = setInterval(() => go(), 10 * 60_000);
    return () => clearInterval(t);
  }, [go]);
  return (
    <p className="nw-live" role="status">
      <i className={busy ? "on" : undefined} aria-hidden="true" />
      {busy ? "Checking ServiceTitan for new bookings…" : at ? `Checked ServiceTitan at ${at}. It checks again every 10 minutes while this page is open.` : "Checks ServiceTitan every 10 minutes while this page is open."}
      {note && !busy && <span className={`pt-inline ${note.ok ? "is-ok" : "is-err"}`}>{note.text}</span>}
      <button type="button" className="rc-mark" onClick={() => go(true)} disabled={busy}>Check now</button>
    </p>
  );
}

function useLiveRefresh(ms: number) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => { if (document.visibilityState === "visible") router.refresh(); };
    const t = setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, [router, ms]);
}

type CardProps = { po: PoWithLines; supplier: Supplier | undefined; testTo: string; alwaysCc: string; delivery: DeliverySettings; noted?: boolean };

const installWhen = (l: { appointment_start: string | null; install_date: string | null }) =>
  l.appointment_start ? when(l.appointment_start) : l.install_date ? dayLabel(l.install_date) : "";

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
          {missing} of {po.lines.length} line{po.lines.length === 1 ? " has" : "s have"} no Reece product number yet, it comes from the
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
                <span className="pt-nw__muted"> , install {installWhen(g)}</span>
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
                    <td className="is-num">{l.unit_cost == null ? "" : money(l.unit_cost * l.qty)}</td>
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

function OrderCard({ po, supplier, testTo, alwaysCc, delivery, noted }: CardProps) {
  const total = linesTotal(po.lines);
  const needsModel = supplier?.method === "email_form";
  // The short version first: what, for which jobs, how much, how it gets here.
  // The lines, delivery and copies open underneath — straight away when a
  // line needs fixing, so a problem is never folded away.
  const jobs = [...new Map(po.lines.filter((l) => l.job_id != null).map((l) => [l.job_id, l])).values()];
  const stock = po.lines.filter((l) => l.job_id == null).length;
  const flagged = needsModel && po.lines.some((l) => modelLooksLikeName(l.supplier_model ?? l.sku_name ?? ""));
  const firstInstall = po.lines.map((l) => l.appointment_start ?? l.install_date).filter(Boolean).sort()[0];
  return (
    <section className={`pt-panel pt-nw__card${po.status === "cancelled" ? " is-muted" : ""}`}>
      <header className="pt-nw__cardhead">
        <h2 className="pt-panel__h">{supplier?.name ?? po.supplier_id}</h2>
        <Status po={po} />
        <span className="pt-nw__po">{po.po_number}</span>
      </header>
      <p className="pt-nw__sum">
        <span><b>{po.lines.length}</b> line{po.lines.length === 1 ? "" : "s"}</span>
        {jobs.length > 0 && <span>{jobs.length === 1 ? `Job ${jobs[0].job_number}${jobs[0].customer_name ? ` · ${jobs[0].customer_name}` : ""}` : `${jobs.length} jobs: ${jobs.map((j) => j.job_number).join(", ")}`}</span>}
        {stock > 0 && <span>{stock} for the factory</span>}
        {firstInstall && <span>first install {installWhen(po.lines.find((l) => (l.appointment_start ?? l.install_date) === firstInstall)!)}</span>}
        <span>{po.pickup ? "We pick it up" : po.delivery_to_site ? "To the site" : "To the factory"}</span>
        <span><b>{money(total)}</b> ex GST</span>
      </p>
      {flagged && <p className="pt-nw__flag" style={{ margin: "0 0 6px" }}>A line has no model number, open the lines to see which.</p>}
      <details className="pt-nw__more" open={flagged || undefined}>
        <summary>Show the lines{po.status === "draft" ? ", delivery and copies" : " and where it went"}</summary>
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
                      {flag && <span className="pt-nw__flag">No model number, fill in Model on this item in the ServiceTitan pricebook</span>}
                      {l.manual && po.status === "draft" && <RemoveStock lineId={l.id} />}
                      {!l.manual && po.status === "draft" && <LineActions po={po} lines={[l]} />}
                    </td>
                    {l.job_id == null
                      ? <><td><strong>Stock</strong><span>for the factory</span></td><td></td></>
                      : <><td><strong>{l.job_number}</strong><span>{l.customer_name}</span></td><td>{installWhen(l)}</td></>}
                    <td className="is-num">{l.unit_cost == null ? "" : money(l.unit_cost * l.qty)}</td>
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
      <Delivery po={po} delivery={delivery} supplierName={supplier?.name} />
      <Cc po={po} supplier={supplier} alwaysCc={alwaysCc} />
      </details>
      <Buttons po={po} supplier={supplier} testTo={testTo} label={po.po_number} noted={noted} />
    </section>
  );
}

function WorkOrderCard({ po, supplier, testTo, alwaysCc, noted }: CardProps) {
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
      {d && (d.crew.length === 0 || (!d.customer_phone && !d.customer_email)) && (
        <p className="pt-nw__flag" style={{ margin: "0 0 6px" }}>{d.crew.length === 0 ? "No crew assigned in ServiceTitan." : "No customer phone or email in ServiceTitan."} Open the details to see.</p>
      )}
      <details className="pt-nw__more" open={!!d && (d.crew.length === 0 || (!d.customer_phone && !d.customer_email)) || undefined}>
        <summary>Show the site, the job and the customer</summary>
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
            {d.customer_name && !d.customer_phone && d.customer_email && <span className="pt-nw__flag">Email only, no phone number on file</span>}
          </dd>
          {d.note && (<><dt>Note to Geoff</dt><dd className="pt-nw__muted">{d.note}</dd></>)}
        </dl>
      )}
      <Cc po={po} supplier={supplier} alwaysCc={alwaysCc} />
      </details>
      <Buttons po={po} supplier={supplier} testTo={testTo} label={ref} noted={noted} />
    </section>
  );
}

export function NextWeekOrders(props: {
  which: "next" | "this";
  /** "todo": drafts still to approve and send. "sent": what's gone, which moves here by itself once it has. */
  view?: "todo" | "sent";
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
  /** Suppliers whose sent orders are noted on their jobs in ServiceTitan (stJobNotes). */
  notedSuppliers?: string[];
  /** Items tagged Factory stock. */
  stocked?: string[];
}) {
  const { which, dbReady, appointmentsSynced, orders, suppliers, problems, testTo, alwaysCc, delivery, holds } = props;
  const view = props.view ?? "todo";
  const { busy, msg, run } = useAct();
  const byId = new Map(suppliers.map((s) => [s.id, s]));
  const noted = new Set(props.notedSuppliers ?? []);
  useLiveRefresh(120_000);

  if (!dbReady) {
    return (
      <section className="pt-panel">
        <h2 className="pt-panel__h">Orders</h2>
        <p className="pt-panel__sub">The database isn&rsquo;t reachable from here, so this page can&rsquo;t say what&rsquo;s been ordered.</p>
      </section>
    );
  }

  const live = orders.filter((o) => o.status !== "cancelled");
  const cancelled = orders.length - live.length;
  // An order is "sent" from the moment it's approved: it's on its way, and
  // nothing on it can change, so it leaves the list of things to do.
  const gone = live.filter((o) => o.status === "sent" || o.status === "approved");
  const shown = view === "sent" ? gone : live.filter((o) => o.status === "draft");
  const goods = shown.filter((o) => o.kind === "order").sort((a, b) => (byId.get(a.supplier_id)?.name ?? "").localeCompare(byId.get(b.supplier_id)?.name ?? ""));
  const work = shown.filter((o) => o.kind === "work_order").sort((a, b) => (a.details?.start_at ?? "").localeCompare(b.details?.start_at ?? ""));

  return (
    <StockedCtx.Provider value={new Set(props.stocked ?? [])}>
    <div className="pt-nw">
      {view === "todo" && <PullLatest which={which} />}
      {view === "todo" && !appointmentsSynced && (
        <p className="pt-note">
          <strong>Booking times are still coming across from ServiceTitan.</strong> Until they have, no install has a date, so there is
          nothing to draft. The sync runs every ten minutes.
        </p>
      )}

      {view === "todo" && <div className="pt-nw__bar">
        <OrderAll drafts={shown.filter((o) => o.status === "draft")} byId={byId} />
        <AddStock which={which} suppliers={suppliers.filter((x) => x.active && x.method !== "work_order").sort((a, b) => a.name.localeCompare(b.name))} />
        <a className="pt-btn pt-btn--ghost pt-btn--sm" href="/portal/supply/emails">Supplier emails &amp; samples</a>
        {msg && <span className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`}>{msg.text}</span>}
      </div>}

      {view === "todo" && problems.length > 0 && (
        <section className="pt-panel pt-nw__problems">
          <h2 className="pt-panel__h">Needs a look</h2>
          <p className="pt-panel__sub">
            Fix these in ServiceTitan and press Check now, or order them by hand. A job that moved after its order went is never
            ordered twice: the portal emails the supplier the new date in office hours (Settings › Automatic) and moves the order with it, and the line goes from here. Dealt with another way? Dismiss it; it comes back only if what&rsquo;s wrong changes.
          </p>
          <ul>
            {problems.map((p, i) => (
              <li key={i}>
                <strong>{p.job_number ? `Job ${p.job_number}` : "A job"}</strong>
                {p.customer_name && <span> · {p.customer_name}</span>}
                {p.install_date && <span className="pt-nw__muted"> · {dayLabel(p.install_date)}</span>}
                <span className="pt-nw__what">{p.what}</span>
                <button type="button" className="pt-todo__editbtn pt-nw__dismiss" disabled={busy} title="Dealt with: take it off this list" onClick={() => run(() => dismissProblem(problemKey(p)))}>Dismiss</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view === "todo" && <HeldList holds={holds} which={which} byId={byId} />}

      {view === "sent" && shown.length === 0 && (
        <section className="pt-panel">
          <h2 className="pt-panel__h">Nothing sent for {which === "this" ? "this" : "next"} week yet</h2>
          <p className="pt-panel__sub">An order lands here the moment it&rsquo;s approved and goes to the supplier or the electrician.</p>
        </section>
      )}

      {view === "todo" && shown.length === 0 && gone.length > 0 && (
        <section className="pt-panel">
          <h2 className="pt-panel__h">Nothing left to send</h2>
          <p className="pt-panel__sub">
            All {gone.length} {gone.length === 1 ? "order has" : "orders have"} gone, they&rsquo;re on the Sent tab. A new booking is drafted here within minutes.
          </p>
        </section>
      )}

      {view === "todo" && shown.length === 0 && gone.length === 0 && (
        <section className="pt-panel">
          <h2 className="pt-panel__h">Nothing drafted for this week yet</h2>
          <p className="pt-panel__sub">
            {which === "next"
              ? "Next week is drafted from Wednesday, and again within minutes of any new booking. Press Check now to make it from the bookings as they stand."
              : "This week is drafted every weekday, within minutes of a new booking. Press Check now to catch anything this instant."}
          </p>
        </section>
      )}

      {goods.length > 0 && <h2 className="pt-nw__section">Supplier orders</h2>}
      {goods.map((po) => <OrderCard key={po.id} po={po} supplier={byId.get(po.supplier_id)} testTo={testTo} alwaysCc={alwaysCc} delivery={delivery} noted={noted.has(po.supplier_id)} />)}

      {work.length > 0 && <h2 className="pt-nw__section">Electrician</h2>}
      {work.map((po) => <WorkOrderCard key={po.id} po={po} supplier={byId.get(po.supplier_id)} testTo={testTo} alwaysCc={alwaysCc} delivery={delivery} noted={noted.has(po.supplier_id)} />)}

      {view === "todo" && cancelled > 0 && <p className="pt-nw__muted">{cancelled} cancelled draft{cancelled === 1 ? "" : "s"} not shown.</p>}
    </div>
    </StockedCtx.Provider>
  );
}
