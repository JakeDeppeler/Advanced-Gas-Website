import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { loadSupplyState } from "@/lib/pricebook/supply";
import { loadPricebookSettings, type PricebookSettings } from "@/lib/pricebook/stPricebook";

export const dynamic = "force-dynamic";
export const metadata = { title: "Supply — Team portal" };

const MEL = "Australia/Melbourne";
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-AU", { timeZone: MEL, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—";

/** Three states, never two: a thing can be working, not working, or unknown. */
type Health = "ok" | "wait" | "off";

function Light({ state, label, detail }: { state: Health; label: string; detail: string }) {
  return (
    <div className={`pt-sup__light pt-sup__light--${state}`}>
      <span className="pt-sup__dot" aria-hidden="true" />
      <div>
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}

export default async function SupplyPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) redirect("/portal?denied=1");

  const state = await loadSupplyState();
  let rules: PricebookSettings | null = null;
  try {
    rules = await loadPricebookSettings();
  } catch {
    rules = null;
  }

  const stLight: Health = state.serviceTitan.configured ? "ok" : "off";
  const reeceLight: Health =
    state.reece.status === "ready" ? "ok" : state.reece.status === "no-customer" ? "wait" : "off";
  const catLight: Health =
    state.catalogue.items == null ? "off" : state.catalogue.items > 0 ? "ok" : "wait";

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">Supply</div>
        <h1>Reece maX, into ServiceTitan<span className="pt-stop">.</span></h1>
        <p>
          Our contractor pricing from Reece, the ServiceTitan pricebook it feeds, and every order that&rsquo;s gone out
          through it. One place to see whether the link is working and what it has done.
        </p>
      </div>

      <section className="pt-panel">
        <h2 className="pt-panel__h">Where the link stands</h2>
        <p className="pt-panel__sub">
          Read from our own records, so this loads instantly. To actually prove ServiceTitan is answering — which takes
          a few seconds and calls it for real — run the <Link href="/portal/supply/health">connection check</Link>.
        </p>
        <div className="pt-sup__lights">
          <Light
            state={stLight}
            label="ServiceTitan"
            detail={state.serviceTitan.configured ? "Credentials are set" : "No credentials set on the server"}
          />
          <Light
            state={reeceLight}
            label="Reece maX"
            detail={
              state.reece.status === "ready"
                ? `Connected${state.reece.customerNumber ? ` · customer ${state.reece.customerNumber}` : ""}`
                : state.reece.status === "no-customer"
                  ? "Credentials are set, but no Reece customer account is linked yet"
                  : "Reece hasn’t issued credentials yet — price files still work"
            }
          />
          <Light
            state={catLight}
            label="Catalogue"
            detail={
              state.catalogue.items == null
                ? "Couldn’t read it"
                : state.catalogue.items === 0
                  ? "Nothing loaded yet — upload a maX price file"
                  : `${state.catalogue.items.toLocaleString("en-AU")} items · ${state.catalogue.priced?.toLocaleString("en-AU") ?? "?"} priced · last seen ${when(state.catalogue.lastSeenAt)}`
            }
          />
          <Light
            state={state.lastRun ? "ok" : "wait"}
            label="Pricebook sync"
            detail={
              state.lastRun
                ? `Last run ${when(state.lastRun.startedAt)} · ${state.lastRun.mode}${state.lastRun.errors.length ? ` · ${state.lastRun.errors.length} error(s)` : ""}`
                : "Never run"
            }
          />
        </div>
        {state.orders.needingAttention != null && state.orders.needingAttention > 0 && (
          <div className="pt-note pt-sup__attn">
            <strong>
              {state.orders.needingAttention === 1
                ? "1 order needs a look."
                : `${state.orders.needingAttention} orders need a look.`}
            </strong>{" "}
            <Link href="/portal/supply/orders?s=error">Open them →</Link>
          </div>
        )}
      </section>

      <div className="pt-tiles">
        <Link href="/portal/supply/orders" className="pt-tile">
          <span className="pt-tile__ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7l8-4 8 4v10l-8 4-8-4zM4 7l8 4 8-4M12 11v10" /></svg>
          </span>
          <h3>Orders</h3>
          <p>Everything sent through maX — where it went, what it came to, and what was on it.</p>
          <div className="pt-card__meta">
            {state.orders.total == null ? "Open →" : `${state.orders.total} order${state.orders.total === 1 ? "" : "s"} →`}
          </div>
        </Link>
        <Link href="/portal/supply/search" className="pt-tile">
          <span className="pt-tile__ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" /></svg>
          </span>
          <h3>Item search</h3>
          <p>Look up a Reece product and what it costs us, for quoting.</p>
          <div className="pt-card__meta">Open →</div>
        </Link>
        <Link href="/portal/supply/syncs" className="pt-tile">
          <span className="pt-tile__ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" /></svg>
          </span>
          <h3>Sync history</h3>
          <p>Every pricebook run, what it changed, and anything that failed.</p>
          <div className="pt-card__meta">Open →</div>
        </Link>
        <Link href="/portal/supply/health" className="pt-tile">
          <span className="pt-tile__ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 4v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V7zM9 12l2 2 4-4" /></svg>
          </span>
          <h3>Connection check</h3>
          <p>Prove ServiceTitan is answering, scope by scope, and name what to fix if it isn&rsquo;t.</p>
          <div className="pt-card__meta">Run it →</div>
        </Link>
      </div>

      <section className="pt-panel">
        <h2 className="pt-panel__h">Pricing rules</h2>
        <p className="pt-panel__sub">
          How Reece&rsquo;s cost becomes a pricebook figure. Shown here rather than editable: changing the markup
          changes what every quote charges on the next sync, so it stays a deliberate change made in{" "}
          <code>portal_settings</code> — the exact statement is in <code>PRICEBOOK.md</code> §2. Say the word and
          I&rsquo;ll put a form on it.
        </p>
        {rules ? (
          <dl className="pt-sup__dl">
            <dt>Vendor</dt>
            <dd>{rules.vendorName}</dd>
            <dt>Price mode</dt>
            <dd>
              {rules.priceMode === "markup"
                ? `Markup — sell price is cost + ${rules.markupPercent}%`
                : "Cost only — vendor cost updates, sell prices left as the office set them"}
            </dd>
            <dt>Rounding</dt>
            <dd>{rules.roundTo > 0 ? `To the nearest $${rules.roundTo}` : "None"}</dd>
            <dt>Create missing items</dt>
            <dd>{rules.createMissing ? "Yes" : "No — only codes already in the pricebook are updated"}</dd>
            {rules.codePrefix && (
              <>
                <dt>Code prefix</dt>
                <dd>{rules.codePrefix}</dd>
              </>
            )}
          </dl>
        ) : (
          <p className="pt-sup__none">Couldn&rsquo;t read the pricing rules.</p>
        )}
      </section>
    </PortalShell>
  );
}
