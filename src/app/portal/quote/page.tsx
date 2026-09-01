import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { brands } from "@/lib/brands";
import { QuickQuote, type QuoteRow } from "@/components/portal/QuickQuote";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quick quote — Team portal" };

export default async function QuotePage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  // Flatten the same price list the public pricing page uses.
  const rows: QuoteRow[] = [];
  for (const b of brands) {
    for (const p of b.products) {
      if (p.retired) continue;
      rows.push({
        brand: b.name,
        productSlug: p.slug,
        name: p.name,
        model: p.model,
        categoryLabel: p.categoryLabel,
        capacity: p.capacity,
        veu: p.veuEligible,
        price: p.installedPriceFrom,
        bestFor: p.bestFor,
      });
    }
  }

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">Quick quote</div>
        <h1>Look up an installed price.</h1>
        <p>Pick a model and you get the customer-ready installed price — VEU rebate already applied where it qualifies — ready to read out on the phone or copy into a message.</p>
      </div>
      <QuickQuote rows={rows} />
    </PortalShell>
  );
}
