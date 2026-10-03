"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addCampaign, removeCampaign, setCampaignStatus } from "@/app/portal/marketing/actions";
import {
  AUDIENCES, STATUSES, audienceLabel, byAudience, statusLabel, statusTone,
  type CampaignRow, type CampaignTally,
} from "@/lib/portal/campaigns";
import { money } from "@/lib/portal/format";
import { marketingHref, type WindowKey } from "@/lib/portal/marketingTabs";

/**
 * Everything marketing is running, as a list the office keeps.
 *
 * The lead column is the only number here nobody types: it comes from matching
 * the campaign's utm against the utm on each website lead. A campaign with no
 * utm set shows a dash rather than a zero — "we can't attribute to this" and
 * "this brought in nothing" are different things, and only one of them is the
 * campaign's fault.
 */
export function CampaignBoard({
  rows, tally, audience, win, windowLabel, adding, picker,
}: {
  rows: CampaignRow[];
  tally: CampaignTally;
  audience: string;
  win: string;
  windowLabel: string;
  /** The form is open — `&new=1`, from the head's "+ New campaign". */
  adding: boolean;
  picker: React.ReactNode;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState("");
  const here = `${marketingHref("campaigns", win as WindowKey)}${audience === "all" ? "" : `&audience=${audience}`}`;

  const pills = byAudience(rows);
  const shown = audience === "all" ? rows : rows.filter((r) => r.audience === audience);

  function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setMsg("");
    start(async () => {
      const res = await fn();
      if (!res.ok) { setMsg(res.error || "Didn't work."); return; }
      router.refresh();
    });
  }

  return (
    <>
      <div className="pt-mkheads">
        <div className="pt-mkhead is-feature">
          <span className="pt-mkhead__k">Live now</span>
          <strong className="pt-mkhead__v">{tally.live}</strong>
          <span className="pt-mkhead__sub">{rows.length} on the list</span>
        </div>
        <div className="pt-mkhead">
          <span className="pt-mkhead__k">Monthly spend</span>
          <strong className="pt-mkhead__v">{tally.spend == null ? "—" : money(tally.spend)}</strong>
          <span className="pt-mkhead__sub">{tally.spend == null ? "no spend recorded" : "on what's live"}</span>
        </div>
        <div className="pt-mkhead">
          <span className="pt-mkhead__k">Leads · {windowLabel}</span>
          <strong className="pt-mkhead__v">{tally.leads}</strong>
          <span className="pt-mkhead__sub">
            {tally.unattributed > 0 ? `${tally.unattributed} carry no campaign` : "all attributed"}
          </span>
        </div>
        <div className="pt-mkhead">
          <span className="pt-mkhead__k">Cost a lead</span>
          <strong className="pt-mkhead__v">{tally.costPerLead == null ? "—" : money(tally.costPerLead)}</strong>
          {/* Against attributed leads only. Dividing by every lead the site
              produced would credit the ads with the organic ones. */}
          <span className="pt-mkhead__sub">
            {tally.costPerLead == null ? "needs a spend and a utm" : "on attributed leads only"}
          </span>
        </div>
      </div>

      <div className="pt-mkbar">
        <nav className="pt-tabs" aria-label="Audience">
          {pills.map((p) => (
            <Link
              key={p.k}
              href={`${marketingHref("campaigns", win as WindowKey)}${p.k === "all" ? "" : `&audience=${p.k}`}`}
              aria-current={p.k === audience ? "page" : undefined}
              className={`pt-tab${p.k === audience ? " is-on" : ""}`}
            >
              {p.label} <em>{p.n}</em>
            </Link>
          ))}
        </nav>
        {picker}
      </div>

      {msg && <div className="pt-note pt-note--warn">{msg}</div>}

      {adding && (
        <NewCampaign
          busy={busy}
          cancelHref={here}
          onSave={(input) => {
            setMsg("");
            start(async () => {
              const res = await addCampaign(input);
              if (!res.ok) { setMsg(res.error || "Didn't work."); return; }
              router.push(here);
              router.refresh();
            });
          }}
        />
      )}

      <section className="pt-panel">
        {shown.length === 0 ? (
          <p className="pt-rep__empty">
            {rows.length === 0
              ? "Nothing on the list yet. Add the first campaign and it shows here with what the website attributed to it."
              : "Nothing for that audience."}
          </p>
        ) : (
          <div className="pt-fleet__wrap">
            <table className="pt-fleet">
              <thead>
                <tr>
                  <th>Campaign</th><th>Where</th><th>For</th><th>Status</th>
                  <th>Monthly</th><th>Leads</th><th>Owner</th><th />
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                      {c.blurb && <span className="pt-fleet__sub">{c.blurb}</span>}
                    </td>
                    <td>{c.channel || "—"}</td>
                    <td><span className="pt-aud">{audienceLabel(c.audience)}</span></td>
                    <td>
                      {/* Changing status is the edit anybody actually makes, so
                          it is a control in the row rather than behind a form. */}
                      <select
                        className={`pt-statsel is-${statusTone(c.status)}`}
                        value={c.status}
                        disabled={busy}
                        onChange={(e) => act(() => setCampaignStatus({ id: c.id, status: e.target.value }))}
                        aria-label={`Status of ${c.name}`}
                      >
                        {STATUSES.map((s) => <option key={s.k} value={s.k}>{s.label}</option>)}
                      </select>
                    </td>
                    <td>{c.monthlySpend == null ? "—" : money(c.monthlySpend)}</td>
                    <td>
                      <strong>{c.leads == null ? "—" : c.leads}</strong>
                      {c.leads == null && <span className="pt-fleet__sub">no utm set</span>}
                    </td>
                    <td>{c.owner || "—"}</td>
                    <td>
                      <button
                        type="button" className="pt-x" disabled={busy}
                        aria-label={`Remove ${c.name}`}
                        onClick={() => act(() => removeCampaign({ id: c.id }))}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {tally.unattributed > 0 && rows.length > 0 && (
        <p className="pt-panel__sub">
          {tally.unattributed} of the {tally.leads} enquiries in this window carry no campaign tag. Put the same
          <code> utm_campaign </code> on the ad link as in the campaign&rsquo;s row and they start counting.
        </p>
      )}
    </>
  );
}

/** The add form. Only the name is required — the rest can be filled in later. */
function NewCampaign({
  busy, onSave, cancelHref,
}: {
  busy: boolean;
  cancelHref: string;
  onSave: (input: {
    name: string; blurb: string; channel: string; audience: string;
    status: string; monthlySpend: string; owner: string; utmCampaign: string;
  }) => void;
}) {
  const [f, setF] = useState({
    name: "", blurb: "", channel: "", audience: "homeowners",
    status: "draft", monthlySpend: "", owner: "", utmCampaign: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  return (
    <section className="pt-panel pt-mknew">
      <h2 className="pt-panel__h">New campaign</h2>
      <div className="pt-mknew__grid">
        <label className="pt-field"><span>Name</span><input className="pt-inp" value={f.name} onChange={set("name")} placeholder="Heat pump hot water" /></label>
        <label className="pt-field"><span>What it is</span><input className="pt-inp" value={f.blurb} onChange={set("blurb")} placeholder="Pakenham, Cardinia, Casey · VEU rebate angle" /></label>
        <label className="pt-field"><span>Where it runs</span><input className="pt-inp" value={f.channel} onChange={set("channel")} placeholder="Facebook / Instagram" /></label>
        <label className="pt-field">
          <span>Who it&rsquo;s for</span>
          <select className="pt-inp" value={f.audience} onChange={set("audience")}>
            {AUDIENCES.map((a) => <option key={a.k} value={a.k}>{a.label}</option>)}
          </select>
        </label>
        <label className="pt-field">
          <span>Status</span>
          <select className="pt-inp" value={f.status} onChange={set("status")}>
            {STATUSES.map((s) => <option key={s.k} value={s.k}>{s.label}</option>)}
          </select>
        </label>
        <label className="pt-field"><span>Monthly spend</span><input className="pt-inp" value={f.monthlySpend} onChange={set("monthlySpend")} placeholder="Leave blank if none" inputMode="decimal" /></label>
        <label className="pt-field"><span>Owner</span><input className="pt-inp" value={f.owner} onChange={set("owner")} placeholder="Jake" /></label>
        <label className="pt-field">
          <span>utm_campaign</span>
          <input className="pt-inp" value={f.utmCampaign} onChange={set("utmCampaign")} placeholder="heat-pump-spring" />
        </label>
      </div>
      <p className="pt-panel__sub">
        The utm is how leads find their way back to this row. Put the same value on the ad&rsquo;s link and every
        enquiry from it counts here by itself.
      </p>
      <div className="pt-topic__acts">
        <Link href={cancelHref} className="pt-btn pt-btn--ghost">Cancel</Link>
        <button type="button" className="pt-btn pt-btn--orange" disabled={busy || !f.name.trim()} onClick={() => onSave(f)}>
          {busy ? "Saving…" : "Add it"}
        </button>
      </div>
    </section>
  );
}
