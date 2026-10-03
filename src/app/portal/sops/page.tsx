import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { SOP_CHANGES, SOP_INTRO, SOP_VERSION } from "@/lib/portal/sops";
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
          <h1>One team. One standard. One goal.</h1>
          {SOP_INTRO.map((p) => <p key={p}>{p}</p>)}
        </div>
        {canEdit && (
          <div className="pt-se__head">
            {drafts > 0 && <span className="pt-se__drafts">{drafts} draft{drafts === 1 ? "" : "s"}</span>}
            <Link href="/portal/sops/edit" className="pt-btn pt-btn--navy pt-btn--sm">Edit procedures</Link>
          </div>
        )}
      </div>

      <div className="pt-sop__meta">
        <span>{SECTIONS.length} sections · {total} procedures</span>
        <span>{SOP_VERSION}</span>
      </div>

      {SOP_CHANGES.length > 0 && (
        <section className="pt-panel">
          <h2 className="pt-panel__h">What changed</h2>
          <p className="pt-panel__sub">A procedure that changes gets told to everyone, with what changed and why — see C6.</p>
          {SOP_CHANGES.map((c) => (
            <div key={c.on} className="pt-sop__change">
              <strong>{c.on}</strong>
              <p>{c.what}</p>
            </div>
          ))}
        </section>
      )}

      <div className="pt-sop__sections">
        {SECTIONS.map((s) => (
          <Link key={s.slug} href={`/portal/sops/${s.slug}`} className="pt-sop__section">
            <span className="pt-sop__letter">{s.letter}</span>
            <span className="pt-sop__sectionid">
              <strong>{s.title}</strong>
              <em>{s.blurb}</em>
              <span className="pt-sop__codes">{s.sops.map((x) => x.code).join(" · ")}</span>
            </span>
            {s.draft && <span className="pt-sop__draft">Draft</span>}
          </Link>
        ))}
      </div>
    </PortalShell>
  );
}
