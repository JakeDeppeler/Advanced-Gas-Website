"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { KpiHead } from "@/components/portal/kit/Kit";
import { useRouter } from "next/navigation";
import { addStock, approve, approveAll, mergeIntoBulk, orderAheadNow, sendSupplier, cancel, choosePickup, emailList, findStock, fromStock, holdForNextWeek, linesOrdered, pullLatest, shelfLine, unbookedLines, orderLaterNow, releaseHolds, noteOnJobs, orderedManually, pushToServiceTitan, dismissProblem, removeStock, saveCc, saveDelivery, testSend, reecePreview, reecePlace, type ActionResult } from "@/app/portal/supply/next-week/actions";
import type { Preview } from "@/lib/ordering/reeceSend";
import type { Hold, PoLine, StockItem } from "@/lib/ordering/db";
import type { PoWithLines } from "@/lib/ordering/db";
import { stockKey } from "@/lib/ordering/stockKey";
import { byJob, dayLabel, dayTimeLabel, isAhead, isStock, isoAddDays, neededBy, nextWeek, thisWeek, deliveryInstructionsFor, linesTotal, modelLooksLikeName, orderDelivery, problemKey, todayMelbourne, workRef, type Problem, type Supplier } from "@/lib/ordering/plan";

/**
 * To order: a checklist. Every supplier order and contractor's work order not
 * sent yet is a line saying what to do ("Send the Rinnai order for Tom
 * Nguyen"), under when it's needed: Today, This week, Next week. The first one
 * is open, with its lines and the one button that sends it, named for what it
 * does ("Send to Rinnai", "Mark ordered in maX") so nobody guesses whether
 * pressing it sent something; the rest (cancel, a test, the PDF) is under
 * More. What can't be ordered yet and what's held for next week are lines too.
 * Beside it, what can be ordered ahead and what's already gone.
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

const sendLabel = (s: Supplier | undefined, pickup = false) => {
  if (!s) return "Send it";
  if (s.method === "reece_cart") return "Mark ordered in maX";
  return `Send to ${s.name}${pickup ? ", we'll pick up" : ""}`;
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
  if (!open) return <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setOpen(true)}>Email the list</button>;
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
          {busy ? "Sending…" : sendLabel(supplier, po.pickup)}
        </button>
        {/* Everything that isn't sending it, one press away rather than five
            buttons the same size as the one that matters. */}
        <details className="nw-more">
          <summary>More</summary>
          <span className="pt-nw__actions">
            {supplier?.method === "reece_cart" && <EmailList po={po} to={supplier.email || testTo} />}
            {supplier?.method !== "reece_cart" && <OrderedElsewhere po={po} />}
            <TestSend po={po} testTo={testTo} />
            <DownloadPdf po={po} />
            <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" disabled={busy}
              onClick={() => { if (confirm(`Cancel ${label}? Nothing has been sent.`)) run(() => cancel(po.id)); }}>
              Cancel the order
            </button>
          </span>
        </details>
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
  // Three buttons on every line of an eleven-line order buried the order, so
  // a line's own actions open from one small "Change".
  return (
    <details className="pt-nw__lineacts nw-linemore">
      <summary>{tagged ? <span className="nw-stocktag" title="We keep this in the factory">Factory stock</span> : null}{what ? `${what}…` : "Change"}</summary>
      <span className="pt-nw__lineacts">
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
      </span>
      {msg && <span className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`}>{msg.text}</span>}
    </details>
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
function AddStock({ po, suppliers }: { po?: PoWithLines; suppliers?: Supplier[] }) {
  const { busy, msg, run } = useAct();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [found, setFound] = useState<StockItem[]>([]);
  const [picked, setPicked] = useState<StockPick | null>(null);
  const [n, setN] = useState("1");
  const [supplierId, setSupplierId] = useState(suppliers?.[0]?.id ?? "");
  const [which, setWhich] = useState<"next" | "this">("next");

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
      {suppliers && (
        <label className="pt-nw__testlbl">
          On{" "}
          <select className="pt-nw__input" value={which} onChange={(e) => setWhich(e.target.value === "this" ? "this" : "next")}>
            <option value="next">next week&rsquo;s order</option>
            <option value="this">this week&rsquo;s order</option>
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
  // One order has its own button on its card; this is for sending several at once.
  if (sendable.length < 2) return null;
  const goods = sendable.filter((p) => p.kind === "order").map((p) => `${byId.get(p.supplier_id)?.name ?? p.supplier_id}${p.pickup ? " (pick up)" : ""}`);
  const work = sendable.filter((p) => p.kind === "work_order").length;
  const flagged = sendable.filter((p) => byId.get(p.supplier_id)?.method === "email_form" && p.lines.some((l) => modelLooksLikeName(l.supplier_model ?? l.sku_name))).length;
  return (
    <>
      {!open && (
        <button type="button" className="pt-btn pt-btn--orange" onClick={() => setOpen(true)} disabled={busy}>
          Send all {sendable.length}
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
function PullLatest() {
  const router = useRouter();
  const [at, setAt] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // Next week drafts by itself from Wednesday. Before that, the only way it
  // drafts is by hand, which the week switch used to do; with one list it's
  // its own button, there only on the days it's needed.
  const dow = new Date(`${todayMelbourne()}T12:00:00Z`).getUTCDay();
  const early = dow === 1 || dow === 2;
  const go = useCallback(async (byHand: false | "this" | "next" = false) => {
    if (!byHand && document.visibilityState !== "visible") return;
    setBusy(true);
    const r = await pullLatest(byHand || undefined).catch((e: Error) => ({ ok: false, error: e.message, note: undefined }));
    setBusy(false);
    setNote(byHand ? (r.ok ? (r.note ? { ok: true, text: r.note } : null) : { ok: false, text: r.error ?? "Couldn't check." }) : null);
    setAt(new Date().toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" }));
    router.refresh();
  }, [router]);
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
      <button type="button" className="rc-mark" onClick={() => go("this")} disabled={busy}>Check now</button>
      {early && <button type="button" className="rc-mark" onClick={() => go("next")} disabled={busy}>Draft next week now</button>}
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

type DraftRef = { id: number; po: string; supplier: string; week: string };
type CardProps = { po: PoWithLines; supplier: Supplier | undefined; testTo: string; alwaysCc: string; delivery: DeliverySettings; noted?: boolean; others?: DraftRef[] };

/**
 * More than one draft for the same supplier (this week's and next week's):
 * one button puts them all on this one, a bulk order that comes in one
 * delivery, by the first install on it. Drafting keeps it as one until it goes.
 */
function MergeBulk({ po, others, name }: { po: PoWithLines; others: DraftRef[]; name: string }) {
  const { busy, msg, run } = useAct();
  const weekOf = (w: string) => `week of ${dayLabel(w)}`;
  return (
    <div className="pt-nw__bulk">
      <span>
        {name} has {others.length === 1 ? "another draft" : `${others.length} other drafts`}: {others.map((o) => `${o.po} (${weekOf(o.week)})`).join(", ")}.
      </span>
      <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" disabled={busy}
        onClick={() => { if (confirm(`Put ${others.map((o) => o.po).join(", ")} onto ${po.po_number} as one bulk order? Everything comes in one delivery, by the first install on it.`)) run(() => mergeIntoBulk(po.id)); }}>
        {busy ? "Adding…" : "Make it one bulk order"}
      </button>
      {msg && <span className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`}>{msg.text}</span>}
    </div>
  );
}

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
            {g.job_id == null && g.estimate_id != null ? (
              <><strong>{g.customer_name ?? "A sale"}</strong>{g.suburb && <span> · {g.suburb}</span>}<span className="pt-nw__muted"> · sold, install not booked yet</span></>
            ) : g.job_id == null ? <strong>Stock for the factory</strong> : (
              <>
                <strong>Job {g.job_number}</strong>
                {g.customer_name && <span> · {g.customer_name}</span>}
                {g.suburb && <span> · {g.suburb}</span>}
                <span className="pt-nw__muted"> · install {installWhen(g)}</span>
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
        const jobs = groups.filter((g) => g.job_id != null || g.estimate_id != null).length;
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

function OrderCard({ po, supplier, testTo, alwaysCc, delivery, noted, others = [] }: CardProps) {
  const total = linesTotal(po.lines);
  const needsModel = supplier?.method === "email_form";
  // What it's for, when, how much and how it gets here, in one line; then the
  // lines themselves, which are what get checked. Delivery and copies are
  // set once and rarely changed, so they fold.
  const jobs = [...new Map(po.lines.filter((l) => l.job_id != null).map((l) => [l.job_id, l])).values()];
  const sales = [...new Map(po.lines.filter(isAhead).map((l) => [l.estimate_id, l])).values()];
  const stock = po.lines.filter(isStock).length;
  const flagged = needsModel && po.lines.some((l) => modelLooksLikeName(l.supplier_model ?? l.sku_name ?? ""));
  const forWhat = jobs.length === 1 ? `For job ${jobs[0].job_number}${jobs[0].customer_name ? ` · ${jobs[0].customer_name}` : ""}`
    : jobs.length ? `For ${jobs.length} jobs: ${jobs.map((j) => j.job_number).join(", ")}`
    : sales.length ? `Ordered ahead for ${sales.map((x) => x.customer_name ?? "a sale").join(", ")}` : "Stock for the factory";
  return (
    <div className="nw-task__in">
      <p className="nw-task__po">
        <span>{supplier?.name ?? po.supplier_id} · {po.po_number}</span>
        {po.group_key.startsWith("bulk") && <span className="pt-nw__tag">Bulk order · this week and next</span>}
        <span>{forWhat}{jobs.length > 0 && sales.length > 0 ? ` and ${sales.length} sold, not booked yet` : ""}{(jobs.length > 0 || sales.length > 0) && stock > 0 ? ` and ${stock} for the factory` : ""}</span>
        <span><b>{money(total)}</b> ex GST</span>
      </p>
      {po.status === "draft" && po.kind === "order" && others.length > 0 && <MergeBulk po={po} others={others} name={supplier?.name ?? po.supplier_id} />}
      {flagged && <p className="pt-nw__flag" style={{ margin: "0 0 6px" }}>A line has no model number. Fill in Model on that item in the ServiceTitan pricebook.</p>}
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
                    {isAhead(l)
                      ? <><td><strong>Not booked</strong><span>{l.customer_name}</span></td><td>ordered ahead</td></>
                      : l.job_id == null
                      ? <><td><strong>Stock</strong><span>for the factory</span></td><td></td></>
                      : <><td><strong>{l.job_number}</strong><span>{l.customer_name}</span></td><td>{installWhen(l)}</td></>}
                    <td className="is-num">{l.unit_cost == null ? "" : money(l.unit_cost * l.qty)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {po.status === "draft" && <AddStock po={po} />}
      <details className="pt-nw__more">
        <summary>{po.status === "draft" ? "Delivery and copies" : "Where it went"}</summary>
        <p className="pt-panel__sub">
          {po.status === "sent" ? `Sent to ${po.sent_to}${po.approved_by ? ` by ${po.approved_by}` : ""}.` : howItGoes(supplier)}
        </p>
        <Delivery po={po} delivery={delivery} supplierName={supplier?.name} />
        <Cc po={po} supplier={supplier} alwaysCc={alwaysCc} />
      </details>
      <Buttons po={po} supplier={supplier} testTo={testTo} label={po.po_number} noted={noted} />
    </div>
  );
}

function WorkOrderCard({ po, supplier, testTo, alwaysCc, noted }: CardProps) {
  const d = po.details;
  // A work order is known by its job and address — that's what Geoff files it
  // under — so that is its heading, not the internal order number.
  const ref = d ? workRef(d) : po.po_number;
  return (
    <div className="nw-task__in">
      <p className="nw-task__po"><span>{ref}</span></p>
      <p className="pt-panel__sub">
        <strong>{d?.start_at ? dayTimeLabel(d.start_at) : d ? dayLabel(d.date) : ""}</strong>
        {" · "}{supplier?.name ?? "Contractor"} · {po.status === "sent" ? `sent to ${po.sent_to}` : howItGoes(supplier)}
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
    </div>
  );
}

/** The soonest install an order is for: what decides how soon it has to go. */
function firstInstall(po: PoWithLines): { appointment_start: string | null; install_date: string | null } | null {
  if (po.kind === "work_order") {
    const d = po.details;
    return d ? { appointment_start: d.start_at ?? null, install_date: d.date ?? null } : null;
  }
  const dated = po.lines.filter((l) => l.appointment_start ?? l.install_date);
  if (!dated.length) return null;
  return dated.reduce((a, b) => ((b.appointment_start ?? b.install_date!) < (a.appointment_start ?? a.install_date!) ? b : a));
}
const firstKey = (po: PoWithLines) => { const f = firstInstall(po); return f ? f.appointment_start ?? f.install_date ?? "~" : "~"; };

/** A sold quote with no install booked, its gear by supplier (page.tsx builds it from sold_unbooked_order_lines). */
/** One line of a sold, unbooked sale; `shelf` when we'll take it from the factory rather than order it. */
export type UnbookedItem = { name: string; qty: number; skuId: number | null; cost: number; shelf: boolean; ordered: string | null };

/** A booked job past the two drafted weeks, for one supplier: shown to order early. */
export type LaterJob = {
  supplierId: string; jobId: number; jobNumber: string | null; customer: string | null; suburb: string | null; install: string | null;
  items: { name: string; qty: number; cost: number }[]; cost: number;
};

export type UnbookedSale = {
  estimateId: number; customer: string | null; suburb: string | null; what: string | null; soldOn: string | null; total: number | null;
  quoteJob: string | null; issues: string[];
  /** The quote's job in ServiceTitan when it was sold on one; most are sold without, so the customer is the way in. */
  jobId: number | null; customerId: number | null;
  groups: { supplierId: string; supplier: string; items: UnbookedItem[]; cost: number; ordered: string | null; drafted: string | null }[];
};

/**
 * A search and a row of chips over a list in the side column. The chips are
 * one choice at a time; the first is always everything.
 */
function SideFilter({ q, setQ, find, chips, on, setOn, label }: {
  q: string; setQ: (v: string) => void; find: string;
  chips: { key: string; label: string; n: number }[]; on: string; setOn: (k: string) => void; label: string;
}) {
  return (
    <div className="nw-filt">
      <label className="qp-find">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={find} aria-label={find} />
      </label>
      {chips.length > 2 && (
        <div className="qp-people" role="group" aria-label={label}>
          {/* An empty chip only ever shows nothing; "(Seeley International)" and the like only make a chip wrap. */}
          {chips.filter((c) => c.key === "all" || c.n > 0).map((c) => ({ ...c, label: shortName(c.label) })).map((c) => (
            <button key={c.key} type="button" className={`qp-chip${on === c.key ? " on" : ""}`} aria-pressed={on === c.key} onClick={() => setOn(c.key)}>
              {c.label} · {c.n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const has = (needle: string, ...xs: (string | null | undefined)[]) => !needle || xs.some((x) => x?.toLowerCase().includes(needle));

/* ------------------------------------------------------------- the checklist */

type When = "today" | "week" | "next" | "none";

/**
 * When an order has to be dealt with. A supplier order: the day its gear is
 * needed at the factory (orderDelivery, three working days before the first
 * install, or the office's own date), today when that's come. A work order:
 * the day before the visit, so the contractor hears in time. Nothing dated
 * (stock, or gear ordered ahead of a booking) is whenever someone's ready.
 */
function dueOf(po: PoWithLines, today: string, weekEnd: string): { when: When; date: string | null } {
  let date: string | null;
  if (po.kind === "work_order") date = po.details?.date ? isoAddDays(po.details.date, -1) : null;
  else {
    const d = orderDelivery(po.lines, today, po.deliver_by);
    date = d ? d.date ?? today : null;
  }
  if (!date) return { when: "none", date: null };
  return { when: date <= today ? "today" : date <= weekEnd ? "week" : "next", date };
}

/** Inside this many days, an order not sent yet is flagged: the gear has to land before the crew does. */
const ALERT_DAYS = 4;

const melDay = (instant: string) => new Date(instant).toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
const daysTo = (day: string, today: string) => Math.round((Date.parse(`${day}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
const shortName = (name: string) => name.replace(/\s*\(.*\)\s*$/, "") || name;

/** The day an order is for: its first install, or a work order's visit. */
function dayOf(po: PoWithLines): string | null {
  if (po.kind === "work_order") return po.details?.date ?? null;
  const f = firstInstall(po);
  return f ? (f.appointment_start ? melDay(f.appointment_start) : f.install_date) : null;
}

const inWords = (n: number, what: string) =>
  n === 0 ? `${what} today` : n === 1 ? `${what} tomorrow` : n > 1 ? `${what} in ${n} days` : `${what} was ${-n} ${n === -1 ? "day" : "days"} ago`;

/** Who and what an order is for, under the supplier's name. */
function taskSub(po: PoWithLines): string {
  if (po.kind === "work_order") {
    const d = po.details;
    return [d?.site_address?.split(",")[0], ...(d?.jobs ?? []).map((j) => `job ${j.job_number}`), d?.trade ?? null].filter(Boolean).join(" · ");
  }
  const jobs = [...new Map(po.lines.filter((l) => l.job_id != null).map((l) => [l.job_id, l])).values()];
  const sales = [...new Map(po.lines.filter(isAhead).map((l) => [l.estimate_id, l])).values()];
  const stock = po.lines.some(isStock);
  return [
    jobs.length === 1 ? `${jobs[0].customer_name ?? "A customer"} · job ${jobs[0].job_number}` : jobs.length ? `${jobs.length} jobs: ${jobs.map((j) => j.job_number).join(", ")}` : null,
    sales.length ? `ordered ahead for ${sales.map((x) => x.customer_name ?? "a sale").join(" and ")}` : null,
    stock ? (jobs.length || sales.length ? "and factory stock" : "factory stock") : null,
    `${po.lines.length} ${po.lines.length === 1 ? "item" : "items"}`,
    po.pickup ? "we pick it up" : po.delivery_to_site ? "to the site" : null,
  ].filter(Boolean).join(" · ");
}

/**
 * How many days until the install (or the visit), said in words and flagged
 * with an alert inside ALERT_DAYS; nothing dated says why there's no day.
 */
function DaysTag({ po, today }: { po: PoWithLines; today: string }) {
  if (po.send_error) return <span className="pt-vstat pt-vstat--bad">Didn&rsquo;t send</span>;
  const d = dayOf(po);
  if (!d) return <span className="pt-vstat pt-vstat--none">{po.lines.some(isAhead) ? "Not booked yet" : "No install date"}</span>;
  const n = daysTo(d, today);
  const what = po.kind === "work_order" ? "Visit" : "Install";
  return <span className={`pt-vstat ${n <= ALERT_DAYS ? "pt-vstat--bad" : n <= 7 ? "pt-vstat--warn" : "pt-vstat--none"}`}>{n <= ALERT_DAYS ? "⚠ " : ""}{inWords(n, what)}</span>;
}
const isAlert = (po: PoWithLines, today: string) => { const d = dayOf(po); return !!po.send_error || (d != null && daysTo(d, today) <= ALERT_DAYS); };

function GroupHead({ name, n, note }: { name: string; n: number; note?: string }) {
  return (
    <div className="nw-gh">
      <h2>{name}</h2>
      <span>{note ?? `${n} to do`}</span>
    </div>
  );
}

/**
 * One line on the list: who it's from, what it's for, how much, and how many
 * days until the install; it drops down to what's in it, every line,
 * delivery and the button that sends it.
 */
function Task({ title, sub, tag, amount, alert, open = false, children }: { title: string; sub: string; tag: ReactNode; amount?: string; alert?: boolean; open?: boolean; children: ReactNode }) {
  return (
    <details className={`nw-task${alert ? " is-alert" : ""}`} open={open || undefined}>
      <summary>
        <span className={`nw-task__dot${alert ? " is-alert" : ""}`} aria-hidden="true">{alert ? "!" : ""}</span>
        <span className="nw-task__t"><b>{title}</b><span>{sub}</span></span>
        {amount && <b className="nw-task__amt">{amount}</b>}
        {tag}
        <span className="nw-task__chev" aria-hidden="true">⌄</span>
      </summary>
      <div className="nw-task__body">{children}</div>
    </details>
  );
}

/**
 * Sold, not booked in yet, a line per supplier: Mitsubishi, and every sold
 * job with gear from them, dropping down to each sale's gear with the button
 * that puts it on that supplier's order. Some suppliers take weeks, so their
 * gear is worth ordering the day it sells rather than the week of the
 * install; once the install is booked, it isn't ordered again.
 */
function AheadRows({ sales }: { sales: UnbookedSale[] }) {
  const { busy, msg, run } = useAct();
  if (!sales.length) return null;
  type Item = { sale: UnbookedSale; g: UnbookedSale["groups"][number] };
  const bySup = new Map<string, { name: string; items: Item[] }>();
  for (const sale of sales) for (const g of sale.groups) {
    const r = bySup.get(g.supplierId) ?? { name: shortName(g.supplier), items: [] };
    r.items.push({ sale, g });
    bySup.set(g.supplierId, r);
  }
  const open = (i: Item) => !i.g.ordered && !i.g.drafted;
  const rows = [...bySup.entries()].map(([id, r]) => ({ id, ...r, left: r.items.filter(open).length, cost: r.items.reduce((t, i) => t + i.g.cost, 0) }))
    .sort((a, b) => b.left - a.left || b.cost - a.cost);
  const unrouted = sales.filter((x) => x.issues.length);
  return (
    <div className="nw-grp" id="ahead">
      <GroupHead name="Order ahead · not booked yet" n={sales.length} note={`${sales.length} sold, install not booked`} />
      {rows.map((r) => (
        <Task key={r.id} title={r.name} amount={money(r.cost)}
          sub={`${r.items.length} sold ${r.items.length === 1 ? "job" : "jobs"}: ${r.items.map((i) => i.sale.customer ?? "a customer").join(", ")}`}
          tag={r.left ? <span className="pt-vstat pt-vstat--none">Not booked yet</span> : <span className="pt-vstat pt-vstat--ok">All on order</span>}>
          <ul className="nw-ahead2">
            {r.items.map(({ sale, g }) => (
              <li key={sale.estimateId}>
                <span className="nw-ahead2__t">
                  <b>{sale.customer ?? "A customer"}{sale.suburb ? ` · ${sale.suburb}` : ""}</b>
                  <span>{[sale.what, sale.soldOn ? `sold ${dayLabel(sale.soldOn)}` : null, sale.quoteJob ? `quoted on job ${sale.quoteJob}` : null].filter(Boolean).join(" · ")}</span>
                  <span>{g.items.map((i) => `${qty(i.qty)} × ${i.name}`).join(", ")}</span>
                </span>
                <b className="nw-task__amt">{money(g.cost)}</b>
                {g.ordered ? <span className="pt-vstat pt-vstat--ok">On order {g.ordered}</span>
                  : g.drafted ? <span className="pt-vstat pt-vstat--warn">On {g.drafted}, not sent yet</span>
                  : <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" disabled={busy} onClick={() => run(() => orderAheadNow({ estimateId: sale.estimateId, supplierId: g.supplierId }))}>Order ahead</button>}
              </li>
            ))}
          </ul>
          <p className="pt-nw__muted">It goes on {r.name}&rsquo;s order on this list, to send when you&rsquo;re ready. Once the install is booked, it isn&rsquo;t ordered again.</p>
        </Task>
      ))}
      {unrouted.length > 0 && <p className="nw-gnote">{unrouted.map((x) => `${x.customer ?? "A sale"}: ${x.issues.join(", ")}`).join(" · ")}</p>}
      {msg && <span className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`}>{msg.text}</span>}
    </div>
  );
}

/** Can't be ordered until something's fixed in ServiceTitan, each saying what. */
function ProblemRows({ problems }: { problems: Problem[] }) {
  const { busy, msg, run } = useAct();
  return (
    <>
      <p className="nw-gnote">
        Fix these in ServiceTitan and press Check now, or order them by hand. A job that moved after its order went isn&rsquo;t ordered twice:
        the order moves with it. Dealt with another way? Dismiss it; it comes back only if what&rsquo;s wrong changes.
      </p>
      {problems.map((p) => (
        <div key={problemKey(p)} className="nw-row">
          <span className="nw-task__dot is-bad" aria-hidden="true" />
          <span className="nw-task__t">
            <b>{p.job_number ? `Job ${p.job_number}` : "A job"}{p.customer_name ? ` · ${p.customer_name}` : ""}</b>
            <span>{p.what}{p.install_date ? ` · install ${dayLabel(p.install_date)}` : ""}</span>
          </span>
          <span className="pt-vstat pt-vstat--bad">Can&rsquo;t order</span>
          <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" disabled={busy} title="Dealt with: take it off this list" onClick={() => run(() => dismissProblem(problemKey(p)))}>Dismiss</button>
        </div>
      ))}
      {msg && <span className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`}>{msg.text}</span>}
    </>
  );
}

/**
 * What's already gone for this week's and next week's installs, newest first,
 * narrowed by the week it's for, by supplier, or by a job, customer or PO.
 * Ten show, the rest a press away; every order is on Sent too.
 */
function SentList({ gone, byId }: { gone: PoWithLines[]; byId: Map<string, Supplier> }) {
  const [q, setQ] = useState("");
  const [on, setOn] = useState("all");
  const [all, setAll] = useState(false);
  if (!gone.length) return null;
  const SHOW = 10;
  const weekStart = thisWeek(new Date()).start;
  const who = (o: PoWithLines) => o.kind === "work_order"
    ? o.details?.site_address?.split(",")[0] ?? o.po_number
    : o.lines.find((l) => l.customer_name)?.customer_name ?? (o.lines.some(isAhead) ? "ordered ahead" : "factory stock");
  const name = (o: PoWithLines) => byId.get(o.supplier_id)?.name ?? o.supplier_id;
  const sups = new Map<string, number>();
  for (const o of gone) sups.set(o.supplier_id, (sups.get(o.supplier_id) ?? 0) + 1);
  const thisWk = (o: PoWithLines) => o.week_of <= weekStart;
  const chips = [
    { key: "all", label: "All", n: gone.length },
    { key: "this", label: "This week", n: gone.filter(thisWk).length },
    { key: "next", label: "Next week", n: gone.filter((o) => !thisWk(o)).length },
    ...[...sups.entries()].sort((a, b) => b[1] - a[1]).map(([key, n]) => ({ key, label: byId.get(key)?.name ?? key, n })),
  ];
  const needle = q.trim().toLowerCase();
  const list = [...gone]
    .filter((o) => on === "all" || (on === "this" ? thisWk(o) : on === "next" ? !thisWk(o) : o.supplier_id === on))
    .filter((o) => has(needle, o.po_number, name(o), who(o), ...o.lines.flatMap((l) => [l.job_number, l.customer_name, l.sku_name, l.supplier_model])))
    .sort((a, b) => (b.sent_at ?? "").localeCompare(a.sent_at ?? ""));
  const value = list.filter((o) => o.kind === "order").reduce((t, o) => t + linesTotal(o.lines), 0);
  return (
    <section className="pt-panel nw-sent" aria-label="Already sent">
      <div className="nw-sent__h">
        <h2 className="pt-panel__h">Already sent</h2>
        <span className="nw-sent__n">{list.length}{value ? ` · ${money(value)}` : ""}</span>
      </div>
      <p className="pt-panel__sub">For this week&rsquo;s and next week&rsquo;s installs.</p>
      <SideFilter q={q} setQ={setQ} find="Find a job, customer or PO" chips={chips} on={on} setOn={setOn} label="Show" />
      {!list.length && <p className="nw-none">Nothing matches that.</p>}
      <ul>
        {(all ? list : list.slice(0, SHOW)).map((o) => (
          <li key={o.id}>
            <span className="nw-sent__tick" aria-hidden="true">✓</span>
            <span className="nw-sent__t"><b>{name(o)}</b><span>{who(o)}{o.sent_at ? ` · ${dayLabel(o.sent_at.slice(0, 10))}` : ""}</span></span>
            {o.kind === "order" && <span className="nw-sent__v">{money(linesTotal(o.lines))}</span>}
          </li>
        ))}
      </ul>
      {list.length > SHOW && <button type="button" className="nw-sent__all" onClick={() => setAll(!all)}>{all ? "Show fewer" : `Show all ${list.length}`}</button>}
      <a className="nw-sent__all" href="/portal/supply/sent">Every order on Sent</a>
    </section>
  );
}

export function NextWeekOrders(props: {
  dbReady: boolean;
  appointmentsSynced: boolean;
  /** This week's and next week's orders together. */
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
  later?: LaterJob[];
  /** Supplier orders still drafts this week and next, to offer making a supplier's into one. */
  allDrafts?: DraftRef[];
  /** Sold quotes with no install booked yet, to order ahead from. */
  unbooked?: UnbookedSale[];
}) {
  const { dbReady, appointmentsSynced, orders, suppliers, problems, testTo, alwaysCc, delivery, holds } = props;
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
  // Supplier orders and work orders together, in the order they're needed:
  // the week an order was drafted for is the system's business.
  const shown = live.filter((o) => o.status === "draft").sort((a, b) => firstKey(a).localeCompare(firstKey(b)));
  const today = todayMelbourne();
  const weekEnd = thisWeek(new Date()).end;
  const due = new Map(shown.map((po) => [po.id, dueOf(po, today, weekEnd)]));
  const groups: { key: When; name: string; pos: PoWithLines[] }[] = [
    { key: "today", name: "Today", pos: [] },
    { key: "week", name: "This week", pos: [] },
    { key: "next", name: "Next week", pos: [] },
    { key: "none", name: "When you’re ready", pos: [] },
  ];
  for (const po of shown) groups.find((g) => g.key === due.get(po.id)!.when)!.pos.push(po);

  const card = (po: PoWithLines) => po.kind === "work_order"
    ? <WorkOrderCard po={po} supplier={byId.get(po.supplier_id)} testTo={testTo} alwaysCc={alwaysCc} delivery={delivery} noted={noted.has(po.supplier_id)} />
    : <OrderCard po={po} supplier={byId.get(po.supplier_id)} testTo={testTo} alwaysCc={alwaysCc} delivery={delivery} noted={noted.has(po.supplier_id)} others={(props.allDrafts ?? []).filter((d) => d.supplier === po.supplier_id && d.id !== po.id)} />;

  // One card per supplier, as the mock has it: what's booked to send,
  // soonest install first, then what's sold and not booked yet, every line a
  // tick, the card's foot the order as it stands.
  const orderDrafts = shown.filter((o) => o.kind === "order");
  const workOrders = shown.filter((o) => o.kind === "work_order");
  const cards = supplierCards(orderDrafts, props.unbooked ?? [], holds, byId, today, props.later ?? []);
  const installs = cards.reduce((n, c) => n + c.jobs.length, 0);
  const soonCards = cards.filter((c) => c.firstDays != null && c.firstDays <= ALERT_DAYS);
  const aheadN = cards.reduce((n, c) => n + c.ahead.filter((a) => !a.onDraft).length, 0);
  const first = cards.find((c) => c.jobs.length);
  const firstJob = first?.jobs[0];
  const goneTotal = gone.filter((o) => o.kind === "order").reduce((t, o) => t + linesTotal(o.lines), 0);

  return (
    <StockedCtx.Provider value={new Set(props.stocked ?? [])}>
    <div className="pt-nw to2">
      <KpiHead title="To order" kpis={[
        { icon: "box", fig: String(installs), label: "Installs to send", badge: soonCards.length ? `▲ ${soonCards.reduce((n, c) => n + c.jobs.filter((j) => j.days != null && j.days <= ALERT_DAYS).length, 0)}` : undefined, tone: soonCards.length ? "down" : undefined },
        { icon: "clock", fig: String(soonCards.length), label: `Within ${ALERT_DAYS} days`, badge: soonCards[0] ? shortName(soonCards[0].name) : undefined, tone: soonCards.length ? "down" : undefined },
        { icon: "tag", fig: String(aheadN), label: "Sold, not booked", badge: aheadN ? `${aheadN} ahead` : undefined },
      ]} />
      <p className="to2-lede">
        {firstJob && first ? <>The {shortName(first.name)} order for {firstJob.customer ?? `job ${firstJob.jobNumber}`} is <b className={firstJob.days != null && firstJob.days <= ALERT_DAYS ? "b" : undefined}>needed {firstJob.install ? dayLabel(firstJob.install) : "soon"}</b>{firstJob.days != null ? `: install ${firstJob.days <= 0 ? "today" : firstJob.days === 1 ? "tomorrow" : `in ${firstJob.days} days`}` : ""}. </> : null}
        {installs ? `${installs} ${installs === 1 ? "install" : "installs"} to send across ${cards.filter((c) => c.jobs.length).length} ${cards.filter((c) => c.jobs.length).length === 1 ? "supplier" : "suppliers"}.` : "Nothing booked waiting to be sent."}
      </p>
      {!appointmentsSynced && (
        <p className="pt-note">
          <strong>Booking times are still coming across from ServiceTitan.</strong> Until they have, no install has a date, so there is
          nothing to draft. The sync runs every ten minutes.
        </p>
      )}

      <Board cards={cards} problems={problems} byId={byId} testTo={testTo} alwaysCc={alwaysCc} delivery={delivery} noted={noted} suppliers={suppliers} />

      {workOrders.length > 0 && (
        <section className="pt-panel nw-check to2-wo" aria-label="Work orders to send">
          <GroupHead name="Work orders to send" n={workOrders.length} />
          {workOrders.map((po) => (
            <Task key={po.id} title={shortName(byId.get(po.supplier_id)?.name ?? po.supplier_id)} sub={taskSub(po)} tag={<DaysTag po={po} today={today} />} alert={isAlert(po, today)}>
              <WorkOrderCard po={po} supplier={byId.get(po.supplier_id)} testTo={testTo} alwaysCc={alwaysCc} delivery={delivery} noted={noted.has(po.supplier_id)} />
            </Task>
          ))}
        </section>
      )}

      <p className="to2-gone">
        <span>Already sent for this week and next: <b>{gone.length} {gone.length === 1 ? "order" : "orders"}</b>{goneTotal ? ` · ${money(goneTotal)} ex GST` : ""}.</span>
        <a href="/portal/supply/sent">See them on Sent ›</a>
      </p>
      {cancelled > 0 && <p className="pt-nw__muted">{cancelled} cancelled draft{cancelled === 1 ? "" : "s"} not shown.</p>}
      <PullLatest />
    </div>
    </StockedCtx.Provider>
  );
}

/* ------------------------------------------------- the board: a card per supplier */

type JobRow = { key: string; jobId: number; jobNumber: string | null; customer: string | null; suburb: string | null; install: string | null; days: number | null; lines: PoLine[]; cost: number; po: PoWithLines };
type AheadRow = {
  key: string; estimateId: number; customer: string | null; what: string; soldOn: string | null; cost: number; onDraft: boolean; ordered: string | null;
  items: UnbookedItem[]; jobId: number | null; customerId: number | null; quoteJob: string | null;
};
type SupCard = { id: string; name: string; supplier: Supplier | undefined; drafts: PoWithLines[]; jobs: JobRow[]; ahead: AheadRow[]; held: Hold[]; later: LaterJob[]; stock: PoLine[]; firstDays: number | null };

/** Held lines by job, soonest install first: one row a job, not one a line. */
function heldJobs(holds: Hold[]): { jobId: number; holds: Hold[] }[] {
  const by = new Map<number, Hold[]>();
  for (const h of holds) by.set(h.job_id, [...(by.get(h.job_id) ?? []), h]);
  return [...by.entries()].map(([jobId, hs]) => ({ jobId, holds: hs }))
    .sort((a, b) => (a.holds[0].install_date ?? "9999").localeCompare(b.holds[0].install_date ?? "9999"));
}

function supplierCards(drafts: PoWithLines[], unbooked: UnbookedSale[], holds: Hold[], byId: Map<string, Supplier>, today: string, later: LaterJob[] = []): SupCard[] {
  const cards = new Map<string, SupCard>();
  const get = (id: string, name?: string) => {
    let c = cards.get(id);
    if (!c) { c = { id, name: byId.get(id)?.name ?? name ?? id, supplier: byId.get(id), drafts: [], jobs: [], ahead: [], held: [], later: [], stock: [], firstDays: null }; cards.set(id, c); }
    return c;
  };
  for (const po of drafts) {
    const c = get(po.supplier_id);
    c.drafts.push(po);
    const byJobId = new Map<number, PoLine[]>();
    for (const l of po.lines) {
      if (isAhead(l)) continue;
      if (l.job_id == null) { c.stock.push(l); continue; }
      byJobId.set(l.job_id, [...(byJobId.get(l.job_id) ?? []), l]);
    }
    for (const [jobId, ls] of byJobId) {
      const f = ls[0];
      const install = f.appointment_start ? melDay(f.appointment_start) : f.install_date;
      c.jobs.push({ key: `j${po.id}-${jobId}`, jobId, jobNumber: f.job_number, customer: f.customer_name, suburb: f.suburb, install, days: install ? daysTo(install, today) : null, lines: ls, cost: linesTotal(ls), po });
    }
  }
  for (const sale of unbooked) for (const g of sale.groups) {
    if (g.ordered) continue;
    const c = get(g.supplierId, g.supplier);
    const toOrder = g.items.filter((i) => !i.shelf && !i.ordered);
    c.ahead.push({
      items: g.items, jobId: sale.jobId, customerId: sale.customerId, quoteJob: sale.quoteJob,
      key: `a${sale.estimateId}`, estimateId: sale.estimateId, customer: sale.customer,
      what: toOrder.length
        ? toOrder.slice(0, 3).map((i) => i.name).join(", ") + (toOrder.length > 3 ? ` and ${toOrder.length - 3} more` : "") + (toOrder.length < g.items.length ? ` · ${g.items.length - toOrder.length} sorted` : "")
        : "All sorted",
      soldOn: sale.soldOn, cost: g.cost, onDraft: !!g.drafted, ordered: g.ordered,
    });
  }
  // Held lines sit in their supplier's card, unticked, so a late one can be
  // ticked back onto the order that's going rather than wait for next week.
  for (const h of holds) get(h.supplier_id).held.push(h);
  for (const l of later) get(l.supplierId).later.push(l);
  for (const c of cards.values()) {
    c.jobs.sort((a, b) => (a.install ?? "9999").localeCompare(b.install ?? "9999"));
    c.firstDays = c.jobs.find((j) => j.days != null)?.days ?? null;
  }
  return [...cards.values()].filter((c) => c.jobs.length || c.ahead.length || c.stock.length || c.held.length || c.later.length)
    .sort((a, b) => (a.firstDays ?? 9999) - (b.firstDays ?? 9999) || a.name.localeCompare(b.name));
}

const initials = (name: string) => shortName(name).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const daysPill = (days: number | null, what = "Install") => days == null
  ? <span className="pt-vstat pt-vstat--none">No install date</span>
  : <span className={`pt-vstat ${days <= ALERT_DAYS ? "pt-vstat--bad" : days <= 7 ? "pt-vstat--warn" : "pt-vstat--none"}`}>{inWords(days, what)}</span>;

type Filter = "all" | "send" | "ahead";

function Board({ cards, problems, byId, testTo, alwaysCc, delivery, noted, suppliers }: {
  cards: SupCard[]; problems: Problem[]; byId: Map<string, Supplier>; testTo: string; alwaysCc: string; delivery: DeliverySettings; noted: Set<string>; suppliers: Supplier[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const shownCards = cards.filter((c) => filter === "all" || (filter === "send" ? c.jobs.length || c.held.length || c.later.length : c.ahead.length));
  return (
    <>
      <div className="to2-bar">
        <nav className="to2-chips" aria-label="Show">
          {([["all", "Every supplier"], ["send", "To send"], ["ahead", "Sold, not booked"]] as [Filter, string][]).map(([k, w]) => (
            <button key={k} type="button" className={filter === k ? "on" : undefined} aria-pressed={filter === k} onClick={() => setFilter(k)}>{w}</button>
          ))}
        </nav>
        <span className="to2-tools">
          <AddStock suppliers={suppliers.filter((x) => x.active && x.method !== "work_order").sort((a, b) => a.name.localeCompare(b.name))} />
        </span>
      </div>

      {problems.length > 0 && <CantOrder problems={problems} />}

      {shownCards.length === 0 && <section className="pk-card to2-card to2-empty"><b>Nothing to order here.</b><span>A new booking is drafted within minutes. Press Check now at the foot of the page to make it from the bookings as they stand.</span></section>}
      {shownCards.map((c) => <SupplierCard key={c.id} c={c} filter={filter} testTo={testTo} alwaysCc={alwaysCc} delivery={delivery} noted={noted.has(c.id)} byId={byId} />)}
    </>
  );
}

/** Tick boxes over a list of lines, and the "Ordered online" where-from box. */
function useTicks<K>() {
  const [on, setOn] = useState<Set<K>>(new Set());
  const flip = (k: K) => setOn((cur) => { const n = new Set(cur); n.has(k) ? n.delete(k) : n.add(k); return n; });
  return { on, flip, set: setOn };
}

/**
 * What to do with the ticked lines: from the factory, ordered already, or
 * bought online from somewhere else (asks where, so the tech knows). Whatever
 * isn't ticked stays to order.
 */
function TickBar({ n, all, toggleAll, busy, onStock, onOrdered, onOnline, extra }: {
  n: number; all: boolean; toggleAll: () => void; busy: boolean;
  onStock: () => void; onOrdered: () => void; onOnline: (where: string) => void; extra?: React.ReactNode;
}) {
  const [asking, setAsking] = useState(false);
  const [where, setWhere] = useState("");
  const what = n ? ` (${n})` : "";
  return (
    <div className="to2-quick to2-tickbar">
      <button type="button" className="to2-all" onClick={toggleAll}>{all ? "Untick all" : "Tick all"}</button>
      {asking ? (
        <span className="to2-where">
          <input id="to2-where" className="pk-in" placeholder="Where from? eBay, Bunnings, the maker…" value={where} autoFocus
            onChange={(e) => setWhere(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { onOnline(where); setAsking(false); } }} aria-label="Where it was ordered" />
          <button type="button" className="pk-btn to2-b" disabled={busy} onClick={() => { onOnline(where); setAsking(false); }}>Mark ordered online{what}</button>
          <button type="button" className="pk-btn g to2-b" onClick={() => setAsking(false)}>Cancel</button>
        </span>
      ) : (
        <>
          <button type="button" className="pk-btn g to2-b" disabled={busy || !n} title="We have it at the factory: off the order" onClick={onStock}>In stock{what}</button>
          <button type="button" className="pk-btn g to2-b" disabled={busy || !n} title="Ordered another way already: off the order, counted as ordered" onClick={onOrdered}>Already ordered{what}</button>
          <button type="button" className="pk-btn g to2-b" disabled={busy || !n} title="Bought from another site: off the order, and a note on the job for the tech" onClick={() => setAsking(true)}>Ordered online{what}</button>
          {extra}
        </>
      )}
    </div>
  );
}

/**
 * An opened job's lines, each with a tick, and what to do with the ticked
 * ones. Some gear we keep, some we buy elsewhere: those come off, and the rest
 * goes on the order as normal.
 */
function JobLines({ po, lines, jobId, reece }: { po: PoWithLines; lines: PoLine[]; jobId: number; reece: boolean }) {
  const { busy, msg, run } = useAct();
  const t = useTicks<number>();
  const ids = lines.map((l) => l.id).filter((id) => t.on.has(id));
  const picked = lines.filter((l) => t.on.has(l.id));
  const until = nextWeek(new Date()).start;
  const late = picked.some((l) => l.install_date && neededBy(l.install_date) < until);
  const after = (fn: () => Promise<ActionResult>) => run(async () => { const r = await fn(); if (r.ok) t.set(new Set()); return r; });
  return (
    <div className="to2-items">
      {lines.map((l) => {
        const on = t.on.has(l.id);
        return (
          <div key={l.id} className="to2-item to2-pick">
            <button type="button" role="checkbox" aria-checked={on} className={`to2-tick sm${on ? " on" : ""}`} onClick={() => t.flip(l.id)}
              aria-label={`Tick ${l.supplier_model ?? l.sku_name ?? "this line"}`} />
            <span onClick={() => t.flip(l.id)}>{qty(l.qty)} × {l.supplier_model ?? l.sku_name ?? "Item"}{l.description && l.description !== (l.supplier_model ?? l.sku_name) ? ` · ${l.description}` : ""}{reece && l.supplier_part ? ` · Reece # ${l.supplier_part}` : ""}</span>
            <b>{l.unit_cost == null ? "" : money(l.unit_cost * l.qty)}</b>
          </div>
        );
      })}
      <TickBar n={ids.length} all={ids.length === lines.length} busy={busy}
        toggleAll={() => t.set(ids.length === lines.length ? new Set() : new Set(lines.map((l) => l.id)))}
        onStock={() => after(() => fromStock({ id: po.id, lineIds: ids, items: picked.map((l) => ({ key: stockKey(l), name: l.supplier_model ?? l.sku_name ?? l.description ?? "" })) }))}
        onOrdered={() => after(() => linesOrdered({ id: po.id, lineIds: ids }))}
        onOnline={(where) => after(() => linesOrdered({ id: po.id, lineIds: ids, online: true, where }))}
        extra={<>
          <button type="button" className="pk-btn g to2-b" disabled={busy || !ids.length} title={`Drafted again on ${dayLabel(until)}`}
            onClick={() => after(() => holdForNextWeek({ id: po.id, lineIds: ids }))}>Next week{late ? " (late)" : ""}</button>
          <a className="pk-btn g to2-b" href={`https://go.servicetitan.com/#/Job/Index/${jobId}`} target="_blank" rel="noreferrer">Job in ServiceTitan ↗</a>
        </>} />
      {msg && <span className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`}>{msg.text}</span>}
    </div>
  );
}

/**
 * A sold, unbooked sale's lines for one supplier, each with a tick: some gear
 * we keep, some we buy elsewhere, and what's left is what Order ahead orders.
 * Marked against the sale, so it carries through once the job is booked.
 */
function AheadItems({ a, supplierId }: { a: AheadRow; supplierId: string }) {
  const { busy, msg, run } = useAct();
  const t = useTicks<number>();
  const open = a.items.map((i, n) => ({ i, n })).filter(({ i }) => !i.shelf && !i.ordered);
  const picked = open.filter(({ n }) => t.on.has(n)).map(({ i }) => ({ skuId: i.skuId, name: i.name }));
  const mark = (m: "stock" | "ordered" | "online", where?: string) =>
    run(async () => { const r = await unbookedLines({ estimateId: a.estimateId, supplierId, items: picked, mark: m, where }); if (r.ok) t.set(new Set()); return r; });
  const st = a.jobId ? `https://go.servicetitan.com/#/Job/Index/${a.jobId}` : a.customerId ? `https://go.servicetitan.com/#/Customer/${a.customerId}` : null;
  return (
    <div className="to2-items">
      {a.items.map((i, n) => {
        const done = i.shelf || !!i.ordered;
        const on = t.on.has(n);
        return (
          <div key={`${i.skuId ?? "x"}-${n}`} className={`to2-item to2-pick${done ? " is-shelf" : ""}`}>
            {done
              ? <span className="to2-tick sm on" aria-hidden="true" />
              : <button type="button" role="checkbox" aria-checked={on} disabled={a.onDraft} className={`to2-tick sm${on ? " on" : ""}`} onClick={() => t.flip(n)} aria-label={`Tick ${i.name}`} />}
            <span onClick={() => !done && !a.onDraft && t.flip(n)}>{qty(i.qty)} × {i.name}</span>
            {i.shelf
              ? <button type="button" className="pk-btn g to2-b on" disabled={busy} title="Order it after all" onClick={() => run(() => shelfLine({ estimateId: a.estimateId, skuId: i.skuId, name: i.name, on: false }))}>From the factory ✓</button>
              : i.ordered
              ? <span className="pt-vstat pt-vstat--ok">Ordered · {i.ordered}</span>
              : <b>{money(i.cost)}</b>}
          </div>
        );
      })}
      {a.onDraft
        ? <div className="to2-quick"><span className="pt-nw__muted">On the order already: take it off there to change what goes.</span>{st && <a className="pk-btn g to2-b" href={st} target="_blank" rel="noreferrer">{a.jobId ? "Job in ServiceTitan" : "Customer in ServiceTitan"} ↗</a>}</div>
        : open.length > 0 && (
          <TickBar n={picked.length} all={picked.length === open.length} busy={busy}
            toggleAll={() => t.set(picked.length === open.length ? new Set() : new Set(open.map(({ n }) => n)))}
            onStock={() => mark("stock")} onOrdered={() => mark("ordered")} onOnline={(w) => mark("online", w)}
            extra={st ? <a className="pk-btn g to2-b" href={st} target="_blank" rel="noreferrer">{a.jobId ? `Job ${a.quoteJob ? `#${a.quoteJob} ` : ""}in ServiceTitan` : "Customer in ServiceTitan"} ↗</a> : null} />
        )}
      {msg && <span className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`}>{msg.text}</span>}
    </div>
  );
}

/** Can't be ordered yet: dashed, at the top, each saying what's wrong and what to do. */
function CantOrder({ problems }: { problems: Problem[] }) {
  const { busy, msg, run } = useAct();
  const today = todayMelbourne();
  return (
    <section className="to2-cant" aria-label="Can't order yet">
      {problems.map((p) => (
        <div key={problemKey(p)} className="to2-cantrow">
          <span className="to2-tick bad" aria-hidden="true" />
          <span className="to2-t">
            <b>Can&rsquo;t order yet · {p.customer_name ?? "a customer"}{p.job_number ? `, job ${p.job_number}` : ""}</b>
            <span>{p.what}{p.install_date ? ` · install ${dayLabel(p.install_date)}` : ""} · fix it in ServiceTitan, then press Check now</span>
          </span>
          {p.install_date && daysPill(daysTo(p.install_date, today))}
          <button type="button" className="pk-btn g to2-b" disabled={busy} title="Dealt with another way: take it off this list" onClick={() => run(() => dismissProblem(problemKey(p)))}>Dismiss</button>
        </div>
      ))}
      {msg && <span className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`}>{msg.text}</span>}
    </section>
  );
}

type ReeceOk = Extract<Preview, { ok: true }>;

/**
 * What Reece made of the order before anything is bought: one maX order per
 * job, each line at our account's price, any cartage, and anything Reece
 * can't take. Placing is a second press, and only of what's shown here.
 */
function ReeceCheck({ rp, busy, onPlace, onCancel }: { rp: ReeceOk; busy: boolean; onPlace: () => void; onCancel: () => void }) {
  const toGo = rp.jobs.filter((j) => !j.placed && j.lines.length);
  const total = toGo.reduce((t, j) => t + j.totalEx + (j.cartage ?? 0), 0);
  const needed = (v: string) => (v ? dayLabel(v.slice(0, 10)) : "");
  return (
    <div className="to2-rx" role="region" aria-label="Reece's check of the order">
      <p className="to2-rxlede"><b>Reece has checked and priced it.</b> Nothing is ordered until you press Place. One maX order per job, delivered as set under More.</p>
      {rp.jobs.map((j) => (
        <div key={j.key} className={`to2-rxjob${j.problems.length && !j.placed ? " bad" : ""}`}>
          <div className="to2-rxh">
            <b>{j.jobNumber ? `Job ${j.jobNumber}` : "Factory stock"}{j.customer ? ` · ${j.customer}` : ""}</b>
            <span>{j.placed ? `Already in maX${j.placed.reece_id ? `, order #${j.placed.reece_id}` : ""}` : j.requiredBy ? `needed ${needed(j.requiredBy)}` : ""}</span>
          </div>
          {!j.placed && j.lines.map((l) => (
            <div key={l.productId} className="to2-item">
              <span>{qty(l.quantity)} {l.uom} × {l.name} · Reece # {l.productId}{l.status && l.status !== "OK" ? ` · ${l.status.toLowerCase().replace(/_/g, " ")}` : ""}</span>
              <b>{l.ex == null ? "" : money(l.ex * l.quantity)}</b>
            </div>
          ))}
          {!j.placed && j.cartage ? <div className="to2-item"><span>Cartage</span><b>{money(j.cartage)}</b></div> : null}
          {!j.placed && j.problems.map((p) => <p key={p} className="to2-rxbad">✕ {p}</p>)}
        </div>
      ))}
      {rp.blocked && <p className="pt-note pt-note--warn" style={{ margin: 0 }}>{rp.blocked}</p>}
      <div className="to2-foot">
        <button type="button" className="pk-btn to2-send" disabled={busy || !!rp.blocked} onClick={onPlace}>
          {busy ? "Placing…" : `Place ${toGo.length} ${toGo.length === 1 ? "order" : "orders"} with Reece`}
        </button>
        <button type="button" className="pk-btn g" disabled={busy} onClick={onCancel}>Not now</button>
        <span className="to2-sum">Reece&rsquo;s price · <b>{money(total)}</b> ex GST</span>
      </div>
    </div>
  );
}

function SupplierCard({ c, filter, testTo, alwaysCc, delivery, noted, byId }: { c: SupCard; filter: Filter; testTo: string; alwaysCc: string; delivery: DeliverySettings; noted: boolean; byId: Map<string, Supplier> }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // Every booked install ticked to start; sold-not-booked ones are the office's choice.
  const [off, setOff] = useState<Set<string>>(new Set());
  const [ahead, setAhead] = useState<Set<number>>(new Set());
  const [rel, setRel] = useState<Set<number>>(new Set());
  const [lat, setLat] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState<Set<string>>(() => new Set(c.jobs.slice(0, 1).map((j) => j.key)));
  const flip = (set: Set<string>, k: string) => { const n = new Set(set); n.has(k) ? n.delete(k) : n.add(k); return n; };
  const ticked = c.jobs.filter((j) => !off.has(j.key));
  const total = c.later.filter((l) => lat.has(l.jobId)).reduce((t, l) => t + l.cost, 0) + ticked.reduce((t, j) => t + j.cost, 0) + c.ahead.filter((a) => a.onDraft || ahead.has(a.estimateId)).reduce((t, a) => t + a.cost, 0) + linesTotal(c.stock);
  const count = ticked.length + c.ahead.filter((a) => a.onDraft || ahead.has(a.estimateId)).length + (c.stock.length ? 1 : 0) + rel.size + lat.size;
  const reece = c.supplier?.method === "reece_cart";
  const label = sendLabel(c.supplier);
  const send = () => {
    const leave = c.jobs.filter((j) => off.has(j.key)).flatMap((j) => j.lines.map((l) => l.id));
    if (leave.length && !confirm(`${c.jobs.length - ticked.length} unticked ${c.jobs.length - ticked.length === 1 ? "job is" : "jobs are"} left off this order and stay on To order for later. Carry on?`)) return;
    start(async () => {
      setMsg(null);
      const r = await sendSupplier({ supplierId: c.id, ahead: [...ahead], leave, release: [...rel], later: [...lat] });
      setMsg(r.ok ? { ok: true, text: r.note ?? "Sent." } : { ok: false, text: r.error ?? "It didn't send." });
      router.refresh();
    });
  };
  const quick = (fn: () => Promise<ActionResult>) => start(async () => { const r = await fn(); setMsg(r.ok ? { ok: true, text: r.note ?? "Done." } : { ok: false, text: r.error ?? "Couldn't do that." }); router.refresh(); });
  // Reece goes into maX through Reece's API: looked at first, then placed.
  const [rp, setRp] = useState<{ check: ReeceOk; leave: number[] } | null>(null);
  const checkReece = () => {
    const leave = c.jobs.filter((j) => off.has(j.key)).flatMap((j) => j.lines.map((l) => l.id));
    start(async () => {
      setMsg(null);
      const r = await reecePreview({ supplierId: c.id, ahead: [...ahead], leave, release: [...rel] });
      if (r.ok) setRp({ check: r, leave }); else setMsg({ ok: false, text: r.error });
      router.refresh();
    });
  };
  const placeReece = () => {
    if (!rp) return;
    if (rp.leave.length && !confirm(`${c.jobs.length - ticked.length} unticked ${c.jobs.length - ticked.length === 1 ? "job is" : "jobs are"} left off and stay on To order for later. Place the rest with Reece?`)) return;
    start(async () => {
      setMsg(null);
      const r = await reecePlace({ poId: rp.check.poId, leave: rp.leave, fingerprint: rp.check.fingerprint });
      setMsg(r.ok ? { ok: true, text: r.note ?? "Ordered in maX." } : { ok: false, text: r.error ?? "It didn't go into maX." });
      setRp(null);
      router.refresh();
    });
  };
  const po = c.drafts[0];
  const showSend = filter !== "ahead";
  const showAhead = filter !== "send";
  return (
    <section className="pk-card to2-card" aria-labelledby={`to2-${c.id}`}>
      <div className="to2-h">
        <span className="to2-badge" aria-hidden="true">{initials(c.name)}</span>
        <span className="to2-t">
          <b id={`to2-${c.id}`}>{shortName(c.name)}</b>
          <span>{[c.jobs.length ? `${c.jobs.length} ${c.jobs.length === 1 ? "install" : "installs"} to send` : null, c.held.length ? `${heldJobs(c.held).length} held` : null, c.later.length ? `${c.later.length} booked further out` : null, c.ahead.length ? `${c.ahead.length} sold, not booked` : null, c.stock.length ? "factory stock" : null].filter(Boolean).join(" · ")}</span>
        </span>
        {c.firstDays != null && <span className={`pt-vstat ${c.firstDays <= ALERT_DAYS ? "pt-vstat--bad" : c.firstDays <= 7 ? "pt-vstat--warn" : "pt-vstat--none"}`}>{c.firstDays <= ALERT_DAYS ? "⚠ " : ""}{inWords(c.firstDays, "First install")}</span>}
      </div>

      {showSend && c.jobs.length > 0 && (
        <>
          <div className="to2-lh">To send, soonest install first</div>
          <ul className="to2-rows">
            {c.jobs.map((j) => {
              const on = !off.has(j.key);
              const isOpen = open.has(j.key);
              return (
                <li key={j.key} className={on ? undefined : "off"}>
                  <div className="to2-row">
                    <button type="button" role="checkbox" aria-checked={on} aria-label={`${on ? "Leave off" : "Put on"} the order: ${j.customer ?? `job ${j.jobNumber}`}`} className={`to2-tick${on ? " on" : ""}${j.days != null && j.days <= ALERT_DAYS ? " bad" : ""}`} onClick={() => setOff(flip(off, j.key))} />
                    <button type="button" className="to2-t to2-open" aria-expanded={isOpen} onClick={() => setOpen(flip(open, j.key))}>
                      <b>{j.customer ?? "A customer"}</b>
                      <span>Job {j.jobNumber}{j.suburb ? ` · ${j.suburb}` : ""}{j.install ? ` · install ${dayLabel(j.install)}` : ""} · {j.lines.length} {j.lines.length === 1 ? "item" : "items"}</span>
                    </button>
                    <b className="to2-amt">{money(j.cost)}</b>
                    {daysPill(j.days)}
                    <span className={`to2-chev${isOpen ? " open" : ""}`} aria-hidden="true">›</span>
                  </div>
                  {isOpen && <JobLines po={j.po} lines={j.lines} jobId={j.jobId} reece={reece} />}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {showSend && c.held.length > 0 && (
        <>
          <div className="to2-lh">Held for next week · tick to send now</div>
          <ul className="to2-rows">
            {heldJobs(c.held).map((g) => {
              const ids = g.holds.map((h) => h.id);
              const on = ids.every((id) => rel.has(id));
              const f = g.holds[0];
              const due = f.install_date ? neededBy(f.install_date) : null;
              const late = !!due && due < f.until;
              const days = f.install_date ? daysTo(f.install_date, todayMelbourne()) : null;
              const k = `h${g.jobId}`;
              return (
                <li key={k} className={on ? undefined : "off"}>
                  <div className="to2-row">
                    <button type="button" role="checkbox" aria-checked={on} aria-label={`${on ? "Keep held" : "Send now"}: job ${f.job_number}`} className={`to2-tick${on ? " on" : ""}${late ? " bad" : ""}`}
                      onClick={() => { const n = new Set(rel); ids.forEach((id) => (on ? n.delete(id) : n.add(id))); setRel(n); }} />
                    <button type="button" className="to2-t to2-open" aria-expanded={open.has(k)} onClick={() => setOpen(flip(open, k))}>
                      <b>{f.customer_name ?? "A customer"}</b>
                      <span>Job {f.job_number}{f.install_date ? ` · install ${dayLabel(f.install_date)}` : ""} · {g.holds.length} {g.holds.length === 1 ? "item" : "items"} · held{f.held_by ? ` by ${f.held_by.split(" ")[0]}` : ""} until {dayLabel(f.until)}</span>
                    </button>
                    {late ? <span className="pt-vstat pt-vstat--bad">Needed by {dayLabel(due!)}</span> : daysPill(days)}
                    <button type="button" className="pk-btn g to2-b" disabled={busy} title="Back on the order to send, without sending anything"
                      onClick={() => quick(() => releaseHolds({ holdIds: ids }))}>Put back</button>
                    <span className={`to2-chev${open.has(k) ? " open" : ""}`} aria-hidden="true">›</span>
                  </div>
                  {open.has(k) && (
                    <div className="to2-items">
                      {g.holds.map((h) => <div key={h.id} className="to2-item"><span>{h.qty != null ? `${qty(Number(h.qty))} × ` : ""}{h.sku_name}</span></div>)}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

            {showSend && c.later.length > 0 && (
        <>
          <div className="to2-lh">Booked further out · tick to order now</div>
          <ul className="to2-rows">
            {c.later.map((l) => {
              const on = lat.has(l.jobId);
              const k = `l${l.jobId}`;
              const days = l.install ? daysTo(l.install, todayMelbourne()) : null;
              return (
                <li key={k} className={on ? undefined : "off"}>
                  <div className="to2-row">
                    <button type="button" role="checkbox" aria-checked={on} aria-label={`${on ? "Leave off" : "Put on"} the order: ${l.customer ?? `job ${l.jobNumber}`}`} className={`to2-tick${on ? " on" : ""}`}
                      onClick={() => { const n = new Set(lat); n.has(l.jobId) ? n.delete(l.jobId) : n.add(l.jobId); setLat(n); }} />
                    <button type="button" className="to2-t to2-open" aria-expanded={open.has(k)} onClick={() => setOpen(flip(open, k))}>
                      <b>{l.customer ?? "A customer"}</b>
                      <span>Job {l.jobNumber}{l.suburb ? ` · ${l.suburb}` : ""}{l.install ? ` · install ${dayLabel(l.install)}` : ""} · {l.items.length} {l.items.length === 1 ? "item" : "items"}</span>
                    </button>
                    <b className="to2-amt">{money(l.cost)}</b>
                    {daysPill(days)}
                    <button type="button" className="pk-btn g to2-b" disabled={busy} onClick={() => quick(() => orderLaterNow({ jobId: l.jobId, supplierId: c.id }))}>Add to order</button>
                    <span className={`to2-chev${open.has(k) ? " open" : ""}`} aria-hidden="true">›</span>
                  </div>
                  {open.has(k) && (
                    <div className="to2-items">
                      {l.items.map((i, n) => <div key={n} className="to2-item"><span>{qty(i.qty)} × {i.name}</span><b>{money(i.cost)}</b></div>)}
                      <div className="to2-quick"><a className="pk-btn g to2-b" href={`https://go.servicetitan.com/#/Job/Index/${l.jobId}`} target="_blank" rel="noreferrer">Job in ServiceTitan ↗</a></div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {showSend && c.stock.length > 0 && (
        <>
          <div className="to2-lh">Factory stock</div>
          <ul className="to2-rows">
            {c.stock.map((l) => (
              <li key={l.id}><div className="to2-row">
                <span className="to2-tick on" aria-hidden="true" />
                <span className="to2-t"><b>{qty(l.qty)} × {l.supplier_model ?? l.sku_name ?? "Item"}</b><span>for the factory shelf</span></span>
                <b className="to2-amt">{l.unit_cost == null ? "" : money(l.unit_cost * l.qty)}</b>
                <RemoveStock lineId={l.id} />
              </div></li>
            ))}
          </ul>
        </>
      )}

      {showAhead && c.ahead.length > 0 && (
        <>
          <div className="to2-lh">Sold, not booked in</div>
          <ul className="to2-rows">
            {c.ahead.map((a) => {
              const on = a.onDraft || ahead.has(a.estimateId);
              return (
                <li key={a.key}><div className="to2-row">
                  <button type="button" role="checkbox" aria-checked={on} disabled={a.onDraft} aria-label={`${on ? "Leave off" : "Put on"} the order: ${a.customer ?? "a sold job"}`} className={`to2-tick${on ? " on" : ""}`}
                    onClick={() => { const n = new Set(ahead); n.has(a.estimateId) ? n.delete(a.estimateId) : n.add(a.estimateId); setAhead(n); }} />
                  <button type="button" className="to2-t to2-open" aria-expanded={open.has(a.key)} onClick={() => setOpen(flip(open, a.key))}>
                    <b>{a.customer ?? "A customer"}</b><span>{a.what}{a.soldOn ? ` · sold ${dayLabel(a.soldOn)}` : ""}</span>
                  </button>
                  <b className="to2-amt">{money(a.cost)}</b>
                  {a.onDraft
                    ? <span className="pt-vstat pt-vstat--ok">On this order</span>
                    : a.items.every((i) => i.shelf || i.ordered)
                    ? <span className="pt-vstat pt-vstat--ok">{a.items.every((i) => i.shelf) ? "From the factory" : "Sorted"}</span>
                    : <>
                        <span className="pt-vstat pt-vstat--none">Not booked yet</span>
                        <button type="button" className="pk-btn g to2-b" disabled={busy} onClick={() => quick(() => orderAheadNow({ estimateId: a.estimateId, supplierId: c.id }))}>Order ahead</button>
                      </>}
                  <span className={`to2-chev${open.has(a.key) ? " open" : ""}`} aria-hidden="true">›</span>
                </div>
                {open.has(a.key) && <AheadItems a={a} supplierId={c.id} />}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className="to2-foot">
        {reece
          ? <button type="button" className="pk-btn to2-send" disabled={busy || count === 0 || !!rp} onClick={checkReece}>{busy && !rp ? "Asking Reece…" : "Order in maX"}</button>
          : <button type="button" className="pk-btn to2-send" disabled={busy || count === 0} onClick={send}>{busy ? "Sending…" : label.replace(c.name, shortName(c.name))}</button>}
        {po && (
          <details className="to2-more">
            <summary className="pk-btn g">More</summary>
            <div className="to2-morein">
              <p className="pt-panel__sub">{po.po_number} · {howItGoes(c.supplier)}</p>
              <Delivery po={po} delivery={delivery} supplierName={c.supplier?.name} />
              <Cc po={po} supplier={c.supplier} alwaysCc={alwaysCc} />
              <span className="pt-nw__actions">
                {reece && <EmailList po={po} to={c.supplier?.email || testTo} />}
                {reece && (
                  <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" disabled={busy || count === 0}
                    onClick={() => { if (confirm("Mark it ordered without sending anything to Reece? Only if it's already been entered in maX by hand.")) send(); }}>
                    Already entered in maX by hand
                  </button>
                )}
                {!reece && <OrderedElsewhere po={po} />}
                <TestSend po={po} testTo={testTo} />
                <DownloadPdf po={po} />
                <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" disabled={busy}
                  onClick={() => { if (confirm(`Cancel ${po.po_number}? Nothing has been sent.`)) quick(() => cancel(po.id)); }}>Cancel the order</button>
              </span>
              <p className="pt-nw__muted"><a href={`/portal/supply/emails#sup-${c.id}`}>Change what the email to {shortName(c.name)} says ›</a></p>
              {c.drafts.length > 1 && <p className="pt-nw__muted">Sending puts this week&rsquo;s and next week&rsquo;s {shortName(c.name)} drafts together as one order.</p>}
              {noted && <p className="pt-nw__muted">Once it goes, it&rsquo;s noted on each job in ServiceTitan with the order attached.</p>}
            </div>
          </details>
        )}
        <span className="to2-sum">{reece ? "Into maX through Reece, one order per job" : `${c.supplier?.method === "email" || c.supplier?.method === "email_form" ? `Emailed to ${shortName(c.name)}` : "Sent"}`} · <b>{money(total)}</b> ex GST</span>
      </div>
      {rp && <ReeceCheck rp={rp.check} busy={busy} onPlace={placeReece} onCancel={() => setRp(null)} />}
      {po?.send_error && <p className="pt-note pt-note--warn" style={{ margin: "8px 0 0" }}><strong>Last try didn&rsquo;t send:</strong> {po.send_error}</p>}
      {msg && <p className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`} role="status">{msg.text}</p>}
    </section>
  );
}
