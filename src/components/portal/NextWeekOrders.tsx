"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approve, cancel, redraft, saveCc, saveDelivery, testSend, type ActionResult } from "@/app/portal/supply/next-week/actions";
import type { PoWithLines } from "@/lib/ordering/db";
import { byJob, dayLabel, dayTimeLabel, deliveryInstructionsFor, linesTotal, modelLooksLikeName, orderDelivery, todayMelbourne, workRef, type Problem, type Supplier } from "@/lib/ordering/plan";

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

const sendLabel = (s: Supplier | undefined) => {
  if (!s) return "Approve";
  if (s.method === "reece_cart") return "Mark ordered in maX";
  if (s.method === "email_form") return `Email ${s.name} with their form`;
  if (s.method === "work_order") return "Email the work order";
  return `Email ${s.name}`;
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

type DeliverySettings = { factoryInstructions?: string; deliveryNote?: string };

function Delivery({ po, delivery }: { po: PoWithLines; delivery: DeliverySettings }) {
  const { busy, msg, run } = useAct();
  const [open, setOpen] = useState(false);
  const [toSite, setToSite] = useState(po.delivery_to_site);
  const [address, setAddress] = useState(po.delivery_address ?? "");
  const [instructions, setInstructions] = useState(po.delivery_instructions ?? "");
  const editable = po.status === "draft";
  return (
    <div className="pt-nw__deliver">
      <span>
        <strong>Deliver to</strong> {po.delivery_address}
        {po.delivery_to_site && <span className="pt-nw__tag">Site delivery</span>}
        {(() => {
          const said = deliveryInstructionsFor(po, delivery);
          return said ? <span className="pt-nw__muted"> · {said}</span> : null;
        })()}
        {po.kind === "order" && (() => {
          const d = orderDelivery(po.lines, todayMelbourne());
          return d ? <span> · <strong>by {d.label}</strong></span> : null;
        })()}
      </span>
      {editable && !open && <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setOpen(true)}>Change</button>}
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
          {busy ? "Working…" : sendLabel(supplier)}
        </button>
        <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" disabled={busy}
          onClick={() => { if (confirm(`Cancel ${label}? Nothing has been sent.`)) run(() => cancel(po.id)); }}>
          Cancel
        </button>
        <TestSend po={po} testTo={testTo} />
      </span>
      {msg && <span className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`}>{msg.text}</span>}
    </div>
  );
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
        <div key={g.job_id} className="pt-nw__jobgroup">
          <h3 className="pt-nw__jobhead">
            <strong>Job {g.job_number}</strong>
            {g.customer_name && <span> · {g.customer_name}</span>}
            {g.suburb && <span> · {g.suburb}</span>}
            <span className="pt-nw__muted"> — install {installWhen(g)}</span>
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
                    </td>
                    <td className="is-num">{l.unit_cost == null ? "—" : money(l.unit_cost * l.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <p className="pt-nw__total">{po.lines.length} line{po.lines.length === 1 ? "" : "s"} across {groups.length} job{groups.length === 1 ? "" : "s"} · <strong>{money(linesTotal(po.lines))}</strong></p>
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
                    </td>
                    <td><strong>{l.job_number}</strong><span>{l.customer_name}</span></td>
                    <td>{installWhen(l)}</td>
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
}) {
  const { which, dbReady, appointmentsSynced, orders, suppliers, problems, testTo, alwaysCc, delivery } = props;
  const { busy, msg, run } = useAct();
  const byId = new Map(suppliers.map((s) => [s.id, s]));

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

      {shown.length === 0 && (
        <section className="pt-panel">
          <h2 className="pt-panel__h">Nothing drafted for this week yet</h2>
          <p className="pt-panel__sub">
            {which === "next"
              ? "Next week is drafted every weekday morning from Wednesday. Press Draft now to make it from the bookings as they stand."
              : "This week is drafted every weekday morning. Press Draft now to catch anything booked since."}
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
