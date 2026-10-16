import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { Locked } from "@/components/portal/Locked";
import { SupplierEmails } from "@/components/portal/SupplierEmails";
import { loadOrderingSettings, loadSuppliers } from "@/lib/ordering/db";
import { loadStPoSettings, stPoOptions, vendorsByName } from "@/lib/ordering/stPurchaseOrders";
import { StPoForm } from "@/components/portal/ordering/StPoForm";
import { JobNotesForm } from "@/components/portal/ordering/JobNotesForm";
import { loadJobNoteSuppliers, brandTags, ordersToUpdate, TAG_SWAPS, tagKey, tagTypes } from "@/lib/ordering/stJobNotes";
import { sbSelect } from "@/lib/dashboard/db";
import { DEFAULT_ORDER_INTRO, DEFAULT_ORDER_SIGNOFF, DEFAULT_WORK_INTRO, type Supplier } from "@/lib/ordering/plan";
import { Head } from "@/components/portal/kit/Kit";

export const dynamic = "force-dynamic";
// "Note them now" writes to ServiceTitan once per job, for every order not yet noted.
export const maxDuration = 60;
export const metadata = { title: "Supplier emails — Team portal" };

export default async function SupplierEmailsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Supply" forWhom="managers" />;

  let suppliers: Supplier[] = [];
  let replyTo = "";
  let dbReady = true;
  try {
    const [s, settings] = await Promise.all([loadSuppliers(), loadOrderingSettings()]);
    suppliers = s.filter((x) => x.active);
    replyTo = settings.replyTo;
  } catch {
    dbReady = false;
  }

  // What ServiceTitan files purchase orders under, read live; the business
  // units come from the sync, which already has them.
  const [stPo, opts, found, bus, noted, toNote, tagNames] = await Promise.all([
    loadStPoSettings(),
    stPoOptions(),
    vendorsByName().catch(() => ({} as Record<string, number | null>)),
    sbSelect<{ id: number; name: string }>("st_business_units", "select=id,name&active=eq.true&order=name.asc").catch(() => []),
    loadJobNoteSuppliers(suppliers).catch(() => [] as string[]),
    ordersToUpdate().catch(() => null),
    tagTypes().catch(() => null),
  ]);
  // Which of the office's tag pairs are in ServiceTitan by name, for the card to say.
  const swaps = TAG_SWAPS.map((t) => ({ from: t.from, to: t.to, when: t.when, found: tagNames ? tagNames.byName.has(tagKey(t.to)) : null }));
  const brands = tagNames ? brandTags(tagNames).map((b) => b.name).sort((x, y) => x.localeCompare(y)) : null;

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/supply" label="Supply" />
      <div className="pk" style={{ marginBottom: 14 }}>
        <Head title="Supplier emails" sub={<>Who each order goes to and how the email reads. Change the wording, then send yourself a sample to see it. Orders come from orders@advancedgas.com.au and replies go to {replyTo || "the office"}.</>} />
      </div>
      <PortalTabs set="supply" />
      <SupplierEmails
        dbReady={dbReady}
        suppliers={suppliers}
        sampleTo={user.email}
        alwaysCc={replyTo || "The office"}
        defaults={{ orderIntro: DEFAULT_ORDER_INTRO, orderSignoff: DEFAULT_ORDER_SIGNOFF, workIntro: DEFAULT_WORK_INTRO }}
      />
      <div className="pk" style={{ marginTop: 18 }}>
        <StPoForm initial={stPo}
          types={opts.ok ? opts.types : []} warehouses={opts.ok ? opts.warehouses : []} vendors={opts.ok ? opts.vendors : []}
          businessUnits={bus.map((b) => ({ id: b.id, name: b.name.trim() }))}
          suppliers={suppliers.filter((x) => x.method !== "work_order").map((x) => ({ id: x.id, name: x.name }))}
          found={found} error={opts.ok ? null : opts.error} />
        <JobNotesForm initial={noted} toNote={toNote?.length ?? null} swaps={swaps} brands={brands}
          suppliers={suppliers.filter((x) => x.active && x.method !== "reece_cart").map((x) => ({ id: x.id, name: x.name, work: x.method === "work_order" }))} />
      </div>
    </PortalShell>
  );
}
