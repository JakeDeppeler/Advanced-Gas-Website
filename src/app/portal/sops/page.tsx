import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { SOPS, SOP_INTRO, SOP_VERSION } from "@/lib/portal/sops";

export const metadata = { title: "Processes & procedures — Team portal" };

export default async function SopsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const total = SOPS.reduce((a, s) => a + s.sops.length, 0);

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">Processes &amp; procedures</div>
        <h1>One team. One standard. One goal.</h1>
        {SOP_INTRO.map((p) => <p key={p}>{p}</p>)}
      </div>

      <div className="pt-sop__meta">
        <span>{SOPS.length} sections · {total} procedures</span>
        <span>{SOP_VERSION}</span>
      </div>

      <div className="pt-sop__sections">
        {SOPS.map((s) => (
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
