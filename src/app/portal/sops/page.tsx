import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { SOP_CHANGES, SOP_VERSION } from "@/lib/portal/sops";
import { PortalBack } from "@/components/portal/PortalBack";
import { can } from "@/lib/portal/caps";
import { dbConfigured, listStoredSops } from "@/lib/portal/db";
import { mergeSops } from "@/lib/portal/sopEdits";

export const dynamic = "force-dynamic";
export const metadata = { title: "Processes & procedures — Team portal" };

export default async function SopsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const canEdit = can(user, "manage_users");
  const stored = dbConfigured() ? await listStoredSops().catch(() => []) : [];
  const SECTIONS = mergeSops(stored, canEdit);
  const total = SECTIONS.reduce((a, s) => a + s.sops.length, 0);
  const drafts = canEdit ? stored.filter((s) => s.status === "draft").length : 0;

  return (
    <PortalShell user={user}>
      <div className="pt-head pt-head--split">
        <div>
          <PortalBack href="/portal" label="Home" />
          <h1 className="pt-sopx__h">One team. One standard. One goal.</h1>
          <p>Every procedure here was agreed at the team training day and applies to everyone, from the director to the first-year apprentice.</p>
        </div>
        <div className="pt-sopx__acts">
          <span className="pt-sopx__ver">{SOP_VERSION}</span>
          {canEdit && drafts > 0 && <span className="pt-se__drafts">{drafts} draft{drafts === 1 ? "" : "s"}</span>}
          {canEdit && <Link href="/portal/sops/edit" className="pt-btn pt-btn--navy pt-sopx__edit">Edit procedures</Link>}
        </div>
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

      <p className="pt-sopx__foot">None of it is finished. If a procedure doesn&rsquo;t work on the job, say so and bring the fix with it — see C6.</p>
    </PortalShell>
  );
}
