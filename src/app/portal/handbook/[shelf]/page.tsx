import { notFound, redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { HANDBOOK } from "@/lib/portal/content";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { shelf: string } }) {
  const s = HANDBOOK.find((x) => x.letter.toLowerCase() === params.shelf.toLowerCase());
  return { title: s ? `${s.title} — Handbook — Team portal` : "Handbook — Team portal" };
}

export default async function HandbookShelfPage({ params }: { params: { shelf: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const shelf = HANDBOOK.find((s) => s.letter.toLowerCase() === params.shelf.toLowerCase());
  if (!shelf) notFound();

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href="/portal/handbook" label="All of the handbook" />
        <div className="pt-head__eyebrow">Handbook · Shelf {shelf.letter}</div>
        <h1>{shelf.title}.</h1>
      </div>

      <ul className="pt-hb-items">
        {shelf.items.map((it) => (
          <li key={it.title} className="pt-hb-item">
            <span className={`pt-hb-status pt-hb-status--${it.status}`}>
              {it.status === "have" ? "Have it" : "To write"}
            </span>
            <div className="pt-hb-item__body">
              <div className="pt-hb-item__title">
                {it.title}
                {it.today && <span className="pt-hb-today">ready today</span>}
              </div>
              {it.note && <div className="pt-hb-item__note">{it.note}</div>}
              {it.status === "write" && it.gap && <div className="pt-hb-item__gap">{it.gap}</div>}
            </div>
          </li>
        ))}
      </ul>
    </PortalShell>
  );
}
