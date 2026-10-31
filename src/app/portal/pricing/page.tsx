import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { getCapSettings, getSettings } from "@/lib/portal/db";
import { normalisePricing } from "@/lib/portal/pricingTypes";
import { Btn, Head, Say } from "@/components/portal/kit/Kit";
import { NumbersForm } from "@/components/portal/numbers/NumbersForm";
import { savePricing } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Our prices · Team portal" };

/**
 * Pricing & costs › Rates & pricing: what we charge. The hourly rate is the one in
 * the ServiceTitan pricebook, kept here so Team › Labour rates can set it
 * against what each person costs; the profit we want is the margin every
 * rate on Our hourly rate is built from.
 */
export default async function PricingPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Rates & pricing" forWhom="the office" />;
  const [raw, cap] = await Promise.all([getSettings<unknown>("pricing").catch(() => null), getCapSettings().catch(() => null)]);
  const p = normalisePricing(raw);
  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Our prices" eyebrow="The numbers the whole portal is built on · change one here and every page updates" info={[
          ["Our hourly rate", "What we charge an hour for a tradesman and an apprentice, as it is in the ServiceTitan pricebook. Changing it here doesn’t change ServiceTitan; keep the two the same."],
          ["One person in a van", "What we charge when a tech goes out on their own. They still have the whole van to pay for, so it isn’t half the crew rate, What an hour must cover works out what it needs to be."],
          ["Profit we want", "The share of the price that is profit once every wage and overhead is paid. Every rate on Our hourly rate and Team is built to leave it, so a job priced at our rates shows this on Profit on every job."],
        ]} />
        <Say>Match these to the ServiceTitan pricebook. Team › Labour rates sets our rate against what each person costs an hour.</Say>
        <NumbersForm title="Rates & pricing" aside="match these to the ServiceTitan pricebook" save={savePricing} canSave={can(user, "overhead")} rows={[
          { key: "hourly", label: "Our hourly rate", sub: "a tradesman and an apprentice, before GST", unit: "$ an hour", value: p.hourly },
          { key: "solo", label: "One person in a van", sub: "a tech on their own, before GST", unit: "$ an hour", value: p.solo },
          { key: "install", label: "Install crew", sub: "a tradesman and two apprentices, one van, before GST", unit: "$ an hour", value: p.install },
          { key: "callout", label: "Call-out fee", sub: "before GST", unit: "$", value: p.callout },
          { key: "afterHours", label: "After-hours", sub: "times the hourly rate", unit: "× the hourly rate", value: p.afterHours },
          { key: "margin", label: "Profit we want", sub: "of the price, after every cost · used to build every rate", unit: "% of the price", value: cap?.margin ?? null },
        ]} />
        <div className="pk-btns">
          <Btn href="/portal/finance/hourly">What makes up an hour ›</Btn>
          <Btn href="/portal/finance/capacity?t=rates" quiet>What each crew charges out at ›</Btn>
        </div>
      </div>
    </PortalShell>
  );
}
