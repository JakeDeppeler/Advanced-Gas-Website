import { PortalBack } from "@/components/portal/PortalBack";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { XeroLine, type XeroState } from "@/components/portal/XeroLine";

/**
 * The top of every Finance tab, drawn once.
 *
 * Each tab had grown its own: Overview went back to Home and the rest to
 * Finance, every title was a different question, and a paragraph pushed the
 * Xero line onto a row of its own. Six tabs of one section now share one head
 * — back to Home, the tab's name, where the figures came from — the way the
 * design draws all six, so moving between them changes only what's under the
 * tabs.
 */
export function FinanceHead({ title, lede, xero }: {
  title: string;
  /** One line, under the tabs. What this tab is for, said once. */
  lede?: string;
  /** Omitted on a tab that reads nothing from Xero. */
  xero?: { state: XeroState; org?: string | null };
}) {
  return (
    <>
      <div className="pt-head pt-head--split pt-finhead">
        <div>
          {/* Home, not Finance: the tabs are siblings, and the strip below is
              how you move between them. */}
          <PortalBack href="/portal" label="Home" />
          <h1>{title}</h1>
        </div>
        {xero && <XeroLine state={xero.state} org={xero.org} />}
      </div>
      <PortalTabs set="finance" />
      {lede && <p className="pt-finhead__lede">{lede}</p>}
    </>
  );
}
