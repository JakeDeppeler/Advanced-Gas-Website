import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listWebLeads, dbConfigured } from "@/lib/portal/db";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { LeadsBoard } from "@/components/portal/LeadsBoard";
import { groupByArea } from "@/lib/portal/leadArea";
import { pageReport } from "@/lib/portal/leadPages";
import { Locked } from "@/components/portal/Locked";
import { SectionTabs, WindowPicker } from "@/components/portal/marketingParts";
import { WEBSITE_TABS, websiteHref, windowKey } from "@/lib/portal/marketingTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Website leads — Team portal" };

export default async function LeadsPage({ searchParams }: { searchParams: { d?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Website" forWhom="managers" />;

  // The same three windows as the Website tabs, so moving between them keeps the window.
  const win = windowKey(searchParams?.d);
  const days = Number(win);
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const ready = dbConfigured();
  const leads = ready ? await listWebLeads(since) : [];
  // Sorted on the server: suburbs.ts is a large module and has no business in
  // the browser bundle just to work out a drive time.
  const area = groupByArea(leads.map((l) => ({ suburb: l.suburb, postcode: l.postcode, kind: l.kind })));
  // Same reason: the page report reads the sitemap, which pulls in every
  // suburb, brand and fault-code module on the site.
  const pages = await pageReport(leads);

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/website" label="Website" />
      <div className="pt-head pt-head--split">
        <div>
          <h1>Every enquiry</h1>
          <p>Every quote request and phone tap — which part of the site earns, the channel that sent them, how far away they are in drive time, and what hour they turn up. No customer details here; the enquiry still goes to the inbox.</p>
        </div>
        <WindowPicker win={win} hrefFor={(w) => `/portal/finance/leads${w === "30" ? "" : `?d=${w}`}`} />
      </div>

      <SectionTabs
        label="Website"
        current="all"
        tabs={[
          ...WEBSITE_TABS.map((t) => ({ k: t.k, label: t.label, href: websiteHref(t.k, win) })),
          { k: "all", label: "Every enquiry", href: `/portal/finance/leads${win === "30" ? "" : `?d=${win}`}` },
        ]}
      />
      <LeadsBoard leads={leads} days={days} area={area} pages={pages} dbReady={ready} />
    </PortalShell>
  );
}
