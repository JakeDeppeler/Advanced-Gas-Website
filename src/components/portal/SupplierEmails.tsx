"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveWording, sendSample, type ActionResult } from "@/app/portal/supply/emails/actions";
import type { Supplier } from "@/lib/ordering/plan";

/**
 * Supply › Supplier emails. Each supplier's address and the words their email
 * opens and closes with. The middle of every email — the order lines,
 * delivery, needed-by date, or the electrician's booking — is generated and
 * can't be edited here, so changing the wording can never drop something a
 * supplier needs. A blank box means the standard wording, shown faintly.
 */

type Defaults = { orderIntro: string; orderSignoff: string; workIntro: string };

function useAct() {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (f: () => Promise<ActionResult>) => start(async () => {
    setMsg(null);
    const r = await f();
    setMsg(r.ok ? { ok: true, text: r.note ?? "Done." } : { ok: false, text: r.error || "Couldn't do that." });
    router.refresh();
  });
  return { busy, msg, run };
}

const howSent = (s: Supplier) =>
  s.method === "reece_cart" ? "Entered in Reece maX — not emailed. The sample shows the list to enter."
    : s.method === "email_form" ? "Emailed, with their order form filled in and attached."
    : s.method === "work_order" ? "Emailed a work order for each site visit."
    : "Emailed.";

function SupplierCard({ s, defaults, sampleTo, alwaysCc }: { s: Supplier; defaults: Defaults; sampleTo: string; alwaysCc: string }) {
  const save = useAct();
  const sample = useAct();
  const isWork = s.method === "work_order";
  const emailed = s.method !== "reece_cart";
  const [email, setEmail] = useState(s.email ?? "");
  const [intro, setIntro] = useState(s.email_intro ?? "");
  // For Geoff the closing is the note in bold at the foot of the work order;
  // until it's edited here it is the note the work orders were set up with.
  const [signoff, setSignoff] = useState(s.email_signoff ?? (isWork ? s.work_order_note ?? "" : ""));
  const savedCc = (s.cc_emails ?? []).join(", ");
  const [cc, setCc] = useState(savedCc);
  const dirty = email !== (s.email ?? "") || intro !== (s.email_intro ?? "") || cc.trim() !== savedCc
    || signoff !== (s.email_signoff ?? (isWork ? s.work_order_note ?? "" : ""));

  return (
    <section className="pt-panel pt-supem__card">
      <header className="pt-nw__cardhead">
        <h2 className="pt-panel__h">{s.name}</h2>
        {!emailed && <span className="pt-vstat pt-vstat--none">maX</span>}
      </header>
      <p className="pt-panel__sub">{howSent(s)}</p>

      {emailed && (
        <label className="pt-supem__field">
          <span>Sends to</span>
          <input className="pt-nw__input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
      )}

      {emailed && (
        <label className="pt-supem__field">
          <span>Copy in (CC)</span>
          <input className="pt-nw__input" type="text" value={cc} onChange={(e) => setCc(e.target.value)}
            placeholder="name@example.com, another@example.com" />
          <small className="pt-nw__muted">
            Copied on every {isWork ? "work order" : "order"} to {s.name}. {alwaysCc} is always copied in.
            One-off copies can be added on the order itself.
          </small>
        </label>
      )}

      {emailed && (
        <>
          <label className="pt-supem__field">
            <span>Opening</span>
            <textarea className="pt-supem__text" rows={3} value={intro} onChange={(e) => setIntro(e.target.value)}
              placeholder={isWork ? defaults.workIntro : defaults.orderIntro} />
          </label>
          <label className="pt-supem__field">
            <span>{isWork ? "Note to Geoff (in bold at the end)" : "Closing"}</span>
            <textarea className="pt-supem__text" rows={isWork ? 4 : 2} value={signoff} onChange={(e) => setSignoff(e.target.value)}
              placeholder={isWork ? "" : defaults.orderSignoff} />
          </label>
          <p className="pt-nw__muted pt-supem__hint">
            {isWork
              ? "The date and time, site, system, crew and customer contact go in between, filled in from ServiceTitan."
              : "The order lines, delivery address and needed-by date go in between. {po} becomes the order number, {supplier} the supplier's name."}
            {" "}Leave a box empty to use the standard wording shown in grey.
          </p>
        </>
      )}

      <div className="pt-nw__foot">
        <span className="pt-nw__actions">
          {emailed && (
            <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" disabled={save.busy || !dirty}
              onClick={() => save.run(() => saveWording({ id: s.id, email, intro, signoff, cc, needsEmail: emailed }))}>
              {save.busy ? "Saving…" : dirty ? "Save" : "Saved"}
            </button>
          )}
          <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" disabled={sample.busy || dirty}
            title={dirty ? "Save first — the sample uses the saved wording" : undefined}
            onClick={() => sample.run(() => sendSample({ to: sampleTo, supplierId: s.id }))}>
            {sample.busy ? "Sending…" : `Send me a sample`}
          </button>
          {dirty && <span className="pt-nw__muted">Save first — the sample uses the saved wording.</span>}
        </span>
        {save.msg && <span className={`pt-inline ${save.msg.ok ? "is-ok" : "is-err"}`}>{save.msg.text}</span>}
        {sample.msg && <span className={`pt-inline ${sample.msg.ok ? "is-ok" : "is-err"}`}>{sample.msg.text}</span>}
      </div>
    </section>
  );
}

export function SupplierEmails({ dbReady, suppliers, sampleTo, defaults, alwaysCc }: {
  dbReady: boolean;
  /** The office address every order is copied to (the reply-to). */
  alwaysCc: string;
  suppliers: Supplier[];
  /** Where samples go unless changed: whoever is looking at the page. */
  sampleTo: string;
  defaults: Defaults;
}) {
  const all = useAct();
  const [to, setTo] = useState(sampleTo);

  if (!dbReady) {
    return (
      <section className="pt-panel">
        <h2 className="pt-panel__h">Supplier emails</h2>
        <p className="pt-panel__sub">The database isn&rsquo;t reachable from here, so the suppliers can&rsquo;t be shown.</p>
      </section>
    );
  }

  // Emailed suppliers first, then Reece, with Geoff last — the order a week's orders go out.
  const rank = (s: Supplier) => (s.method === "work_order" ? 2 : s.method === "reece_cart" ? 1 : 0);
  const sorted = [...suppliers].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));

  return (
    <div className="pt-supem">
      <section className="pt-panel pt-supem__all">
        <h2 className="pt-panel__h">Send me every email</h2>
        <p className="pt-panel__sub">
          One sample from each supplier and one work order for Geoff, all to the address below, marked SAMPLE. They use real jobs
          booked in the next four weeks where there are any. Nothing goes to any supplier and no order is touched.
        </p>
        <div className="pt-supem__allrow">
          <input className="pt-nw__input" type="email" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Send the samples to" />
          <button type="button" className="pt-btn pt-btn--orange" disabled={all.busy || !to.trim()}
            onClick={() => all.run(() => sendSample({ to }))}>
            {all.busy ? "Sending…" : `Send all ${sorted.length}`}
          </button>
        </div>
        {all.msg && <span className={`pt-inline ${all.msg.ok ? "is-ok" : "is-err"}`}>{all.msg.text}</span>}
      </section>

      {sorted.map((s) => <SupplierCard key={s.id} s={s} defaults={defaults} sampleTo={to} alwaysCc={alwaysCc} />)}
    </div>
  );
}
