import Link from "next/link";
import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { KpiHead, Say } from "@/components/portal/kit/Kit";
import { money, pc, plural } from "@/lib/portal/run/month";
import { todayMelbourne } from "@/lib/todos/store";
import { privateCustomers, windows } from "@/lib/customers/private";

export const dynamic = "force-dynamic";
export const metadata = { title: "Private customers · Team portal" };

const day = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Melbourne" });
const year = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { month: "short", year: "numeric", timeZone: "Australia/Melbourne" });

/**
 * Profit & finance › Private customers (Jake, 28 Nov): who we worked for at
 * home, how many were new, how many came back, who we were in touch with, and
 * what marketing cost per customer. How each is counted, and what is left out,
 * is on privateCustomers.
 */
export default async function PrivateCustomersPage({ searchParams }: { searchParams: { w?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Private customers" forWhom="the office" />;

  const today = todayMelbourne();
  const ws = windows(today);
  const w = ws.find((x) => x.key === searchParams.w) ?? ws[1];
  const d = await privateCustomers(w, today).catch(() => null);
  const soFar = w.to > today;
  const period = w.key === "month" ? `${w.label}${soFar ? " so far" : ""}` : `${w.label}${soFar ? ", so far" : ""}`;

  const perNew = d && d.spend != null && d.fresh > 0 ? d.spend / d.fresh : null;
  const perServed = d && d.spend != null && d.served > 0 ? d.spend / d.served : null;
  const adsPerNew = d && d.adSpend != null && d.fresh > 0 ? d.adSpend / d.fresh : null;
  const avgInvoiced = d && d.served > 0 ? d.invoiced / d.served : null;
  const share = (n: number) => (d && d.served > 0 ? (n / d.served) * 100 : 0);
  const mailFrom = d?.emailSince && d.emailSince.slice(0, 10) > w.from ? d.emailSince : null;

  return (
    <PortalShell user={user}>
      <div className="rp">
        <KpiHead hi={`Profit & finance · ${period}`} title={<>Private<br />customers</>} kpis={d ? [
          { icon: "people", fig: String(d.served), label: "Private customers we worked for" },
          { icon: "trend", fig: String(d.back), label: "Came back for more work", badge: d.served ? pc(share(d.back)) : undefined, tone: "up" },
          { icon: "tag", fig: perNew != null ? money(perNew) : "—", label: perNew != null ? "Marketing per new customer" : "Marketing per new customer, Xero not read" },
          { icon: "mail", fig: String(d.inTouch), label: mailFrom ? `In touch by email since ${day(mailFrom)}` : "In touch by email" },
        ] : []} info={[
          ["Private", "Jobs in ServiceTitan's Domestic business units. Property managers, builders and businesses book some of their work as Domestic too, so anyone who has had a Real Estate, Retirement Village or Commercial job, had work at more than three addresses, or goes by a business's name (a Pty Ltd, an agency, a builder) is left out. So are records whose only email is one of ours: tests, and the crew's own homes."],
          ["New", "Their first job with us, as far back as the old system's history goes (2021 for private customers)."],
          ["Came back", "They'd had a job with us before, at least a month before this one."],
          ["Carrying on", "Their last job was within the month before: a diagnosis, then the repair. Not won this period, and not really back either."],
          ["Marketing per customer", "Every Xero account the overheads page files as marketing (advertising, printing, client meetings, gifts, sponsorships), over the private customers. None of it is split between private and trade, so this is the most it could be. Advertising alone is shown beside it."],
          ["Calls", "Not counted. The calls the portal has from ServiceTitan don't say which customer was on the line, so there's nothing to count them against."],
        ]} />

        <div className="dt-tabs">
          <nav className="rp-seg" aria-label="Which period">
            {ws.map((x) => (
              <Link key={x.key} href={`/portal/finance/customers${x.key === "quarter" ? "" : `?w=${x.key}`}`} aria-current={x === w ? "page" : undefined} className={x === w ? "on" : undefined}>
                {x.key === "month" ? "This month" : "Three months"}
              </Link>
            ))}
          </nav>
        </div>

        {!d ? <Say>ServiceTitan&rsquo;s jobs couldn&rsquo;t be read just now. Try again in a minute.</Say> : (
          <>
            <div className="pc-grid">
              <section className="rp-panel rp-card pc-cost" aria-labelledby="pc-cost-h" style={{ ["--i" as string]: 1 }}>
                <div className="rp-panel-h">
                  <span className="rp-hh"><b id="pc-cost-h">What a customer costs to win</b><span className="rp-note">Marketing in Xero, {period}</span></span>
                  <Link href="/portal/finance/capacity" className="rp-round" aria-label="Open Overheads, where the marketing accounts are filed">↗</Link>
                </div>
                {d.spend == null ? <p className="rp-empty">Xero didn&rsquo;t answer, so the marketing spend isn&rsquo;t here.</p> : (
                  <>
                    <div className="rp-big">
                      <span className="rp-num">{perNew != null ? money(perNew) : "—"}</span>
                      <span>{perNew != null ? <>for each of the <b>{d.fresh}</b> new private customers</> : "no new private customers yet this period"}</span>
                    </div>
                    <div className="pc-facts">
                      <div><span>All marketing</span><b>{money(d.spend)}</b></div>
                      <div><span>Per private customer we worked for</span><b>{perServed != null ? money(perServed) : "—"}</b></div>
                      <div><span>Advertising alone, per new customer</span><b>{adsPerNew != null ? money(adsPerNew) : "—"}</b></div>
                      <div><span>Invoiced per private customer, ex GST</span><b>{avgInvoiced != null ? money(avgInvoiced) : "—"}</b></div>
                    </div>
                    {d.spendLines.length > 0 && (
                      <div className="pc-lines" aria-label="Marketing accounts">
                        {d.spendLines.map((l) => (
                          <div key={l.label} className="pc-line">
                            <span>{l.label}</span>
                            <span className="pc-kind">{l.ads ? "Advertising" : "Other marketing"}</span>
                            <b>{money(l.amount)}</b>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="rp-note pc-foot">All of it is put against private customers, so it&rsquo;s the most a customer could cost. Client meetings and gifts may well be for agents.</p>
                  </>
                )}
              </section>

              <section className="rp-panel rp-card pc-who" aria-labelledby="pc-who-h" style={{ ["--i" as string]: 2 }}>
                <div className="rp-panel-h">
                  <span className="rp-hh"><b id="pc-who-h">New or back</b><span className="rp-note">{plural(d.served, "private customer")}{d.leftOut ? ` · ${plural(d.leftOut, "agent, builder or business", "agents, builders and businesses")} left out` : ""}</span></span>
                </div>
                <div className="pc-split" aria-hidden="true">
                  <i className="fresh" style={{ flexGrow: d.fresh }} />
                  <i className="back" style={{ flexGrow: d.back }} />
                  <i className="on" style={{ flexGrow: d.followOn }} />
                </div>
                <div className="pc-rows">
                  <div className="pc-row"><span><i className="pc-sw fresh" aria-hidden="true" />New to us</span><span>{pc(share(d.fresh))}</span><b>{d.fresh}</b></div>
                  <div className="pc-row"><span><i className="pc-sw back" aria-hidden="true" />Came back for more work</span><span>{pc(share(d.back))}</span><b>{d.back}</b></div>
                  <div className="pc-row"><span><i className="pc-sw on" aria-hidden="true" />Carrying on from a job just before</span><span>{pc(share(d.followOn))}</span><b>{d.followOn}</b></div>
                </div>
                {d.lifetime.customers > 0 && (
                  <p className="pc-life">
                    <b>{pc((d.lifetime.cameBack / d.lifetime.customers) * 100)}</b> of the private customers we first worked for more than a year ago have come back since: {d.lifetime.cameBack} of {d.lifetime.customers}.
                  </p>
                )}
              </section>

              <section className="rp-panel rp-card pc-touch" aria-labelledby="pc-touch-h" style={{ ["--i" as string]: 3 }}>
                <div className="rp-panel-h">
                  <span className="rp-hh"><b id="pc-touch-h">In touch</b><span className="rp-note">Of the {plural(d.served, "private customer")}{mailFrom ? ` · email from ${day(mailFrom)}, when filing began` : ""}</span></span>
                </div>
                <div className="pc-rows">
                  <div className="pc-row"><span>Emailed us</span><span>{pc(share(d.emailedUs))}</span><b>{d.emailedUs}</b></div>
                  <div className="pc-row"><span>We emailed from the portal</span><span>{pc(share(d.weEmailed))}</span><b>{d.weEmailed}</b></div>
                  <div className="pc-row"><span>Either way</span><span>{pc(share(d.inTouch))}</span><b>{d.inTouch}</b></div>
                  <div className="pc-row pc-off"><span>Phone calls</span><span>not counted</span><b>—</b></div>
                </div>
                <p className="rp-note pc-foot">Calls aren&rsquo;t counted: the calls the portal has from ServiceTitan don&rsquo;t say which customer rang. Emails are matched on the customer&rsquo;s address in ServiceTitan; one sent from Outlook directly isn&rsquo;t seen.</p>
              </section>
              {d.months.length > 1 && (
                <section className="rp-panel rp-card pc-months" aria-labelledby="pc-mo-h" style={{ ["--i" as string]: 4 }}>
                  <div className="rp-panel-h"><span className="rp-hh"><b id="pc-mo-h">Month by month</b><span className="rp-note">Each customer in the month of their first job in the period</span></span></div>
                  <div className="pc-table" role="table" aria-label="Private customers by month">
                    <div className="pc-tr pc-th" role="row"><span role="columnheader">Month</span><span role="columnheader">Worked for</span><span role="columnheader">New</span><span role="columnheader">Came back</span><span role="columnheader">Carrying on</span></div>
                    {d.months.map((m) => (
                      <div key={m.label} className="pc-tr" role="row">
                        <span role="cell">{m.label}</span><b role="cell">{m.served}</b><span role="cell">{m.fresh}</span><span role="cell">{m.back}</span><span role="cell">{m.followOn}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <section className="rp-panel rp-card pc-back" aria-labelledby="pc-back-h" style={{ ["--i" as string]: 5 }}>
              <div className="rp-panel-h"><span className="rp-hh"><b id="pc-back-h">Who came back</b><span className="rp-note">Newest first</span></span></div>
              {d.cameBack.length ? (
                <ol className="pc-list">
                  {d.cameBack.map((c) => (
                    <li key={`${c.customer}-${c.cameOn}`} className="pc-li">
                      <span className="pc-name"><b>{c.customer}</b><span>{[c.suburb, `since ${year(c.firstEver)}`, `${plural(c.before, "job")} before`].filter(Boolean).join(" · ")}</span></span>
                      <span className="pc-when"><b>{day(c.cameOn)}</b><span>last before: {year(c.lastBefore)}</span></span>
                    </li>
                  ))}
                </ol>
              ) : <p className="rp-empty">Nobody came back this period.</p>}
            </section>
          </>
        )}
      </div>
    </PortalShell>
  );
}
