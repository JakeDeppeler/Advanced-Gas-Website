import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell } from "@/components/portal/TradeShell";
import { VanTiles } from "@/components/portal/VanTiles";
import { VanHead, NoVan } from "@/components/portal/tradeVan";
import { mondayWeek } from "@/lib/portal/monday";
import { localToday } from "@/lib/portal/xero";

export const dynamic = "force-dynamic";
export const metadata = { title: "My van — Trade portal" };

/**
 * The van signed to you, and the four things you do about it: the weekly
 * check, damage and service, parts, and the tools on board.
 */
export default async function TradeVan() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const { van } = await mondayWeek(user.id);

  return (
    <TradeShell user={user} active="van" title="My van" sub={van ? "Checks, damage, parts and tools · goes straight to the office" : "Nothing signed to you yet"}>
      {van ? (
        <>
          <VanHead van={van} who="Signed to you" today={localToday()} />
          <VanTiles
            van={van} you
            hrefs={{ check: "/trade/van/check", report: "/trade/van/report", parts: "/trade/van/parts", tools: "/trade/van/tools", stock: "/trade/stock" }}
          />
        </>
      ) : <NoVan />}
    </TradeShell>
  );
}
