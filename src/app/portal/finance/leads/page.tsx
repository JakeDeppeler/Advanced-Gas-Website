import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listWebLeads, dbConfigured } from "@/lib/portal/db";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { LeadsBoard } from "@/components/portal/LeadsBoard";
import { groupByArea } from "@/lib/portal/leadArea";
import { pageReport } from "@/lib/portal/leadPages";

export const dynamic = "force-dynamic";
export const metadata = { title: "Website leads — Team portal" };

export default async function LeadsPage({ searchParams }: { searchParams: { d?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) redirect("/portal?denied=1");

  const days = [30, 90, 365].includes(Number(searchParams?.d)) ? Number(searchParams!.d) : 30;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const leads = dbConfigured() ? await listWebLeads(since) : [];
  // Sorted on the server: suburbs.ts is a large module and has no business in
  // the browser bundle just to work out a drive time.
  const area = groupByArea(leads.map((l) => ({ suburb: l.suburb, postcode: l.postcode, kind: l.kind })));
  // Same reason: the page report reads the sitemap, which pulls in every
  // suburb, brand and fault-code module on the site.
  const pages = pageReport(leads);

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href="/portal/finance" label="Finance" />
        <div className="pt-head__eyebrow">Finance · Website leads</div>
        <h1>What the website brings in.</h1>
        <p>Every quote request and every phone tap: which part of the site earns and which sits there, the page the visit started on, the channel that sent them, how far away they are in drive time rather than kilometres, and what hour of the day they turn up. Nothing here is a customer&rsquo;s details; the enquiry itself still goes to the inbox.</p>
      </div>
      <LeadsBoard leads={leads} days={days} area={area} pages={pages} />
    </PortalShell>
  );
}
