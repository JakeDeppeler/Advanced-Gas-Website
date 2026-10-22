import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { getSettings } from "@/lib/portal/db";
import { coverBase } from "@/lib/portal/cover/load";
import { CREWS, coverHour, crewRates, vansFor } from "@/lib/portal/cover/hour";
import { normaliseSiteRates } from "@/lib/portal/siteRates";
import { Bad, Btn, Card, Good, Head, Say } from "@/components/portal/kit/Kit";
import { NumbersForm } from "@/components/portal/numbers/NumbersForm";
import { saveSiteRates } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "On site & commercial · Team portal" };

const mc = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const hrs = (n: number) => n.toLocaleString("en-AU", { maximumFractionDigits: 1 });

type Row = { k: string; label: string; sub: string; be: number; price: number; ours: number | null };

/**
 * Pricing & costs › Hourly › On site & commercial: what a crew has to charge
 * an hour on a day spent on one site, worked from the same sums as Hourly rate
 * with more of the day billed, and for commercial work with its own profit.
 * The settings and charges are kept in site_rates (lib/portal/siteRates.ts).
 */
export default async function OnsiteRatesPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="On site & commercial rates" forWhom="the office" />;
  const [base, raw] = await Promise.all([coverBase(), getSettings<unknown>("site_rates").catch(() => null)]);
  const sr = normaliseSiteRates(raw);
  const i = base.i;
  const vans = vansFor(base.fleet, i.techs);

  // The same hour as Hourly rate, with the day billed as set here: the year's
  // overheads and pay over more billed hours, so less on each.
  const ratesAt = (billPerDay: number, margin: number) => crewRates(coverHour(base.lines, base.fleet, base.oc, { ...i, billPerDay, margin }), vans, base.oc);
  const domestic = ratesAt(i.billPerDay, i.margin);
  const onHrs = Math.min(sr.onsiteHrs ?? i.dayHrs, 24);
  const comHrs = Math.min(sr.commercialHrs ?? i.dayHrs, 24);
  const comMargin = sr.commercialMargin ?? i.margin;
  const onsite = ratesAt(onHrs, i.margin);
  const commercial = ratesAt(comHrs, comMargin);
  const rowsOf = (r: ReturnType<typeof ratesAt>, charge: Record<string, number | null>): Row[] =>
    r.rows.map((c) => ({ k: c.k, label: c.label, sub: c.sub, be: c.be, price: c.price, ours: charge[c.k] ?? null }));
  const onRows = rowsOf(onsite, sr.onsite);
  const comRows = rowsOf(commercial, sr.commercial);
  const short = [...onRows.map((r) => ({ ...r, what: "on site" })), ...comRows.map((r) => ({ ...r, what: "commercial" }))].filter((r) => r.ours != null && r.ours < r.price);
  const anySet = [...onRows, ...comRows].some((r) => r.ours != null);

  const table = (rows: Row[], margin: number) => (
    <div className="pk-tbl-wrap">
      <table className="pk-tbl">
        <thead><tr><th>Crew</th><th>We charge</th><th>Break-even</th><th>To make {margin}%</th><th>Domestic, to make {i.margin}%</th><th className="l">How it stands</th></tr></thead>
        <tbody>
          {rows.map((c) => {
            const dom = domestic.rows.find((d) => d.k === c.k)!;
            return (
              <tr key={c.k}>
                <td><b>{c.label}</b><div className="ks">{c.sub}</div></td>
                <td><b>{c.ours != null ? mc(c.ours) : "not set"}</b></td>
                <td>{mc(c.be)}</td>
                <td>{mc(c.price)}</td>
                <td><span className="ks">{mc(dom.price)}</span></td>
                <td className="l">{c.ours == null ? <span className="ks">set it below</span>
                  : c.ours < c.be ? <span className="pt-cover__neg">▼ {mc(c.be - c.ours)} under break-even</span>
                  : c.ours < c.price ? <span className="pt-cover__neg">! {mc(c.price - c.ours)} short of {margin}%</span>
                  : <span className="pt-cover__pos">✓ {mc(c.ours - c.price)} over {margin}%</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="On site & commercial" sub="Crew rates for a day on one site · from the same sums as Hourly rate" info={[
          ["On site all day", `An install that fills the day: the van bills every hour it's paid for instead of ${hrs(i.billPerDay)} of ${hrs(i.dayHrs)}, so each hour carries less of the year's overheads and pay.`],
          ["Commercial", "Commercial work, with its own hours billed and its own profit. Set them to what commercial jobs really run at."],
          ["Domestic", "The Hourly rate tab's figure for the same crew, for comparison: a van doing service calls, losing part of the day to driving."],
        ]} />
        <Say>
          {!anySet ? <>Nothing&rsquo;s set to charge yet. The rates below are what each crew needs, put what we charge in the form at the bottom.</>
            : short.length === 0 ? <Good>Every on-site and commercial rate we&rsquo;ve set makes its profit.</Good>
            : <Bad>{short.map((r) => `${r.label.replace(/^A /, "a ")} (${r.what})`).join(" and ")} {short.length === 1 ? "is" : "are"} under what makes the profit.</Bad>}
        </Say>
        <Card title="Install, on site all day" aside={`${hrs(onHrs)} of ${hrs(i.dayHrs)} hours billed · to make ${i.margin}% · before GST`}>
          {table(onRows, i.margin)}
          <p className="pk-note" style={{ marginTop: 10 }}>
            One van for the year, the same overheads and pay as Hourly rate, billed {hrs(onHrs)} hours a day instead of {hrs(i.billPerDay)}. It&rsquo;s what an hour must be if a day like this were every day; the more of the year that&rsquo;s service calls, the closer the real need is to the domestic rate.
          </p>
        </Card>
        <Card title="Commercial" aside={`${hrs(comHrs)} of ${hrs(i.dayHrs)} hours billed · to make ${comMargin}% · before GST`}>
          {table(comRows, comMargin)}
          {sr.commercialHrs == null && sr.commercialMargin == null ? <p className="pk-note" style={{ marginTop: 10 }}>Worked on a full day billed and the same {i.margin}% as domestic until commercial&rsquo;s own hours and profit are set below.</p> : null}
        </Card>
        <NumbersForm title="Set the hours, profit and what we charge" aside="before GST" save={saveSiteRates} canSave={can(user, "overhead")} rows={[
          { key: "onsiteHrs", label: "On site all day: hours billed", sub: `of the ${hrs(i.dayHrs)}-hour paid day · blank is the whole day`, unit: "hours", value: sr.onsiteHrs },
          ...CREWS.map((c) => ({ key: `onsite_${c.k}`, label: `On site: ${c.label.replace(/^A /, "a ")}`, sub: c.sub, unit: "$ an hour", value: sr.onsite[c.k] })),
          { key: "commercialHrs", label: "Commercial: hours billed", sub: `of the ${hrs(i.dayHrs)}-hour paid day · blank is the whole day`, unit: "hours", value: sr.commercialHrs },
          { key: "commercialMargin", label: "Commercial: profit we want", sub: `of the price · blank is the ${i.margin}% domestic is built on`, unit: "% of the price", value: sr.commercialMargin },
          ...CREWS.map((c) => ({ key: `commercial_${c.k}`, label: `Commercial: ${c.label.replace(/^A /, "a ")}`, sub: c.sub, unit: "$ an hour", value: sr.commercial[c.k] })),
        ]} />
        <div className="pk-btns">
          <Btn href="/portal/rates">Domestic crew rates ›</Btn>
          <Btn href="/portal/finance/cover" quiet>Change the wages or hours ›</Btn>
        </div>
      </div>
    </PortalShell>
  );
}
