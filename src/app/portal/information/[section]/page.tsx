import { notFound, redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { INFO_SECTIONS } from "@/lib/portal/content";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { section: string } }) {
  const s = INFO_SECTIONS.find((x) => x.slug === params.section);
  return { title: s ? `${s.label} — Team portal` : "Information — Team portal" };
}

export default async function InfoSectionPage({ params }: { params: { section: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const section = INFO_SECTIONS.find((s) => s.slug === params.section);
  if (!section) notFound();

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">Information · {section.label}</div>
        <h1>{section.title}</h1>
        {section.intro && <p>{section.intro}</p>}
      </div>

      <div className="pt-info">
        {section.blocks.map((block) => (
          <div key={block.title} className="pt-info__card">
            <h3>{block.title}</h3>
            {block.rows?.map((r) => (
              <div key={r.k} className="pt-info__row">
                <span>{r.k}</span>
                <strong>{r.v}</strong>
              </div>
            ))}
            {block.body?.map((p, i) => (
              <p key={i} className="pt-info__p">{p}</p>
            ))}
            {block.list && (
              <ul className="pt-info__list">
                {block.list.map((li, i) => (
                  <li key={i}>{li}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </PortalShell>
  );
}
