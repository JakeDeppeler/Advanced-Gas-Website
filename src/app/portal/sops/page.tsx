import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { SOP_CHANGES, SOP_VERSION } from "@/lib/portal/sops";
import { KpiHead } from "@/components/portal/kit/Kit";
import { dbConfigured, listStoredSops } from "@/lib/portal/db";
import { mergeSops } from "@/lib/portal/sopEdits";
import { canEditStandards } from "@/lib/portal/standards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Processes & procedures · Team portal" };

export default async function SopsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const canEdit = canEditStandards(user);
  const stored = dbConfigured() ? await listStoredSops().catch(() => []) : [];
  const SECTIONS = mergeSops(stored, canEdit);
  const total = SECTIONS.reduce((a, s) => a + s.sops.length, 0);
  const drafts = canEdit ? stored.filter((s) => s.status === "draft").length : 0;

  return (
    <PortalShell user={user}>
      <KpiHead title="Processes" kpis={[
        { icon: "doc", fig: String(total), label: `Procedures in ${SECTIONS.length} sections` },
        { icon: "clock", fig: SOP_VERSION.split(" ")[1] ?? SOP_VERSION, label: `Version, ${SOP_VERSION.split(" · ")[1] ?? ""}` },
        ...(canEdit && drafts > 0 ? [{ icon: "trend", fig: String(drafts), label: drafts === 1 ? "Draft waiting" : "Drafts waiting" }] : []),
      ]} />
      <div className="sx-bar">
        <p className="pk-note td-intro"><b>One team. One standard. One goal.</b> Every procedure here was agreed at the team training day and applies to everyone, from the director to the first-year apprentice.</p>
        {canEdit && <Link href="/portal/sops/edit" className="qp-btn dark">Edit procedures</Link>}
      </div>

      {SOP_CHANGES[0] && (
        <section className="pt-sopx__changed">
          <div>
            <strong>What changed</strong>
            <span>in {SOP_CHANGES[0].on.toLowerCase()}</span>
          </div>
          <ul>
            {SOP_CHANGES[0].items.map((c) => (
              <li key={c.code}><b>{c.code}</b> {c.text}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="pt-sopx__list" aria-label={`${SECTIONS.length} sections · ${total} procedures`}>
        {SECTIONS.map((s) => (
          <Link key={s.slug} href={`/portal/sops/${s.slug}`} className="pt-sopx__row">
            <span className="pt-sopx__letter">{s.letter}</span>
            <span className="pt-sopx__txt">
              <strong>{s.title}</strong>
              <span>{s.blurb}</span>
            </span>
            {s.draft && <span className="pt-sopsec__tag">Draft</span>}
            <span className="pt-sopx__chev" aria-hidden="true">›</span>
          </Link>
        ))}
      </section>

      <p className="pt-sopx__foot">None of it is finished. If a procedure doesn&rsquo;t work on the job, say so and bring the fix with it, see C6.</p>
    </PortalShell>
  );
}
