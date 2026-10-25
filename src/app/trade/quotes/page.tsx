import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell } from "@/components/portal/TradeShell";
import { TradeQuoteCall } from "@/components/portal/TradeQuoteCall";
import { myPipeQuotes } from "@/lib/portal/tradeQuotes";
import { FOLLOW_UPS, addDays, followUps, nextGap, HOW_LABEL } from "@/lib/pipeline/types";
import { isoDateMelbourne } from "@/lib/dashboard/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "My quotes — Trade portal" };

const money = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
const day = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
const STAGE: Record<string, string> = { due: "Ring today", new: "Just quoted", waiting: "Waiting on them" };

/**
 * My quotes: what you've quoted that hasn't said yes, the ones to ring first
 * at the top. A call logged here is on the Pipeline and the job in
 * ServiceTitan, and moves the office's Follow up card to the next call.
 */
export default async function TradeQuotes() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  const list = await myPipeQuotes(user.name).catch(() => null);
  const today = isoDateMelbourne(new Date());

  return (
    <TradeShell user={user} active="home" title="My quotes" sub="Waiting on a yes · ring the top ones first">
      {!list ? (
        <section className="tr-card"><p className="tr-empty">Your quotes couldn&rsquo;t be read just now. Try again in a minute.</p></section>
      ) : list.length === 0 ? (
        <section className="tr-card"><p className="tr-empty">No quotes of yours are waiting on a yes.</p></section>
      ) : (
        <section className="tr-card">
          <div className="tr-jobrows">
            {list.map((x) => {
              const last = [...x.touches].sort((a, b) => b.at.localeCompare(a.at))[0];
              return (
                <div key={x.key} className="tr-jobrow">
                  <div className="tr-jobrow__k">
                    <strong>{[x.customer ?? "Customer", x.suburb].filter(Boolean).join(", ")}</strong>
                    <span>{[x.what ?? "Quote", x.value ? money(x.value) : null, `quoted ${day(x.quotedOn)}`].filter(Boolean).join(" · ")}</span>
                    <span>{last ? `Last: ${HOW_LABEL[last.how]} ${day(last.at)}${last.by ? ` (${last.by.split(" ")[0]})` : ""}` : "No call logged yet"}{x.nextOn ? ` · next call ${day(x.nextOn)}` : ""} · {followUps(x.touches)} of {FOLLOW_UPS} calls</span>
                    {x.phone && <a className="tr-link" href={`tel:${x.phone.replace(/[^\d+]/g, "")}`}>Ring {x.phone}</a>}
                  </div>
                  <span className={`tr-chip${x.stage === "due" ? " tr-chip--warn" : ""}`}>{STAGE[x.stage] ?? x.stage}</span>
                  {/* The rule's next call after this one, the same gap the Pipeline uses; none after the third. */}
                  <TradeQuoteCall qkey={x.key} nextDefault={followUps(x.touches) + 1 < FOLLOW_UPS ? addDays(today, nextGap(followUps(x.touches) + 1)) : ""} />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </TradeShell>
  );
}
