import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { loadSupplyState } from "@/lib/pricebook/supply";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";

export const dynamic = "force-dynamic";
export const metadata = { title: "Supply — Team portal" };

const MEL = "Australia/Melbourne";
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-AU", { timeZone: MEL, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—";

/** Three states, never two: a thing can be working, not working, or unknown. */
type Health = "ok" | "wait" | "off";

/** The word for each state, so the dot is never carrying it alone. */
const HEALTH_WORD: Record<Health, string> = { ok: "Working", wait: "Waiting", off: "Not set up" };

function Light({ state, label, detail, fix }: {
  state: Health; label: string; detail: string;
  /** The one thing to do about it, when there is one. It replaces the status
   *  word rather than sitting beside it: a row that needs an action does not
   *  also need to be told it isn't working. */
  fix?: { href: string; label: string };
}) {
  return (
    <div className={`pt-sup__row pt-sup__row--${state}`}>
      <strong>{label}</strong>
      <span className="pt-sup__state">
        <i className="pt-sup__dot" aria-hidden="true" />
        {detail}
      </span>
      {fix
        ? <Link href={fix.href} className="pt-sup__fix">{fix.label}</Link>
        : <em>{HEALTH_WORD[state]}</em>}
    </div>
  );
}

export default async function SupplyPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Supply" forWhom="managers" />;

  const state = await loadSupplyState();
  const stLight: Health = state.serviceTitan.configured ? "ok" : "off";
  const reeceLight: Health =
    state.reece.status === "ready" ? "ok" : state.reece.status === "no-customer" ? "wait" : "off";
  const catLight: Health =
    state.catalogue.items == null ? "off" : state.catalogue.items > 0 ? "ok" : "wait";

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href="/portal" label="Home" />
        <h1>Reece maX, into ServiceTitan</h1>
        <p>Our contractor pricing from Reece, the pricebook it feeds, and every order that&rsquo;s gone out through it.</p>
      </div>

      <PortalTabs set="supply" />

      <section className="pt-panel pt-sup">
        <div className="pt-sup__head">
          <h2 className="pt-panel__h">Where the link stands</h2>
          <Link href="/portal/supply/health" className="pt-btn pt-btn--navy">Run connection check</Link>
        </div>
        <div className="pt-sup__rows">
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
                  ? "Nothing loaded yet"
                  : `${state.catalogue.items.toLocaleString("en-AU")} items · ${state.catalogue.priced?.toLocaleString("en-AU") ?? "?"} priced · last seen ${when(state.catalogue.lastSeenAt)}`
            }
            fix={state.catalogue.items === 0 ? { href: "/portal/supply/search", label: "Upload a price file" } : undefined}
          />
          <Light
            state={state.lastRun ? "ok" : "wait"}
            label="Pricebook sync"
            detail={
              state.lastRun
                ? `Last run ${when(state.lastRun.startedAt)} · ${state.lastRun.mode}${state.lastRun.errors.length ? ` · ${state.lastRun.errors.length} error(s)` : ""}`
                : "Never run"
            }
            fix={state.lastRun ? undefined : { href: "/portal/supply/syncs", label: "Run a sync" }}
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


    </PortalShell>
  );
}
