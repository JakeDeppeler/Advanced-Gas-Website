/**
 * Where the Xero figures on this page came from, and when.
 *
 * It belongs beside the heading rather than above the first panel: everything
 * under it is read from Xero, so saying so once at the top is the honest
 * placement. Every Finance page that reads Xero carries the same line, so a
 * stale page can't quietly look like a live one.
 *
 * The dot repeats what the words already say — it is a glance aid, never the
 * signal on its own.
 */
export type XeroState = "connected" | "not-connected" | "not-configured";

const MEL = "Australia/Melbourne";

export function XeroLine({ state, org }: { state: XeroState; org?: string | null }) {
  if (state !== "connected") {
    return (
      <p className="pt-xline pt-xline--off">
        <i aria-hidden="true" />
        {state === "not-configured" ? "Xero isn’t set up yet" : "Xero isn’t connected yet"}
      </p>
    );
  }
  const at = new Date().toLocaleString("en-AU", { timeZone: MEL, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  return (
    // "Xero", not the organisation's registered name: that runs to fifty
    // characters and pushed the line onto a row of its own under every title.
    // The name is still there for anyone who hovers.
    <p className="pt-xline" title={org ? `Connected to ${org}` : undefined}>
      <i aria-hidden="true" />
      Live from Xero · read {at}
    </p>
  );
}
