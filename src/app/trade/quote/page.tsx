import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell } from "@/components/portal/TradeShell";
import { QuoteBuilder } from "@/components/portal/QuoteBuilder";

export const dynamic = "force-dynamic";
export const metadata = { title: "The quote — Trade portal" };

export default async function TradeQuote() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  return (
    <TradeShell user={user} active="pricebook" title="The quote" sub="Options for the customer to choose from">
      <QuoteBuilder />
    </TradeShell>
  );
}
