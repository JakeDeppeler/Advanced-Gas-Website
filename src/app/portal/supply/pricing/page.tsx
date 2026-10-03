import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { loadPricebookSettings, type PricebookSettings } from "@/lib/pricebook/stPricebook";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pricing rules — Supply — Team portal" };

/** Name, what it does, and what it is set to. */
type Rule = { k: string; what: string; v: string };

function rulesOf(s: PricebookSettings): Rule[] {
  const out: Rule[] = [
    { k: "Vendor", what: "Whose cost the pricebook is fed from", v: s.vendorName },
    {
      k: "Markup",
      what: "Applied to the vendor cost before it lands in the pricebook",
      v: s.priceMode === "markup" ? `+${s.markupPercent}%` : "None — cost only",
    },
    {
      k: "Sell prices",
      what: s.priceMode === "markup" ? "Recalculated from cost on every sync" : "Left exactly as the office set them",
      v: s.priceMode === "markup" ? "Overwritten" : "Untouched",
    },
    { k: "Rounding", what: "Prices round to the nearest", v: s.roundTo > 0 ? `$${s.roundTo}` : "Not rounded" },
    {
      k: "Items not in the pricebook",
      what: "What a sync does with a code it has never seen",
      v: s.createMissing ? "Created" : "Skipped",
    },
  ];
  if (s.codePrefix) out.push({ k: "Code prefix", what: "Prepended to every code the sync writes", v: s.codePrefix });
  return out;
}

export default async function SupplyPricingPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) redirect("/portal?denied=1");

  let rules: PricebookSettings | null = null;
  try {
    rules = await loadPricebookSettings();
  } catch {
    rules = null;
  }

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href="/portal/supply" label="Supply" />
        <h1>Pricing rules</h1>
        <p>What happens to a Reece cost on its way into the ServiceTitan pricebook.</p>
      </div>

      <PortalTabs set="supply" />

      <section className="pt-panel">
        <h2 className="pt-panel__h">How Reece&rsquo;s cost becomes a pricebook figure</h2>
        {rules ? (
          <div className="pt-rule">
            {rulesOf(rules).map((r) => (
              <div key={r.k} className="pt-rule__row">
                <strong>{r.k}</strong>
                <span>{r.what}</span>
                <em>{r.v}</em>
              </div>
            ))}
          </div>
        ) : (
          <div className="pf-empty">Couldn&rsquo;t read the pricing rules.</div>
        )}
      </section>

      {/* The design draws these as fields to type into. They are read-only
          here on purpose: the markup is what every quote charges from the next
          sync onwards, so changing it is a decision somebody makes once and
          records, not a box somebody adjusts while looking at a price that
          seemed low. It is set in portal_settings; PRICEBOOK.md §2 has the
          exact statement. Say the word and it becomes a form. */}
      <div className="pt-note">
        <strong>Read-only here.</strong> Changing a markup changes what every quote charges on the next sync, so it
        stays a deliberate change made in <code>portal_settings</code> — the statement to run is in{" "}
        <code>PRICEBOOK.md</code> §2.
      </div>
    </PortalShell>
  );
}
